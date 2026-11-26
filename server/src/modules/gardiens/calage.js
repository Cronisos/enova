// Caler une carte sur le terrain : on connaît la place de chaque point sur une carte vue du dessus (en pixels), le joueur
// en marque deux ou plus sur place (coordonnées du jeu), et on en déduit où sont les autres. Pur.
//
// Gabarits : positions relevées à l'œil (± 10 pixels) sur les cartes de la communauté, le 22 nov. 2026. Seules ces
// positions sont reprises, pas les images.
//   - arme : carte du site de Synuefe EU-Q c21-10 A 3 (image NovaForce, parcours CMDR Cal Dallicort), 960 × 720 ;
//   - module : carte du site de Synuefe NL-N c23-4 B 3 (CMDR Cal Dallicort), 1423 × 1025.
// Le numéro d'un pylône (n) est son rang dans l'ordre de charge conseillé par le guide (guides.js).
// On suppose la carte vue d'aplomb et non retournée (une photo aérienne) : échelle, rotation et décalage suffisent.
// Précision attendue : 10 à 30 m. Un point calculé n'est qu'une indication, remplacé dès qu'il est marqué sur place.

const RAD = Math.PI / 180;

export const GABARITS = Object.freeze({
  arme: Object.freeze([
    { cle: 'machine', type: 'machine', nom: 'Machine', x: 443, y: 57 },
    { cle: 'principal-g', n: 2, type: 'pylone', nom: 'Principal gauche', x: 420, y: 125 },
    { cle: 'principal-d', n: 3, type: 'pylone', nom: 'Principal droit', x: 464, y: 125 },
    { cle: 'gauche', n: 4, type: 'pylone', nom: 'Gauche', x: 110, y: 72 },
    { cle: 'droite', n: 1, type: 'pylone', nom: 'Droite', x: 806, y: 131 },
    { cle: 'centre', n: 5, type: 'pylone', nom: 'Centre', x: 437, y: 330 },
    { cle: 'arriere', n: 6, type: 'pylone', nom: 'Arrière', x: 80, y: 599 },
    // Relique « juste derrière le pylône de gauche » (guide) : place déduite du relevé en jeu du 22 nov. 2026
    { cle: 'relique-gauche', type: 'relique', nom: 'derrière le pylône Gauche', x: 104, y: 56 },
    // Trois autres reliques marquées en jeu le même jour, reportées sur la carte
    { cle: 'relique-zone', type: 'relique', nom: 'près de la zone de pose', x: 260, y: 288 },
    { cle: 'relique-bas', type: 'relique', nom: 'en bas, au centre', x: 433, y: 533 },
    { cle: 'relique-droite', type: 'relique', nom: 'au centre droit', x: 613, y: 397 },
    // Panneaux destructibles (matériaux) : six seuls autour du centre, puis quatre groupes en bas (trois par groupe,
    // un seul pour le dernier), d'après les pastilles vertes et jaunes de la carte
    { cle: 'panneau-1', type: 'panneau', nom: 'centre', x: 402, y: 262 },
    { cle: 'panneau-2', type: 'panneau', nom: 'centre', x: 545, y: 265 },
    { cle: 'panneau-3', type: 'panneau', nom: 'centre', x: 360, y: 344 },
    { cle: 'panneau-4', type: 'panneau', nom: 'centre', x: 507, y: 347 },
    { cle: 'panneau-5', type: 'panneau', nom: 'centre', x: 347, y: 390 },
    { cle: 'panneau-6', type: 'panneau', nom: 'centre', x: 403, y: 387 },
    { cle: 'panneau-7', type: 'panneau', nom: 'bas, 3 panneaux', x: 367, y: 458 },
    { cle: 'panneau-8', type: 'panneau', nom: 'bas, 3 panneaux', x: 497, y: 458 },
    { cle: 'panneau-9', type: 'panneau', nom: 'bas, 3 panneaux', x: 340, y: 580 },
    { cle: 'panneau-10', type: 'panneau', nom: 'tout en bas', x: 395, y: 673 },
    // Sentinelles qui sortent à l'approche (pastilles rouges de la carte) : près des pylônes Gauche, Droite et Arrière
    { cle: 'sentinelle-g', type: 'sentinelle', nom: 'près du pylône Gauche', x: 141, y: 102 },
    { cle: 'sentinelle-d', type: 'sentinelle', nom: 'près du pylône Droite', x: 796, y: 157 },
    { cle: 'sentinelle-a', type: 'sentinelle', nom: 'près du pylône Arrière', x: 118, y: 632 },
  ]),
  module: Object.freeze([
    { cle: 'machine', type: 'machine', nom: 'Machine', x: 480, y: 125 },
    { cle: 'declencheur', n: 1, type: 'pylone', nom: 'Déclencheur', x: 480, y: 212 },
    { cle: 'structure-g', n: 2, type: 'pylone', nom: 'Structure gauche', x: 385, y: 317 },
    { cle: 'structure-d', n: 3, type: 'pylone', nom: 'Structure droite', x: 551, y: 317 },
    { cle: 'bas-centre', n: 4, type: 'pylone', nom: 'Bas centre', x: 465, y: 592 },
    { cle: 'patte-d', n: 5, type: 'pylone', nom: 'Patte droite', x: 669, y: 787 },
    { cle: 'patte-g', n: 6, type: 'pylone', nom: 'Patte gauche', x: 240, y: 767 },
  ]),
});

