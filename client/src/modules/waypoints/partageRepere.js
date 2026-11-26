// Partage d'un repère avec l'escadron : son type (Rhino, minage en vaisseau, site gardien, autre) et ce qui part.
// Rhino et minage en vaisseau sont deux types séparés : chacun se règle et se lit à part.

export const GENRES_REPERES = {
  'repere-rhino': 'Minage au Rhino',
  'repere-minage': 'Minage en vaisseau',
  'repere-gardien': 'Site gardien',
  repere: 'Autre repère',
};
export const TYPES_REPERES = Object.keys(GENRES_REPERES);

/** Minage posé au sol (Rhino : en SRV, ou un EEP avec ses foreuses), minage en vaisseau, site gardien, ou autre repère. */
export function genreRepere(w) {
  if (w.category === 'guardian') return 'repere-gardien';
  if (w.category !== 'mining') return 'repere';
  return w.vehicle === 'srv' || w.drills != null || w.siteNumber != null ? 'repere-rhino' : 'repere-minage';
}

const CHAMPS = ['label', 'category', 'notes', 'siteNumber', 'drills', 'system', 'systemAddress', 'body', 'station', 'latitude', 'longitude', 'altitude', 'heading', 'planetRadius', 'vehicle'];

/** Ce qui part : le lieu et ta description. Ni identifiant, ni dates, ni « tari » ou « pas rentable » (ton suivi à toi). */
export function donneesRepere(w) {
  const d = {};
  for (const c of CHAMPS) if (w[c] != null && w[c] !== '') d[c] = w[c];
  return d;
}

/** Une ligne pour dire où c'est : « Système Test 2 a · Système Test · EEP 3, 4 foreuses ». */
export function lieuRepere(d) {
  const site = [d.siteNumber != null ? `EEP ${d.siteNumber}` : null, d.drills != null ? `${d.drills} foreuse${d.drills > 1 ? 's' : ''}` : null].filter(Boolean).join(', ');
  return [d.body || d.station, d.system, site].filter(Boolean).join(' · ');
}
