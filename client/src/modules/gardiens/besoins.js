// Planificateur des Gardiens : de ce que tu veux débloquer à ce qu'il te manque. Sans React : testé seul.

/**
 * @param recettes [{ id, ingredients: [{ cle, quantite }] }]
 * @param choix identifiants des recettes voulues
 * @param ingredients { cle: { fr, en, genre, ou } }
 * @param stock Map(clé du matériau → quantité en stock) ; un matériau absent de la Map est à 0. Les marchandises
 *   (genre « marchandise ») n'ont pas de stock connu : elles sont toujours « à acheter ».
 * @returns { lignes, pretes, total }
 *   lignes : une par ingrédient [{ cle, nom, en, genre, ou, besoin, stock (null : inconnu), manque, pour: [ids] }], ce qu'il
 *   manque le plus d'abord ; pretes : identifiants des recettes dont tous les matériaux sont en stock, en comptant
 *   les recettes choisies ensemble (deux modules qui veulent les mêmes cellules ne les comptent pas deux fois).
 */
export function besoins(recettes, choix, ingredients, stock = new Map()) {
  const voulues = (recettes || []).filter((r) => (choix || []).includes(r.id));
  const parCle = new Map();
  for (const r of voulues) {
    for (const i of r.ingredients) {
      const l = parCle.get(i.cle) || { cle: i.cle, besoin: 0, pour: [] };
      l.besoin += i.quantite;
      l.pour.push(r.id);
      parCle.set(i.cle, l);
    }
  }
  const lignes = [...parCle.values()].map((l) => {
    const info = ingredients?.[l.cle] || {};
    const connu = info.genre !== 'marchandise';
    const enStock = connu ? Math.max(0, Number(stock.get(l.cle)) || 0) : null;
    return { ...l, nom: info.fr || info.en || l.cle, en: info.en || l.cle, genre: info.genre || 'autre', ou: info.ou || '', stock: enStock, manque: connu ? Math.max(0, l.besoin - enStock) : l.besoin };
  });
  const rang = { gardien: 0, donnees: 1, brut: 2, fabrique: 3, marchandise: 4, autre: 5 };
  lignes.sort((a, b) => Number(b.manque > 0) - Number(a.manque > 0) || rang[a.genre] - rang[b.genre] || b.manque - a.manque || a.en.localeCompare(b.en));
  // Prêtes : servies dans l'ordre choisi, chacune prenant sa part du stock (hors marchandises, toujours à acheter)
  const reste = new Map(stock);
  const pretes = [];
  for (const r of voulues) {
    const materiaux = r.ingredients.filter((i) => ingredients?.[i.cle]?.genre !== 'marchandise');
    if (materiaux.every((i) => (Number(reste.get(i.cle)) || 0) >= i.quantite)) {
      for (const i of materiaux) reste.set(i.cle, (Number(reste.get(i.cle)) || 0) - i.quantite);
      pretes.push(r.id);
    }
  }
  return { lignes, pretes, total: voulues.length };
}

/** Stock par clé, depuis l'inventaire du module Ingénierie ({ items, absents }) ; rien de lisible : Map vide. */
export function stockDepuis(inventaire) {
  const m = new Map();
  for (const it of [...(inventaire?.absents || []), ...(inventaire?.items || [])]) {
    if (it && typeof it.key === 'string') m.set(it.key.toLowerCase(), Number(it.count) || 0);
  }
  return m;
}

/** Nom français d'un ingrédient quand le jeu l'a déjà donné (inventaire), sinon son nom anglais. */
export function nomsDepuis(inventaire) {
  const m = new Map();
  for (const it of [...(inventaire?.absents || []), ...(inventaire?.items || [])]) {
    if (it && typeof it.key === 'string' && typeof it.label === 'string' && it.label) m.set(it.key.toLowerCase(), it.label);
  }
  return m;
}
