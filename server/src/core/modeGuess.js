// Proposition de mode de jeu : l'app regarde ce que tu fais (journal en direct, véhicule) et, sur un signe net,
// propose le mode qui va avec (« ⛏ Minage Rhino ? »). Une devinette ne bascule jamais d'elle-même : changer de mode remet
// à zéro les compteurs du nouveau, une fausse alerte les viderait. « Non » fait taire ce mode 30 min.
// Seule exception, voulue par le joueur : le rôle principal d'un vaisseau, à l'embarquement (core/roleSwitch.js). Les
// rôles changent aussi ce qui est proposé ici (ModeAdvisor.classify).

import { hasRole, inRole, isMode, POLYVALENT } from './modes.js';
import { REAL_TIMERS } from './timers.js';
import { estRare } from './rares.js';

export const DISMISS_MS = 30 * 60 * 1000;
export const EXPIRE_MS = 15 * 60 * 1000; // proposition restée sans réponse : elle s'efface
const MATERIALS_N = 5; // matériaux ramassés…
const MATERIALS_MS = 10 * 60 * 1000; // …en 10 min, sans minage : chasse aux matériaux
const FLAG_IN_SRV = 1 << 26;
const FLAG2_ON_FOOT = 1 << 0; // Status.json, Flags2 : à pied (Odyssey)
const RESCUE_CARGO = /escapepod|cryopod/i;
// Chantier de construction (vaisseau de colonisation, chantier orbital ou planétaire) : nom ET service de livraison.
// Le service seul ne suffit pas : un établissement terminé le garde (journal de référence, 1er nov. 2026).
const CONSTRUCTION_NAME = /^(\$EXT_(PANEL|PNL)_ColonisationShip|(Orbital|Planetary) Construction Site:)/i;
const isConstructionDock = (ev) => CONSTRUCTION_NAME.test(String(ev.StationName || ''))
  && Array.isArray(ev.StationServices) && ev.StationServices.some((x) => String(x).toLowerCase() === 'colonisationcontribution');

