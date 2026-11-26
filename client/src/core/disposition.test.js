// Liste des fenêtres à disposer (disposition.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fenetresOverlay, nomFenetre } from './disposition.js';

const X = () => null;

test('fenêtres à disposer : la principale de chaque module et ses fenêtres en plus, sans les tiroirs ni doublon', () => {
  const modules = [
    { id: 'waypoints', title: 'Mes repères', Hud: X, hudPages: { 'waypoints-sweep': X, 'waypoints-sweep-top': X, 'waypoints-sweep-pose': X } },
    { id: 'links', title: 'Applications externes' },
    { id: 'fsdcool', title: 'Refroidissement SCO', Hud: X },
    { id: 'combat', title: 'Combat', Hud: X },
    { id: 'autre', title: 'Autre', hudPages: { 'waypoints-sweep': X } },
  ];
  assert.deepEqual(fenetresOverlay(modules), [
    { page: 'waypoints', nom: 'Minage Rhino' },
    { page: 'waypoints-sweep', nom: 'Balayage de l’EEP' },
    { page: 'fsdcool', nom: 'Refroidissement SCO' },
    { page: 'combat', nom: 'Combat' },
  ]);
  assert.equal(nomFenetre('inconnue'), 'inconnue');
});

test('vigie des règles coupée : son cadre n’est pas proposé', () => {
  const modules = [{ id: 'regles', title: 'Règles du jeu', hudPages: { vigie: X } }, { id: 'bilan', title: 'Bilans', hudPages: { bilan: X } }];
  assert.deepEqual(fenetresOverlay(modules).map((f) => f.page), ['vigie', 'bilan']);
  assert.deepEqual(fenetresOverlay(modules, ['vigie']), [{ page: 'bilan', nom: 'Bilan de session' }]);
});
