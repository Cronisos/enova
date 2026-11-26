// Déclaration des modes de jeu et des rôles (core/modes.js) : forme, et validation d'un rôle de vaisseau.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  checkRole, hasRole, inRole, isMode, isRole, MAX_SECONDARY_ROLES, modeById, modeInfo, modeName, MODES, POLYVALENT, roleById, ROLES, windowsOf,
} from './modes.js';

const PAGE = /^[a-z0-9-]{1,30}$/; // nom de page de l'overlay (core/overlay.js validPage)

test('déclaration : identifiants uniques, fenêtres valides, HUD en premier, tout figé', () => {
  const ids = MODES.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.includes(POLYVALENT.id), 'Polyvalent n’est pas un mode');
  for (const m of MODES) {
    assert.match(m.id, PAGE);
    assert.ok(!(m.id in Object.prototype));
    assert.ok(m.label && m.icon, `${m.id} : nom et icône`);
    assert.equal(new Set(m.windows).size, m.windows.length, `${m.id} : fenêtres sans doublon`);
    for (const w of m.windows) assert.match(w, PAGE);
    if (m.windows.length) assert.equal(m.windows[0], m.id, `${m.id} : son HUD d'abord`);
    assert.ok(m.windows.length <= 15, `${m.id} : l'overlay en ouvre 16 au plus, Coup d'œil compris`);
    assert.ok(Object.isFrozen(m) && Object.isFrozen(m.windows));
    // Avis de bascule en bon français : « Colonisation activée », « Matériaux activés » (constat du 9 nov.)
    assert.ok(['activé', 'activée', 'activés', 'activées'].includes(m.activated), `${m.id} : accord de « activé » déclaré`);
  }
  assert.deepEqual(Object.fromEntries(MODES.map((m) => [m.id, m.activated])), {
    routes: 'activé', rares: 'activé', waypoints: 'activé', shipmining: 'activé', combat: 'activé', groundcombat: 'activé', rescue: 'activé', materials: 'activés', powerdelivery: 'activée', gardiens: 'activés', colonisation: 'activée',
  });
  assert.ok(Object.isFrozen(MODES) && Object.isFrozen(ROLES));
  assert.deepEqual(ROLES.map((r) => r.id), [...ids, 'polyvalent'], 'rôles = modes + Polyvalent, sans rien écrire en plus');
  assert.deepEqual(windowsOf('routes'), [], 'Commerce : pas de fenêtre');
  assert.deepEqual(windowsOf('waypoints'), ['waypoints', 'waypoints-list', 'waypoints-guide', 'waypoints-sweep', 'waypoints-sweep-top', 'waypoints-sweep-pose']);
  const copie = windowsOf('combat');
  copie.push('x');
  assert.deepEqual(windowsOf('combat'), ['combat'], 'windowsOf rend une copie');
  // Données pures : aucun import (l'interface la reprend telle quelle, compilée par Vite)
  assert.doesNotMatch(fs.readFileSync(new URL('./modes.js', import.meta.url), 'utf8'), /^import /m);
});

test('recherche par identifiant : jamais une propriété d’Object', () => {
  for (const id of ['constructor', '__proto__', 'toString', 'hasOwnProperty', '', null, undefined, 3, {}]) {
    assert.equal(modeById(id), null);
    assert.equal(roleById(id), null);
    assert.equal(isMode(id), false);
    assert.equal(isRole(id), false);
    assert.deepEqual(windowsOf(id), []);
  }
  assert.equal(isRole('polyvalent'), true);
  assert.equal(isMode('polyvalent'), false);
  assert.equal(modeName('rescue'), '✚ Sauvetage');
  assert.throws(() => modeInfo('__proto__'), /Mode de jeu inconnu : « __proto__ »/);
});

test('rôle valide : principal facultatif, secondaires facultatifs', () => {
  assert.deepEqual(checkRole({ primary: 'waypoints', secondary: ['shipmining', 'combat'] }), { ok: true, role: { primary: 'waypoints', secondary: ['shipmining', 'combat'] } });
  assert.deepEqual(checkRole({ primary: null, secondary: ['rescue'] }).role, { primary: null, secondary: ['rescue'] });
  assert.deepEqual(checkRole({ primary: 'polyvalent' }).role, { primary: 'polyvalent', secondary: [] });
  assert.deepEqual(checkRole({}).role, { primary: null, secondary: [] }, 'aucun rôle');
  const s = ['combat'];
  const r = checkRole({ primary: null, secondary: s });
  s.push('rescue');
  assert.deepEqual(r.role.secondary, ['combat'], 'copie, pas la liste reçue');
});

test('rôle refusé, avec la raison en français', () => {
  const cas = [
    [null, /Rôle illisible/],
    [[], /Rôle illisible/],
    ['waypoints', /Rôle illisible/],
    [{ primary: 4 }, /Rôle principal illisible/],
    [{ primary: 'minage' }, /Rôle principal inconnu : « minage »\. Rôles possibles : routes, rares, waypoints/],
    [{ primary: '__proto__' }, /Rôle principal inconnu/],
    [{ primary: 'constructor' }, /Rôle principal inconnu/],
    [{ primary: null, secondary: 'combat' }, /Rôles secondaires illisibles/],
    [{ primary: null, secondary: [3] }, /Rôle secondaire illisible/],
    [{ primary: null, secondary: ['polyvalent'] }, /« Polyvalent » ne peut être qu’un rôle principal/],
    [{ primary: null, secondary: ['toString'] }, /Rôle secondaire inconnu : « toString »/],
    [{ primary: null, secondary: ['combat', 'combat'] }, /Rôle secondaire en double : « Combat »/],
    [{ primary: 'combat', secondary: ['combat'] }, /« Combat » est déjà le rôle principal : retire-le des rôles secondaires/],
    [{ primary: 'polyvalent', secondary: ['combat'] }, /« Polyvalent » couvre déjà tous les modes/],
    [{ primary: null, secondary: ['combat', 'rescue', 'materials', 'routes'] }, new RegExp(`${MAX_SECONDARY_ROLES} rôles secondaires au plus`)],
    [{ primary: null, secondary: new Array(10_000).fill('combat') }, /rôles secondaires au plus/],
  ];
  for (const [entree, raison] of cas) {
    const r = checkRole(entree);
    assert.equal(r.ok, false, JSON.stringify(entree)?.slice(0, 80));
    assert.match(r.error, raison);
  }
});

test('hasRole et inRole', () => {
  assert.equal(hasRole(null), false);
  assert.equal(hasRole({ primary: null, secondary: [] }), false);
  assert.equal(hasRole({ primary: null, secondary: ['combat'] }), true);
  const r = { primary: 'waypoints', secondary: ['shipmining'] };
  assert.equal(inRole(r, 'waypoints'), true);
  assert.equal(inRole(r, 'shipmining'), true);
  assert.equal(inRole(r, 'combat'), false);
  assert.equal(inRole({ primary: 'polyvalent', secondary: [] }, 'combat'), true, 'Polyvalent : tout est dans son rôle');
  assert.equal(inRole({ primary: 'polyvalent', secondary: [] }, 'inconnu'), false);
  assert.equal(inRole(null, 'combat'), false);
});
