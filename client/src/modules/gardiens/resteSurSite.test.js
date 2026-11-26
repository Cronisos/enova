// Bandeau du mode Gardiens : ce qu'il reste à trouver sur les sites pour le plan.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { besoins } from './besoins.js';
import { resteSurSite } from './resteSurSite.js';

const INGREDIENTS = {
  guardian_moduleblueprint: { fr: 'Segment de plan de module', en: 'x', genre: 'gardien' },
  guardian_weaponblueprint: { fr: 'Segment de plan d’arme', en: 'x', genre: 'gardien' },
  guardian_powercell: { fr: 'Cellule', en: 'x', genre: 'gardien' },
  ancientlanguagedata: { fr: 'Delta', en: 'x', genre: 'donnees' },
  focuscrystals: { fr: 'Cristaux', en: 'x', genre: 'fabrique' },
  'm:hnshockmount': { fr: 'Support', en: 'x', genre: 'marchandise' },
};
const RECETTES = [
  { id: 'a', ingredients: [{ cle: 'guardian_moduleblueprint', quantite: 1 }, { cle: 'guardian_powercell', quantite: 21 }, { cle: 'focuscrystals', quantite: 24 }, { cle: 'm:hnshockmount', quantite: 8 }] },
  { id: 'b', ingredients: [{ cle: 'guardian_weaponblueprint', quantite: 2 }, { cle: 'guardian_powercell', quantite: 17 }, { cle: 'ancientlanguagedata', quantite: 24 }] },
];

test('segments de plan à part, puis les manques des sites, le plus gros d’abord ; ni fabriqués ni marchandises', () => {
  const plan = besoins(RECETTES, ['a', 'b'], INGREDIENTS, new Map([['guardian_weaponblueprint', 5], ['guardian_powercell', 30], ['ancientlanguagedata', 4]]));
  const r = resteSurSite(plan);
  assert.deepEqual(r.plans, { besoin: 3, stock: 2, manque: 1 }, 'le surplus d’un type de plan ne compte pas pour un autre');
  assert.deepEqual(r.lignes.map((l) => [l.cle, l.manque]), [['ancientlanguagedata', 20], ['guardian_powercell', 8]]);
});

test('sans plan, ou plan complet', () => {
  assert.deepEqual(resteSurSite(null), { plans: { besoin: 0, stock: 0, manque: 0 }, lignes: [] });
  const plein = besoins(RECETTES, ['a'], INGREDIENTS, new Map([['guardian_moduleblueprint', 1], ['guardian_powercell', 99]]));
  assert.deepEqual(resteSurSite(plein), { plans: { besoin: 1, stock: 1, manque: 0 }, lignes: [] });
});
