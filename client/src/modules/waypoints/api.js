// Appels API du module Mes repères.

import { api } from '../../core/api.js';
import { discordName } from '../../core/discord.js';

const base = '/modules/waypoints';

export const wpApi = {
  categories: () => api(`${base}/categories`),
  here: () => api(`${base}/here`),
  list: () => api(`${base}/waypoints`),
  mark: (body = {}) => api(`${base}/waypoints`, { method: 'POST', body }),
  brouillon: () => api(`${base}/waypoints/brouillon`, { method: 'POST' }),
  validerBrouillon: (body) => api(`${base}/waypoints/brouillon/valider`, { method: 'POST', body }),
  update: (id, body) => api(`${base}/waypoints/${id}`, { method: 'PATCH', body }),
  remove: (id) => api(`${base}/waypoints/${id}`, { method: 'DELETE' }),
  // Repère reçu de l'escadron, copié chez soi : ses coordonnées sont celles données, pas la position actuelle
  importer: (repere) => api(`${base}/waypoints/importer`, { method: 'POST', body: repere }),
  guide: (id) => api(`${base}/waypoints/${id}/guide`),
  // Repère suivi par la fenêtre de guidage de l'overlay
  guideTarget: () => api(`${base}/guide-target`),
  setGuideTarget: (id) => api(`${base}/guide-target`, { method: 'PUT', body: { id } }),
  // Balayage d'un EEP en SRV : centre puis bord marqués depuis ta position
  sweep: () => api(`${base}/sweep`),
  // Prix du système : Ardent seulement si les recherches automatiques sont activées, ou au clic (online) : une écriture
  // (POST, avec l'en-tête maison), qu'une lecture venue d'ailleurs (image, lien) ne peut pas imiter
  sweepMarkets: (online = false) => (online ? api(`${base}/sweep/markets/load`, { method: 'POST' }) : api(`${base}/sweep/markets`)),
  sweepTopOres: () => api(`${base}/sweep/top-ores`),
  // Guide des ressources : tes observations (journaux), sans réseau
  guide: () => api(`${base}/guide`),
  // Chercher un minerai : les endroits connus, tous systèmes confondus (base locale, sans réseau)
  chercher: () => api(`${base}/chercher`),
  sweepCenter: () => api(`${base}/sweep/center`, { method: 'POST' }),
  sweepEdge: () => api(`${base}/sweep/edge`, { method: 'POST' }),
  sweepReset: () => api(`${base}/sweep`, { method: 'DELETE' }),
  // EEP balayés : liste, carte, nom, effacement, partage (fichier de carte), import
  eeps: () => api(`${base}/eeps`),
  eepCarte: (id) => api(`${base}/eeps/${encodeURIComponent(id)}/carte`),
  eepRenommer: (id, nom) => api(`${base}/eeps/${encodeURIComponent(id)}`, { method: 'PATCH', body: { nom } }),
  eepEffacer: (id) => api(`${base}/eeps/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  eepExport: (id) => api(`${base}/eeps/${encodeURIComponent(id)}/export`),
  eepImport: (carte) => api(`${base}/eeps/import`, { method: 'POST', body: carte }),
  // Foreuses du Rhino : vidanges vues dans le journal, pose marquée ici, boussole vers la prochaine à vider
  drills: () => api(`${base}/drills`),
  drillPlace: () => api(`${base}/drills`, { method: 'POST' }),
  drillRemove: (n) => api(`${base}/drills/${encodeURIComponent(n)}`, { method: 'DELETE' }),
  drillsClear: () => api(`${base}/drills`, { method: 'DELETE' }),
  drillSettings: (body) => api(`${base}/drills/settings`, { method: 'PUT', body }),
  drillGuide: () => api(`${base}/drills/guide`),
  setDrillGuide: (target) => api(`${base}/drills/guide`, { method: 'PUT', body: { target } }),
  session: () => api(`${base}/session`),
  sessions: () => api(`${base}/sessions`),
  startSession: (id) => api(`${base}/waypoints/${id}/session`, { method: 'POST' }),
  endSession: () => api(`${base}/session/end`, { method: 'POST' }),
  resetSession: () => api(`${base}/session/reset`, { method: 'POST' }),
  resumeSession: (id) => api(`${base}/sessions/${id}/resume`, { method: 'POST' }),
  // Prospection : planètes à EEP d'un système (le système où l'on est par défaut) et ce qu'on y a vu
  // Spansh : seulement si les recherches automatiques sont activées, ou au clic sur « Charger depuis Spansh » (online) :
  // une écriture (POST /survey/load, avec l'en-tête maison), qu'une lecture venue d'ailleurs (image, lien) ne peut pas imiter
  survey: (system, systemAddress, online = false) => {
    if (online) return api(`${base}/survey/load`, { method: 'POST', body: system ? { system, systemAddress: systemAddress || '' } : {} });
    const s = new URLSearchParams(system ? { system, systemAddress: systemAddress || '' } : {}).toString();
    return api(`${base}/survey${s ? `?${s}` : ''}`);
  },
  // Recherches en ligne automatiques (Spansh, Ardent, avec le système où tu es) : { auto, asked }
  online: () => api(`${base}/online`),
  setOnline: (auto) => api(`${base}/online`, { method: 'PUT', body: { auto } }),
  surveySystems: () => api(`${base}/survey/systems`),
  saveSite: (body) => api(`${base}/survey/site`, { method: 'PUT', body }),
  saveBody: (body) => api(`${base}/survey/body`, { method: 'PUT', body }),
  // Captures du cadre de l'overlay : image et texte lu
  capture: (shot) => api(`${base}/captures`, { method: 'POST', body: shot }),
  captures: () => api(`${base}/captures`),
  removeCapture: (id) => api(`${base}/captures/${id}`, { method: 'DELETE' }),
  captureImage: (id) => `/api${base}/captures/${id}.png`,
};

const VEHICLES = { ship: 'vaisseau', srv: 'SRV', onfoot: 'à pied', fighter: 'chasseur' };
export const vehicleLabel = (v) => VEHICLES[v] || '';

/** « 57,5307 / −88,6966 » */
export const coords = (lat, lon) =>
  lat == null ? null : `${lat.toLocaleString('fr-FR', { maximumFractionDigits: 4 })} / ${lon.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}`;

/** Distance lisible : « 850 m », « 12,4 km » */
export function meters(d) {
  if (d == null) return '—';
  return d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
}

/**
 * Texte à coller dans Discord. Les noms (repère, corps, station, système) passent par discordName (core/discord.js) :
 * ni mention ni mise en forme ; les notes restent telles que tu les as écrites.
 */
export function discordText(w) {
  const where = [w.body || w.station, w.system].filter(Boolean).map((n) => discordName(n)).join(' · ');
  const site = `${w.siteNumber != null ? ` EEP ${w.siteNumber}` : ''}${w.drills != null ? `, ${w.drills} foreuse${w.drills > 1 ? 's' : ''}` : ''}`;
  const lines = [`**${discordName(w.label)}** (${discordName(w.categoryLabel)}${site})`, where];
  if (w.latitude != null) lines.push(`Lat ${w.latitude.toFixed(4)} / Lon ${w.longitude.toFixed(4)}`);
  if (w.notes) lines.push(w.notes);
  return lines.join('\n');
}