/** Mode suggéré par un seul événement : { mode, reason } ou null. `inSrv` : le joueur est dans son SRV ; `onFoot` : à pied. */
export function guessFromEvent(ev, { inSrv = false, onFoot = false } = {}) {
  switch (ev.event) {
    case 'Loadout': {
      // Vaisseau pris (ou jeu lancé) : son équipement dit ce pour quoi il est fait. Le grand hangar
      // (largebuggybay, mkiilargebuggybay) est celui du Rhino ; lasers de minage et prospection : minage en vaisseau.
      // Une liste d'objets, sinon rien (un Loadout abîmé ne fait plus échouer la suggestion de mode)
      const items = (Array.isArray(ev.Modules) ? ev.Modules : []).map((m) => String(m?.Item || '').toLowerCase());
      if (items.some((i) => i.includes('largebuggybay'))) return { mode: 'waypoints', reason: 'vaisseau avec hangar à Rhino' };
      if (items.some((i) => /mining|abrasion|dronecontrol_prospector/.test(i))) return { mode: 'shipmining', reason: 'vaisseau équipé pour le minage' };
      return null;
    }
    case 'LaunchSRV':
      return /rhino/i.test(`${ev.SRVType} ${ev.SRVType_Localised}`) ? { mode: 'waypoints', reason: 'Rhino sorti' } : null;
    case 'MiningRefined':
      return inSrv ? { mode: 'waypoints', reason: 'raffinage en SRV' } : { mode: 'shipmining', reason: 'raffinage en vaisseau' };
    case 'ProspectedAsteroid':
    case 'AsteroidCracked':
      return { mode: 'shipmining', reason: 'astéroïde prospecté' };
    case 'LaunchDrone':
      return ev.Type === 'Prospector' ? { mode: 'shipmining', reason: 'drone de prospection' } : null;
    case 'Bounty':
    case 'PVPKill':
      return onFoot ? { mode: 'groundcombat', reason: 'prime gagnée à pied' } : { mode: 'combat', reason: 'prime gagnée' };
    case 'FactionKillBond':
      return onFoot ? { mode: 'groundcombat', reason: 'zone de conflit au sol' } : { mode: 'combat', reason: 'zone de conflit' };
    case 'CapShipBond':
      return { mode: 'combat', reason: 'zone de conflit' };
    case 'DropshipDeploy':
      return { mode: 'groundcombat', reason: 'largage de Frontline Solutions' };
    case 'SearchAndRescue':
      return { mode: 'rescue', reason: 'livraison de sauvetage' };
    case 'CollectCargo':
      return RESCUE_CARGO.test(ev.Type) ? { mode: 'rescue', reason: 'capsule de survie ramassée' } : null;
    case 'Docked':
      return isConstructionDock(ev) ? { mode: 'colonisation', reason: 'à quai à un chantier de construction' } : null;
    case 'ColonisationContribution':
      return { mode: 'colonisation', reason: 'livraison à un chantier' };
    case 'MarketBuy':
      // Une marchandise rare achetée (relevé core/rares.js) : on fait du commerce de rares
      return estRare(ev.Type) ? { mode: 'rares', reason: 'marchandise rare achetée' } : null;
    case 'ApproachSettlement':
      // Ruines et structures des Gardiens : leur nom interne commence par « $Ancient » (relevé du 22 nov. 2026)
      return /^\$ancient/i.test(String(ev.Name || '')) ? { mode: 'gardiens', reason: 'site gardien en vue' } : null;
    case 'MaterialCollected':
      // Matériau des Gardiens (site, sentinelle, obélisque) : un seul suffit, on ne les trouve que là
      return /^(guardian_|ancient\w+data$)/i.test(String(ev.Name || '')) ? { mode: 'gardiens', reason: 'matériau gardien ramassé' } : null;
    case 'PowerplayCollect':
      // Ressources allouées par ta puissance (dossiers de presse, contrats sous scellé…) : chargées pour être livrées
      return { mode: 'powerdelivery', reason: 'ressources Powerplay chargées' };
    default:
      return null;
  }
}

/** Ce qui distingue deux propositions pour l'affichage : une autre clé, et les fenêtres sont prévenues. */
const shownKey = (s) => (s ? JSON.stringify([s.mode, s.reason, Boolean(s.discreet), s.source ?? null, s.shipId ?? null, Boolean(s.canRemember)]) : null);

/**
 * Suivi des propositions. deps : { mode() : mode en cours, now() : horloge, onChange(suggestion) : à chaque
 * changement (null quand il n'y a plus rien à proposer), ship() : { id, role, away } du vaisseau où tu es, ou null
 * s'il est inconnu (rôles des vaisseaux, core/roleSwitch.js advisorShip ; sans ship, aucun suivi du vaisseau : comme
 * avant les rôles), timers : { set, clear } ou null (pas d'effacement de lui-même, tests), store : silences gardés
 * d'un démarrage à l'autre ({ load() → Map mode → fin (ms), save(Map) }, core/silences.js), ou null (en mémoire
 * seulement, tests) }.
 *
 * Proposition : { mode, reason, at } et, selon le cas :
 * - discreet: true : activité hors des rôles du vaisseau, montrée sans attirer l'œil ;
 * - shipId + canRemember: true : vaisseau sans rôle, proposition tirée de son équipement (Loadout) : « Retenir comme
 *   rôle de ce vaisseau » ;
 * - source: 'role' + shipId : bascule impossible (overlay absent ou coupé) devenue proposition (core/roleSwitch.js).
 *
 * Avec les rôles : un vaisseau qui a un rôle principal ou secondaire n'a plus de proposition tirée de son équipement, le
 * rôle prime ; une activité de ses rôles est proposée normalement, une autre discrètement. Polyvalent : tout est proposé
 * normalement, comme sans rôle, équipement compris (« tout est proposé comme avant les rôles »), mais sans « Retenir »
 * (un rôle est déjà donné). Sans rôle : comme avant.
 * L'équipement (Loadout) ne dit quelque chose que de TON vaisseau, celui où tu es : pas d'un taxi, du vaisseau d'un
 * autre CMDR (équipage), ni d'un Loadout que le suivi du vaisseau a écarté (autre numéro, chasseur, SRV).
 * « Non » fait taire ce mode 30 min, discret ou non, même si l'app redémarre entre-temps (store). Une proposition
 * discrète ne remplace jamais une proposition normale en attente. Sans réponse, toute proposition s'efface au bout de
 * 15 min (et les fenêtres en sont prévenues).
 */
