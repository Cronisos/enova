// Tranches de 30 minutes du quota Powerplay, déduites des chargements. Heures relevées dans les journaux (UTC).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grille, tranche } from './grille.js';

const p = (iso, n = 250) => ({ t: Date.parse(iso), n });
const NOV24 = [p('2026-11-24T21:22:47Z'), p('2026-11-24T21:23:13Z'), p('2026-11-24T21:54:59Z'), p('2026-11-24T22:25:13Z')];
const NOV25 = [p('2026-11-25T09:10:15Z'), p('2026-11-25T10:01:06Z'), p('2026-11-25T10:43:36Z'), p('2026-11-25T12:08:37Z'), p('2026-11-25T16:02:37Z'), p('2026-11-25T16:27:26Z')];

test('rien de chargé : pas de tranche ; un seul chargement : au plus tard 30 minutes après', () => {
  assert.equal(tranche([]), null);
  assert.equal(grille([p('2026-11-25T09:10:15Z')]), null);
  assert.deepEqual(tranche([p('2026-11-25T09:10:15Z')]), { since: '2026-11-25T09:10:15.000Z', nextAt: '2026-11-25T09:40:15.000Z', taken: 250, sure: false });
});

test('deux pleins quotas à 26 s d’écart : le changement de tranche est entre les deux', () => {
  const g = grille(NOV24.slice(0, 2));
  assert.deepEqual(g, { debut: Date.parse('2026-11-24T21:22:47Z') % 1_800_000, longueur: 26_000 });
  // Juste après le second : la tranche suivante commence au plus tard 30 min après lui, un seul chargement compté
  assert.deepEqual(tranche(NOV24.slice(0, 2)), { since: '2026-11-24T21:23:13.000Z', nextAt: '2026-11-24T21:53:13.000Z', taken: 250, sure: true });
});

test('25 nov. : la grille de la veille tient, le chargement de 09:10 ne se double pas avant 09:23', () => {
  const matin = [...NOV24, NOV25[0]];
  assert.deepEqual(tranche(matin), { since: '2026-11-25T09:10:15.000Z', nextAt: '2026-11-25T09:23:13.000Z', taken: 250, sure: true });
});

test('25 nov., 16:27 : chargé 25 minutes après 16:02, la recharge suivante est à 16:53 et pas à 16:32', () => {
  const t = tranche([...NOV24, ...NOV25]);
  assert.deepEqual(t, { since: '2026-11-25T16:27:26.000Z', nextAt: '2026-11-25T16:53:13.000Z', taken: 250, sure: true });
  // Sans la veille : la paire 16:02 / 16:27 suffit à dire que le changement est entre les deux, donc avant 16:57:26
  assert.deepEqual(tranche(NOV25), { since: '2026-11-25T16:27:26.000Z', nextAt: '2026-11-25T16:57:26.000Z', taken: 250, sure: true });
});

test('un quota pris en deux fois (249 t puis 1 t) compte pour une seule tranche et ne dit rien de la grille', () => {
  const prises = [p('2026-11-19T18:12:33Z'), p('2026-11-19T18:46:41Z', 249), p('2026-11-19T18:46:44Z', 1)];
  assert.equal(grille(prises), null, '18:12 et 18:46 sont à plus de 30 minutes, 249 n’est pas un plein quota');
  assert.deepEqual(tranche(prises), { since: '2026-11-19T18:46:41.000Z', nextAt: '2026-11-19T19:16:44.000Z', taken: 250, sure: false });
});

test('grille décalée depuis : une paire trop ancienne ou contradictoire ne compte plus', () => {
  // 21 nov. : changement vers la minute 41 ; plus de 36 h avant le 24 nov. au soir
  const vieux = [p('2026-11-21T16:41:17Z'), p('2026-11-21T16:41:23Z')];
  assert.deepEqual(grille([...vieux, ...NOV24]), grille(NOV24));
  // Deux paires récentes qui se contredisent : la plus récente l'emporte
  const contraire = [p('2026-11-24T10:41:17Z'), p('2026-11-24T10:41:23Z'), ...NOV24.slice(0, 2)];
  assert.deepEqual(grille(contraire), grille(NOV24.slice(0, 2)));
});
