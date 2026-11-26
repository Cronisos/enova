// Fiche d'un vaisseau et cartes de la flotte (ficheVue.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumeEcart, badgeIngenierie, barresGrade, chiffresCarte, credits, groupesStats, modeles, modulesParGroupe, ordreFlotte, padTexte, passeRole, resistances, rolesFlotte, SANS_ROLE, texteIngenierie } from './ficheVue.js';

const NB = ' '; // espace fine insécable des milliers (fr-FR)

const stats = {
  jump: { max: 37.84, unladen: 36.1, laden: 30.2, range: 210.5 },
  fuel: 32, cargo: 256, cabins: [], mass: { unladen: 1506.3 },
  shields: 412.4, shieldRes: { kin: 39.6, thm: -20, exp: 50 }, shield: { cellsTotal: 0, full: 98 },
  armour: 1450, armourRes: { kin: 20, thm: 0, exp: -40 },
  speed: 212, boost: 280, boosts: 2, rotation: { pitch: 21.5 },
  power: { deployed: 18.2, capacity: 22.5 }, heat: { powerPlant: 7.3, weapons: 0 },
  armament: { list: [], burst: 0, wepTime: null }, dps: 0,
  cost: { rebuy: 1234567 },
};

test('cartes : saut, soute, boucliers ; rien de vide', () => {
  assert.deepEqual(chiffresCarte({ pad: 'L', saut: 1, soute: 0, boucliers: 0 }).map((c) => [c.label, c.valeur]), [['pad', 'L'], ['saut', '1 AL']]);
  assert.equal(padTexte('M'), 'Pad M (moyen)');
  assert.equal(padTexte(null), '');
  assert.deepEqual(barresGrade({ grade: 3, max: 5 }), [true, true, true, false, false]);
  assert.deepEqual(barresGrade(null), []);
  assert.deepEqual(chiffresCarte({ saut: 24.6, soute: 256, boucliers: 412 }), [
    { label: 'saut', valeur: '24,6 AL' }, { label: 'soute', valeur: '256 t' }, { label: 'boucliers', valeur: '412 MJ' },
  ]);
  assert.deepEqual(chiffresCarte({ saut: 60, soute: 0, boucliers: 0 }).map((c) => c.label), ['saut']);
  assert.deepEqual(chiffresCarte(null), []);
  assert.equal(credits(1234567), '1,2 M cr');
  assert.equal(credits(41234), '41 k cr');
  assert.equal(credits(980), '980 cr');
  assert.equal(credits(2.5e9), '2,5 Md cr');
});

test('stats : groupes, chiffres du jeu d’abord, sans armement s’il n’y en a pas', () => {
  const g = groupesStats({ stats, jeu: { saut: 38.01, soute: 256, rachat: 2000000 } });
  assert.deepEqual(g.map((x) => x.titre), ['Saut', 'Défense', 'Mobilité', 'Énergie et chaleur', 'Soute et valeur']);
  assert.equal(g[0].lignes[0].valeur, '38,01 AL');
  assert.equal(g[1].lignes[0].valeur, '412 MJ');
  assert.deepEqual(g[1].lignes[0].res, [{ label: 'Cin.', valeur: 40 }, { label: 'Therm.', valeur: -20 }, { label: 'Expl.', valeur: 50 }]);
  assert.equal(g[4].lignes.find((l) => l.label === 'Rachat').valeur, '2 M cr');
  assert.equal(g[3].lignes[0].valeur, '18,2 / 22,5 MW');
  const arme = groupesStats({ stats: { ...stats, dps: 120.5, armament: { list: [{}], burst: 160, wepTime: 12 } } });
  assert.equal(arme.find((x) => x.titre === 'Armement').lignes[0].valeur, '120,5');
  assert.equal(groupesStats({ stats: { ...stats, shields: 0, shieldRes: null } })[1].lignes[0].valeur, 'aucun');
  assert.equal(resistances(null).length, 0);
});

