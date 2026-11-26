// Sites gardiens : filtre de la liste connue, repères déjà posés, repère créé depuis une structure.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activations, corpsComplet, dejaChezMoi, mesSites, repereDepuis, sitesFiltres } from './sitesVue.js';

const SITES = [
  { systeme: 'Système Test', corps: 'B 3', latitude: -34.8, longitude: 132.9, active: true },
  { systeme: 'Autre Test', corps: 'A 1', latitude: 1, longitude: 2, active: false },
];
const REPERES = [
  { id: 1, category: 'mining', system: 'Système Test' },
  { id: 2, category: 'guardian', system: 'système test', body: 'Système Test B 3' },
  { id: 3, category: 'guardian', system: 'Ailleurs' },
];

test('mes sites, et structure déjà dans mes repères', () => {
  assert.deepEqual(mesSites(REPERES).map((w) => w.id), [2, 3]);
  assert.deepEqual(mesSites(null), []);
  assert.equal(corpsComplet(SITES[0]), 'Système Test B 3');
  assert.equal(dejaChezMoi(SITES[0], REPERES), true);
  assert.equal(dejaChezMoi(SITES[1], REPERES), false);
  assert.equal(dejaChezMoi(SITES[0], [{ category: 'guardian', system: 'Système Test', body: 'Système Test C 1' }]), false, 'autre corps du même système');
  assert.equal(dejaChezMoi(SITES[0], [{ category: 'guardian', system: 'Système Test' }]), true, 'repère sans corps : le système suffit');
});

test('filtre : actives seules par défaut, texte cherché dans le système et le corps', () => {
  assert.deepEqual(sitesFiltres(SITES).map((s) => s.systeme), ['Système Test']);
  assert.equal(sitesFiltres(SITES, { actives: false }).length, 2);
  assert.deepEqual(sitesFiltres(SITES, { actives: false, texte: ' autre ' }).map((s) => s.corps), ['A 1']);
  assert.deepEqual(sitesFiltres(SITES, { actives: false, texte: 'test b' }).map((s) => s.corps), ['B 3']);
  assert.deepEqual(sitesFiltres(null), []);
});

test('repère créé depuis une structure connue, et activations à prévoir', () => {
  const r = repereDepuis(SITES[0], { nom: 'Source Test', date: '2018-03-01' });
  assert.deepEqual({ ...r, notes: null }, { label: 'Structure gardienne · Système Test B 3', category: 'guardian', system: 'Système Test', body: 'Système Test B 3', latitude: -34.8, longitude: 132.9, notes: null });
  assert.match(r.notes, /Structure active/);
  assert.match(r.notes, /Source Test, 2018/);
  assert.match(repereDepuis(SITES[1]).notes, /inactive/);
  assert.deepEqual(activations([{ cle: 'guardian_weaponblueprint', manque: 3 }, { cle: 'guardian_moduleblueprint', manque: 0 }, { cle: 'guardian_powercell', manque: 40 }, { cle: 'guardian_vesselblueprint', manque: 1 }]), [{ type: 'arme', nombre: 3 }, { type: 'vaisseau', nombre: 1 }]);
  assert.deepEqual(activations(null), []);
});
