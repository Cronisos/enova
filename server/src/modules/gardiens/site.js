// Site gardien en vue : le jeu écrit « ApproachSettlement » à l'approche, avec un nom interne en « $Ancient… » (ruines et
// structures des Gardiens), le corps et les coordonnées du site. Pur : les événements sont donnés un par un.
//
// Relevé du 22 nov. 2026 (journal de l'auteur) : « $Ancient_Small_002:#index=1; », « Structure des Guardians », sur
// Synuefe EU-Q c21-10 A 3 (le site des plans d'arme), à 19,8236 / −82,4609. Ces coordonnées ne sont pas celles de la
// liste de 2018 pour ce corps : la liste est à prendre comme une piste, le journal fait foi.
//
// Le site n'est PAS oublié au retour au menu : relancer le jeu est la façon de refaire un site. Il l'est en quittant la
// planète (LeaveBody), en repassant en supercruise ou en sautant.

import { GUIDES, PLAN_DES_SITES } from './guides.js';

export const SITE_EVENTS = ['ApproachSettlement', 'LeaveBody', 'SupercruiseEntry', 'FSDJump', 'CarrierJump'];
const GARDIEN = /^\$ancient/i;

/** « $Ancient_Small_002:#index=1; » → « ancient_small_002 » : la forme du site (plusieurs sites partagent la même). */
export const formeDe = (nom) => /^\$([a-z0-9_]+)/i.exec(String(nom || ''))?.[1].toLowerCase() ?? null;

/** Type de plan d'un site : par son corps quand on le connaît (guides.js), sinon null. */
export function planDuCorps(corps) {
  const c = String(corps || '').trim().toLowerCase();
  for (const [cle, plan] of Object.entries(PLAN_DES_SITES)) if (cle.replace('|', ' ').toLowerCase() === c) return plan;
  for (const g of GUIDES) if (`${g.systeme} ${g.corps}`.toLowerCase() === c) return g.plan;
  return null;
}

export class SiteState {
  constructor() {
    this.site = null; // { nom, forme, corps, latitude, longitude, plan, at }
  }

  /** Rend true quand le site en vue a changé. */
  apply(ev) {
    if (ev.event === 'ApproachSettlement') {
      if (!GARDIEN.test(String(ev.Name || ''))) return false;
      const nombre = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
      const site = {
        nom: String(ev.Name_Localised || 'Site gardien').slice(0, 80),
        forme: formeDe(ev.Name),
        corps: String(ev.BodyName || '').slice(0, 120),
        latitude: nombre(ev.Latitude),
        longitude: nombre(ev.Longitude),
        plan: planDuCorps(ev.BodyName),
        at: ev.timestamp,
      };
      const meme = this.site && this.site.corps === site.corps && this.site.forme === site.forme;
      this.site = site;
      return !meme;
    }
    if (!this.site) return false;
    this.site = null; // planète quittée, supercruise ou saut
    return true;
  }

  /** Le site en vue et son guide (carte, étapes) quand on connaît son type de plan. */
  vue() {
    const guide = this.site?.plan ? GUIDES.find((g) => g.plan === this.site.plan) ?? null : null;
    return { site: this.site, guide };
  }
}
