// Session du mode Gardiens : seuls les matériaux des Gardiens comptent, et le lancement du jeu ne la vide pas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GARDIENS_EVENTS, GardiensState, estGardien } from './session.js';

const ramasse = (t, Name, Count, Category = 'Manufactured') => ({ timestamp: t, event: 'MaterialCollected', Category, Name, Count });

test('matériaux des Gardiens seulement', () => {
  assert.equal(estGardien('Guardian_PowerCell'), true);
  assert.equal(estGardien('ancienttechnologicaldata'), true);
  assert.equal(estGardien('manganese'), false, 'matière première : pas un matériau gardien');
  assert.equal(estGardien('m:hnshockmount'), false);
  assert.equal(estGardien('__proto__'), false);
  assert.equal(estGardien(null), false);
});

test('session : cumul par matériau, segments de plan, données, derniers ramassés', () => {
  const s = new GardiensState();
  assert.deepEqual(GARDIENS_EVENTS, ['MaterialCollected']);
  assert.equal(s.apply(ramasse('2026-11-22T10:00:00Z', 'iron', 3, 'Raw')), false);
  assert.equal(s.summary().startedAt, null, 'rien de gardien : pas de session');
  assert.equal(s.apply(ramasse('2026-11-22T10:01:00Z', 'guardian_powercell', 3)), true);
  s.apply(ramasse('2026-11-22T10:02:00Z', 'Guardian_PowerCell', 2));
  s.apply(ramasse('2026-11-22T10:03:00Z', 'guardian_moduleblueprint', 1));
  s.apply(ramasse('2026-11-22T10:04:00Z', 'ancientculturaldata', 3, 'Encoded'));
  assert.equal(s.apply(ramasse('2026-11-22T10:05:00Z', 'guardian_powercell', 0)), false);
  assert.equal(s.apply({ timestamp: '2026-11-22T10:06:00Z', event: 'LoadGame' }), false, 'relancer le jeu ne vide pas la session');
  const v = s.summary();
  assert.equal(v.startedAt, '2026-11-22T10:01:00Z');
  assert.deepEqual([v.total, v.plans, v.donnees], [9, 1, 3]);
  assert.deepEqual(v.collectes, [{ cle: 'guardian_powercell', count: 5 }, { cle: 'ancientculturaldata', count: 3 }, { cle: 'guardian_moduleblueprint', count: 1 }]);
  assert.deepEqual(v.recent[0], { at: '2026-11-22T10:04:00Z', cle: 'ancientculturaldata', count: 3 });
  s.reset('2026-11-22T11:00:00Z');
  assert.deepEqual([s.summary().total, s.summary().startedAt], [0, '2026-11-22T11:00:00Z']);
});
