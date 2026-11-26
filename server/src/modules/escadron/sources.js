// Ce que le partage sait lire chez les autres modules, par leur API locale (jamais leur code) : pour chaque type, d'où
// viennent les objets du joueur et ce qui part. Sert au partage automatique, et au bouton « Partager » des builds et
// des routes commerciales (le contenu est composé ici, pas par la page). Pour les repères, la page compose le sien
// avec les mêmes règles (client/src/modules/waypoints/partageRepere.js) : à tenir ensemble.

/**
 * Types proposés au partage automatique, dans l'ordre des réglages. Les builds n'y sont pas, exprès : un build se
 * partage à la main, un par un (on en garde beaucoup de brouillons et d'essais).
 */
export const TYPES_AUTO = {
  'repere-rhino': 'Repères de minage au Rhino',
  'repere-minage': 'Repères de minage en vaisseau',
  'repere-gardien': 'Sites gardiens',
  repere: 'Autres repères',
  'route-commerce': 'Routes commerciales',
};

const CHAMPS_REPERE = ['label', 'category', 'notes', 'siteNumber', 'drills', 'system', 'systemAddress', 'body', 'station', 'latitude', 'longitude', 'altitude', 'heading', 'planetRadius', 'vehicle'];
const MAX_ROUTES = 30; // routes commerciales lues par passage (une lecture par route)
const txt = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const nombre = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Minage posé au sol (Rhino : en SRV, ou un EEP avec ses foreuses), minage en vaisseau, site gardien, ou autre repère. */
export function genreRepere(w) {
  if (w.category === 'guardian') return 'repere-gardien';
  if (w.category !== 'mining') return 'repere';
  return w.vehicle === 'srv' || w.drills != null || w.siteNumber != null ? 'repere-rhino' : 'repere-minage';
}

/**
 * Repères du joueur → objets partageables. Un repère « pas rentable » ou sans système n'est pas proposé : il ne sert
 * à personne. Ni identifiant interne dans le contenu, ni dates, ni suivi personnel (tari, pas rentable).
 */
export function reperesPartageables(liste) {
  const objets = [];
  for (const w of Array.isArray(liste) ? liste : []) {
    if (!w || typeof w !== 'object' || !Number.isInteger(w.id) || typeof w.label !== 'string' || !w.label.trim() || !w.system || w.unprofitable) continue;
    const data = {};
    for (const c of CHAMPS_REPERE) if (w[c] != null && w[c] !== '') data[c] = w[c];
    objets.push({ kind: genreRepere(w), ref: String(w.id), title: w.label.trim().slice(0, 80), data });
  }
  return objets;
}

/**
 * Builds du joueur → objets partageables : le vaisseau et ses modules, avec leurs modifications. Ni le vaisseau réel
 * visé (gameShipId), ni le commandant, ni les dates. Celui qui le reçoit l'enregistre par l'API du Constructeur, qui
 * le revérifie en entier.
 */
export function buildsPartageables(liste) {
  const objets = [];
  for (const b of Array.isArray(liste) ? liste : []) {
    if (!b || typeof b !== 'object' || !Number.isInteger(b.id) || !txt(b.name, 200) || !Number.isInteger(b.shipId) || !b.slots || typeof b.slots !== 'object') continue;
    const data = { name: b.name.trim().slice(0, 120), shipId: b.shipId, slots: b.slots };
    if (txt(b.shipType, 60)) data.shipType = b.shipType;
    if (txt(b.ship, 60)) data.ship = b.ship;
    if (txt(b.notes, 1000)) data.notes = b.notes.trim().slice(0, 1000);
    objets.push({ kind: 'build', ref: String(b.id), title: data.name.slice(0, 80), data });
  }
  return objets;
}

/**
 * Fiche d'une route commerciale (GET /routes/:id) → objet partageable : les stations dans l'ordre, ce qu'on y achète
 * et vend avec le dernier prix connu, les sauts, et ce qu'elle rapporte en moyenne. Ni l'objectif du joueur, ni son
 * solde, ni le détail de ses boucles. Une route se suit depuis ses propres journaux : celui qui la reçoit la lit,
 * la fait une fois en jeu, puis la crée chez lui.
 */