export class ModeAdvisor {
  constructor({ mode, now = () => Date.now(), onChange = () => {}, ship = null, timers = REAL_TIMERS, store = null }) {
    this.mode = mode;
    this.now = now;
    this.onChange = onChange;
    this.ship = ship;
    this.timers = timers;
    this.timer = null;
    this.store = store;
    this.suggestion = null; // { mode, reason, at, … }
    this.dismissed = this.restoreSilences(); // mode → fin du silence (ms)
    this.materials = [];
    this.lastRefine = 0;
  }

  /**
   * Silences encore en cours au démarrage (store) : modes connus seulement, échéances passées oubliées, et jamais plus
   * de 30 min à partir de maintenant (horloge du PC reculée, fichier retouché).
   */
  restoreSilences() {
    const out = new Map();
    if (!this.store) return out;
    let saved;
    try {
      saved = this.store.load();
    } catch {
      return out; // le store dit lui-même ce qui ne va pas ; on repart sans silence
    }
    const t = this.now();
    for (const [mode, until] of saved instanceof Map ? saved : []) {
      if (isMode(mode) && Number.isFinite(until) && until > t) out.set(mode, Math.min(until, t + DISMISS_MS));
    }
    return out;
  }

  /** Garde les silences en cours (store), pour qu'ils tiennent après un redémarrage ; les échéances passées sont oubliées. */
  saveSilences() {
    const t = this.now();
    for (const [mode, until] of this.dismissed) if (until <= t) this.dismissed.delete(mode);
    if (!this.store) return;
    try {
      this.store.save(new Map(this.dismissed));
    } catch {
      // le store ne lève pas d'erreur (il l'écrit lui-même) ; ceinture et bretelles : « Non » est pris en mémoire
    }
  }

  /** Proposition en cours (effacée si trop vieille ou si le mode est déjà le bon). */
  current() {
    const s = this.suggestion;
    if (s && (this.now() - s.at > EXPIRE_MS || s.mode === this.mode())) this.set(null);
    return this.suggestion;
  }

  set(s) {
    const before = this.suggestion;
    this.suggestion = s;
    if (this.timers) {
      if (this.timer) this.timers.clear(this.timer);
      // Échéance : l'effacer et le dire aux fenêtres, sans attendre qu'une page la redemande
      this.timer = s ? this.timers.set(() => this.current(), EXPIRE_MS + 1000) : null;
    }
    if (shownKey(before) !== shownKey(s)) this.onChange(s);
  }

  /** Normale, discrète, avec « Retenir », ou rien, selon les rôles du vaisseau actuel. */
  classify(guess, { fromLoadout = false } = {}) {
    const ship = this.ship?.() || null;
    const role = ship?.role || null;
    if (!hasRole(role)) {
      // Sans rôle : comme avant ; l'équipement propose en plus de retenir ce mode comme rôle du vaisseau
      return fromLoadout && Number.isInteger(ship?.id) ? { ...guess, shipId: ship.id, canRemember: true } : guess;
    }
    // Un rôle est déclaré : il prime sur l'équipement ; Polyvalent, lui, laisse tout proposer comme sans rôle
    if (fromLoadout) return role.primary === POLYVALENT.id ? guess : null;
    return inRole(role, guess.mode) ? guess : { ...guess, discreet: true };
  }

