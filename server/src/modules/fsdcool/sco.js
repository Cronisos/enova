// « SCO prêt » : compte à rebours de l'overdrive du supercruise (SCO), d'après Status.json (relu toutes les 500 ms).
//
// Le jeu ne dit pas quand le SCO redevient disponible, et l'indicateur « FSD Cooldown » (bit 18 de Flags) ne se lève
// pas après un SCO (relevé data/fsd-status.log, 4-7 nov. 2026). Le compte à rebours part à la coupure du SCO (le bit 20
// de Flags2 retombe) et dure selon la génération du vaisseau (Loadout.Ship).
//
// Mesure : chaque coupure et la réactivation suivante sont notées. Si le jeu refuse le SCO pendant son refroidissement,
// l'écart entre les deux borne la vraie durée par le haut : le plus court écart récent, sans sortie du supercruise ni
// changement de vaisseau, remplace la valeur de départ dès qu'il est plus court qu'elle.

import { FLAG } from './state.js';

// --- Règles du jeu : dépôt des règles, server/src/regles/supercroisiere.js (voir regles/LISEZMOI.md) -----------------

import { SCO_FLAG2, SCO_COOLDOWN_MS, SCO_NEW_GENERATION_LIST, SCO_CASPIAN } from '../../regles/supercroisiere.js';

export { SCO_FLAG2, SCO_COOLDOWN_MS, SCO_CASPIAN };
/** Vaisseaux « nouvelle génération » (Loadout.Ship, en minuscules), d'après la fiche du dépôt. */
export const SCO_NEW_GENERATION = new Set(SCO_NEW_GENERATION_LIST);

// --- Réglages de l'app (pas des règles du jeu) -------------------------------------------------------------------

export const SCO_READY_SIGNAL_MS = 1_000; // le signal « SCO prêt » reste affiché 1 s, puis la fenêtre se ferme (4 s jusqu'au 19 nov. 2026 : trop long)
export const SCO_MIN_GAP_MS = 2_000; // écart plus court : bit qui clignote, pas une vraie réactivation
export const SCO_MAX_GAP_MS = 60_000; // écart plus long : le joueur a attendu, la mesure n'apprend rien
export const SCO_KEEP = 20; // écarts gardés par vaisseau : une mesure fausse finit par sortir

const SHIP_KEY = /^[a-z0-9][a-z0-9_]{0,39}$/;
const OUT_OF_SUPERCRUISE = 'sorti du supercruise';

/** Nom de vaisseau du journal (Loadout.Ship) en minuscules, ou null s'il est vide ou inattendu. */
export function shipKey(ship) {
  const s = String(ship ?? '').trim().toLowerCase();
  return SHIP_KEY.test(s) ? s : null;
}

/**
 * Événements du journal qui donnent le nom affiché d'un type de vaisseau : [champ du type, champ du nom localisé].
 * Loadout ne donne jamais Ship_Localised (0 sur 232 dans les journaux du joueur, 7 nov. 2026), et le nom du core
 * (game.snapshot().ship) peut être celui d'un VRS ou d'une combinaison après un LoadGame, ou l'ancien après un échange.
 */
export const SHIP_NAME_EVENTS = Object.freeze({
  LoadGame: ['Ship', 'Ship_Localised'],
  ShipyardSwap: ['ShipType', 'ShipType_Localised'],
  ShipyardNew: ['ShipType', 'ShipType_Localised'],
  ShipyardBuy: ['ShipType', 'ShipType_Localised'],
});

/**
 * Retient dans names (Map type de vaisseau → nom affiché) le nom donné par l'événement, s'il en donne un.
 * LoadGame sans nom localisé (« Anaconda ») garde son champ Ship, déjà lisible ; les Shipyard* donnent le type en minuscules.
 */
export function learnShipName(names, ev) {
  const fields = Object.hasOwn(SHIP_NAME_EVENTS, ev?.event) ? SHIP_NAME_EVENTS[ev.event] : null;
  if (!fields) return false;
  const key = shipKey(ev[fields[0]]);
  const raw = ev[fields[1]] ?? (ev.event === 'LoadGame' ? ev[fields[0]] : null);
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (!key || !name || name.length > 60 || /[\u0000-\u001f]/.test(name)) return false;
  names.set(key, name);
  return true;
}

