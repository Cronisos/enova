import { test } from 'node:test';
import assert from 'node:assert/strict';
import { donneesRepere, genreRepere, lieuRepere } from './partageRepere.js';

test('Rhino, minage en vaisseau et autres repères : trois types séparés', () => {
  assert.equal(genreRepere({ category: 'mining', vehicle: 'srv' }), 'repere-rhino');
  assert.equal(genreRepere({ category: 'mining', vehicle: 'ship', drills: 4 }), 'repere-rhino');
  assert.equal(genreRepere({ category: 'mining', vehicle: 'ship', siteNumber: 2 }), 'repere-rhino');
  assert.equal(genreRepere({ category: 'mining', vehicle: 'ship' }), 'repere-minage');
  assert.equal(genreRepere({ category: 'mining' }), 'repere-minage');
  assert.equal(genreRepere({ category: 'bio', vehicle: 'srv' }), 'repere');
  assert.equal(genreRepere({ category: 'guardian', vehicle: 'srv', siteNumber: 2 }), 'repere-gardien');
});

test('ce qui part : le lieu et la description, pas le suivi personnel', () => {
  const w = {
    id: 12, label: 'Filon', category: 'mining', notes: '', siteNumber: 3, drills: null, system: 'Système Test', body: 'Système Test 2 a',
    latitude: 1.5, longitude: -2.25, vehicle: 'srv', unprofitable: true, depletedAt: '2026-11-01', createdAt: 'x', updatedAt: 'y', categoryLabel: 'Minage',
  };
  assert.deepEqual(donneesRepere(w), { label: 'Filon', category: 'mining', siteNumber: 3, system: 'Système Test', body: 'Système Test 2 a', latitude: 1.5, longitude: -2.25, vehicle: 'srv' });
  assert.equal(lieuRepere({ ...w, drills: 4 }), 'Système Test 2 a · Système Test · EEP 3, 4 foreuses');
  assert.equal(lieuRepere({ system: 'Système Test' }), 'Système Test');
});
