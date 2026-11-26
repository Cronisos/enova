// Session du mode « Gardiens » : ce que tu ramasses sur les sites (matériaux gardiens, données d'obélisque, segments de
// plan), d'après MaterialCollected. Elle ne repart PAS à zéro au lancement du jeu : revenir au menu puis relancer est
// justement la façon de refaire un site. Elle repart quand on passe au mode, ou au bouton.

import { INGREDIENTS } from './recettes.js';

export const GARDIENS_EVENTS = ['MaterialCollected'];
const RECENT = 12;
const PLANS = new Set(['guardian_weaponblueprint', 'guardian_moduleblueprint', 'guardian_vesselblueprint']);

/** Ce matériau vient-il des Gardiens (site, sentinelle, obélisque) ? Les matières premières et le reste : non. */
export function estGardien(nom) {
  const i = INGREDIENTS[String(nom || '').toLowerCase()];
  return Boolean(i && (i.genre === 'gardien' || i.genre === 'donnees'));
}

export class GardiensState {
  constructor() {
    this.reset(null);
  }

  reset(startedAt) {
    this.startedAt = startedAt;
    this.parCle = new Map(); // nom interne → quantité ramassée
    this.recent = [];
  }

  apply(ev) {
    if (ev.event !== 'MaterialCollected') return false;
    const cle = String(ev.Name || '').toLowerCase();
    if (!estGardien(cle)) return false;
    const count = Number.isFinite(ev.Count) && ev.Count > 0 ? ev.Count : 0;
    if (!count) return false;
    if (!this.startedAt) this.startedAt = ev.timestamp; // la session démarre au premier matériau gardien
    this.parCle.set(cle, (this.parCle.get(cle) || 0) + count);
    this.recent.unshift({ at: ev.timestamp, cle, count });
    if (this.recent.length > RECENT) this.recent.length = RECENT;
    return true;
  }

  summary() {
    const collectes = [...this.parCle].map(([cle, count]) => ({ cle, count })).sort((a, b) => b.count - a.count);
    const somme = (filtre) => collectes.filter(filtre).reduce((n, c) => n + c.count, 0);
    return {
      startedAt: this.startedAt,
      total: somme(() => true),
      plans: somme((c) => PLANS.has(c.cle)),
      donnees: somme((c) => INGREDIENTS[c.cle].genre === 'donnees'),
      collectes,
      recent: this.recent,
    };
  }
}
