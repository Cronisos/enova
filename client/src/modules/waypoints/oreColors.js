// Couleur de chaque minerai du Rhino, toujours la même, sur la carte du balayage et dans le Top 10 : les plus chers
// d'abord (prix du 4 nov. 2026, iridium d'après ta vente du 31 oct.). Pas d'orange : c'est la fin du dernier minage.
// Repère sans minerai reconnu : blanc.
export const ORE_COLORS = {
  Rhodplumsite: '#ff4d4d', // ~316 k
  Platine: '#ff7ac8', // ~275 k
  Iridium: '#b46cff', // ~257 k
  Osmium: '#4f9dff', // ~235 k
  Palladium: '#5fd38d', // ~60 k
  Or: '#ffd24a', // ~56 k
  Argent: '#9fb3c8', // ~49 k
  Hématite: '#a0522d',
  Uranium: '#b6f04a',
  Titane: '#2ec4b6',
  Magnésite: '#d8c7a0',
  Hélium: '#8fe3ff',
};
/**
 * Les autres minerais du Rhino (19 nov. 2026) : jusque-là blancs, chacun a maintenant sa couleur, toujours la même.
 * À part des 12 courants ci-dessus, dont la liste sert aussi de boutons dans le tiroir du repère : ceux-ci se
 * choisissent par « Autre… ». Teintes prises dans les trous de la première palette (magenta, indigo, olive, menthe,
 * or sombre, mauve, bleu profond, bordeaux, sarcelle sombre, vert vif, glace) ; toujours pas d'orange.
 */
export const AUTRES_COULEURS = {
  'Diamants basse température': '#c9f2ff',
  Alexandrite: '#e040fb',
  Benitoïte: '#6c7bff',
  'Dunite de périclase': '#9a9a3a',
  Grandidiérite: '#aaf0d1',
  Monazite: '#c9a227',
  Musgravite: '#c9a0dc',
  Serendibite: '#2f5fd0',
  Thortveitite: '#b03060',
  Tritium: '#1f8a8a',
  'Opale du vide': '#00e5a0',
  // Minerais des cours du 19 nov. 2026 (guide des ressources)
  'Hafnium 178': '#5f7a8a',
  Diamant: '#ffe9a8',
  Saphir: '#4169e1',
  Rubis: '#e0115f',
  Bastanäsite: '#8b7355',
  Painite: '#e9967a',
  Taaffeite: '#da70d6',
  'Hélium 3': '#7fffd4',
};
export const LAST_SPOT = '#ff9a3c';
export const UNKNOWN_ORE = '#f4f6f8';

const norme = (nom) => String(nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const PAR_NOM = new Map([...Object.entries(ORE_COLORS), ...Object.entries(AUTRES_COULEURS)].map(([nom, c]) => [norme(nom), c]));

/**
 * Couleur d'un minerai par son nom, accents et casse ignorés (« Bénitoïte » du guide, « Benitoïte » du jeu) ; un
 * minerai sans couleur attitrée : blanc.
 */
export function couleurMinerai(nom) {
  return PAR_NOM.get(norme(nom)) ?? UNKNOWN_ORE;
}

/** Tous les minerais qui ont une couleur, les 12 courants d'abord (pour une légende). */
export const MINERAIS_COLORES = [...Object.keys(ORE_COLORS), ...Object.keys(AUTRES_COULEURS)];
