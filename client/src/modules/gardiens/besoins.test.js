// Planificateur des Gardiens : besoins cumulés, stock, ce qui manque, recettes prêtes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { besoins, nomsDepuis, stockDepuis } from './besoins.js';

const INGREDIENTS = {
  plan: { en: 'Guardian Module Blueprint Segment', genre: 'gardien', ou: 'site' },
  cellule: { en: 'Guardian Power Cell', genre: 'gardien', ou: 'site' },
  cristaux: { en: 'Focus Crystals', genre: 'fabrique', ou: 'échangeur' },
  'm:support': { en: 'HN Shock Mount', genre: 'marchandise', ou: 'marché' },
};
const RECETTES = [
  { id: 'booster', ingredients: [{ cle: 'plan', quantite: 1 }, { cle: 'cellule', quantite: 21 }, { cle: 'cristaux', quantite: 24 }, { cle: 'm:support', quantite: 8 }] },
  { id: 'distributeur', ingredients: [{ cle: 'plan', quantite: 1 }, { cle: 'cellule', quantite: 24 }] },
  { id: 'autre', ingredients: [{ cle: 'cellule', quantite: 99 }] },
];

test('besoins cumulés des recettes choisies, stock déduit, marchandises toujours à acheter', () => {
  const b = besoins(RECETTES, ['booster', 'distributeur'], INGREDIENTS, new Map([['plan', 1], ['cellule', 30], ['cristaux', 50]]));
  const par = Object.fromEntries(b.lignes.map((l) => [l.cle, [l.besoin, l.stock, l.manque]]));
  assert.deepEqual(par, { plan: [2, 1, 1], cellule: [45, 30, 15], cristaux: [24, 50, 0], 'm:support': [8, null, 8] });
  assert.deepEqual(b.lignes.map((l) => l.cle), ['cellule', 'plan', 'm:support', 'cristaux'], 'ce qui manque d’abord, les matériaux gardiens en tête');
  assert.deepEqual(b.lignes.find((l) => l.cle === 'cellule').pour, ['booster', 'distributeur']);
  assert.equal(b.total, 2);
  // Le stock sert la première recette choisie ; il n'en reste pas assez pour la seconde
  assert.deepEqual(b.pretes, ['booster']);
});

test('rien de choisi, tout en stock, stock vide', () => {
  assert.deepEqual(besoins(RECETTES, [], INGREDIENTS), { lignes: [], pretes: [], total: 0 });
  const plein = besoins(RECETTES, ['booster', 'distributeur'], INGREDIENTS, new Map([['plan', 2], ['cellule', 45], ['cristaux', 24]]));
  assert.deepEqual(plein.pretes, ['booster', 'distributeur']);
  assert.ok(plein.lignes.filter((l) => l.genre !== 'marchandise').every((l) => l.manque === 0));
  const vide = besoins(RECETTES, ['booster'], INGREDIENTS);
  assert.deepEqual(vide.pretes, []);
  assert.equal(vide.lignes.find((l) => l.cle === 'cellule').manque, 21);
  assert.deepEqual(besoins(null, ['x'], null).lignes, []);
});

test('stock et noms depuis l’inventaire du module Ingénierie', () => {
  const inv = { items: [{ key: 'Guardian_PowerCell', label: 'Cellule d’énergie gardienne', count: 12 }], absents: [{ key: 'focuscrystals', label: 'Focus Crystals', count: 0 }, null, { key: 5 }] };
  assert.deepEqual([...stockDepuis(inv)], [['focuscrystals', 0], ['guardian_powercell', 12]]);
  assert.equal(nomsDepuis(inv).get('guardian_powercell'), 'Cellule d’énergie gardienne');
  assert.deepEqual([...stockDepuis(null)], []);
});