export function routePartageable(vue) {
  const s = vue?.structure;
  const route = vue?.route;
  if (!s || !route || !Number.isInteger(route.id) || !txt(route.name, 200) || !txt(s.startStation, 120) || !Array.isArray(s.stops)) return null;
  const prix = new Map((vue.stats?.trends ?? []).map((t) => [t.commodity, t]));
  const marchandise = (g, cote) => (g ? { name: String(g.name ?? g.commodity ?? '').slice(0, 60), prix: nombre(prix.get(g.commodity)?.[cote === 'achat' ? 'lastBuy' : 'lastSell']) ?? nombre(g.price) } : null);
  const trajet = (leg) => (leg ? { sauts: Array.isArray(leg.jumps) ? leg.jumps.length : null, distance: nombre(leg.distance) } : null);
  const plateforme = (station) => txt((s.stations ?? []).find((x) => x?.station === station)?.pad, 2);
  const principale = (k) => s.legCommodities?.[k]?.commodity;
  const etapes = s.stops.slice(0, 8).map((stop, k) => ({
    system: String(stop.system ?? '').slice(0, 120), station: String(stop.station ?? '').slice(0, 120), pad: txt(stop.pad, 2),
    trajet: trajet(s.legs?.[k]),
    vend: marchandise((stop.sells ?? []).find((g) => g.commodity === principale(k)) ?? stop.sells?.[0], 'vente'),
    achete: marchandise(stop.buys?.[0], 'achat'),
  }));
  const dernier = (s.legs?.length ?? 0) - 1;
  const data = {
    name: route.name.trim().slice(0, 120),
    depart: { system: String(s.startSystem ?? '').slice(0, 120), station: s.startStation.slice(0, 120), pad: plateforme(s.startStation), achete: marchandise(s.start?.buys?.[0], 'achat') },
    etapes,
    retour: {
      trajet: trajet(s.legs?.[dernier]),
      vend: marchandise((s.arrival?.sells ?? []).find((g) => g.commodity === principale((s.legCommodities?.length ?? 0) - 1)) ?? s.arrival?.sells?.[0], 'vente'),
    },
    sautsParBoucle: nombre(s.jumpsPerLoop),
    sautLePlusLong: nombre(s.longestJump),
    gainMoyen: nombre(vue.stats?.avgNet),
    minutesMoyennes: nombre(vue.stats?.avgMinutes),
    // Tonnage de la marchandise principale à la détection de la boucle (la soute du vaisseau du moment n'en dit rien)
    soute: nombre(s.start?.buys?.[0]?.count),
    boucles: nombre(vue.stats?.loopsCount),
    releveLe: txt(vue.loops?.[0]?.endAt, 40) ?? txt(route.createdAt, 40),
  };
  return { kind: 'route-commerce', ref: String(route.id), title: data.name.slice(0, 80), data };
}

/**
 * Les sources : les types qu'elles donnent, et comment les lire. `lire(get)` : `get(chemin)` rend le JSON de l'API
 * locale, ou null si le module n'est pas dans cette version (404).
 */
export const SOURCES = [
  {
    kinds: ['repere-rhino', 'repere-minage', 'repere-gardien', 'repere'],
    lire: async (get) => reperesPartageables(await get('/api/modules/waypoints/waypoints')),
  },
  {
    kinds: ['build'],
    lire: async (get) => buildsPartageables(await get('/api/modules/builder/builds')),
  },
  {
    kinds: ['route-commerce'],
    lire: async (get) => {
      const liste = await get('/api/modules/routes/routes');
      const objets = [];
      for (const r of (Array.isArray(liste) ? liste : []).slice(0, MAX_ROUTES)) {
        if (!Number.isInteger(r?.id)) continue;
        const o = routePartageable(await get(`/api/modules/routes/routes/${r.id}`));
        if (o) objets.push(o);
      }
      return objets;
    },
  },
];

/** Lit les objets du joueur pour ces types (tous si `kinds` est vide), source par source. */
export async function lireSources(get, kinds) {
  const voulus = Array.isArray(kinds) && kinds.length ? new Set(kinds) : null;
  const objets = [];
  for (const s of SOURCES) {
    if (voulus && !s.kinds.some((k) => voulus.has(k))) continue;
    objets.push(...(await s.lire(get)).filter((o) => !voulus || voulus.has(o.kind)));
  }
  return objets;
}
