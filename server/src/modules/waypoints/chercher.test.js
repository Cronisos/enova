// Chercher un minerai : les endroits connus, tous systèmes confondus (chercher.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lieuxParMinerai } from './chercher.js';
import { buildSurvey } from './survey.js';

const site = (system, body, number, rating, ores, plus = {}) => ({ system, body, number, rating, bad: false, deposits: JSON.stringify(ores.map((ore) => ({ ore }))), notes: '', ...plus });
const repere = (id, system, body, siteNumber, label, plus = {}) => ({ id, category: 'mining', system, body, siteNumber, label, unprofitable: false, depletedUntil: null, drills: null, ...plus });

test('un minerai : ses endroits dans tous les systèmes, les bons d’abord (le plus de foreuses, puis la note), les taris à la fin', () => {
  const dans2026 = new Date('2026-11-19T12:00:00Z');
  const reperesA = [repere(1, 'Système A', 'Système A 4', 10, 'Iridium', { drills: 4 }), repere(2, 'Système A', 'Système A 4', 16, 'Iridium', { depletedUntil: '2027-01-10T00:00:00Z' })];
  const a = buildSurvey({
    system: 'Système A', systemAddress: '111',
    classes: new Map([['Système A 4', 'High metal content body']]),
    sites: [site('Système A', 'Système A 4', 10, 8, ['Iridium', 'Hélium']), site('Système A', 'Système A 4', 16, 7, ['Iridium']), site('Système A', 'Système A 4', 3, 2, ['Iridium'])],
    waypoints: reperesA,
  }, dans2026);
  const b = buildSurvey({
    system: 'Système B', systemAddress: '222',
    classes: new Map([['Système B 2 a', 'Metal rich body']]),
    sites: [site('Système B', 'Système B 2 a', 5, 9, ['Iridium']), site('Système B', 'Système B 2 a', 6, null, ['Iridium'], { bad: true })],
    waypoints: [],
  }, dans2026);
  const reperes = new Map(reperesA.map((w) => [w.id, w]));
  const liste = lieuxParMinerai([a, b], reperes);
  const iridium = liste.find((m) => m.ore === 'Iridium');
  assert.deepEqual(iridium.lieux.map((l) => [l.system, l.name, l.eep, l.note, l.etat]), [
    ['Système A', '4', 10, 8, 'bon'], // 4 foreuses : avant le mieux noté, qui n'en a aucune de connue
    ['Système B', '2 a', 5, 9, 'bon'],
    ['Système A', '4', 3, 2, 'petit'],
    ['Système A', '4', 16, 7, 'tari'],
  ], 'l’EEP « rien d’intéressant » (B, n° 6) n’est pas proposé');
  assert.equal(iridium.bons, 2);
  assert.deepEqual([iridium.lieux[0].foreuses, iridium.lieux[0].type, iridium.lieux[0].systemAddress], [4, 'Haute teneur en métaux', '111']);
  assert.ok(iridium.lieux[3].retour, 'un tari donne sa date de retour');
  assert.equal(liste[0].ore, 'Iridium', 'le minerai qui a le plus de bons endroits d’abord');
  assert.deepEqual(liste.find((m) => m.ore === 'Hélium').lieux.map((l) => l.eep), [10]);
});

test('planète écartée, relevés vides ou mal formés : rien, sans erreur', () => {
  const ecartee = buildSurvey({ system: 'S', sites: [site('S', 'S 1', 1, 9, ['Platine'])], bodies: [{ system: 'S', body: 'S 1', out: true, notes: '' }], waypoints: [] });
  assert.deepEqual(lieuxParMinerai([ecartee]), []);
  assert.deepEqual(lieuxParMinerai([]), []);
  assert.deepEqual(lieuxParMinerai(null), []);
  assert.deepEqual(lieuxParMinerai([null, {}, { planets: [{ ores: [{ ore: '' }] }] }]), []);
});

test('noms tapés à la main : ramenés à leur minerai, sans doublon ; ce qui n’est pas un minerai est écarté', () => {
  const s = buildSurvey({
    system: 'S',
    sites: [site('S', 'S 1', 4, 8, ['Iridium'])],
    waypoints: [repere(1, 'S', 'S 1', 4, 'iridim'), repere(2, 'S', 'S 1', 4, 'pas rentable le 12'), repere(3, 'S', 'S 1', 7, 'Iridiul')],
  });
  const minerai = (nom) => (/^irid/i.test(nom) ? 'Iridium' : null);
  const liste = lieuxParMinerai([s], new Map(), minerai);
  assert.deepEqual(liste.map((m) => m.ore), ['Iridium']);
  assert.deepEqual(liste[0].lieux.map((l) => l.eep), [4, 7], 'EEP 4 une seule fois, malgré « Iridium » et « iridim »');
});
