// Site gardien en vue : reconnu à l'approche, gardé au retour au menu, oublié en quittant la planète.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SITE_EVENTS, SiteState, formeDe, planDuCorps } from './site.js';

const approche = (Name, BodyName, extra = {}) => ({ timestamp: '2026-11-22T17:50:30Z', event: 'ApproachSettlement', Name, Name_Localised: 'Structure des Guardians', BodyName, Latitude: 19.823612, Longitude: -82.460922, ...extra });

test('forme du site et type de plan d’après le corps', () => {
  assert.equal(formeDe('$Ancient_Small_002:#index=1;'), 'ancient_small_002');
  assert.equal(formeDe('Gibbs Hydroponics Site'), null);
  assert.equal(planDuCorps('Synuefe EU-Q c21-10 A 3'), 'arme');
  assert.equal(planDuCorps('synuefe nl-n c23-4 b 3'), 'module');
  assert.equal(planDuCorps('Synuefe EU-Q c21-15 A 1'), 'vaisseau', 'site des guides, absent de la liste de 2018');
  assert.equal(planDuCorps('Système Test 2 a'), null);
});

test('le relevé du 22 nov. : site reconnu, son guide donné ; une colonie ordinaire est ignorée', () => {
  const s = new SiteState();
  assert.ok(SITE_EVENTS.includes('ApproachSettlement'));
  assert.equal(s.apply({ event: 'ApproachSettlement', Name: 'Gibbs Hydroponics Site', BodyName: 'Système Test 2 a' }), false);
  assert.equal(s.vue().site, null);
  assert.equal(s.apply(approche('$Ancient_Small_002:#index=1;', 'Synuefe EU-Q c21-10 A 3')), true);
  const v = s.vue();
  assert.deepEqual(v.site, { nom: 'Structure des Guardians', forme: 'ancient_small_002', corps: 'Synuefe EU-Q c21-10 A 3', latitude: 19.823612, longitude: -82.460922, plan: 'arme', at: '2026-11-22T17:50:30Z' });
  assert.equal(v.guide.plan, 'arme');
  assert.equal(s.apply(approche('$Ancient_Small_002:#index=1;', 'Synuefe EU-Q c21-10 A 3')), false, 'même site revu (jeu relancé) : rien de neuf');
  assert.equal(s.apply({ event: 'LeaveBody' }), true);
  assert.deepEqual(s.vue(), { site: null, guide: null });
  assert.equal(s.apply({ event: 'FSDJump' }), false, 'déjà sans site');
});

test('site au plan inconnu : montré sans guide', () => {
  const s = new SiteState();
  s.apply(approche('$Ancient:#index=2;', 'Système Test 2 a', { Latitude: 'x' }));
  assert.equal(s.vue().site.plan, null);
  assert.equal(s.vue().site.latitude, null);
  assert.equal(s.vue().guide, null);
});