  /** Un événement du journal en direct. */
  event(ev, status) {
    const t = this.now();
    const inSrv = Boolean((status?.Flags || 0) & FLAG_IN_SRV);
    if (ev.event === 'MiningRefined') this.lastRefine = t;
    const onFoot = Boolean((status?.Flags2 || 0) & FLAG2_ON_FOOT);
    let guess = guessFromEvent(ev, { inSrv, onFoot });
    // Matériaux : seulement une vraie chasse (plusieurs d'affilée), pas ceux ramassés en minant
    if (!guess && ev.event === 'MaterialCollected' && !inSrv && t - this.lastRefine > MATERIALS_MS) {
      this.materials = [...this.materials.filter((x) => t - x < MATERIALS_MS), t];
      if (this.materials.length >= MATERIALS_N) guess = { mode: 'materials', reason: `${this.materials.length} matériaux ramassés` };
    }
    if (!guess) return;
    if (ev.event === 'Loadout' && !this.ownLoadout(ev)) return;
    const s = this.classify(guess, { fromLoadout: ev.event === 'Loadout' });
    if (s) this.propose(s);
  }

  /** Le Loadout est-il celui de ton vaisseau, celui où tu es ? Sans suivi du vaisseau (ship absent) : comme avant, oui. */
  ownLoadout(ev) {
    if (!this.ship) return true;
    const ship = this.ship();
    return Boolean(ship && !ship.away && Number.isInteger(ship.id) && ship.id === ev.ShipID);
  }

  /**
   * Propose un mode. force : même s'il se tait après un « Non » (bascule devenue proposition : elle vient d'un rôle
   * choisi, pas d'une devinette).
   */
  propose(s, { force = false } = {}) {
    if (s.mode === this.mode()) return this.current();
    if (!force && this.silenced(s.mode)) return this.current();
    const pending = this.current();
    if (pending) {
      if (pending.mode === s.mode) {
        // Déjà proposé : on garde la première raison, sauf pour monter d'un cran (discrète → normale, devinette → rôle)
        const upgrade = (pending.discreet && !s.discreet) || (s.source === 'role' && pending.source !== 'role');
        if (!upgrade) return pending;
      } else if (s.discreet && !pending.discreet) {
        return pending; // une proposition discrète ne chasse pas une proposition normale
      }
    }
    const { at, ...rest } = s;
    this.set({ ...rest, at: this.now() });
    return this.suggestion;
  }

  /** « Non » : on n'en reparle pas avant 30 min, même si l'app redémarre entre-temps. */
  dismiss() {
    if (this.suggestion) {
      this.dismissed.set(this.suggestion.mode, this.now() + DISMISS_MS);
      this.saveSilences();
    }
    this.set(null);
  }

  /** Ce mode se tait-il encore après un « Non » (ou une bascule annulée) ? La bascule au relog en dépend (core/roleSwitch.js). */
  silenced(mode) {
    return (this.dismissed.get(mode) || 0) > this.now();
  }

  /** Fait taire un mode 30 min, comme « Non » (bascule annulée). */
  silence(mode) {
    if (!isMode(mode)) return;
    this.dismissed.set(mode, this.now() + DISMISS_MS);
    this.saveSilences();
    if (this.suggestion?.mode === mode) this.set(null);
  }

  /** Le mode a changé (accepté, ou choisi au menu) : la proposition n'a plus lieu d'être s'il est le bon. */
  modeChanged() {
    if (this.suggestion && this.suggestion.mode === this.mode()) this.set(null);
  }

  /** Autre vaisseau : la proposition venait de l'ancien. */
  shipChanged() {
    this.set(null);
  }

  /** Rôle donné au vaisseau `shipId` : « Retenir comme rôle » n'a plus lieu d'être pour lui. */
  roleChanged(shipId) {
    if (this.suggestion?.canRemember && this.suggestion.shipId === shipId) this.set(null);
  }
}
