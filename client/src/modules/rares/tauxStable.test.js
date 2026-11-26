// Taux horaire stable du commerce de rares : arrêté à la dernière vente.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releve, secondesALaVente, tauxStable } from './tauxStable.js';

const T0 = Date.parse('2026-11-23T16:00:00Z');
const iso = (s) => new Date(T0 + s * 1000).toISOString();
const session = (merits, extra = {}) => ({ startedAt: iso(0), merits, recent: merits ? [{ at: iso(1800), merits }, { at: iso(600), merits: 0 }] : [{ at: iso(600), merits: 0 }], ...extra });

test('le taux ne bouge plus entre deux ventes, et se met à jour à la vente suivante', () => {
  // Vente à 30 min de temps actif : relevé pris à ce moment
  let r = releve({ cle: `${iso(0)}|0`, seconds: 900 }, session(3758), 1800, T0 + 1800_000);
  assert.deepEqual(r, { cle: `${iso(0)}|3758`, seconds: 1800 });
  assert.equal(tauxStable(3758, r, 3758), 7516);
  // Dix minutes plus tard, rien de vendu : même relevé, même taux
  const apres = releve(r, session(3758), 2400, T0 + 2400_000);
  assert.equal(apres, r);
  assert.equal(tauxStable(3758, apres, 3758), 7516);
  // Deuxième vente à 60 min : la moyenne est refaite sur toute la session
  r = releve(apres, session(7000), 3600, T0 + 3600_000);
  assert.equal(tauxStable(7000, r, 7000), 7000);
  // Session remise à zéro : nouveau relevé
  assert.notEqual(releve(r, { ...session(0), startedAt: iso(4000) }, 0, T0 + 4000_000), r);
});

test('fenêtre ouverte en cours de session : relevé estimé à l’heure de la vente, pause à quai déduite', () => {
  // Vente à 30 min, on ouvre 10 min après en roulant : 2400 s actives → 1800 à la vente
  assert.equal(secondesALaVente(session(3758), 2400, T0 + 2400_000), 1800);
  // Vente à 30 min, resté à quai depuis (chrono en pause dès la vente), ouvert 20 min après : le temps actif n'a pas bougé
  assert.equal(secondesALaVente(session(3758, { pausedSince: iso(1800) }), 1800, T0 + 3000_000), 1800);
  // Reparti 5 min puis de nouveau en pause depuis 5 min
  assert.equal(secondesALaVente(session(3758, { pausedSince: iso(2100) }), 2100, T0 + 2400_000), 1800);
  assert.equal(secondesALaVente(session(0), 2400, T0 + 2400_000), null, 'rien de vendu');
  assert.deepEqual(releve(null, session(3758), 2400, T0 + 2400_000), { cle: `${iso(0)}|3758`, seconds: 1800 });
});

test('pas de taux avant la première vente, ni sur moins de 5 minutes, ni sans session', () => {
  assert.equal(tauxStable(0, { cle: 'x', seconds: 1800 }, 0), null);
  assert.equal(tauxStable(500, { cle: 'x', seconds: 200 }, 500), null);
  assert.equal(tauxStable(500, null, 500), null);
  assert.equal(releve(null, null, 100), null);
  assert.equal(releve(null, session(10), null), null);
});
