// Historique des stocks de rares : Spansh ne garde que le dernier relevé de chaque marché, donc l'app note elle-même
// chaque valeur qu'elle voit, pour suivre comment un stock monte et descend (16 t un jour, 400 t un autre pour la
// même rare) et avec quel état de faction. Trois origines :
//   - 'spansh' : le relevé du catalogue (marché vu par un joueur, à l'heure de son passage) ;
//   - 'toi'    : un marché que tu ouvres en jeu (Market.json), à la station source ;
//   - 'absent' : la rare n'est plus sortie du relevé, donc à 0 au dernier passage d'un joueur (heure du relevé).
// Données pures : testé seul.

export const MAX_POINTS = 400; // par rare : les plus anciens sortent

const num = (v) => (Number.isFinite(v) ? v : null);

/**
 * Ajoute un point { at, stock, prix, etat, source } à l'historique d'une rare. Rien si ce passage est déjà noté
 * (même heure et même origine), ou si c'est un second « absent » d'affilée. Rend true si l'historique a changé.
 */
export function ajouter(hist, nom, point) {
  if (!nom || !point || !Number.isFinite(Date.parse(point.at)) || !Number.isFinite(point.stock)) return false;
  const points = Array.isArray(hist[nom]) ? hist[nom] : (hist[nom] = []);
  if (points.some((p) => p.at === point.at && p.source === point.source)) return false;
  const dernier = points.at(-1);
  if (point.source === 'absent' && dernier?.source === 'absent') return false;
  points.push({ at: point.at, stock: Math.max(0, Math.round(point.stock)), prix: num(point.prix), etat: typeof point.etat === 'string' && point.etat ? point.etat : null, source: point.source });
  points.sort((a, b) => a.at.localeCompare(b.at));
  if (points.length > MAX_POINTS) points.splice(0, points.length - MAX_POINTS);
  return true;
}

/** Note un relevé du catalogue : chaque ligne trouvée, et un « absent » pour celles qu'il n'a pas retrouvées. */
export function historiser(hist, lignes, releveAt) {
  let change = false;
  for (const l of lignes || []) {
    const point = l.epuisee ? { at: releveAt, stock: 0, prix: null, etat: null, source: 'absent' } : { at: l.maj, stock: l.stock, prix: l.prix, etat: l.etat, source: 'spansh' };
    if (ajouter(hist, l.nom, point)) change = true;
  }
  return change;
}

/** Ce que l'historique dit d'une rare : nombre de passages notés, plus haut et plus bas stock vus, et quand. */
export function resume(points) {
  const p = Array.isArray(points) ? points : [];
  if (!p.length) return { releves: 0, max: null, maxAt: null, maxEtat: null, min: null };
  const haut = p.reduce((a, b) => (b.stock > a.stock ? b : a));
  return { releves: p.length, max: haut.stock, maxAt: haut.at, maxEtat: haut.etat, min: Math.min(...p.map((x) => x.stock)) };
}
