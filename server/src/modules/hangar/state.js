// Hangars sans véhicule : on suit, vaisseau par vaisseau, les hangars (véhicules planétaires, chasseurs) et si un
// véhicule y a été mis. Pur : rien n'est lu ici, les événements du journal sont donnés un par un.
//
// Ce que le journal dit, et ce qu'on en déduit (journaux de l'auteur, 22 nov. 2026) :
//   - un hangar acheté arrive VIDE : après l'achat d'un grand hangar, quatre « RestockVehicle » ont suivi pour le remplir ;
//   - « RestockVehicle » (achat d'un véhicule) ne dit pas dans quel hangar il va : on considère alors remplis tous les
//     hangars de ce genre (planétaire ou chasseur) du vaisseau où l'on est. Deux hangars achetés et un seul rempli : pas
//     d'alerte (limite connue) ;
//   - un hangar déjà là quand le suivi commence, ou ressorti du stockage : contenu inconnu, jamais d'alerte.
// L'alerte ne vient donc que d'un hangar acheté puis jamais garni : pas de fausse alerte sur un doute.

import { nomModele } from '../../core/ship.js';

export const HANGAR_EVENTS = ['Loadout', 'ModuleBuy', 'ModuleSell', 'ModuleStore', 'ModuleRetrieve', 'ModuleSwap', 'RestockVehicle', 'LaunchSRV', 'LaunchFighter', 'Undocked', 'Docked'];

const SRV = /^(testbuggy|mev_rhino|combat_multicrew_srv_\d+)$/i; // Scarabée, Rhino, Scorpion
/** Nom interne d'un module : « $int_buggybay_size2_class1_name; » → « int_buggybay_size2_class1 ». */
const interne = (v) => String(v || '').toLowerCase().replace(/^\$/, '').replace(/_name;$/, '');
/** Genre de hangar d'un module : 'srv' (véhicules planétaires), 'chasseur', ou null si ce n'en est pas un. */
export function genreHangar(item) {
  const i = interne(item);
  if (/buggybay/.test(i)) return 'srv';
  if (/fighterbay/.test(i)) return 'chasseur';
  return null;
}
const taille = (item) => Number(/_size(\d)/.exec(interne(item))?.[1]) || null;
/** Nom montré : celui du jeu quand l'achat l'a donné, sinon un nom simple avec la taille. */
function nomHangar(item, localise) {
  if (typeof localise === 'string' && localise.trim()) return localise.trim().slice(0, 80);
  const t = taille(item);
  return `${genreHangar(item) === 'chasseur' ? 'Hangar à chasseurs' : 'Hangar de véhicules planétaires'}${t ? ` (taille ${t})` : ''}`;
}

export class HangarState {
  constructor() {
    this.ships = new Map(); // ShipID → { nom, hangars: Map(slot → { item, genre, nom, vide: true | false | null }) }
    this.shipId = null; // vaisseau où l'on est
  }

  ship(id) {
    if (!Number.isInteger(id)) return null;
    if (!this.ships.has(id)) this.ships.set(id, { nom: null, hangars: new Map() });
    return this.ships.get(id);
  }

  /** Pose (ou retire) le module d'un emplacement ; `vide` : true (acheté), null (contenu inconnu). */
  poser(ship, slot, item, vide, localise) {
    if (!ship || typeof slot !== 'string' || !slot) return;
    const genre = genreHangar(item);
    if (!genre) ship.hangars.delete(slot);
    else ship.hangars.set(slot, { item: interne(item), genre, nom: nomHangar(item, localise), vide });
  }

  /**
   * Applique un événement. Rend { decollage: true } à un décollage (Undocked), { change: true } quand l'état des
   * hangars a pu changer, sinon null.
   */
  apply(ev) {
    switch (ev.event) {
      case 'Loadout': {
        const s = this.ship(ev.ShipID);
        if (!s) return null;
        this.shipId = ev.ShipID;
        s.nom = String(ev.ShipName || '').trim() || nomModele(ev.Ship) || ev.Ship || s.nom;
        // Les hangars du vaisseau tels que le jeu les donne ; ce qu'on savait d'un hangar resté au même endroit est gardé
        const avant = s.hangars;
        s.hangars = new Map();
        for (const m of Array.isArray(ev.Modules) ? ev.Modules : []) {
          if (!m || typeof m.Slot !== 'string' || !genreHangar(m.Item)) continue;
          const connu = avant.get(m.Slot);
          if (connu && connu.item === interne(m.Item)) s.hangars.set(m.Slot, connu);
          else this.poser(s, m.Slot, m.Item, null);
        }
        return { change: true };
      }
      case 'ModuleBuy': {
        const s = this.ship(ev.ShipID);
        if (!s) return null;
        this.shipId = ev.ShipID;
        this.poser(s, ev.Slot, ev.BuyItem, true, ev.BuyItem_Localised); // un hangar acheté arrive vide
        return { change: true };
      }
      case 'ModuleRetrieve': {
        const s = this.ship(ev.ShipID);
        this.poser(s, ev.Slot, ev.RetrievedItem, null, ev.RetrievedItem_Localised); // ressorti du stockage : contenu inconnu
        return s ? { change: true } : null;
      }
      case 'ModuleSell':
      case 'ModuleStore': {
        const s = this.ship(ev.ShipID);
        if (!s || !s.hangars.delete(ev.Slot)) return null;
        return { change: true };
      }
      case 'ModuleSwap': {
        const s = this.ship(ev.ShipID);
        if (!s) return null;
        const de = s.hangars.get(ev.FromSlot);
        const vers = s.hangars.get(ev.ToSlot);
        if (!de && !vers) return null;
        s.hangars.delete(ev.FromSlot);
        s.hangars.delete(ev.ToSlot);
        if (de) s.hangars.set(ev.ToSlot, de);
        if (vers) s.hangars.set(ev.FromSlot, vers);
        return { change: true };
      }
      case 'RestockVehicle':
        return this.garnir(SRV.test(String(ev.Type || '')) ? 'srv' : 'chasseur');
      // Un véhicule sorti : il y en avait donc un
      case 'LaunchSRV':
        return this.garnir('srv');
      case 'LaunchFighter':
        return this.garnir('chasseur');
      case 'Undocked':
        return { decollage: true };
      case 'Docked':
        return { change: true };
      default:
        return null;
    }
  }

  /** Les hangars de ce genre du vaisseau actuel sont garnis (`genre` absent : tous). */
  garnir(genre = null) {
    const s = this.ships.get(this.shipId);
    if (!s) return null;
    let change = false;
    for (const h of s.hangars.values()) {
      if ((!genre || h.genre === genre) && h.vide !== false) {
        h.vide = false;
        change = true;
      }
    }
    return change ? { change: true } : null;
  }

  /** Hangars achetés et jamais garnis du vaisseau actuel : { shipId, vaisseau, hangars: [{ slot, nom, genre }] }, ou null. */
  vides() {
    const s = this.ships.get(this.shipId);
    if (!s) return null;
    const hangars = [...s.hangars].filter(([, h]) => h.vide === true).map(([slot, h]) => ({ slot, nom: h.nom, genre: h.genre }));
    return hangars.length ? { shipId: this.shipId, vaisseau: s.nom, hangars } : null;
  }

  /** Le vaisseau actuel et ses hangars, pour la page de diagnostic. */
  vue() {
    const s = this.ships.get(this.shipId);
    return { shipId: this.shipId, vaisseau: s?.nom ?? null, hangars: s ? [...s.hangars].map(([slot, h]) => ({ slot, nom: h.nom, genre: h.genre, vide: h.vide })) : [] };
  }
}
