// Recettes des Gardiens : recopiées d'EDEngineer (22 nov. 2026), bien formées.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROUPES, INGREDIENTS, RECETTES, choixPropres } from './recettes.js';

const de = (id) => Object.fromEntries(RECETTES.find((x) => x.id === id).ingredients.map((i) => [i.cle, i.quantite]));

test('29 recettes, identifiants uniques, groupes connus, ingrédients connus et quantités entières', () => {
  assert.equal(RECETTES.length, 29);
  assert.equal(new Set(RECETTES.map((x) => x.id)).size, 29);
  assert.equal(new Set(RECETTES.map((x) => x.en)).size, 29);
  for (const x of RECETTES) {
    assert.ok(Object.hasOwn(GROUPES, x.groupe), x.id);
    assert.ok(x.nom && x.en, x.id);
    assert.ok(x.ingredients.length >= 4 && x.ingredients.length <= 5, x.id);
    for (const i of x.ingredients) {
      assert.ok(Object.hasOwn(INGREDIENTS, i.cle), `${x.id} : ${i.cle}`);
      assert.ok(Number.isInteger(i.quantite) && i.quantite > 0 && i.quantite <= 30, `${x.id} : ${i.cle}`);
    }
    // Chaque déblocage demande un segment de plan, d'un seul type
    const plans = x.ingredients.filter((i) => /blueprint$/.test(i.cle));
    assert.equal(plans.length, 1, x.id);
  }
  assert.deepEqual(Object.fromEntries(Object.keys(GROUPES).map((g) => [g, RECETTES.filter((x) => x.groupe === g).length])), { modules: 6, armes: 14, modifiees: 6, chasseurs: 3 });
});

test('quelques recettes, valeur par valeur', () => {
  assert.deepEqual(de('fsd-booster'), { guardian_moduleblueprint: 1, guardian_powercell: 21, guardian_techcomponent: 21, focuscrystals: 24, 'm:hnshockmount': 8 });
  assert.deepEqual(de('gauss-fixe-moyen'), { guardian_weaponblueprint: 1, guardian_powercell: 18, guardian_techcomponent: 20, manganese: 15, 'm:magneticemittercoil': 6 });
  assert.deepEqual(de('plasma-tourelle-grand'), { guardian_weaponblueprint: 2, guardian_powerconduit: 26, guardian_sentinel_weaponparts: 24, chromium: 26, 'm:articulationmotors': 10 });
  assert.deepEqual(de('trident'), { guardian_powercell: 25, guardian_vesselblueprint: 1, ancienttechnologicaldata: 26, ancientculturaldata: 18, guardian_techcomponent: 25 });
  assert.deepEqual(de('renfort-coque'), { guardian_moduleblueprint: 1, guardian_sentinel_wreckagecomponents: 21, ancientculturaldata: 16, ancienthistoricaldata: 16, 'm:reinforcedmountingplate': 12 });
});

test('ingrédients : un genre et un « où » chacun ; choix reçus nettoyés', () => {
  for (const [cle, i] of Object.entries(INGREDIENTS)) {
    assert.ok(['gardien', 'donnees', 'brut', 'fabrique', 'marchandise'].includes(i.genre), cle);
    assert.ok(i.fr && i.en && i.ou, cle);
    assert.equal(cle.startsWith('m:'), i.genre === 'marchandise', cle);
  }
  assert.deepEqual(choixPropres(['fsd-booster', 'inconnu', 'fsd-booster', 7, 'trident', '__proto__']), ['fsd-booster', 'trident']);
  assert.deepEqual(choixPropres(null), []);
  assert.deepEqual(choixPropres('fsd-booster'), []);
});

test('guides des pylônes : un par type de plan, cartes en lien, sites présents dans la liste connue', async () => {
  const { GUIDES, PLAN_DES_SITES, PYLONES_RELEVES, REGLES_PYLONES } = await import('./guides.js');
  const { SITES_CONNUS } = await import('./sites.js');
  assert.deepEqual(GUIDES.map((g) => g.plan), ['module', 'arme', 'vaisseau']);
  for (const g of GUIDES) {
    assert.ok(g.systeme && g.corps && g.etapes.length >= 3, g.plan);
    for (const c of g.cartes) assert.match(c.url, /^https:\/\/drive\.google\.com\/file\/d\//, g.plan);
    assert.match(g.guide, /^https:\/\/sites\.google\.com\/view\/elitedangerousguides\//);
  }
  assert.equal(REGLES_PYLONES.length, 5);
  assert.equal(PYLONES_RELEVES.pylones.length, 6);
  // Chaque structure dont on connaît le plan est bien dans la liste, et la liste le porte
  for (const [cle, plan] of Object.entries(PLAN_DES_SITES)) {
    const [systeme, corps] = cle.split('|');
    assert.equal(SITES_CONNUS.find((s) => s.systeme === systeme && s.corps === corps)?.plan, plan, cle);
  }
  assert.equal(SITES_CONNUS.filter((s) => s.plan).length, 3);
  assert.equal(SITES_CONNUS.length, 49);
  // Les pylônes relevés sont bien autour de la structure de la liste
  const s = SITES_CONNUS.find((x) => x.systeme === PYLONES_RELEVES.systeme);
  for (const p of PYLONES_RELEVES.pylones) assert.ok(Math.abs(p.latitude - s.latitude) < 0.02 && Math.abs(p.longitude - s.longitude) < 0.02, String(p.n));
});
