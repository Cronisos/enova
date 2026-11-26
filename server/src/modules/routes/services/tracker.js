// Suivi en temps réel : tient la chronologie à jour à partir du lecteur de journaux,
// enregistre automatiquement chaque nouvelle boucle et archive Market.json.

import { ROUTE_EVENTS, TimelineBuilder, commodityKey } from './timeline.js';
import { extractLoops, median, PAUSE_FACTOR, loopSec } from './loops.js';
import { evaluateBuy, nextStop } from './buyCheck.js';
import { stationQuestion, commodityQuestion, applyAnswer } from './questions.js';
import { parseJsonColumn } from '../../../core/jsonColumn.js';

const ROUTE_SET = new Set(ROUTE_EVENTS);
// Événements après lesquels on ressynchronise les boucles
const SYNC_TRIGGERS = new Set(['MarketBuy', 'MarketSell', 'Docked', 'Undocked', 'FSDJump', 'Died', 'Resurrect', 'Location']);

export class RouteTracker {
  constructor({ prisma, journal, game, broadcast, overlay }) {
    this.prisma = prisma;
    this.journal = journal;
    this.game = game;
    this.broadcast = broadcast;
    // Alertes d'achat et questions sur la route : seulement en mode Commerce. Dans un autre mode (commerce de rares,
    // minage…), un achat qui s'écarte de la route active est voulu : on ne dérange pas. Le suivi des boucles, lui,
    // continue (il se refait depuis le journal). Sans overlay (tests, serveur seul) : comme avant, toujours.
    this.enModeCommerce = () => !overlay?.mode || overlay.mode() === 'routes';
    // Chronologie tenue au fil du journal (timeline.js) : les événements bruts ne sont pas gardés
    this.builder = new TimelineBuilder();
    this.timeline = this.builder.entries;
    this.syncTimer = null;
    this.syncing = Promise.resolve();
    this.questions = new Map(); // questions en attente de réponse (id → question)
    this.nextQuestionId = 1;

    journal.addInterest(ROUTE_EVENTS);
    journal.on('ready', ({ history }) => {
      this.builder = new TimelineBuilder();
      for (const ev of history) if (ROUTE_SET.has(ev.event)) this.builder.add(ev);
      this.timeline = this.builder.entries;
      this.scheduleSync(0);
    });
    journal.on('event', (ev) => {
      if (!ROUTE_SET.has(ev.event)) return;
      this.builder.add(ev);
      this.timeline = this.builder.entries;
      if (ev.event === 'MarketBuy' && this.enModeCommerce()) {
        // Vérification immédiate de l'achat (le Market.json de la station est déjà à jour)
        this.checkBuy(this.timeline[this.timeline.length - 1])
          .then((r) => r && this.broadcast('routes:buy-check', r))
          .catch((err) => console.error("Vérification de l'achat :", err.message));
      }
      if ((ev.event === 'Docked' || ev.event === 'MarketBuy') && this.enModeCommerce()) {
        this.askIfChanged(this.timeline[this.timeline.length - 1]).catch((err) => console.error('Question :', err.message));
      }
      if (SYNC_TRIGGERS.has(ev.event)) this.scheduleSync(300);
      else this.notify([]);
    });
    journal.on('market', (m) => {
      this.archiveMarket(m)
        .then((added) => added && this.notify([]))
        .catch((err) => console.error('Archivage Market.json :', err.message));
    });
  }

  /** Définition minimale d'une route pour l'extraction des boucles. Structure illisible : erreur qui le dit. */
  static def(route) {
    const s = typeof route.structure === 'string' ? parseJsonColumn(route.structure, null, { label: `Route ${route.id} (structure)` }) : route.structure;
    if (!s || !Array.isArray(s.stops)) throw new Error(`Route ${route.id} : structure illisible en base, boucles non recalculées.`);
    return {
      startSystem: s.startSystem,
      startStation: s.startStation,
      startCommodity: s.startCommodity,
      stops: s.stops.map((x) => ({ system: x.system, station: x.station })),
    };
  }

  extract(route) {
    return extractLoops(this.timeline, RouteTracker.def(route), { from: new Date(route.trackFrom).getTime() });
  }

  notify(routeIds) {
    this.broadcast('routes:update', { routeIds });
  }

  /**
   * File unique des écritures de boucles : `fn` passe après la synchronisation en cours (programmée ou demandée par
   * l'API). Avant, une action de la page pendant une synchronisation programmée écrivait les mêmes boucles en même
   * temps (erreur P2002 sur [routeId, startAt], réponse 500). Rend le résultat de `fn` ; un échec ne bloque pas la file.
   */
  enqueue(fn) {
    const run = this.syncing.then(fn);
    this.syncing = run.catch(() => {});
    return run;
  }

