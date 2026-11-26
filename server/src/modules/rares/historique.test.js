// Historique des stocks de rares : points notés, doublons écartés, résumé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_POINTS, ajouter, historiser, resume } from './historique.js';

test('un passage est noté une fois ; les points restent dans l’ordre du temps', () => {
  const h = {};
  assert.equal(ajouter(h, 'A', { at: '2026-11-25T10:00:00Z', stock: 16.4, prix: 17000, etat: 'Boom', source: 'spansh' }), true);
  assert.equal(ajouter(h, 'A', { at: '2026-11-25T10:00:00Z', stock: 16, prix: 17000, source: 'spansh' }), false, 'même passage');
  assert.equal(ajouter(h, 'A', { at: '2026-11-25T10:00:00Z', stock: 400, prix: 17000, source: 'toi' }), true, 'autre origine, même heure');
  assert.equal(ajouter(h, 'A', { at: '2026-11-24T08:00:00Z', stock: 400, prix: 16000, source: 'spansh' }), true);
  assert.deepEqual(h.A.map((p) => `${p.at.slice(8, 13)} ${p.stock} ${p.source}`), ['24T08 400 spansh', '25T10 16 spansh', '25T10 400 toi']);
  assert.deepEqual(h.A[1], { at: '2026-11-25T10:00:00Z', stock: 16, prix: 17000, etat: 'Boom', source: 'spansh' });
  assert.equal(ajouter(h, 'A', { at: 'hier', stock: 5, source: 'spansh' }), false);
  assert.equal(ajouter(h, 'A', { at: '2026-11-26T10:00:00Z', stock: null, source: 'spansh' }), false);
});

test('relevé du catalogue : lignes trouvées notées, rare disparue notée une fois à 0', () => {
  const h = {};
  const lignes = [{ nom: 'A', stock: 30, prix: 500, etat: 'Boom', maj: '2026-11-25T09:00:00Z' }, { nom: 'B', stock: 0, epuisee: true, maj: '2026-11-20T09:00:00Z' }];
  assert.equal(historiser(h, lignes, '2026-11-25T12:00:00Z'), true);
  assert.deepEqual(h.B, [{ at: '2026-11-25T12:00:00Z', stock: 0, prix: null, etat: null, source: 'absent' }]);
  assert.equal(historiser(h, lignes, '2026-11-25T18:00:00Z'), false, 'rien de neuf : même passage, absente déjà notée');
  assert.equal(h.A.length, 1);
  assert.equal(h.B.length, 1);
});

test('résumé : plus haut stock vu, avec sa date et l’état de la faction', () => {
  assert.deepEqual(resume(undefined), { releves: 0, max: null, maxAt: null, maxEtat: null, min: null });
  const points = [{ at: 'a', stock: 16, etat: 'War' }, { at: 'b', stock: 400, etat: 'Boom' }, { at: 'c', stock: 0, etat: null }];
  assert.deepEqual(resume(points), { releves: 3, max: 400, maxAt: 'b', maxEtat: 'Boom', min: 0 });
});

test('au plus MAX_POINTS par rare : les plus anciens sortent', () => {
  const h = {};
  for (let i = 0; i < MAX_POINTS + 5; i += 1) ajouter(h, 'A', { at: new Date(Date.UTC(2026, 0, 1) + i * 3_600_000).toISOString(), stock: i, source: 'spansh' });
  assert.equal(h.A.length, MAX_POINTS);
  assert.equal(h.A[0].stock, 5);
});
