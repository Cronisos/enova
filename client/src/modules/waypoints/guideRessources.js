// Guide du Rhino : sur quel type de monde chercher chaque ressource rentable, en minage planétaire. Sans React :
// testé seul.
//
// Deux sources, fondues ici :
//   - le tableau de la communauté transmis par Cronisos Lysiris le 19 nov. 2026 : sur quels types de corps une
//     ressource A ÉTÉ TROUVÉE (il ne garantit pas qu'elle soit à chaque emplacement de minage) ;
//   - tes propres journaux (serveur, modules/waypoints/guide.js) : ce que TU as raffiné en Rhino, sur quel type de
//     monde, et à quel prix tu l'as vendu. Tes observations l'emportent : une case que le tableau dit vide, ou ne
//     connaît pas, devient « trouvée ».
// Le guide est une information générale, pas un bilan personnel (l’auteur, 19 nov. 2026) : il ne montre ni tes tonnes
// ni qui a trouvé quoi, seulement où chercher.
// Ce qu'aucune des deux ne dit reste « pas encore répertorié » : mieux vaut un trou visible qu'une case inventée.

/** Types de mondes où le Rhino mine, dans l'ordre du tableau. Pas de couleur par monde : la couleur est celle du minerai. */
export const MONDES = Object.freeze([
  { id: 'hmc', court: 'HMC', nom: 'Haute teneur en métaux' },
  { id: 'mrb', court: 'MRB', nom: 'Riche en métaux' },
  { id: 'roc', court: 'ROC', nom: 'Rocheux' },
  { id: 'rg', court: 'R/G', nom: 'Roche et glace' },
  { id: 'gl', court: 'GL', nom: 'Glacé' },
]);

export const SEUIL_RENTABLE = 50_000; // cr la tonne : en dessous, la ressource n'est pas dans le tableau principal

/**
 * Tableau de la communauté : { nom, mondes: [id], partiel?, conseil? }. `partiel` : citée seulement pour les mondes
 * rocheux, rien n'est dit des autres. `conseil` : sa recommandation, telle quelle.
 */
export const COMMUNAUTE = Object.freeze([
  { nom: 'Rhodplumsite', mondes: ['hmc', 'roc'], conseil: 'HMC ou monde rocheux' },
  { nom: 'Iridium', mondes: ['hmc', 'mrb', 'roc'], conseil: 'Monde riche en métaux d’abord, puis HMC' },
  { nom: 'Dunite de périclase', mondes: ['roc'], conseil: 'Monde rocheux' },
  { nom: 'Thortveitite', mondes: ['roc'], conseil: 'Monde rocheux' },
  { nom: 'Monazite', mondes: ['roc'], conseil: 'Monde rocheux' },
  { nom: 'Alexandrite', mondes: ['roc'], conseil: 'Monde rocheux' },
  { nom: 'Musgravite', mondes: ['roc'], partiel: true },
  { nom: 'Bénitoïte', mondes: ['roc'], partiel: true },
  { nom: 'Grandidiérite', mondes: ['roc'], partiel: true },
  { nom: 'Sérendibite', mondes: ['roc'], partiel: true },
  // Ajouts de Cronisos Lysiris (19 nov. 2026) : trouvés sur des mondes glacés ; rien n'est dit des autres mondes
  { nom: 'Tritium', mondes: ['gl'], partiel: true },
  { nom: 'Hélium 3', mondes: ['gl'], partiel: true },
]);

/**
 * Cours des minerais, transmis par Cronisos Lysiris le 19 nov. 2026 : { nom, moyen, max } en crédits la tonne (prix de
 * vente moyen, et meilleur prix relevé). Palladium : cité sans prix (liste coupée). Taafféite : meilleur prix non donné.
 * Tout minerai de cette liste est dans le guide, même si l'on ne sait pas encore sur quel monde le trouver.
 */
export const COURS = Object.freeze([
  { nom: 'Monazite', moyen: 276_573, max: 864_414 },
  { nom: 'Alexandrite', moyen: 228_549, max: 699_703 },
  { nom: 'Musgravite', moyen: 222_749, max: 739_560 },
  { nom: 'Iridium', moyen: 217_075, max: 960_004 },
  { nom: 'Grandidiérite', moyen: 212_545, max: 590_110 },
  { nom: 'Dunite de périclase', moyen: 210_447, max: 944_252 },
  { nom: 'Thortveitite', moyen: 209_912, max: 944_252 },
  { nom: 'Sérendibite', moyen: 188_242, max: 570_948 },
  { nom: 'Rhodplumsite', moyen: 187_264, max: 843_392 },
  { nom: 'Bénitoïte', moyen: 166_215, max: 851_402 },
  { nom: 'Opale du vide', moyen: 151_701, max: 663_200 },
  { nom: 'Diamant', moyen: 138_795, max: 623_202 },
  { nom: 'Diamants basse température', moyen: 132_538, max: 384_562 },
  { nom: 'Saphir', moyen: 132_092, max: 601_055 },
  { nom: 'Rubis', moyen: 113_705, max: 510_156 },
  { nom: 'Bastanäsite', moyen: 83_065, max: 351_384 },
  { nom: 'Hafnium 178', moyen: 76_567, max: 76_567 },
  { nom: 'Platine', moyen: 72_076, max: 302_844 },
  { nom: 'Painite', moyen: 58_098, max: 453_078 },
  { nom: 'Osmium', moyen: 57_349, max: 273_000 },
  { nom: 'Taafféite', moyen: 52_403, max: null },
  { nom: 'Palladium', moyen: null, max: null },
]);

