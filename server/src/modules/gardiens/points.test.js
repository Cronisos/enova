// Carte d'un site gardien faite par le joueur : points marqués, numérotés, retirés, relus.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PointsSites, cleSite } from './points.js';

const ICI = { latitude: 19.82, longitude: -82.46 };

test('pylônes numérotés dans l’ordre, une seule machine, annulation, renumérotation', () => {
  const p = new PointsSites(null);
  assert.deepEqual(p.de('Système Test 2 a', 'ancient_small_002'), []);
  assert.deepEqual(p.ajouter('Système Test 2 a', 'ancient_small_002', 'pylone', ICI), { id: 1, type: 'pylone', n: 1, ...ICI });
  p.ajouter('Système Test 2 a', 'ancient_small_002', 'pylone', { latitude: 19.83, longitude: -82.47 });
  p.ajouter('Système Test 2 a', 'ancient_small_002', 'machine', { latitude: 19.84, longitude: -82.46 });
  p.ajouter('Système Test 2 a', 'ancient_small_002', 'machine', { latitude: 19.85, longitude: -82.46 });
  p.ajouter('Système Test 2 a', 'ancient_small_002', 'pylone', { latitude: 19.86, longitude: -82.47 });
  const liste = () => p.de('système test 2 a', 'Ancient_Small_002').map((x) => [x.type, x.n, x.latitude]);
  assert.deepEqual(liste(), [['pylone', 1, 19.82], ['pylone', 2, 19.83], ['machine', null, 19.85], ['pylone', 3, 19.86]]);
  assert.equal(p.retirer('Système Test 2 a', 'ancient_small_002', 2), true);
  assert.deepEqual(liste(), [['pylone', 1, 19.82], ['machine', null, 19.85], ['pylone', 2, 19.86]]);
  assert.equal(p.annuler('Système Test 2 a', 'ancient_small_002'), true);
  assert.deepEqual(liste(), [['pylone', 1, 19.82], ['machine', null, 19.85]]);
  assert.equal(p.retirer('Système Test 2 a', 'ancient_small_002', 99), false);
  assert.deepEqual(p.de('Système Test 2 a', 'autre_forme'), [], 'autre site du même corps : à part');
});

test('refus : type inconnu, position illisible ; relecture du fichier, entrées abîmées ignorées', () => {
  const p = new PointsSites(null);
  assert.equal(p.ajouter('Système Test 2 a', 'f', 'tour', ICI), null);
  assert.equal(p.ajouter('Système Test 2 a', 'f', '__proto__', ICI), null);
  assert.equal(p.ajouter('Système Test 2 a', 'f', 'pylone', { latitude: 95, longitude: 0 }), null);
  assert.equal(p.ajouter('', 'f', 'pylone', ICI), null);
  assert.deepEqual(p.donnees(), { sites: {} });
  p.ajouter('Système Test 2 a', 'f', 'relique', ICI);
  const relu = new PointsSites(JSON.parse(JSON.stringify(p.donnees())));
  assert.deepEqual(relu.de('Système Test 2 a', 'f'), [{ id: 1, type: 'relique', n: 1, ...ICI }]);
  const abime = new PointsSites({ sites: { x: { corps: 'Système Test 2 a', forme: 'f', points: [{ id: 1, type: 'pylone', latitude: 'x', longitude: 1 }, null, { id: 2, type: 'pylone', n: 1, latitude: 1, longitude: 2 }] }, y: 'non' } });
  assert.deepEqual(abime.de('Système Test 2 a', 'f').map((x) => x.id), [2]);
  assert.equal(cleSite(' Système Test 2 a ', 'F'), 'système test 2 a|f');
});

test('site du relevé de 2018 : ses six pylônes en attendant les tiens', () => {
  const p = new PointsSites(null);
  const releves = p.de('Vela Dark Region DL-Y d91 5 A', 'ancient_small_001');
  assert.equal(releves.length, 6);
  assert.ok(releves.every((x) => x.releve && x.type === 'pylone'));
  p.ajouter('Vela Dark Region DL-Y d91 5 A', 'ancient_small_001', 'pylone', { latitude: -6.57, longitude: -39.87 });
  assert.equal(p.de('Vela Dark Region DL-Y d91 5 A', 'ancient_small_001').length, 1, 'dès que tu marques, ta carte prime');
});

test('points nommés (gabarit de la carte) : remplacés au re-marquage, hors numérotation, rayon gardé', () => {
  const p = new PointsSites(null);
  const ici = { latitude: 19.82, longitude: -82.46, planetRadius: 1777674.5 };
  p.ajouter('Système Test 2 a', 'f', 'pylone', ici);
  assert.deepEqual(p.ajouter('Système Test 2 a', 'f', 'pylone', ici, { cle: 'centre', nom: 'Centre' }), { id: 2, type: 'pylone', n: null, latitude: 19.82, longitude: -82.46, cle: 'centre', nom: 'Centre' });
  p.ajouter('Système Test 2 a', 'f', 'pylone', { ...ici, latitude: 19.83 }, { cle: 'centre', nom: 'Centre' });
  p.ajouter('Système Test 2 a', 'f', 'pylone', ici);
  assert.deepEqual(p.de('Système Test 2 a', 'f').map((x) => [x.cle ?? null, x.n, x.latitude]), [[null, 1, 19.82], ['centre', null, 19.83], [null, 2, 19.82]]);
  assert.equal(p.rayon('Système Test 2 a', 'f'), 1777674.5);
  const relu = new PointsSites(JSON.parse(JSON.stringify(p.donnees())));
  assert.equal(relu.rayon('Système Test 2 a', 'f'), 1777674.5);
  assert.equal(relu.de('Système Test 2 a', 'f')[1].nom, 'Centre');
  assert.equal(p.rayon('Ailleurs', 'f'), null);
});

test('type corrigé : le point change de type, les numéros des deux types sont refaits', () => {
  const p = new PointsSites(null);
  const ici = { latitude: 19.82, longitude: -82.46 };
  p.ajouter('Système Test 2 a', 'f', 'relique', ici);
  p.ajouter('Système Test 2 a', 'f', 'relique', ici);
  p.ajouter('Système Test 2 a', 'f', 'pylone', ici);
  assert.equal(p.corriger('Système Test 2 a', 'f', 1, 'pylone'), true);
  assert.deepEqual(p.de('Système Test 2 a', 'f').map((x) => [x.id, x.type, x.n]), [[1, 'pylone', 1], [2, 'relique', 1], [3, 'pylone', 2]]);
  assert.equal(p.corriger('Système Test 2 a', 'f', 1, 'pylone'), false, 'déjà de ce type');
  assert.equal(p.corriger('Système Test 2 a', 'f', 1, 'tour'), false);
  assert.equal(p.corriger('Système Test 2 a', 'f', 99, 'relique'), false);
  assert.ok(p.ajouter('Système Test 2 a', 'f', 'panneau', ici) && p.ajouter('Système Test 2 a', 'f', 'sentinelle', ici) && p.ajouter('Système Test 2 a', 'f', 'materiau', ici));
});
