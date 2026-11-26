// Bandeau de refroidissement : la courbe de chaleur (vague.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VAGUE_H, VAGUE_L, chaleur, hauteurVague, partVidee, traceVague } from './vague.js';

test('courbe de chaleur : haute à gauche, basse à droite, toujours dans son cadre', () => {
  const quart = (k) => {
    let somme = 0;
    for (let x = (k * VAGUE_L) / 4; x < ((k + 1) * VAGUE_L) / 4; x += 1) somme += chaleur(x);
    return somme / (VAGUE_L / 4);
  };
  // Elle descend : chaque quart est plus bas que le précédent, en moyenne
  assert.ok(quart(0) > quart(1) && quart(1) > quart(2) && quart(2) > quart(3), 'la chaleur retombe de gauche à droite');
  assert.ok(quart(0) > 3 * quart(3), 'nettement plus haute au début qu’à la fin');
  for (let x = 0; x <= VAGUE_L; x += 1) {
    assert.ok(hauteurVague(x) > 2 && hauteurVague(x) < VAGUE_H - 1, `hors cadre à ${x}`);
  }
  const t = traceVague();
  assert.match(t, /^M0 \d/);
  assert.ok(t.includes(`L${VAGUE_L} `), 'jusqu’au bord droit');
});

test('courbe vidée : avec le temps écoulé, bornée ; pleine quand la durée est inconnue', () => {
  assert.equal(partVidee(0), 0);
  assert.equal(partVidee(0.25), 0.25);
  assert.equal(partVidee(1), 1);
  assert.equal(partVidee(3), 1);
  assert.equal(partVidee(-1), 0);
  assert.equal(partVidee(NaN), 0);
  assert.equal(partVidee(undefined), 0);
  assert.equal(partVidee(null), 0);
});