test('modules, ingénierie, modèles, ordre', () => {
  const f = { groupes: [{ key: 'hardpoint', label: 'Points d’emport' }, { key: 'component', label: 'Modules de base' }], modules: [{ groupe: 'component', module: '5A Propulseurs' }] };
  assert.deepEqual(modulesParGroupe(f).map((g) => g.key), ['component']);
  const soutes = { groupes: [{ key: 'internal', label: 'Internes' }], modules: [
    { groupe: 'internal', emplacement: 'Interne (6)', module: '6E Soute (64 t)', ingenierie: null, effet: null },
    { groupe: 'internal', emplacement: 'Interne (6)', module: '6E Soute (64 t)', ingenierie: null, effet: null },
    { groupe: 'internal', emplacement: 'Interne (5)', module: '5E Soute (32 t)', ingenierie: null, effet: null },
    { groupe: 'internal', emplacement: 'Interne (6)', module: '6E Soute (64 t)', ingenierie: null, effet: null },
  ] };
  assert.deepEqual(modulesParGroupe(soutes)[0].modules.map((m) => [m.module, m.nombre]), [['6E Soute (64 t)', 2], ['5E Soute (32 t)', 1], ['6E Soute (64 t)', 1]]);
  assert.equal(texteIngenierie({ plan: 'Propulseurs sales', grade: 5, max: 5 }), 'Propulseurs sales G5');
  assert.equal(texteIngenierie({ plan: 'Portée accrue', grade: 4, max: 5 }), 'Portée accrue G4/5');
  assert.equal(texteIngenierie(null), '');
  const flotte = [{ model: 'Anaconda', name: 'B' }, { model: 'Cobra Mk III' }, { model: 'Anaconda', name: 'A' }, { model: 'Type-11 Prospector', current: true }];
  assert.deepEqual(modeles(flotte), [{ model: 'Anaconda', nombre: 2 }, { model: 'Cobra Mk III', nombre: 1 }, { model: 'Type-11 Prospector', nombre: 1 }]);
  assert.deepEqual(ordreFlotte(flotte).map((s) => s.name || s.model), ['Type-11 Prospector', 'A', 'B', 'Cobra Mk III']);
  assert.ok(entierOk());
});

function entierOk() {
  return `1${NB}234` === new Intl.NumberFormat('fr-FR').format(1234);
}

test('badge ingénierie : nombre de modules et grade max ; rien sans configuration connue', () => {
  assert.deepEqual(badgeIngenierie({ ingenierie: { modules: 7, gradeMax: 5 } }), { nombre: 7, gradeMax: 5, actif: true, texte: "7 modules ingéniérés · jusqu'au grade 5" });
  assert.equal(badgeIngenierie({ ingenierie: { modules: 1, gradeMax: 3 } }).texte, "1 module ingéniéré · jusqu'au grade 3");
  assert.deepEqual(badgeIngenierie({ ingenierie: { modules: 0, gradeMax: null } }), { nombre: 0, gradeMax: null, actif: false, texte: 'Aucun module ingéniéré' });
  assert.equal(badgeIngenierie({}), null);
  assert.equal(badgeIngenierie(null), null);
});

test('badge ingénierie : nombre de modules et grade max ; rien sans configuration connue', () => {
  assert.deepEqual(badgeIngenierie({ ingenierie: { modules: 7, gradeMax: 5 } }), { nombre: 7, gradeMax: 5, actif: true, texte: "7 modules ingéniérés · jusqu'au grade 5" });
  assert.equal(badgeIngenierie({ ingenierie: { modules: 1, gradeMax: 3 } }).texte, "1 module ingéniéré · jusqu'au grade 3");
  assert.deepEqual(badgeIngenierie({ ingenierie: { modules: 0, gradeMax: null } }), { nombre: 0, gradeMax: null, actif: false, texte: 'Aucun module ingéniéré' });
  assert.equal(badgeIngenierie({}), null);
  assert.equal(badgeIngenierie(null), null);
});

test('résumé de ce qu’il te faut pour un build', () => {
  assert.equal(resumeEcart({ identique: true }), 'Rien à faire : ta configuration a déjà tout');
  assert.equal(resumeEcart({ identique: false, achats: 2, ingenierie: 1, retraits: 0 }), '2 modules à acheter · 1 modification');
  assert.equal(resumeEcart({ identique: false, achats: 0, ingenierie: 3, retraits: 1 }), '3 modifications · 1 à retirer');
  assert.equal(resumeEcart(null), 'Écart indisponible');
});

test('filtre par rôle : rôles portés par la flotte (principal ou secondaire), comptés, « Sans rôle » à la fin', () => {
  const tag = (id, label) => ({ id, label, icone: '', couleur: '#fff' });
  const tags = { 1: [tag('waypoints', 'Minage Rhino'), tag('routes', 'Commerce')], 2: [tag('routes', 'Commerce')], 3: [], 4: [tag('combat', 'Combat')] };
  const flotte = [{ shipId: 1 }, { shipId: 2 }, { shipId: 3 }, { shipId: 4 }];
  const roles = rolesFlotte(flotte, (s) => tags[s.shipId]);
  assert.deepEqual(roles.map((r) => [r.id, r.nombre]), [['routes', 2], ['combat', 1], ['waypoints', 1], [SANS_ROLE, 1]]);
  assert.deepEqual(rolesFlotte([{ shipId: 2 }], (s) => tags[s.shipId]).map((r) => r.id), ['routes'], 'pas de « Sans rôle » si tous en ont un');
  const passent = (role) => flotte.filter((s) => passeRole(tags[s.shipId], role)).map((s) => s.shipId);
  assert.deepEqual(passent(''), [1, 2, 3, 4]);
  assert.deepEqual(passent('routes'), [1, 2]);
  assert.deepEqual(passent('waypoints'), [1]);
  assert.deepEqual(passent(SANS_ROLE), [3]);
  assert.deepEqual(passent('inconnu'), []);
});
