// Guide du Rhino : le tableau de la communauté recopié sans rien inventer, fondu avec les observations du joueur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMMUNAUTE, COURS, MONDES, NON_CLASSEES, SEUIL_RENTABLE, caseDe, groupes, normeNom, ouAller, ressourcesDuGuide, ressourcesDuMonde } from './guideRessources.js';

// Observations telles que le serveur les rend (valeurs relevées dans les journaux de l’auteur le 19 nov. 2026)
const OBSERVATIONS = [
  { nom: 'Iridium', tonnes: 5282, mondes: { hmc: 3302, mrb: 1980 }, sansType: 0, prix: { max: 835153 } },
  { nom: 'Rhodplumsite', tonnes: 3770, mondes: { mrb: 2583, hmc: 1187 }, sansType: 0, prix: { max: 793457 } },
  { nom: 'Diamants basse température', tonnes: 2609, mondes: { gl: 2609 }, sansType: 0, prix: { max: 201134 } },
  { nom: 'Tritium', tonnes: 903, mondes: { gl: 903 }, sansType: 0, prix: null },
  { nom: 'Or', tonnes: 544, mondes: { roc: 3, hmc: 541 }, sansType: 0, prix: { max: 44162 } },
  { nom: 'Platine', tonnes: 433, mondes: { mrb: 399, hmc: 34 }, sansType: 0, prix: { max: 192906 } },
];
// Nombre de minerais du guide sans observation : le tableau de la communauté et les cours, sans doublon
const TOUS = new Set([...COMMUNAUTE, ...COURS].map((x) => normeNom(x.nom))).size;
const ligne = (liste, nom) => MONDES.map((m) => caseDe(liste.find((x) => x.nom === nom), m.id));

test('tableau de la communauté seul (aucune observation) : chaque ligne telle que transmise', () => {
  const seul = ressourcesDuGuide([]);
  assert.deepEqual(MONDES.map((m) => m.court), ['HMC', 'MRB', 'ROC', 'R/G', 'GL']);
  assert.deepEqual(ligne(seul, 'Dunite de périclase'), ['non', 'non', 'oui', 'non', 'non']);
  assert.deepEqual(ligne(seul, 'Thortveitite'), ['non', 'non', 'oui', 'non', 'non']);
  assert.deepEqual(ligne(seul, 'Monazite'), ['non', 'non', 'oui', 'non', 'non']);
  assert.deepEqual(ligne(seul, 'Iridium'), ['oui', 'oui', 'oui', 'non', 'non']);
  assert.deepEqual(ligne(seul, 'Rhodplumsite'), ['oui', 'non', 'oui', 'non', 'non']);
  assert.deepEqual(ligne(seul, 'Alexandrite'), ['non', 'non', 'oui', 'non', 'non']);
  // Citées seulement pour les mondes rocheux : le reste n'est pas « non »
  for (const nom of ['Musgravite', 'Bénitoïte', 'Grandidiérite', 'Sérendibite']) {
    assert.deepEqual(ligne(seul, nom), ['inconnu', 'inconnu', 'oui', 'inconnu', 'inconnu'], nom);
  }
  assert.equal(seul.length, TOUS, 'le tableau et les cours, sans doublon');
  assert.deepEqual(NON_CLASSEES, ['Opale du vide']);
  assert.equal(groupes(seul).rentables.length, TOUS, 'tout ce qui est coté ou cité est dans le guide');
});

