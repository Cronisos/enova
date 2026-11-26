// Couleurs des minerais : une par minerai, la même partout, sans doublon.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUTRES_COULEURS, LAST_SPOT, MINERAIS_COLORES, ORE_COLORS, UNKNOWN_ORE, couleurMinerai } from './oreColors.js';
import { COMMUNAUTE } from './guideRessources.js';

test('chaque minerai a sa couleur, différente de toutes les autres, du blanc et de l’orange du dernier minage', () => {
  const toutes = [...Object.values(ORE_COLORS), ...Object.values(AUTRES_COULEURS)];
  assert.equal(new Set(toutes.map((c) => c.toLowerCase())).size, toutes.length, 'aucune couleur en double');
  for (const c of toutes) {
    assert.match(c, /^#[0-9a-f]{6}$/i);
    assert.notEqual(c.toLowerCase(), UNKNOWN_ORE.toLowerCase());
    assert.notEqual(c.toLowerCase(), LAST_SPOT.toLowerCase());
  }
  assert.equal(Object.keys(ORE_COLORS).length, 12, 'les 12 courants (boutons du tiroir) ne changent pas');
  assert.deepEqual(Object.keys(AUTRES_COULEURS).filter((k) => Object.hasOwn(ORE_COLORS, k)), []);
  assert.equal(MINERAIS_COLORES.length, toutes.length);
});

test('couleur par nom : accents et casse ignorés ; inconnu : blanc', () => {
  assert.equal(couleurMinerai('Iridium'), '#b46cff');
  assert.equal(couleurMinerai('Bénitoïte'), AUTRES_COULEURS['Benitoïte']);
  assert.equal(couleurMinerai('sérendibite'), AUTRES_COULEURS.Serendibite);
  assert.equal(couleurMinerai('Diamants basse température'), '#c9f2ff');
  assert.equal(couleurMinerai('Caillou inconnu'), UNKNOWN_ORE);
  assert.equal(couleurMinerai(null), UNKNOWN_ORE);
  assert.equal(couleurMinerai('constructor'), UNKNOWN_ORE);
});

test('toutes les ressources du guide de la communauté ont une couleur', () => {
  for (const r of COMMUNAUTE) assert.notEqual(couleurMinerai(r.nom), UNKNOWN_ORE, r.nom);
});