/**
 * Échelle connue d'une carte, en mètres par pixel : [min, max]. Mesurée en jeu le 22 nov. 2026 pour le site des plans
 * d'arme (pylône Centre et pylônes principaux à 165 m, soit 205 pixels : 0,8 m par pixel), avec 25 % de marge. Sans
 * mesure, toute échelle plausible est essayée (reconnaitre).
 */
export const ECHELLES = Object.freeze({ arme: Object.freeze([0.6, 1.05]) });

/** Deux repères plus proches que ça sur le terrain ne calent rien de fiable (l'orientation serait au hasard). */
export const ECART_MIN_M = 40;

/**
 * @param gabarit [{ cle, x, y, … }]
 * @param reperes [{ cle, latitude, longitude }] : points du gabarit marqués sur place
 * @param rayon rayon de la planète (m)
 * @returns { points: [{ ...point du gabarit, latitude, longitude }] pour les points NON marqués, echelle (m par pixel),
 *   erreur (écart moyen des repères au calage, m) } ou null si le calage est impossible (moins de deux repères, trop
 *   proches, rayon inconnu).
 */
export function caler(gabarit, reperes, rayon) {
  if (!Array.isArray(gabarit) || !Number.isFinite(rayon) || rayon <= 0) return null;
  const parCle = new Map(gabarit.map((g) => [g.cle, g]));
  const refs = (reperes || []).filter((r) => parCle.has(r.cle) && Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
  if (refs.length < 2) return null;
  // Terrain : mètres vers l'est et le nord depuis le premier repère. Carte : x vers la droite, y vers le BAS.
  const o = refs[0];
  const k = RAD * rayon;
  const cosLat = Math.cos(o.latitude * RAD);
  const terrain = refs.map((r) => ({ e: (r.longitude - o.longitude) * k * cosLat, n: (r.latitude - o.latitude) * k }));
  const carte = refs.map((r) => ({ x: parCle.get(r.cle).x, y: -parCle.get(r.cle).y }));
  const moy = (l, c) => l.reduce((s, v) => s + v[c], 0) / l.length;
  const [mx, my, me, mn] = [moy(carte, 'x'), moy(carte, 'y'), moy(terrain, 'e'), moy(terrain, 'n')];
  // Similitude au mieux (moindres carrés) : terrain = a · carte + b, en nombres complexes a = (ar, ai)
  let [sr, si, d2] = [0, 0, 0];
  let etendue = 0;
  for (let i = 0; i < refs.length; i += 1) {
    const [px, py, te, tn] = [carte[i].x - mx, carte[i].y - my, terrain[i].e - me, terrain[i].n - mn];
    sr += px * te + py * tn;
    si += px * tn - py * te;
    d2 += px * px + py * py;
    etendue = Math.max(etendue, Math.hypot(te, tn));
  }
  if (d2 === 0 || etendue * 2 < ECART_MIN_M) return null;
  const [ar, ai] = [sr / d2, si / d2];
  const versTerrain = (x, y) => {
    const [px, py] = [x - mx, -y - my];
    return { e: me + ar * px - ai * py, n: mn + ai * px + ar * py };
  };
  const erreur = refs.reduce((s, r, i) => {
    const t = versTerrain(parCle.get(r.cle).x, parCle.get(r.cle).y);
    return s + Math.hypot(t.e - terrain[i].e, t.n - terrain[i].n);
  }, 0) / refs.length;
  const marques = new Set(refs.map((r) => r.cle));
  const points = gabarit.filter((g) => !marques.has(g.cle)).map((g) => {
    const t = versTerrain(g.x, g.y);
    return { ...g, latitude: o.latitude + t.n / k, longitude: o.longitude + t.e / (k * cosLat) };
  });
  return { points, echelle: Math.hypot(ar, ai), erreur };
}

/** Échelles plausibles d'une carte, en mètres par pixel : en dehors, l'hypothèse est écartée. */
const ECHELLE_MIN = 0.2;
const ECHELLE_MAX = 1.6;
/** Un point marqué « colle » au schéma s'il tombe à moins de ça du point prévu (m). */
export const TOLERANCE_M = 35;
/** Un point marqué avec un autre type que celui du schéma est corrigé s'il tombe à moins de ça du point prévu (m). */
export const CORRECTION_M = 20;

/**
 * Reconnaît le schéma dans des points marqués sans nom : à quel point de la carte correspond chacun ?
 * Toutes les façons de poser la carte sur deux des points marqués sont essayées (types respectés, échelle plausible) ;
 * pour chacune, les autres points marqués sont rapprochés du point de même type le plus proche. La meilleure est
 * gardée si elle colle à trois points au moins et si aucune autre ne fait aussi bien.
 * @param marques [{ id, type, latitude, longitude }] : seuls les types présents dans le schéma comptent
 * @param echelle [min, max] en mètres par pixel, quand on connaît celle de la carte (ECHELLES)
 * @returns null (pas assez de points), { ambigu: true } (plusieurs poses possibles : il faut un point de plus), ou
 *   { correspondances: { id → cle }, corrections: [{ id, de, type, cle }] (points marqués avec le mauvais type),
 *     points (calculés, pour les points du schéma non marqués), erreur, hors: [ids] }
 */
export function reconnaitre(gabarit, marques, rayon, { tolerance = TOLERANCE_M, echelle: bornes = [ECHELLE_MIN, ECHELLE_MAX] } = {}) {
  if (!Array.isArray(gabarit) || !Number.isFinite(rayon) || rayon <= 0) return null;
  const types = new Set(gabarit.map((g) => g.type));
  const pts = (marques || []).filter((m) => types.has(m.type) && Number.isFinite(m.latitude) && Number.isFinite(m.longitude));
  if (pts.length < 3) return null;
  const o = pts[0];
  const k = RAD * rayon;
  const cosLat = Math.cos(o.latitude * RAD);
  const T = pts.map((m) => ({ e: (m.longitude - o.longitude) * k * cosLat, n: (m.latitude - o.latitude) * k }));
  const C = gabarit.map((g) => ({ x: g.x, y: -g.y }));
  const poses = [];
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) {
      const [de, dn] = [T[j].e - T[i].e, T[j].n - T[i].n];
      if (Math.hypot(de, dn) < ECART_MIN_M) continue; // deux points voisins : orientation au hasard
      for (let a = 0; a < gabarit.length; a += 1) {
        for (let b = 0; b < gabarit.length; b += 1) {
          if (a === b || gabarit[a].type !== pts[i].type || gabarit[b].type !== pts[j].type) continue;
          const [dx, dy] = [C[b].x - C[a].x, C[b].y - C[a].y];
          const d2 = dx * dx + dy * dy;
          const [ar, ai] = [(dx * de + dy * dn) / d2, (dx * dn - dy * de) / d2];
          const echelle = Math.hypot(ar, ai);
          if (echelle < bornes[0] || echelle > bornes[1]) continue;
          const prevu = C.map((c) => ({ e: T[i].e + ar * (c.x - C[a].x) - ai * (c.y - C[a].y), n: T[i].n + ai * (c.x - C[a].x) + ar * (c.y - C[a].y) }));
          // Chaque point marqué va au point libre de même type le plus proche, s'il est dans la tolérance
          const pris = new Map([[a, i], [b, j]]);
          let somme = 0;
          for (let m = 0; m < pts.length; m += 1) {
            if (m === i || m === j) continue;
            let meilleur = null;
            for (let g = 0; g < gabarit.length; g += 1) {
              if (pris.has(g) || gabarit[g].type !== pts[m].type) continue;
              const d = Math.hypot(prevu[g].e - T[m].e, prevu[g].n - T[m].n);
              if (d <= tolerance && (!meilleur || d < meilleur.d)) meilleur = { g, d };
            }
            if (meilleur) {
              pris.set(meilleur.g, m);
              somme += meilleur.d;
            }
          }
          const signature = [...pris].sort((p, q) => p[1] - q[1]).map(([g, m]) => `${m}:${g}`).join(',');
          // Points marqués avec un autre type que le schéma, mais posés pile sur un de ses points libres : ils appuient
          // cette pose (demi-point chacun), sans quoi une erreur de type suffirait à faire douter entre deux poses
          let croises = 0;
          const servis = new Set(pris.values());
          const occupes = new Set(pris.keys());
          for (let m = 0; m < pts.length; m += 1) {
            if (servis.has(m)) continue;
            for (let g = 0; g < gabarit.length; g += 1) {
              if (occupes.has(g) || gabarit[g].type === pts[m].type) continue;
              if (Math.hypot(prevu[g].e - T[m].e, prevu[g].n - T[m].n) <= CORRECTION_M) {
                occupes.add(g);
                croises += 1;
                break;
              }
            }
          }
          poses.push({ colles: pris.size, score: pris.size + croises / 2, somme, signature, pris });
        }
      }
    }
  }
  if (!poses.length) return null;
  poses.sort((p, q) => q.score - p.score || p.somme - q.somme);
  const meilleure = poses[0];
  if (meilleure.colles < 3) return { ambigu: true };
  // Une autre pose, avec d'autres correspondances, fait-elle aussi bien (même nombre de points, à 10 m près) ?
  const rivale = poses.find((p) => p.signature !== meilleure.signature && !inclus(p.signature, meilleure.signature));
  if (rivale && rivale.score === meilleure.score && rivale.somme - meilleure.somme < 10 * (meilleure.colles - 2)) return { ambigu: true };
  const correspondances = {};
  const reperes = [];
  for (const [g, m] of meilleure.pris) {
    correspondances[pts[m].id] = gabarit[g].cle;
    reperes.push({ cle: gabarit[g].cle, latitude: pts[m].latitude, longitude: pts[m].longitude });
  }
  const cale = caler(gabarit, reperes, rayon);
  if (!cale) return { ambigu: true };
  // Filtre des erreurs de type : un point marqué qui n'a collé à rien (« relique » posée là où le schéma a un pylône)
  // prend le point libre du schéma le plus proche, quel que soit son type, s'il est vraiment dessus
  const libres = [...cale.points];
  const corrections = [];
  for (const m of marques || []) {
    if (m.id in correspondances || !Number.isFinite(m.latitude) || !Number.isFinite(m.longitude)) continue;
    let meilleur = null;
    for (const g of libres) {
      const d = Math.hypot((g.longitude - m.longitude) * k * cosLat, (g.latitude - m.latitude) * k);
      if (d <= CORRECTION_M && g.type !== m.type && (!meilleur || d < meilleur.d)) meilleur = { g, d };
    }
    if (!meilleur) continue;
    libres.splice(libres.indexOf(meilleur.g), 1);
    correspondances[m.id] = meilleur.g.cle;
    corrections.push({ id: m.id, de: m.type, type: meilleur.g.type, cle: meilleur.g.cle });
  }
  return { correspondances, corrections, points: libres, erreur: cale.erreur, hors: pts.filter((m) => !(m.id in correspondances)).map((m) => m.id) };
}

/** La pose `a` est-elle la même que `b`, avec des points en moins ? */
function inclus(a, b) {
  const tous = new Set(b.split(','));
  return a.split(',').every((x) => tous.has(x));
}
