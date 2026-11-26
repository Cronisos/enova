// Session de livraison Powerplay : les ressources allouées par ta puissance (dossiers de presse, contrats sous scellé,
// programmes…), chargées chez elle puis livrées dans un système, et les mérites que ça rapporte.
// Une session commence au lancement du jeu (LoadGame) ou à une remise à zéro.
//
// Mesuré dans le journal du 19 nov. 2026 (Aisling Duval) :
//   PowerplayCollect { Power, Type: "aislingmediamaterials", Type_Localised: "Dossiers de presse d'Aisling", Count: 99 }
//   PowerplayDeliver { Power, Type, Type_Localised, Count: 268 }
//   PowerplayMerits  { MeritsGained: 1608, TotalMerits } à la même seconde que la livraison

import { MeritCounter } from '../../core/merits.js';
import { MEMOIRE_MS, tranche } from './grille.js';

export const DELIVERY_EVENTS = ['LoadGame', 'Died', 'Powerplay', 'PowerplayCollect', 'PowerplayDeliver', 'PowerplayMerits'];

// Mérites comptés pour une livraison : ceux qui arrivent juste après elle (même règle que le Sauvetage). Le journal du
// 19 nov. les donne à la même seconde ; 10 s laissent de la marge sans prendre ceux d'une autre activité.
export const MERIT_WINDOW_MS = 10_000;
// Ressources allouées : un quota par tranche fixe de 30 minutes (grille.js : ce que les journaux en montrent, et
// comment la grille des tranches est déduite des chargements).
export const QUOTA_WINDOW_MS = 30 * 60_000;
const RECENT = 20;
const lower = (s) => String(s || '').toLowerCase();
const tons = (n) => (Number.isInteger(n) && n > 0 ? n : 0);

export class PowerDeliveryState {
  constructor() {
    this.counter = new MeritCounter(); // total du jeu : ne repart pas de zéro avec la session
    // Ressources Powerplay déjà vues (nom interne → nom affiché) : gardées d'une session à l'autre, pour reconnaître
    // en soute une cargaison chargée avant la remise à zéro
    this.connues = new Map();
    // Période d'allocation en cours : celle du jeu, pas de la session (une remise à zéro ne rend pas le droit de charger)
    this.prises = []; // chargements récents [{ t (ms), n (tonnes) }], dans l'ordre : de quoi retrouver la tranche
    this.reset(null);
  }

  reset(startedAt) {
    this.startedAt = startedAt;
    this.collected = 0;
    this.delivered = 0;
    this.merits = 0;
    this.deaths = 0;
    this.byType = new Map(); // nom interne → { label, collected, delivered, merits }
    this.recent = []; // derniers chargements et livraisons, du plus récent au plus ancien
    this.lastDeliveryAt = null;
    this.lastActionAt = null;
  }

  type(ev) {
    const key = lower(ev.Type);
    const label = String(ev.Type_Localised || ev.Type || '').slice(0, 80);
    if (key) this.connues.set(key, label);
    if (!this.byType.has(key)) this.byType.set(key, { label, collected: 0, delivered: 0, merits: 0 });
    return this.byType.get(key);
  }

  apply(ev) {
    switch (ev.event) {
      case 'LoadGame':
        this.reset(ev.timestamp);
        break;
      case 'Powerplay':
        this.counter.setTotal(ev.Merits);
        return false;
      case 'PowerplayCollect': {
        const n = tons(ev.Count);
        if (!ev.Type || !n) return false;
        const t = this.type(ev);
        t.collected += n;
        this.collected += n;
        const quand = Date.parse(ev.timestamp);
        if (Number.isFinite(quand)) {
          this.prises.push({ t: quand, n });
          // Seuls les chargements récents disent quelque chose de la grille d'aujourd'hui
          while (this.prises.length > 1 && quand - this.prises[0].t > MEMOIRE_MS) this.prises.shift();
        }
        this.log(ev, 'Chargé', t.label, n);
        break;
      }
      case 'PowerplayDeliver': {
        const n = tons(ev.Count);
        if (!ev.Type || !n) return false;
        const t = this.type(ev);
        t.delivered += n;
        this.delivered += n;
        this.lastDeliveryAt = Date.parse(ev.timestamp);
        this.log(ev, 'Livré', t.label, n);
        break;
      }
      case 'PowerplayMerits': {
        const gained = this.counter.gain(ev); // doublons du journal retirés
        if (this.lastDeliveryAt == null || Date.parse(ev.timestamp) - this.lastDeliveryAt > MERIT_WINDOW_MS) return false;
        this.merits += gained;
        const derniere = this.recent.find((r) => r.kind === 'Livré');
        if (derniere) {
          derniere.merits += gained;
          const t = this.byType.get(derniere.type);
          if (t) t.merits += gained;
        }
        break;
      }
      case 'Died':
        this.deaths += 1;
        break;
      default:
        return false;
    }
    return true;
  }

  log(ev, kind, label, count) {
    this.lastActionAt = ev.timestamp;
    this.recent.unshift({ at: ev.timestamp, kind, type: lower(ev.Type), label, count, merits: 0 });
    if (this.recent.length > RECENT) this.recent.length = RECENT;
  }

  /** @param cargo soute actuelle [{ name, label, count }] (Cargo.json) */
  summary(cargo = []) {
    const items = (Array.isArray(cargo) ? cargo : [])
      .filter((c) => this.connues.has(lower(c?.name)) && c.count > 0)
      .map((c) => ({ label: c.label || this.connues.get(lower(c.name)) || c.name, count: c.count }));
    return {
      startedAt: this.startedAt,
      collected: this.collected,
      delivered: this.delivered,
      merits: this.merits,
      deaths: this.deaths,
      hold: { count: items.reduce((a, c) => a + c.count, 0), items },
      // Tranche d'allocation : ce qui y a été pris et depuis quand, quand on pourra recharger (nextAt), et si la
      // grille est connue (sure) ou si nextAt est seulement « au plus tard »
      quota: tranche(this.prises),
      types: [...this.byType.values()].sort((a, b) => b.delivered - a.delivered || b.collected - a.collected),
      lastActionAt: this.lastActionAt,
      recent: this.recent.map(({ type, ...r }) => r),
    };
  }
}
