// Verdict de l'échangeur : les échanges proposés suffisent-ils ?

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bilanEchanges } from './echangesVue.js';

const don = [{ key: 'x', donne: 6, recoit: 1 }];

test('tout est couvert : les échanges suffisent', () => {
  const b = bilanEchanges([
    { key: 'a', label: 'A', grade: 5, manque: 3, reste: 0, echanges: don, echangeable: true },
    { key: 'b', label: 'B', grade: 4, manque: 1, reste: 0, echanges: don, echangeable: true, plusieursPassages: true },
  ]);
  assert.deepEqual([b.total, b.couverts, b.suffit, b.passages], [2, 2, true, 1]);
  assert.deepEqual(b.restants, []);
});

test('il en manquera encore : la liste, avec la raison de chacun', () => {
  const b = bilanEchanges([
    { key: 'a', label: 'A', grade: 5, manque: 25, reste: 6, echanges: don, echangeable: true },
    { key: 'b', label: 'B', grade: 5, manque: 10, reste: 10, echanges: [], echangeable: true },
    { key: 'c', label: 'C', grade: 3, manque: 4, reste: 4, echanges: [], echangeable: false },
    { key: 'd', label: 'D', grade: 2, manque: 4, reste: 0, echanges: don, echangeable: true },
  ]);
  assert.equal(b.suffit, false);
  assert.equal(b.couverts, 1);
  assert.deepEqual(b.restants.map((r) => [r.label, r.reste, r.raison]), [['A', 6, 'pas assez à donner'], ['B', 10, 'rien à donner'], ['C', 4, 'ne s’échange pas']]);
});

test('rien ne manque : pas de verdict à donner', () => {
  assert.deepEqual(bilanEchanges([]), { total: 0, couverts: 0, suffit: false, restants: [], passages: 0 });
  assert.equal(bilanEchanges(null).total, 0);
});