/** Ressource citée par le tableau sans y être classée. */
export const NON_CLASSEES = Object.freeze(['Opale du vide']);

/** Même ressource malgré les accents et la casse (« Bénitoïte » du tableau, « Benitoïte » du jeu). */
export const normeNom = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Les ressources du guide : le tableau de la communauté, plus ce que le joueur a raffiné en Rhino.
 * @param observations réponse du serveur : [{ nom, tonnes, mondes: { hmc: t, … }, sansType, prix: { max, dernier, le } | null }]
 * @returns [{ nom, communaute: [id] | null, partiel, conseil, toi: { tonnes, mondes, sansType } | null, cote, prix, prixMax, rentable }]
 *   `cote` : le minerai est dans les cours transmis (il a sa place dans le guide, même sans prix) ;
 *   `prix` : son cours moyen (cr/t), à défaut ton meilleur prix de vente, ou null ; `prixMax` : meilleur prix relevé ;
 *   `rentable` : vrai (prix au-dessus du seuil), faux (en dessous), null (prix inconnu).
 */
export function ressourcesDuGuide(observations = []) {
  const lignes = new Map();
  for (const c of COMMUNAUTE) {
    lignes.set(normeNom(c.nom), { nom: c.nom, communaute: c.mondes, partiel: c.partiel === true, conseil: c.conseil ?? null, toi: null, prix: null });
  }
  for (const c of COURS) {
    const k = normeNom(c.nom);
    const l = lignes.get(k) || { nom: c.nom, communaute: null, partiel: false, conseil: null, toi: null, prix: null };
    Object.assign(l, { cote: true, prix: c.moyen, prixMax: c.max });
    lignes.set(k, l);
  }
  for (const o of Array.isArray(observations) ? observations : []) {
    if (!o || typeof o.nom !== 'string' || !(o.tonnes > 0)) continue;
    const k = normeNom(o.nom);
    const l = lignes.get(k) || { nom: o.nom, communaute: null, partiel: false, conseil: null, toi: null, prix: null };
    const mondes = {};
    for (const m of MONDES) if (o.mondes?.[m.id] > 0) mondes[m.id] = o.mondes[m.id];
    l.toi = { tonnes: o.tonnes, mondes, sansType: o.sansType > 0 ? o.sansType : 0 };
    // Un minerai coté garde son cours ; sinon, ton meilleur prix de vente
    if (l.prix == null) l.prix = Number.isFinite(o.prix?.max) && o.prix.max > 0 ? o.prix.max : null;
    lignes.set(k, l);
  }
  return [...lignes.values()]
    .map((l) => ({ cote: false, prixMax: null, ...l, rentable: l.prix == null ? null : l.prix >= SEUIL_RENTABLE }))
    .sort((a, b) => (b.prix ?? -1) - (a.prix ?? -1) || (b.toi?.tonnes ?? 0) - (a.toi?.tonnes ?? 0) || a.nom.localeCompare(b.nom, 'fr'));
}

/**
 * État d'une case : 'oui' (trouvée sur ce type de monde, par toi ou d'après la communauté), 'non' (la communauté dit
 * non, et tu ne l'y as pas trouvée), 'inconnu' (pas encore répertorié).
 */
export function caseDe(ressource, mondeId) {
  if (ressource.toi?.mondes?.[mondeId] > 0) return 'oui';
  if (!ressource.communaute) return 'inconnu';
  if (ressource.communaute.includes(mondeId)) return 'oui';
  return ressource.partiel ? 'inconnu' : 'non';
}

/**
 * Ce que montre le guide, en trois groupes :
 *   - `rentables` : au-dessus du seuil d'après les cours ou tes ventes, ou données rentables par la communauté ou
 *     citées dans les cours (prix inconnu) ;
 *   - `sousSeuil` : tu les as minées, mais vendues moins cher que le seuil ;
 *   - `sansPrix` : tu les as minées sans jamais les vendre, et la communauté ne les cite pas.
 */
export function groupes(ressources) {
  const dedans = (r) => r.rentable === true || (r.rentable === null && (r.communaute || r.cote));
  const rentables = ressources.filter(dedans);
  const sousSeuil = ressources.filter((r) => r.rentable === false);
  const sansPrix = ressources.filter((r) => r.rentable === null && !dedans(r));
  return { rentables, sousSeuil, sansPrix };
}

/** Ressources à chercher sur un type de monde (trouvées par toi ou par la communauté), les plus chères d'abord. */
export function ressourcesDuMonde(mondeId, ressources) {
  return ressources.filter((r) => caseDe(r, mondeId) === 'oui');
}

/**
 * Où aller pour une ressource, en une phrase : les mondes où elle a vraiment été raffinée, du plus productif au moins
 * productif, sinon le conseil de la communauté.
 */
export function ouAller(ressource) {
  const tiens = Object.entries(ressource.toi?.mondes || {}).sort((a, b) => b[1] - a[1]);
  if (tiens.length) {
    const nom = (id) => MONDES.find((m) => m.id === id)?.nom.toLowerCase() ?? id;
    const [premier, ...autres] = tiens;
    return `Monde ${nom(premier[0])}${autres.length ? `, puis ${autres.map(([id]) => nom(id)).join(', ')}` : ''}`;
  }
  if (ressource.conseil) return ressource.conseil;
  if (!ressource.communaute) return null;
  // Citée pour certains mondes seulement : on les nomme, sans rien dire des autres
  const connus = ressource.communaute.map((id) => MONDES.find((m) => m.id === id)?.nom.toLowerCase() ?? id);
  return `Monde ${connus.join(', ')} ; le reste n’est pas répertorié`;
}
