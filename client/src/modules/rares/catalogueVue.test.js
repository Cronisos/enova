// Catalogue des rares : tri, filtres, âge d'un relevé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { age, etatFr, pad, trier } from './catalogueVue.js';

const L = [
  { label: 'Cigares de Kamitra', stock: 23, prix: 6592, distance: 253.4, grandPad: true, maj: '2026-11-25T09:20:52Z' },
  { label: 'Reliques de Soontill', stock: 160, prix: 17000, distance: 107.8, grandPad: true, maj: '2026-11-25T15:36:21Z' },
  { label: 'Brandy de Lave', stock: 120, prix: 3500, distance: null, grandPad: false, moyenPad: true, maj: '2026-11-24T10:00:00Z' },
];
const noms = (l) => l.map((x) => x.label);

test('tri par distance (inconnue en dernier), quantité, prix, nom, relevé', () => {
  assert.deepEqual(noms(trier(L)), ['Reliques de Soontill', 'Cigares de Kamitra', 'Brandy de Lave']);
  assert.deepEqual(noms(trier(L, { tri: 'stock' })), ['Reliques de Soontill', 'Brandy de Lave', 'Cigares de Kamitra']);
  assert.deepEqual(noms(trier(L, { tri: 'prix' })), ['Brandy de Lave', 'Cigares de Kamitra', 'Reliques de Soontill']);
  assert.deepEqual(noms(trier(L, { tri: 'label' })), ['Brandy de Lave', 'Cigares de Kamitra', 'Reliques de Soontill']);
  assert.deepEqual(noms(trier(L, { tri: 'maj' })), ['Reliques de Soontill', 'Cigares de Kamitra', 'Brandy de Lave']);
  assert.equal(L[0].label, 'Cigares de Kamitra', 'la liste reçue n’est pas réordonnée');
});

test('filtres : distance, grand pad, quantité au seuil', () => {
  assert.deepEqual(noms(trier(L, { distanceMax: 200 })), ['Reliques de Soontill', 'Brandy de Lave'], 'distance inconnue : gardée');
  assert.deepEqual(noms(trier(L, { grandPad: true })), ['Reliques de Soontill', 'Cigares de Kamitra']);
  assert.deepEqual(noms(trier(L, { auSeuil: true, seuil: 100 })), ['Reliques de Soontill', 'Brandy de Lave']);
  assert.deepEqual(noms(trier(L, { auSeuil: true, seuil: 150 })), ['Reliques de Soontill']);
  assert.deepEqual(trier(null), []);
});

test('âge d’un relevé et pad', () => {
  const now = Date.parse('2026-11-25T16:00:00Z');
  assert.equal(age('2026-11-25T15:59:30Z', now), 'à l’instant');
  assert.equal(age('2026-11-25T15:36:00Z', now), 'il y a 24 min');
  assert.equal(age('2026-11-25T09:00:00Z', now), 'il y a 7 h');
  assert.equal(age('2026-11-20T16:00:00Z', now), 'il y a 5 j');
  assert.equal(age(null, now), '—');
  assert.deepEqual([pad(L[0]), pad(L[2]), pad({})], ['L', 'M', 'S']);
  assert.deepEqual([etatFr('Boom'), etatFr('Civil War'), etatFr('Truc'), etatFr(null)], ['Essor', 'Guerre civile', 'Truc', '—']);
  const m = [{ label: 'A', max: 16 }, { label: 'B', max: 400 }, { label: 'C', max: null }];
  assert.deepEqual(trier(m, { tri: 'max' }).map((x) => x.label), ['B', 'A', 'C']);
});