  /** Synchronisation d'une route par la file (API, réponses aux questions). */
  syncRouteQueued(route) {
    return this.enqueue(() => this.syncRoute(route));
  }

  scheduleSync(delay) {
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.enqueue(() => this.syncAll()).catch((err) => console.error('Synchronisation des boucles :', err));
    }, delay);
  }

  async syncAll() {
    // Seule la route active enregistre les nouvelles boucles : les autres routes passant par
    // les mêmes systèmes compteraient sinon les mêmes trajets une deuxième fois.
    const routes = await this.prisma.route.findMany({ where: { active: true } });
    for (const r of routes) {
      // Une route en échec (structure abîmée…) n'empêche plus les suivantes
      try {
        await this.syncRoute(r);
      } catch (err) {
        console.error(`Synchronisation des boucles de la route ${r.id} :`, err.message);
      }
    }
    // Toujours prévenir toutes les pages : la boucle en cours (soute, gain partiel) a changé
    // même si aucune boucle n'a été enregistrée.
    this.notify([]);
  }

  /** Enregistre en base les boucles trouvées dans les journaux (sans doublon). */
  async syncRoute(route) {
    const { loops } = this.extract(route);
    const existing = await this.prisma.loop.findMany({
      where: { routeId: route.id },
      select: { id: true, startAt: true, endAt: true, netGain: true, activeSec: true, tags: true },
    });
    const byStart = new Map(existing.map((l) => [l.startAt.toISOString(), l]));
    let changed = 0;

    for (const loop of loops) {
      const ex = byStart.get(loop.startAt);
      if (ex && ex.endAt.toISOString() === loop.endAt && ex.netGain === loop.netGain && ex.activeSec === loop.activeSec && ex.tags === JSON.stringify(loop.tags)) continue;
      const data = loopToDb(loop);
      if (ex) {
        await this.prisma.$transaction([
          this.prisma.trade.deleteMany({ where: { loopId: ex.id } }),
          this.prisma.loop.update({ where: { id: ex.id }, data: { ...data, trades: { create: tradesToDb(loop) } } }),
        ]);
      } else {
        await this.prisma.loop.create({ data: { ...data, routeId: route.id, trades: { create: tradesToDb(loop) } } });
      }
      changed++;
    }

    // Boucles enregistrées qui n'existent plus dans les journaux (découpage revu) : supprimées, seulement si elles tiennent
    // entières dans la période réellement relue (du premier au dernier événement de la chronologie), et jamais quand un
    // journal a été sauté (illisible au démarrage : journalService.skipped). Avant, il n'y avait pas de borne haute :
    // un dossier des journaux pointé par erreur sur une vieille sauvegarde, ou un journal verrouillé par l'antivirus,
    // effaçait pour de bon toutes les boucles d'après.
    const stale = staleLoops(existing, loops, {
      firstT: Math.max(this.timeline[0]?.t ?? Infinity, new Date(route.trackFrom).getTime()),
      lastT: this.timeline[this.timeline.length - 1]?.t ?? -Infinity,
      incomplete: (this.journal?.skipped?.size ?? 0) > 0,
    });
    if (stale.length) {
      await this.prisma.loop.deleteMany({ where: { id: { in: stale.map((l) => l.id) } } });
      changed += stale.length;
    }

    // Pauses recalculées sur l'ensemble des boucles enregistrées de la route
    const all = await this.prisma.loop.findMany({ where: { routeId: route.id }, select: { id: true, durationSec: true, activeSec: true, pause: true } });
    const med = median(all.map(loopSec));
    for (const l of all) {
      const pause = med != null && loopSec(l) > PAUSE_FACTOR * med;
      if (pause !== l.pause) {
        await this.prisma.loop.update({ where: { id: l.id }, data: { pause } });
        changed++;
      }
    }
    return changed > 0;
  }

  /** Dernier prix d'une marchandise dans un système, d'après la chronologie (tous les journaux). */
  lastPrice(kind, commodity, system) {
    for (let i = this.timeline.length - 1; i >= 0; i--) {
      const e = this.timeline[i];
      if (e.kind === kind && e.commodity === commodity && e.system === system) return { price: e.price, station: e.station };
    }
    return null;
  }

  /** Dernier relevé de marché connu dans un système (Market.json archivés). */
  async latestMarket(system) {
    const last = await this.prisma.marketSnapshot.findFirst({
      where: { system },
      orderBy: { at: 'desc' },
      select: { marketId: true, at: true, station: true },
    });
    if (!last) return null;
    const items = await this.prisma.marketSnapshot.findMany({ where: { marketId: last.marketId, at: last.at } });
    return { ...last, items: new Map(items.map((i) => [i.commodity, i])) };
  }

  /**
   * Un achat vient d'être fait : est-il rentable à la prochaine station de la route active ?
   * @param {object} buy entrée 'buy' de la chronologie
   */
  async checkBuy(buy) {
    if (!buy || buy.kind !== 'buy') return null;
    const route = await this.prisma.route.findFirst({ where: { active: true } });
    if (!route) return null;
    const s = parseJsonColumn(route.structure, null, { label: `Route ${route.id} (structure)` });
    if (!s) return null;
    const dest = nextStop(s, buy.system);
    if (!dest) return null; // achat hors de la route : rien à comparer

    const market = await this.latestMarket(dest.system);
    const destStation = market?.station || this.lastPrice('sell', buy.commodity, dest.system)?.station || dest.station;
    // Marchandise absente du relevé : la station ne l'achète pas
    const destItem = market ? market.items.get(buy.commodity) || { sellPrice: 0, demand: 0 } : null;
    const historySell = this.lastPrice('sell', buy.commodity, dest.system);

    // Revente immédiate : Market.json de la station où l'on se trouve
    let hereSell = null;
    const m = this.journal.stateData.market;
    if (m?.MarketID === buy.marketId && Array.isArray(m.Items)) {
      const it = m.Items.find((i) => commodityKey(i.Name) === buy.commodity);
      if (it?.SellPrice > 0) hereSell = it.SellPrice;
    }

    // Marchandise principale de l'étape et sa marge habituelle
    let main = null;
    const lc = s.legCommodities?.[dest.legIndex];
    if (lc) {
      const b = this.lastPrice('buy', lc.commodity, buy.system);
      const sl = market?.items.get(lc.commodity)?.sellPrice || this.lastPrice('sell', lc.commodity, dest.system)?.price;
      if (b && sl) main = { commodity: lc.commodity, name: lc.name, margin: sl - b.price };
    }

    const result = evaluateBuy({
      buy,
      dest: { station: destStation, system: dest.system },
      destItem,
      historySell,
      hereSell,
      main,
      cargoCapacity: this.game.snapshot().loadout?.cargoCapacity ?? null,
    });
    return {
      ...result,
      routeId: route.id,
      commodity: buy.commodity,
      count: buy.count,
      station: buy.station,
      at: new Date(buy.t).toISOString(),
    };
  }

  /** Revérifie le dernier achat (bouton de test sur la page de la route). */
  async checkLastBuy() {
    for (let i = this.timeline.length - 1; i >= 0; i--) {
      if (this.timeline[i].kind === 'buy') return this.checkBuy(this.timeline[i]);
    }
    return null;
  }

  /** Amarrage ou achat qui s'écarte de la route active : on pose la question au joueur. */
  async askIfChanged(entry) {
    const route = await this.prisma.route.findFirst({ where: { active: true } });
    if (!route) return;
    const q = entry?.kind === 'dock'
      ? stationQuestion(route, entry)
      : commodityQuestion(route, entry, this.game.snapshot().loadout?.cargoCapacity ?? null);
    if (!q) return;
    // Une seule question en attente par sujet (pas de doublon si l'on achète en plusieurs fois)
    for (const p of this.questions.values()) {
      if (p.routeId === q.routeId && p.type === q.type && p.legIndex === q.legIndex) this.questions.delete(p.id);
    }
    const question = { ...q, id: this.nextQuestionId++, at: new Date(entry.t).toISOString() };
    this.questions.set(question.id, question);
    this.broadcast('routes:question', question);
  }

  pendingQuestions() {
    return [...this.questions.values()];
  }

  /** Réponse du joueur : la route est mise à jour (oui) ou la question n'est plus posée (non). */
  async answer(id, yes) {
    const q = this.questions.get(Number(id));
    if (!q) return null;
    this.questions.delete(q.id);
    const route = await this.prisma.route.findUnique({ where: { id: q.routeId } });
    if (!route) return null;
    const updated = await this.prisma.route.update({ where: { id: route.id }, data: applyAnswer(route, q, yes) });
    this.broadcast('routes:question-closed', { id: q.id });
    await this.syncRouteQueued(updated);
    this.notify([]);
    return updated;
  }

  /**
   * Archive le contenu de Market.json pour suivre l'évolution des stocks. Le même relevé lu deux fois en même temps
   * (deux Market.json rapprochés) : le second est ignoré sans erreur (P2002 sur [marketId, commodity, at]).
   */
  async archiveMarket(m) {
    if (!m?.MarketID || !Array.isArray(m.Items) || !m.timestamp) return false;
    const at = new Date(m.timestamp);
    if (!Number.isFinite(at.getTime())) return false;
    const already = await this.prisma.marketSnapshot.findFirst({ where: { marketId: m.MarketID, at } });
    if (already) return false;
    const rows = m.Items.filter((i) => (i.Stock || 0) > 0 || (i.Demand || 0) > 0).map((i) => ({
      marketId: m.MarketID,
      station: m.StationName || '?',
      system: m.StarSystem || '?',
      commodity: commodityKey(i.Name),
      name: i.Name_Localised || commodityKey(i.Name),
      buyPrice: i.BuyPrice || 0,
      sellPrice: i.SellPrice || 0,
      stock: i.Stock || 0,
      demand: i.Demand || 0,
      at,
    }));
    if (!rows.length) return false;
    try {
      await this.prisma.marketSnapshot.createMany({ data: rows });
    } catch (err) {
      if (err?.code === 'P2002') return false; // déjà archivé par un appel parallèle
      throw err;
    }
    this.purgeMarketsSoon();
    return true;
  }

  /** Purge de l'archive au plus une fois par jour, après un archivage (jamais en même temps qu'une autre). */
  purgeMarketsSoon(now = Date.now()) {
    if (this.purging || now - (this.lastPurgeAt ?? 0) < MARKET_PURGE_EVERY_MS) return null;
    this.lastPurgeAt = now;
    this.purging = this.purgeMarkets(now)
      .catch((err) => console.error("Purge de l'archive des marchés :", err.message))
      .finally(() => {
        this.purging = null;
      });
    return this.purging;
  }

  /**
   * Archive des marchés : environ 100 lignes par marché ouvert, gardées sans fin, avant. Les relevés de plus de 30 jours
   * sont effacés, sauf le dernier de chaque station (prix et marchandises d'appoint d'une station où l'on ne retourne
   * qu'une fois par mois). La page d'une route ne lit que les dernières 24 h pour la tendance du stock.
   * Rend le nombre de lignes effacées.
   */
  async purgeMarkets(now = Date.now()) {
    const cutoff = new Date(now - MARKET_KEEP_MS);
    const old = await this.prisma.marketSnapshot.groupBy({
      by: ['marketId'],
      _max: { at: true },
      _min: { at: true },
      having: { at: { _min: { lt: cutoff } } },
    });
    let removed = 0;
    for (const s of old) {
      const latest = s._max.at;
      const before = latest < cutoff ? latest : cutoff; // le dernier relevé de la station reste toujours
      const r = await this.prisma.marketSnapshot.deleteMany({ where: { marketId: s.marketId, at: { lt: before } } });
      removed += r?.count ?? 0;
    }
    return removed;
  }
}

