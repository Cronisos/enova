// Carte d'un site gardien, faite par le joueur : les points qu'il marque sur place (pylônes, machine, reliques), avec
// leurs coordonnées. Pur : le stockage est un simple objet, lu et écrit par index.js (gardiens-points.json).
//
// Un site est reconnu par son corps et sa forme (« ancient_small_002 ») : deux sites sur le même corps ne se mélangent pas.

import { PYLONES_RELEVES } from './guides.js';

// Panneau : panneau ou pilier destructible (matériaux dedans) ; sentinelle : endroit où il en sort une ; matériau : tout
// autre chose à ramasser.
export const TYPES_POINT = Object.freeze({ pylone: 'Pylône', machine: 'Machine', relique: 'Relique', panneau: 'Panneau', sentinelle: 'Sentinelle', materiau: 'Matériau' });
const MAX_POINTS = 40;

const norme = (s) => String(s ?? '').trim().toLowerCase();
export const cleSite = (corps, forme) => `${norme(corps)}|${norme(forme)}`;
const nombre = (v, min, max) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null);

/** Point lu ou reçu, vérifié : { id, type, n, latitude, longitude }, ou null. */
function pointPropre(p) {
  if (!p || typeof p !== 'object' || !Object.hasOwn(TYPES_POINT, p.type)) return null;
  const latitude = nombre(p.latitude, -90, 90);
  const longitude = nombre(p.longitude, -180, 180);
  if (latitude == null || longitude == null || !Number.isInteger(p.id) || p.id < 1) return null;
  const cle = typeof p.cle === 'string' && /^[a-z0-9-]{1,30}$/.test(p.cle) ? p.cle : null;
  return { id: p.id, type: p.type, n: Number.isInteger(p.n) && p.n > 0 ? p.n : null, latitude, longitude, ...(cle ? { cle, nom: String(p.nom || cle).slice(0, 40) } : {}) };
}

export class PointsSites {
  /** @param donnees contenu du fichier : { sites: { clé: { corps, forme, points: [...] } } } */
  constructor(donnees) {
    this.sites = new Map();
    const lus = donnees && typeof donnees === 'object' && donnees.sites && typeof donnees.sites === 'object' ? donnees.sites : {};
    for (const s of Object.values(lus)) {
      if (!s || typeof s !== 'object' || typeof s.corps !== 'string') continue;
      const points = (Array.isArray(s.points) ? s.points : []).map(pointPropre).filter(Boolean).slice(0, MAX_POINTS);
      this.sites.set(cleSite(s.corps, s.forme), { corps: s.corps, forme: s.forme ?? null, rayon: nombre(s.rayon, 1, 1e9), points });
    }
  }

  /**
   * Points d'un site : ceux du joueur ; s'il n'en a marqué aucun et que le site est celui du relevé de 2018 (guides.js),
   * ces pylônes-là, marqués `releve` (à vérifier sur place, non modifiables).
   */
  de(corps, forme) {
    const miens = this.sites.get(cleSite(corps, forme))?.points ?? [];
    if (miens.length) return miens;
    if (norme(corps) === norme(`${PYLONES_RELEVES.systeme} ${PYLONES_RELEVES.corps}`)) {
      return PYLONES_RELEVES.pylones.map((p) => ({ id: -p.n, type: 'pylone', n: p.n, latitude: p.latitude, longitude: p.longitude, releve: true }));
    }
    return [];
  }

  /**
   * Marque un point à cette position. `nomme` : { cle, nom } quand c'est un point du gabarit de la carte (calage.js) ;
   * le même point marqué de nouveau remplace l'ancien. Rend le point, ou null (type inconnu, position illisible,
   * carte pleine).
   */
  ajouter(corps, forme, type, position, nomme = null) {
    const latitude = nombre(position?.latitude, -90, 90);
    const longitude = nombre(position?.longitude, -180, 180);
    if (!corps || !Object.hasOwn(TYPES_POINT, type) || latitude == null || longitude == null) return null;
    const cle = cleSite(corps, forme);
    const site = this.sites.get(cle) ?? { corps, forme: forme ?? null, rayon: null, points: [] };
    site.rayon = nombre(position?.planetRadius, 1, 1e9) ?? site.rayon ?? null;
    if (nomme) site.points = site.points.filter((p) => p.cle !== nomme.cle);
    if (site.points.length >= MAX_POINTS) return null;
    const memes = site.points.filter((p) => p.type === type && !p.cle);
    const point = { id: Math.max(0, ...site.points.map((p) => p.id)) + 1, type, n: type === 'machine' || nomme ? null : memes.length + 1, latitude, longitude, ...(nomme ? { cle: nomme.cle, nom: nomme.nom } : {}) };
    // Une seule machine par site : la nouvelle remplace l'ancienne
    if (type === 'machine') site.points = site.points.filter((p) => p.type !== 'machine');
    site.points.push(point);
    this.sites.set(cle, site);
    return point;
  }

  /** Retire un point (les suivants du même type sont renumérotés). Rend true s'il existait. */
  retirer(corps, forme, id) {
    const site = this.sites.get(cleSite(corps, forme));
    const p = site?.points.find((x) => x.id === id);
    if (!p) return false;
    site.points = site.points.filter((x) => x.id !== id);
    let n = 0;
    for (const x of site.points) if (x.type === p.type && x.type !== 'machine' && !x.cle) x.n = (n += 1);
    return true;
  }

  /**
   * Change le type d'un point (marqué « relique » là où le schéma a un pylône, par exemple) ; les numéros des deux types
   * sont refaits. Rend true si le point existait et a changé.
   */
  corriger(corps, forme, id, type) {
    const site = this.sites.get(cleSite(corps, forme));
    const p = site?.points.find((x) => x.id === id);
    if (!p || !Object.hasOwn(TYPES_POINT, type) || p.type === type) return false;
    if (type === 'machine') site.points = site.points.filter((x) => x.type !== 'machine');
    p.type = type;
    for (const t of Object.keys(TYPES_POINT)) {
      let n = 0;
      for (const x of site.points) if (x.type === t && !x.cle) x.n = t === 'machine' ? null : (n += 1);
    }
    return true;
  }

  /** Retire le dernier point marqué. */
  annuler(corps, forme) {
    const dernier = this.sites.get(cleSite(corps, forme))?.points.at(-1);
    return dernier ? this.retirer(corps, forme, dernier.id) : false;
  }

  /** Rayon de la planète du site, relevé au dernier marquage (pour caler la carte), ou null. */
  rayon(corps, forme) {
    return this.sites.get(cleSite(corps, forme))?.rayon ?? null;
  }

  /** Contenu à enregistrer. */
  donnees() {
    return { sites: Object.fromEntries([...this.sites].filter(([, s]) => s.points.length)) };
  }
}
