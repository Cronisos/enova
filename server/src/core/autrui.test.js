// Loadout du vaisseau d'un autre commandant : écarté à la lecture du journal.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadoutDAutrui, suiteAutrui } from './autrui.js';

const suivre = (evs) => evs.reduce((a, ev) => suiteAutrui(a, ev), false);

test('la fiche du vaisseau d’un équipier (sans valeur, rachat à 0) est reconnue, pas la tienne', () => {
  // Formes relevées le 22 nov. 2026 (noms remplacés)
  const equipier = { event: 'Loadout', Ship: 'mandalay', ShipID: 21, ShipIdent: 'TE-01S', HullHealth: 1, Rebuy: 0, Modules: [] };
  const mien = { event: 'Loadout', Ship: 'explorer_nx', ShipID: 36, HullValue: 177925284, ModulesValue: 156261569, Rebuy: 16709344, Modules: [] };
  assert.equal(loadoutDAutrui(equipier), true);
  assert.equal(loadoutDAutrui(mien), false);
  // Vaisseau gratuit : rachat à 0 mais valeur de coque écrite, c'est bien le tien
  assert.equal(loadoutDAutrui({ event: 'Loadout', Ship: 'sidewinder', ShipID: 1, HullValue: 0, Rebuy: 0 }), false);
  // Très vieux journal sans ces champs : gardé
  assert.equal(loadoutDAutrui({ event: 'Loadout', Ship: 'anaconda', ShipID: 3 }), false);
  assert.equal(loadoutDAutrui({ event: 'Docked' }, true), false, 'seuls les Loadout sont concernés');
});

test('à bord chez un autre : du Embark Multicrew (ou JoinACrew) jusqu’au retour dans ton vaisseau', () => {
  const monte = [{ event: 'LoadGame' }, { event: 'Embark', SRV: true, Multicrew: true }];
  assert.equal(suivre(monte), true);
  // Même une fiche complète est écartée tant que tu es chez lui
  assert.equal(loadoutDAutrui({ event: 'Loadout', ShipID: 21, HullValue: 1, Rebuy: 5 }, suivre(monte)), true);
  // À pied à côté de son vaisseau : toujours dans son équipage
  assert.equal(suivre([...monte, { event: 'DockSRV' }, { event: 'Disembark', Multicrew: true }]), true);
  assert.equal(suivre([...monte, { event: 'Embark', Multicrew: false, ID: 36 }]), false);
  assert.equal(suivre([{ event: 'JoinACrew' }]), true);
  assert.equal(suivre([{ event: 'JoinACrew' }, { event: 'QuitACrew' }]), false);
  assert.equal(suivre([{ event: 'JoinACrew' }, { event: 'Shutdown' }]), false);
  assert.equal(suivre([{ event: 'JoinACrew' }, { event: 'Fileheader' }]), false);
});
