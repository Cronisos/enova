// Lignes du tableau d'un plan : à bord aujourd'hui, visé, reste à faire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aFaire, bilan, ligne, texteModif } from './planVue.js';

const GRP = { blueprints: [{ key: 'PowerPlant_Boosted', name: 'Surchargé' }, { key: 'Weapon_Efficient', name: 'Efficace' }], specials: [{ key: 'special_thermal', name: 'Répartition thermique' }] };
const gen = { module: 'int_powerplant_size8_class5', label: '8A Générateur' };

test('module à bord déjà au niveau visé : fait, rien à appliquer', () => {
  const l = ligne({
    key: 'std-pp', label: 'Générateur', size: 8,
    current: { ...gen, blueprint: 'PowerPlant_Boosted', blueprintLabel: 'Surchargé', grade: 5, quality: 1, experimentalLabel: 'Répartition thermique' },
    target: { ...gen, blueprint: 'PowerPlant_Boosted', grade: 5, experimental: 'special_thermal' },
  }, { done: true, rolls: 0 }, GRP);
  assert.equal(l.etat, 'fait');
  assert.equal(l.appl, 0);
  assert.equal(texteModif(l.actuel), 'G5 Surchargé · Répartition thermique');
  assert.equal(texteModif(l.vise), 'G5 Surchargé · Répartition thermique');
  assert.equal(aFaire(l), false);
});

test('bon module, modification à faire : modifier, avec le nombre d’applications', () => {
  const l = ligne({
    key: 'std-pp', label: 'Générateur', size: 8,
    current: { ...gen, blueprint: null, grade: 0 },
    target: { ...gen, blueprint: 'PowerPlant_Boosted', grade: 5, experimental: null },
  }, { done: false, rolls: 16, estimate: true, blocked: false }, GRP);
  assert.equal(l.etat, 'modifier');
  assert.deepEqual([l.appl, l.estimation, l.bloque], [16, true, false]);
  assert.equal(texteModif(l.actuel), 'sans modification');
  assert.equal(texteModif(l.vise), 'G5 Surchargé');
  assert.equal(aFaire(l), true);
});

test('le module visé n’est pas celui à bord, ou l’emplacement est vide : à monter', () => {
  const vise = { module: 'hpt_beamlaser_gimbal_medium', label: '2D Rayon laser', blueprint: 'Weapon_Efficient', grade: 5, experimental: null };
  const autre = ligne({ key: 'hp-3', label: 'Moyen', size: 2, current: { module: 'hpt_pulselaser_gimbal_medium', label: '2G Laser à impulsion', grade: 0 }, target: vise }, { done: false, rolls: 16 }, GRP);
  assert.equal(autre.etat, 'monter');
  assert.equal(autre.appl, 16);
  const vide = ligne({ key: 'hp-7', label: 'Utilitaire', size: 0, current: null, target: vise }, undefined, GRP);
  assert.equal(vide.etat, 'monter');
  assert.equal(vide.actuel, null);
  assert.equal(vide.appl, 0);
});

test('emplacement que le plan veut vide, emplacement vide des deux côtés', () => {
  const retirer = ligne({ key: 'int-12', label: 'Interne', size: 1, current: { module: 'int_planetapproachsuite_advanced', label: 'Module d’approche' }, target: { module: null } }, undefined, GRP);
  assert.equal(retirer.etat, 'retirer');
  assert.equal(aFaire(retirer), true);
  const rien = ligne({ key: 'int-13', label: 'Interne', size: 1, current: null, target: { module: null } }, undefined, GRP);
  assert.equal(rien.etat, 'vide');
  assert.equal(aFaire(rien), false);
});

test('grade en cours : la part faite est dite ; nom inconnu : la clé', () => {
  assert.equal(texteModif({ modif: 'Surchargé', grade: 4, part: 60, effet: null }), 'G4 Surchargé (60 %)');
  const l = ligne({ key: 'x', label: 'X', current: null, target: { module: 'm', label: 'M', blueprint: 'Inconnue', grade: 3, experimental: 'special_x' } }, undefined, GRP);
  assert.equal(texteModif(l.vise), 'G3 Inconnue · special_x');
});

test('bilan : décompte par état', () => {
  const lignes = [{ etat: 'monter' }, { etat: 'monter' }, { etat: 'modifier' }, { etat: 'fait' }, { etat: 'vide' }];
  assert.deepEqual(bilan(lignes), { monter: 2, retirer: 0, modifier: 1, fait: 1, vide: 1 });
});