/** 'legacy', 'newGeneration', 'caspian', ou 'unknown' tant que le vaisseau n'est pas connu. */
export function scoGeneration(ship) {
  const key = shipKey(ship);
  if (!key) return 'unknown';
  if (key === SCO_CASPIAN) return 'caspian';
  return SCO_NEW_GENERATION.has(key) ? 'newGeneration' : 'legacy';
}

/** Écart mesuré gardé : nombre entier de ms entre les bornes. */
export const validGap = (ms) => Number.isFinite(ms) && ms >= SCO_MIN_GAP_MS && ms <= SCO_MAX_GAP_MS;

const secs = (ms) => `${(ms / 1000).toFixed(1)} s`;
const SOURCES = { measured: 'mesurée', default: "d'après SCO-Cooldown", unknown: 'vaisseau inconnu' };

/** Ligne du relevé (data/fsd-status.log) pour une coupure ou une réactivation du SCO : de quoi affiner la durée. */
export function scoNote(change) {
  if (change?.type === 'end') {
    const c = change.countdown;
    return `SCO coupé : prêt dans ${secs(c.durationMs)} (${c.ship || 'vaisseau inconnu'}, ${SOURCES[c.source]})`;
  }
  const m = change?.type === 'start' ? change.measure : null;
  if (!m) return null;
  const vs = m.expectedMs != null ? ` ; compte à rebours ${secs(m.expectedMs)}${m.early ? ', réactivé avant sa fin' : ''}` : '';
  return `SCO réactivé ${secs(m.ms)} après la coupure (${m.ship || 'vaisseau inconnu'}${vs})${m.kept ? '' : ` : non retenu, ${m.why}`}`;
}

export class ScoCooldown {
  /** @param samples Map vaisseau → [{ at, ms }] : écarts déjà mesurés, les plus récents à la fin */
  constructor(samples = new Map()) {
    this.samples = samples instanceof Map ? samples : new Map();
    this.on = null; // dernier état du bit 20 (null avant la première lecture)
    this.supercruise = false;
    this.active = null; // { since } pendant le SCO
    this.countdown = null; // { endedAt, readyAt, durationMs, source, ship, shipName } depuis la dernière coupure
    this.pending = null; // dernière coupure en attente de réactivation : { at, ship, why } (why : raison de l'écarter)
  }

  /** Plus court écart récent mesuré pour ce vaisseau (ms), ou null. */
  shortest(ship) {
    const list = this.samples.get(shipKey(ship)) || [];
    return list.length ? Math.min(...list.map((s) => s.ms)) : null;
  }

  /** Durée attendue pour ce vaisseau : la valeur de départ, ou le plus court écart mesuré s'il est plus court. */
  expected(ship) {
    const generation = scoGeneration(ship);
    const base = SCO_COOLDOWN_MS[generation];
    const shortest = this.shortest(ship);
    const measured = this.samples.get(shipKey(ship))?.length || 0;
    if (shortest != null && shortest < base) return { ms: shortest, source: 'measured', generation, base, shortest, measured };
    return { ms: base, source: generation === 'unknown' ? 'unknown' : 'default', generation, base, shortest, measured };
  }

  /**
   * Saut hyperespace, rechargement du jeu ou sortie du supercruise : l'écart en cours ne mesure plus le refroidissement
   * du SCO. La première raison est gardée, pour le relevé.
   * @param why 'saut hyperespace', 'rechargement du jeu' ou 'sorti du supercruise'
   */
  interrupted(why) {
    if (this.pending && !this.pending.why) this.pending.why = why || 'interrompu';
  }

