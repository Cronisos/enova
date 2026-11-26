// Carte interactive d'un site gardien : distances, caps, mise à l'échelle.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carte, cote, ecart, metres, relatif } from './carteSite.js';

const R = 1_000_000; // 1 000 km : 1° de latitude = 17 453 m

test('écart en mètres et cap', () => {
  const nord = ecart({ latitude: 0, longitude: 0 }, { latitude: 0.01, longitude: 0 }, R);
  assert.ok(Math.abs(nord.distance - 174.53) < 0.1);
  assert.equal(Math.round(nord.cap), 0);
  const est = ecart({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.01 }, R);
  assert.equal(Math.round(est.cap), 90);
  // À 60° de latitude, un degré de longitude vaut moitié moins
  assert.ok(Math.abs(ecart({ latitude: 60, longitude: 0 }, { latitude: 60, longitude: 0.01 }, R).distance - 87.27) < 0.1);
  // De part et d'autre du méridien 180
  assert.ok(ecart({ latitude: 0, longitude: 179.995 }, { latitude: 0, longitude: -179.995 }, R).distance < 200);
  assert.ok(ecart({ latitude: 0, longitude: 0 }, { latitude: 0.01, longitude: 0 }, null).distance > 0, 'rayon inconnu : valeur par défaut');
});

test('cap relatif au nez, et côté en clair', () => {
  assert.equal(relatif(90, 0), 90);
  assert.equal(relatif(350, 10), -20);
  assert.equal(relatif(10, 350), 20);
  assert.equal(relatif(90, undefined), null);
  assert.deepEqual([0, 45, 90, 135, 180, -45, -90, -135].map(cote), ['devant', 'devant à droite', 'à droite', 'derrière à droite', 'derrière', 'devant à gauche', 'à gauche', 'derrière à gauche']);
  assert.equal(cote(null), '');
  assert.deepEqual([metres(84.6), metres(1234), metres(null)], ['85 m', '1,2 km', '—']);
});

test('carte : tout tient dans le carré, nord en haut, toi et tes distances', () => {
  const points = [{ id: 1, type: 'pylone', n: 1, latitude: 0.01, longitude: 0 }, { id: 2, type: 'pylone', n: 2, latitude: -0.01, longitude: 0.02 }];
  const c = carte({ latitude: 0, longitude: 0, heading: 90 }, points, R, { taille: 300, marge: 20 });
  for (const p of [...c.points, c.moi]) assert.ok(p.x >= 20 && p.x <= 280 && p.y >= 20 && p.y <= 280);
  assert.ok(c.points[0].y < c.points[1].y, 'le point le plus au nord est plus haut');
  assert.ok(c.points[1].x > c.points[0].x, 'le point le plus à l’est est plus à droite');
  assert.equal(Math.round(c.points[0].distance), 175);
  assert.equal(c.points[0].relatif, -90, 'cap à l’est, pylône au nord : à gauche');
  assert.equal(c.moi.heading, 90);
  // Un seul point tout proche : la carte ne zoome pas à l'infini
  assert.equal(carte(null, [points[0]], R).rayon, 120);
  assert.equal(carte(null, [points[0]], R).points[0].distance, null);
  assert.deepEqual(carte(null, [], R), { rayon: 120, points: [], moi: null });
});
