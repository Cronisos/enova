// Calage d'une carte sur le terrain : deux points marqués suffisent à placer les autres.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GABARITS, caler } from './calage.js';

const RAYON = 1_777_674.5;
const RAD = Math.PI / 180;
const G = [
  { cle: 'a', type: 'machine', nom: 'A', x: 100, y: 100 },
  { cle: 'b', type: 'pylone', nom: 'B', x: 300, y: 100 },
  { cle: 'c', type: 'pylone', nom: 'C', x: 100, y: 400 },
  { cle: 'd', type: 'pylone', nom: 'D', x: 300, y: 400 },
];
/** Terrain fabriqué : la carte à `echelle` m/pixel, tournée de `angle` degrés, posée à (lat0, lon0). */
function terrain(echelle, angle, lat0 = 19.82, lon0 = -82.46) {
  const [c, s] = [Math.cos(angle * RAD), Math.sin(angle * RAD)];
  const k = RAD * RAYON;
  return Object.fromEntries(G.map((g) => {
    const [x, y] = [g.x * echelle, -g.y * echelle];
    const [e, n] = [x * c - y * s, x * s + y * c];
    return [g.cle, { cle: g.cle, latitude: lat0 + n / k, longitude: lon0 + e / (k * Math.cos(lat0 * RAD)) }];
  }));
}
const metres = (p, q) => Math.hypot((p.latitude - q.latitude) * RAD * RAYON, (p.longitude - q.longitude) * RAD * RAYON * Math.cos(p.latitude * RAD));

test('deux repères : les autres points retrouvés, quelle que soit l’orientation de la carte', () => {
  for (const angle of [0, 37, 180, -120]) {
    const vrai = terrain(0.6, angle);
    const r = caler(G, [vrai.a, vrai.d], RAYON);
    assert.deepEqual(r.points.map((p) => p.cle), ['b', 'c']);
    for (const p of r.points) assert.ok(metres(p, vrai[p.cle]) < 0.5, `${p.cle} à ${angle}°`);
    assert.ok(Math.abs(r.echelle - 0.6) < 0.001);
    assert.ok(r.erreur < 0.01);
    assert.equal(r.points[0].nom, 'B');
  }
});

test('trois repères dont un mal marqué : calage au mieux, et l’erreur le dit', () => {
  const vrai = terrain(0.5, 20);
  const faux = { ...vrai.b, latitude: vrai.b.latitude + 15 / (RAD * RAYON) }; // 15 m trop au nord
  const r = caler(G, [vrai.a, faux, vrai.d], RAYON);
  assert.deepEqual(r.points.map((p) => p.cle), ['c']);
  assert.ok(metres(r.points[0], vrai.c) < 15);
  assert.ok(r.erreur > 2 && r.erreur < 15);
});

test('calage impossible : un seul repère, repères trop proches, clé inconnue, rayon inconnu', () => {
  const vrai = terrain(0.6, 0);
  assert.equal(caler(G, [vrai.a], RAYON), null);
  assert.equal(caler(G, [vrai.a, { cle: 'zzz', latitude: 1, longitude: 1 }], RAYON), null);
  assert.equal(caler(G, [vrai.a, vrai.d], null), null);
  const colles = terrain(0.05, 0); // 10 m entre a et b
  assert.equal(caler(G, [colles.a, colles.b], RAYON), null);
  assert.equal(caler(null, [vrai.a, vrai.d], RAYON), null);
});

test('gabarits : une machine et six pylônes chacun, clés uniques', () => {
  for (const [plan, g] of Object.entries(GABARITS)) {
    assert.equal(g.filter((p) => p.type === 'machine').length, 1, plan);
    assert.equal(g.filter((p) => p.type === 'pylone').length, 6, plan);
    assert.deepEqual(g.filter((p) => p.type === 'pylone').map((p) => p.n).sort(), [1, 2, 3, 4, 5, 6], plan);
    assert.equal(new Set(g.map((p) => p.cle)).size, g.length, plan);
  }
});