test('tes observations comblent les trous et l’emportent sur le tableau', () => {
  const tout = ressourcesDuGuide(OBSERVATIONS);
  // Rhodplumsite : la communauté dit « non » sur les mondes riches en métaux, tu en as raffiné 2 583 t
  assert.deepEqual(ligne(tout, 'Rhodplumsite'), ['oui', 'oui', 'oui', 'non', 'non']);
  assert.deepEqual(ligne(tout, 'Iridium'), ['oui', 'oui', 'oui', 'non', 'non']);
  // Diamants basse température : absents du tableau, trouvés par toi sur monde glacé
  assert.deepEqual(ligne(tout, 'Diamants basse température'), ['inconnu', 'inconnu', 'inconnu', 'inconnu', 'oui']);
  assert.deepEqual(ligne(tout, 'Platine'), ['oui', 'oui', 'inconnu', 'inconnu', 'inconnu']);
  const g = groupes(tout);
  assert.deepEqual(g.rentables.slice(0, 4).map((r) => r.nom), ['Monazite', 'Alexandrite', 'Musgravite', 'Iridium'], 'les plus chères d’abord, au cours moyen');
  assert.deepEqual([g.rentables[3].prix, g.rentables[3].prixMax], [217075, 960004], 'un minerai coté garde son cours, pas ton prix de vente');
  assert.ok(g.rentables.some((r) => r.nom === 'Palladium' && r.prix === null), 'cité dans les cours sans prix : dans le guide quand même');
  assert.deepEqual(g.sousSeuil.map((r) => r.nom), ['Or'], `vendu moins de ${SEUIL_RENTABLE} cr`);
  assert.deepEqual(g.sansPrix.map((r) => r.nom), [], 'le tritium, ajouté au guide, n’est plus à part');
  assert.deepEqual(ligne(tout, 'Tritium'), ['inconnu', 'inconnu', 'inconnu', 'inconnu', 'oui']);
  assert.equal(g.rentables.length + g.sousSeuil.length + g.sansPrix.length, tout.length, 'aucune oubliée');
  assert.deepEqual(ressourcesDuMonde('gl', g.rentables).map((r) => r.nom), ['Diamants basse température', 'Tritium', 'Hélium 3']);
  assert.deepEqual(ligne(tout, 'Hélium 3'), ['inconnu', 'inconnu', 'inconnu', 'inconnu', 'oui']);
  assert.deepEqual(ressourcesDuMonde('mrb', g.rentables).map((r) => r.nom), ['Iridium', 'Rhodplumsite', 'Platine']);
  assert.deepEqual(ligne(tout, 'Rubis'), ['inconnu', 'inconnu', 'inconnu', 'inconnu', 'inconnu'], 'coté, mais monde pas encore répertorié');
});

test('où aller : les mondes où elle a été raffinée, le plus productif d’abord, sinon le conseil de la communauté', () => {
  const tout = ressourcesDuGuide(OBSERVATIONS);
  const de = (nom) => ouAller(tout.find((r) => r.nom === nom));
  assert.equal(de('Rhodplumsite'), 'Monde riche en métaux, puis haute teneur en métaux');
  assert.equal(de('Diamants basse température'), 'Monde glacé');
  assert.equal(de('Alexandrite'), 'Monde rocheux');
  assert.equal(de('Musgravite'), 'Monde rocheux ; le reste n’est pas répertorié');
  assert.equal(ouAller(ressourcesDuGuide([]).find((r) => r.nom === 'Tritium')), 'Monde glacé ; le reste n’est pas répertorié');
});

test('noms : accents et casse ignorés ; observations mal formées écartées', () => {
  assert.equal(normeNom('Bénitoïte'), normeNom('benitoite'));
  const avec = ressourcesDuGuide([{ nom: 'Benitoïte', tonnes: 12, mondes: { roc: 12 }, prix: { max: 90000 } }]);
  assert.equal(avec.length, TOUS, 'même ligne que « Bénitoïte » du tableau');
  assert.equal(avec.find((r) => r.nom === 'Bénitoïte').toi.tonnes, 12);
  assert.equal(ressourcesDuGuide([null, {}, { nom: 'X', tonnes: 0 }, { nom: 5, tonnes: 3 }]).length, TOUS);
  assert.equal(ressourcesDuGuide('n’importe quoi').length, TOUS);
});