  /**
   * Nouvel état de Status.json.
   * @param ship Loadout.Ship du vaisseau, ou une fonction qui le donne (appelée seulement à la coupure ou à la reprise)
   * @param shipName nom affiché du vaisseau (idem)
   * @returns null, { type: 'end', countdown }, { type: 'start', measure } ou { type: 'supercruise' }
   */
  status(flags, flags2, at, ship = null, shipName = null) {
    const value = (v) => (typeof v === 'function' ? v() : v);
    const sc = Boolean(flags & FLAG.supercruise);
    const on = Boolean(flags2 & SCO_FLAG2);
    const before = this.on;
    const scChanged = sc !== this.supercruise;
    this.on = on;
    this.supercruise = sc;
    if (!sc) this.interrupted(OUT_OF_SUPERCRUISE); // l'écart ne mesure plus rien
    if (before === null) {
      // Première lecture : point de départ, sans compte à rebours (comme SCO-Cooldown)
      this.active = on ? { since: at } : null;
      return null;
    }
    if (on && !before) {
      const measure = this.measure(at, shipKey(value(ship)));
      this.active = { since: at };
      this.countdown = null;
      this.pending = null;
      return { type: 'start', measure };
    }
    if (!on && before) {
      const key = shipKey(value(ship));
      const e = this.expected(key);
      this.active = null;
      this.countdown = { endedAt: at, readyAt: at + e.ms, durationMs: e.ms, source: e.source, generation: e.generation, ship: key, shipName: value(shipName) || null, measured: e.measured };
      this.pending = { at, ship: key, why: sc ? null : OUT_OF_SUPERCRUISE };
      return { type: 'end', countdown: this.countdown };
    }
    // Entrée ou sortie du supercruise pendant le compte à rebours : la fenêtre se montre ou se cache
    return scChanged && this.countdown && at < this.countdown.readyAt + SCO_READY_SIGNAL_MS ? { type: 'supercruise' } : null;
  }

  /** Réactivation : écart depuis la dernière coupure, gardé s'il mesure bien le refroidissement. */
  measure(at, ship) {
    const p = this.pending;
    if (!p) return null;
    const ms = at - p.at;
    const expectedMs = this.countdown?.durationMs ?? null;
    let why = null;
    if (p.why) why = p.why;
    else if (!p.ship || p.ship !== ship) why = 'vaisseau inconnu ou changé';
    else if (ms < SCO_MIN_GAP_MS) why = 'trop court (indicateur qui clignote)';
    else if (ms > SCO_MAX_GAP_MS) why = 'trop long pour apprendre quelque chose';
    if (!why) this.samples.set(p.ship, [...(this.samples.get(p.ship) || []), { at: new Date(at).toISOString(), ms }].slice(-SCO_KEEP));
    return { ms, ship: p.ship, kept: !why, why, expectedMs, early: expectedMs != null && ms < expectedMs };
  }

  /** Fin de l'affichage (compte à rebours puis signal « SCO prêt »), en ms, ou null s'il n'y a rien à montrer. */
  shownUntil(now) {
    const c = this.countdown;
    if (!c || this.active || !this.supercruise) return null;
    const until = c.readyAt + SCO_READY_SIGNAL_MS;
    return now < until ? until : null;
  }

  shown(now) {
    return this.shownUntil(now) !== null;
  }

  summary(now) {
    const c = this.countdown;
    const iso = (t) => new Date(t).toISOString();
    return {
      active: this.active && { since: iso(this.active.since) },
      supercruise: this.supercruise,
      countdown: c && { ...c, endedAt: iso(c.endedAt), readyAt: iso(c.readyAt) },
      signalMs: SCO_READY_SIGNAL_MS,
      shown: this.shown(now),
    };
  }

  /** Règles en vigueur et mesures par vaisseau, pour les comparer (GET /api/modules/fsdcool/sco). */
  report(currentShip) {
    const ships = [...this.samples.keys()].sort().map((ship) => ({ ship, ...this.expected(ship), samples: this.samples.get(ship) }));
    return {
      rules: {
        flags2Bit: 20,
        cooldownMs: SCO_COOLDOWN_MS,
        newGeneration: [...SCO_NEW_GENERATION],
        caspian: SCO_CASPIAN,
        source: "d'après SCO-Cooldown 0.1.0 (9 oct. 2026), à mesurer",
      },
      current: { ship: shipKey(currentShip), ...this.expected(currentShip) },
      ships,
    };
  }
}