test('schéma reconnu sans dire quel point est lequel : trois points suffisent quand la forme n’est pas symétrique', async () => {
  const { reconnaitre } = await import('./calage.js');
  const arme = GABARITS.arme;
  const k = RAD * RAYON;
  const lat0 = 19.82;
  // Terrain fabriqué depuis le gabarit des plans d'arme : 0,6 m par pixel, carte tournée de 25°
  const [c, s] = [Math.cos(25 * RAD), Math.sin(25 * RAD)];
  const vrai = Object.fromEntries(arme.map((g) => {
    const [x, y] = [g.x * 0.6, -g.y * 0.6];
    return [g.cle, { latitude: lat0 + (x * s + y * c) / k, longitude: -82.46 + (x * c - y * s) / (k * Math.cos(lat0 * RAD)) }];
  }));
  const marque = (id, cle, decalage = 0) => ({ id, type: arme.find((g) => g.cle === cle).type, latitude: vrai[cle].latitude + decalage / k, longitude: vrai[cle].longitude });
  assert.equal(reconnaitre(arme, [marque(1, 'machine'), marque(2, 'arriere')], RAYON), null, 'deux points : pas assez');
  // Machine, Arrière, Droite, marqués à 8 m près
  const r = reconnaitre(arme, [marque(1, 'arriere', 8), marque(2, 'machine', -6), marque(3, 'droite', 5)], RAYON);
  assert.deepEqual(r.correspondances, { 1: 'arriere', 2: 'machine', 3: 'droite' });
  assert.deepEqual(r.points.filter((p) => p.type === 'pylone').map((p) => p.cle).sort(), ['centre', 'gauche', 'principal-d', 'principal-g']);
  assert.equal(r.points.filter((p) => p.type === 'panneau').length, 10);
  assert.equal(r.points.filter((p) => p.type === 'sentinelle').length, 3);
  for (const p of r.points) assert.ok(metres(p, vrai[p.cle]) < 25, p.cle);
  assert.deepEqual(r.hors, []);
  // Un point marqué n'importe où en plus : il reste « hors schéma », le reste tient
  const avecIntrus = reconnaitre(arme, [marque(1, 'arriere'), marque(2, 'machine'), marque(3, 'droite'), marque(4, 'centre'), { id: 9, type: 'pylone', latitude: lat0 + 900 / k, longitude: -82.46 }], RAYON);
  assert.equal(avecIntrus.correspondances[4], 'centre');
  assert.deepEqual(avecIntrus.hors, [9]);
});

test('schéma : trois pylônes dont deux voisins ne suffisent pas à trancher', async () => {
  const { reconnaitre } = await import('./calage.js');
  // Les points réellement marqués le 22 nov. 2026 sur le site des plans d'arme : deux pylônes à 28 m, un à 165 m
  const marques = [
    { id: 3, type: 'pylone', latitude: 19.823774, longitude: -82.460739 },
    { id: 4, type: 'pylone', latitude: 19.828382, longitude: -82.457947 },
    { id: 5, type: 'pylone', latitude: 19.829027, longitude: -82.458595 },
  ];
  assert.deepEqual(reconnaitre(GABARITS.arme, marques, RAYON), { ambigu: true });
  // L'échelle de cette carte, mesurée, tranche : le pylône isolé est le Centre, les deux voisins les principaux
  const { ECHELLES } = await import('./calage.js');
  const r = reconnaitre(GABARITS.arme, marques, RAYON, { echelle: ECHELLES.arme });
  assert.deepEqual(r.correspondances, { 3: 'centre', 4: 'principal-d', 5: 'principal-g' });
  // Avec la relique marquée derrière le pylône de gauche : elle colle au schéma elle aussi
  const avec = reconnaitre(GABARITS.arme, [...marques, { id: 6, type: 'relique', latitude: 19.833798, longitude: -82.466009 }, { id: 1, type: 'relique', latitude: 19.819061, longitude: -82.463173 }], RAYON, { echelle: ECHELLES.arme });
  assert.equal(avec.correspondances[6], 'relique-gauche');
  assert.equal(avec.correspondances[1], 'relique-bas');
  assert.deepEqual(avec.hors, []);
  assert.deepEqual(avec.corrections, []);
  // Une « relique » marquée au pied du pylône Droite (calculé) : c'est un pylône, corrigé
  const droite = r.points.find((p) => p.cle === 'droite');
  const faux = reconnaitre(GABARITS.arme, [...marques, { id: 8, type: 'relique', latitude: droite.latitude + 6 / (RAD * RAYON), longitude: droite.longitude }], RAYON, { echelle: ECHELLES.arme });
  assert.deepEqual(faux.corrections, [{ id: 8, de: 'relique', type: 'pylone', cle: 'droite' }]);
  assert.equal(faux.correspondances[8], 'droite');
  assert.ok(!faux.points.some((p) => p.cle === 'droite'), 'plus calculé : il est marqué');
  // Loin de tout point du schéma : pas de correction
  const loin = reconnaitre(GABARITS.arme, [...marques, { id: 8, type: 'materiau', latitude: 19.9, longitude: -82.46 }], RAYON, { echelle: ECHELLES.arme });
  assert.deepEqual(loin.corrections, []);
});