const MARKET_KEEP_MS = 30 * 24 * 3600e3;
const MARKET_PURGE_EVERY_MS = 24 * 3600e3;

/**
 * Boucles enregistrées à supprimer : absentes des boucles retrouvées dans les journaux, et entières dans la période
 * relue [firstT, lastT]. Historique incomplet (un journal sauté) : aucune.
 * @param {{ id: number, startAt: Date, endAt: Date }[]} existing boucles en base
 * @param {{ startAt: string }[]} loops boucles retrouvées dans les journaux
 * @param {{ firstT: number, lastT: number, incomplete: boolean }} range
 */
export function staleLoops(existing, loops, { firstT, lastT, incomplete }) {
  if (incomplete || !Number.isFinite(firstT) || !Number.isFinite(lastT)) return [];
  const starts = new Set(loops.map((l) => l.startAt));
  return existing.filter((l) => l.startAt.getTime() >= firstT && l.endAt.getTime() <= lastT && !starts.has(l.startAt.toISOString()));
}

function loopToDb(l) {
  return {
    startAt: new Date(l.startAt),
    endAt: new Date(l.endAt),
    durationSec: l.durationSec,
    activeSec: l.activeSec ?? 0,
    netGain: l.netGain,
    sales: l.sales,
    purchases: l.purchases,
    fuel: l.fuel,
    repairs: l.repairs,
    wages: l.wages,
    ammo: l.ammo,
    rebuy: l.rebuy,
    merits: l.merits,
    cargo: l.cargo,
    cargoDetail: JSON.stringify(l.cargoDetail),
    legTimes: JSON.stringify(l.legTimes),
    tags: JSON.stringify(l.tags),
    destroyed: l.destroyed,
  };
}

function tradesToDb(l) {
  return l.trades.map((t) => ({ ...t, at: new Date(t.at) }));
}

/** Boucle lue en base → objet utilisable par les calculs. Une colonne JSON abîmée vaut une liste vide (signalée). */
export function loopFromDb(l) {
  const list = (v, what) => parseJsonColumn(v || '[]', [], { label: `Boucle ${l.id} (${what})`, accept: Array.isArray });
  return {
    ...l,
    startAt: l.startAt.toISOString(),
    endAt: l.endAt.toISOString(),
    cargoDetail: list(l.cargoDetail, 'soute'),
    legTimes: list(l.legTimes, 'étapes'),
    tags: list(l.tags, 'étiquettes'),
    trades: l.trades || [],
  };
}
