// Géométrie du bandeau de refroidissement (Jauge.jsx), sans React ni image : testée seule.
//
// La courbe représente la chaleur qui retombe : haute à gauche (chaud, orange), elle descend vers la droite (froid,
// bleu), avec une légère ondulation comme sur la maquette. Elle ne défile pas (l’auteur, 19 nov. 2026 : « une courbe
// descendante », pas des vagues qui avancent) : elle fluctue sur place, de haut en bas (Jauge.jsx), et son remplissage
// se vide de gauche à droite. `phase` décale l'ondulation : un second tracé, en reflet, donne l'impression d'un flux.

export const LARGEUR = 560;
export const HAUTEUR = 92;
export const VAGUE_L = 268;
export const VAGUE_H = 34;

/** Hauteur de chaleur (px au-dessus du bas) à l'abscisse x : une bosse au départ, puis une descente qui ondule un peu. */
export function chaleur(x, phase = 0) {
  const t = Math.min(1, Math.max(0, x / VAGUE_L));
  const montee = 0.6 + 0.4 * Math.min(1, t / 0.12); // elle part un peu plus bas, monte, puis redescend
  const descente = 4 + 23 * (1 - t) ** 1.3;
  const ondulation = 2.4 * Math.sin(t * 15 + phase) * (0.35 + 0.65 * t) * (1 - t) ** 0.4;
  return Math.max(1.5, descente * montee + ondulation);
}

/** Ordonnée du dessus de la courbe à l'abscisse x (0 en haut du cadre). */
export const hauteurVague = (x, phase = 0) => VAGUE_H - 1 - chaleur(x, phase);

/** Tracé du dessus de la courbe, sur toute la largeur. */
export function traceVague(phase = 0) {
  const points = [];
  for (let x = 0; x <= VAGUE_L; x += 2) points.push(`${x} ${hauteurVague(x, phase).toFixed(1)}`);
  return `M${points.join(' L')}`;
}

/**
 * Part de la courbe déjà vidée, de 0 (pleine) à 1 (vide). Elle se vide de gauche à droite avec le temps écoulé ; durée
 * inconnue (fraction non finie) : elle reste pleine.
 */
export function partVidee(fraction) {
  return Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
}
