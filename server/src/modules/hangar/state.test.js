// Hangars sans véhicule : un hangar acheté est vide jusqu'à l'achat d'un véhicule ; jamais d'alerte sur un doute.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HangarState, genreHangar } from './state.js';

const loadout = (ShipID, Modules, ShipName = '') => ({ event: 'Loadout', ShipID, Ship: 'explorer_nx', ShipName, Modules });
const achat = (ShipID, Slot, BuyItem, BuyItem_Localised) => ({ event: 'ModuleBuy', ShipID, Slot, BuyItem, BuyItem_Localised });
const GRAND = '$int_mkiilargebuggybay_size6_class3_free_name;';
const PETIT = '$int_mkiilargebuggybay_size2_class3_free_name;';

test('genre de hangar d’après le nom interne du module', () => {
  assert.equal(genreHangar('int_buggybay_size2_class1'), 'srv');
  assert.equal(genreHangar(GRAND), 'srv');
  assert.equal(genreHangar('Int_FighterBayMk2_Size5_Class1'), 'chasseur');
  assert.equal(genreHangar('int_cargorack_size6_class1'), null);
  assert.equal(genreHangar(null), null);
});

test('la séance du 22 nov. : grand hangar acheté puis rempli, petit hangar acheté ensuite et resté vide', () => {
  const s = new HangarState();
  s.apply(loadout(36, [{ Slot: 'Slot01_Size7', Item: 'int_cargorack_size7_class1' }], 'Caspian'));
  assert.equal(s.vides(), null);
  s.apply(achat(36, 'Slot03_Size6', GRAND, 'Grand hangar Mk II'));
  assert.deepEqual(s.vides().hangars.map((h) => h.slot), ['Slot03_Size6']);
  for (let i = 0; i < 4; i += 1) s.apply({ event: 'RestockVehicle', Type: 'mev_rhino', Count: 1 });
  assert.equal(s.vides(), null, 'véhicules achetés : le hangar est garni');
  s.apply(achat(36, 'Slot11_Size2', PETIT, 'Grand hangar Mk II (Gratuit)'));
  // Le Loadout qui suit l'achat ne fait pas oublier ce qu'on sait
  s.apply(loadout(36, [{ Slot: 'Slot03_Size6', Item: 'int_mkiilargebuggybay_size6_class3_free' }, { Slot: 'Slot11_Size2', Item: 'int_mkiilargebuggybay_size2_class3_free' }], 'Caspian'));
  assert.deepEqual(s.apply({ event: 'Undocked' }), { decollage: true });
  assert.deepEqual(s.vides(), { shipId: 36, vaisseau: 'Caspian', hangars: [{ slot: 'Slot11_Size2', nom: 'Grand hangar Mk II (Gratuit)', genre: 'srv' }] });
  s.garnir();
  assert.equal(s.vides(), null, '« Il est plein » : plus d’alerte');
});

test('jamais d’alerte sur un doute : hangar déjà là, ou ressorti du stockage ; un chasseur ne garnit pas un hangar planétaire', () => {
  const s = new HangarState();
  s.apply(loadout(7, [{ Slot: 'Slot02_Size4', Item: 'int_buggybay_size4_class2' }, { Slot: 'Slot05_Size6', Item: 'int_fighterbay_size6_class1' }]));
  assert.equal(s.vides(), null);
  assert.deepEqual(s.vue().hangars.map((h) => h.vide), [null, null]);
  s.apply({ event: 'ModuleRetrieve', ShipID: 7, Slot: 'Slot03_Size2', RetrievedItem: '$int_buggybay_size2_class1_name;' });
  assert.equal(s.vides(), null);
  s.apply(achat(7, 'Slot04_Size2', '$int_buggybay_size2_class2_name;'));
  s.apply({ event: 'RestockVehicle', Type: 'independent_fighter', Count: 1 });
  assert.deepEqual(s.vides().hangars.map((h) => [h.slot, h.nom]), [['Slot04_Size2', 'Hangar de véhicules planétaires (taille 2)']]);
  s.apply({ event: 'LaunchSRV', SRVType: 'testbuggy' });
  assert.equal(s.vides(), null, 'un véhicule sorti : il y en avait un');
});

test('hangar vendu, rangé, déplacé, remplacé ; chaque vaisseau a les siens', () => {
  const s = new HangarState();
  s.apply(achat(1, 'A', PETIT));
  s.apply({ event: 'ModuleSwap', ShipID: 1, FromSlot: 'A', ToSlot: 'B' });
  assert.deepEqual(s.vides().hangars.map((h) => h.slot), ['B']);
  s.apply(achat(1, 'B', '$int_cargorack_size2_class1_name;'));
  assert.equal(s.vides(), null, 'remplacé par autre chose');
  s.apply(achat(1, 'C', PETIT));
  s.apply({ event: 'ModuleStore', ShipID: 1, Slot: 'C' });
  assert.equal(s.vides(), null);
  s.apply(achat(1, 'D', PETIT));
  s.apply(loadout(2, []));
  assert.equal(s.vides(), null, 'autre vaisseau : pas concerné');
  s.apply(loadout(1, [{ Slot: 'D', Item: 'int_mkiilargebuggybay_size2_class3_free' }]));
  assert.equal(s.vides().hangars.length, 1);
  assert.equal(s.apply({ event: 'ModuleBuy', Slot: 'X', BuyItem: PETIT }), null, 'sans numéro de vaisseau : ignoré');
});
