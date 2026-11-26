// Partage avec l'escadron, de bout en bout : la classe Partage de l'app face au vrai Worker (la copie que l'app met
// en ligne chez le chef), sur une base SQLite en mémoire avec son schéma. Aucun réseau.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { handle } from './chef/worker/squadron-worker.js';
import { Partage, destinataires } from './partage.js';
import { rolesValides } from './chef/chef.js';

const BASE = 'https://escadron-test.workers.dev';
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'partage-'));

function escadron() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(fs.readFileSync(new URL('./chef/worker/schema.sql', import.meta.url), 'utf8'));
  const statement = (sql, args = []) => ({
    bind: (...values) => statement(sql, values),
    run: async () => sqlite.prepare(sql).run(...args),
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
  });
  const env = { DB: { prepare: (sql) => statement(sql), batch: async (l) => Promise.all(l.map((s) => s.run())) }, ADMIN_TOKEN: 'chef', TRACKER_TOKEN: 'suivi', JOIN_PASSWORD: 'code' };
  const appels = [];
  let ip = 0;
  const fetch = async (url, options = {}) => {
    appels.push({ url, method: options.method || 'GET', auth: options.headers?.authorization, body: typeof options.body === 'string' ? options.body : null });
    const { signal: _, ...reste } = options;
    return handle(new Request(url, { ...reste, headers: { ...reste.headers, 'cf-connecting-ip': `203.0.113.${(ip += 1) % 250}` } }), env);
  };
  const json = async (chemin, options) => (await fetch(`${BASE}${chemin}`, options)).json();
  const rejoindre = async (cmdr) => (await json('/v1/join', { method: 'POST', body: JSON.stringify({ cmdr, password: 'code' }) })).token;
  const chef = (chemin, method, body) => json(chemin, { method, headers: { authorization: 'Bearer chef' }, body: body ? JSON.stringify(body) : undefined });
  /** L'app d'un membre : son jeton, et le partage activé. */
  const app = async (cmdr, { actif = true } = {}) => {
    const token = await rejoindre(cmdr);
    const p = new Partage({ dir: tmp(), fetch, acces: () => ({ base: BASE, token }) });
    if (actif) p.activer(true);
    return p;
  };
  return { fetch, appels, rejoindre, chef, app };
}

const REPERE = { kind: 'repere-rhino', ref: '12', title: 'Filon de platine', data: { system: 'Système Test', body: 'Système Test 2 a', latitude: 1.5, longitude: -2.25 } };

test('rien ne part tant que le partage n’est pas activé', async () => {
  const e = escadron();
  const p = await e.app('Testeur', { actif: false });
  const avant = e.appels.length;
  assert.equal(p.view().actif, false);
  p.rafraichirSiVieux();
  await assert.rejects(p.lire(), (err) => err.status === 409);
  await assert.rejects(p.envoyer({ ...REPERE, to: { all: true } }), (err) => err.status === 409);
  assert.equal(e.appels.length, avant);
});

test('sans serveur ni jeton : refus net, aucun appel', async () => {
  const e = escadron();
  const p = new Partage({ dir: tmp(), fetch: e.fetch, acces: () => ({ base: null, token: null }) });
  p.activer(true);
  await assert.rejects(p.lire(), (err) => err.status === 409 && /Rejoins/.test(err.publicMessage));
  assert.equal(e.appels.length, 0);
  assert.equal(p.view().pret, false);
});

test('partager à tout l’escadron : l’autre le reçoit, à part, et peut le masquer chez lui', async () => {
  const e = escadron();
  const a = await e.app('Testeur');
  const b = await e.app('Testeur 2');
  const vue = await a.envoyer({ ...REPERE, to: { all: true } });
  assert.equal(vue.miens.length, 1);
  assert.equal(vue.recus.length, 0);
  const chezB = await b.lire();
  assert.equal(chezB.recus.length, 1);
  assert.deepEqual(chezB.recus[0].data, REPERE.data);
  assert.equal(chezB.recus[0].cmdr, 'Testeur');
  assert.deepEqual(chezB.membres.map((m) => m.cmdr), ['Testeur', 'Testeur 2']);
  b.masquer(chezB.recus[0].id, true);
  assert.equal(b.view().recus.length, 0);
  assert.equal(b.view().masques, 1);
  assert.equal((await a.lire()).miens.length, 1); // l'auteur n'en sait rien
  b.demasquer();
  assert.equal(b.view().recus.length, 1);
  // L'auteur retire son partage : il disparaît chez l'autre
  await a.retirer(vue.miens[0].id);
  assert.equal((await b.lire()).recus.length, 0);
});

test('partage par rôle et à une personne : seuls les destinataires le reçoivent', async () => {
  const e = escadron();
  const [a, recrue, officier] = [await e.app('Testeur'), await e.app('Recrue'), await e.app('Officier')];
  const roles = rolesValides([{ name: 'Officier' }, { name: 'Recrue' }]);
  await e.chef('/admin/roles', 'PUT', { roles });
  await e.chef('/admin/members/Recrue/role', 'PUT', { role: 'recrue' });
  await e.chef('/admin/members/Officier/role', 'PUT', { role: 'officier' });
  await a.envoyer({ ...REPERE, to: { role: 'officier' } });
  assert.equal((await recrue.lire()).recus.length, 0);
  const vu = await officier.lire();
  assert.equal(vu.recus.length, 1);
  assert.equal(vu.role.id, 'officier');
  assert.deepEqual(vu.roles.map((r) => r.id), ['officier', 'recrue']);
  await a.envoyer({ ...REPERE, ref: '13', title: 'Pour toi seul', to: { cmdrs: ['Recrue'] } });
  assert.deepEqual((await recrue.lire()).recus.map((s) => s.title), ['Pour toi seul']);
  assert.equal((await officier.lire()).recus.length, 1);
  assert.deepEqual((await a.lire()).miens.find((s) => s.ref === '13').to, ['Recrue']);
  await assert.rejects(a.envoyer({ ...REPERE, to: { cmdrs: ['Inconnu'] } }), (err) => err.status === 400);
});

test('la clé du chef ne lit aucun partage', async () => {
  const e = escadron();
  const a = await e.app('Testeur');
  await e.app('Testeur 2');
  await a.envoyer({ ...REPERE, to: { cmdrs: ['Testeur 2'] } });
  assert.equal((await e.fetch(`${BASE}/v1/shares`, { headers: { authorization: 'Bearer chef' } })).status, 401);
});

test('deuxième installation au même nom : en attente, puis confirmée depuis la première', async () => {
  const e = escadron();
  const premiere = await e.app('Testeur');
  const b = await e.app('Testeur 2');
  await b.envoyer({ ...REPERE, to: { cmdrs: ['Testeur'] } });
  const seconde = await e.app('Testeur');
  const vue = await seconde.lire();
  assert.equal(vue.attente, true);
  assert.equal(vue.recus.length, 0);
  await assert.rejects(seconde.envoyer({ ...REPERE, to: { all: true } }), (err) => err.status === 409 && /confirmée/.test(err.publicMessage));
  const moi = await premiere.lire();
  const enAttente = moi.installations.find((i) => i.attente);
  assert.ok(enAttente && !enAttente.ici);
  await premiere.confirmer(enAttente.id);
  const apres = await seconde.lire();
  assert.equal(apres.attente, false);
  assert.equal(apres.recus.length, 1);
});

test('changer de serveur : ce qui venait de l’ancien escadron ne reste pas', async () => {
  const e = escadron();
  const token = await e.rejoindre('Testeur');
  let base = BASE;
  const dir = tmp();
  const p = new Partage({ dir, fetch: e.fetch, acces: () => ({ base, token }) });
  p.activer(true);
  await (await e.app('Testeur 2')).envoyer({ ...REPERE, to: { all: true } });
  assert.equal((await p.lire()).recus.length, 1);
  // Relu depuis le disque, puis autre serveur
  assert.equal(new Partage({ dir, fetch: e.fetch, acces: () => ({ base, token }) }).view().recus.length, 1);
  base = 'https://autre-escadron.workers.dev';
  const vue = p.view();
  assert.equal(vue.recus.length, 0);
  assert.equal(vue.membres.length, 0);
  assert.equal(vue.actif, true);
});

test('le jeton ne va qu’au serveur de l’escadron, et n’est jamais écrit dans le fichier du partage', async () => {
  const e = escadron();
  const token = await e.rejoindre('Testeur');
  const dir = tmp();
  const p = new Partage({ dir, fetch: e.fetch, acces: () => ({ base: BASE, token }) });
  p.activer(true);
  await p.envoyer({ ...REPERE, to: { all: true } });
  assert.ok(e.appels.every((a) => a.url.startsWith(`${BASE}/`)));
  assert.ok(!fs.readFileSync(path.join(dir, 'escadron-partage.json'), 'utf8').includes(token));
});

test('contenu et destinataires vérifiés avant tout appel', async () => {
  const e = escadron();
  const p = await e.app('Testeur');
  const avant = e.appels.length;
  await assert.rejects(p.envoyer({ ...REPERE, kind: 'Pas Bon', to: { all: true } }), (err) => err.status === 400);
  await assert.rejects(p.envoyer({ ...REPERE, title: '', to: { all: true } }), (err) => err.status === 400);
  await assert.rejects(p.envoyer({ ...REPERE, data: { gros: 'x'.repeat(9000) }, to: { all: true } }), (err) => err.status === 413);
  await assert.rejects(p.envoyer({ ...REPERE }), (err) => err.status === 400);
  await assert.rejects(p.retirer('../../admin'), (err) => err.status === 400);
  await assert.rejects(p.confirmer('x'), (err) => err.status === 400);
  assert.equal(e.appels.length, avant);
  assert.deepEqual(destinataires({ cmdrs: [' Testeur ', 'Testeur', 12] }), { cmdrs: ['Testeur'] });
  assert.throws(() => destinataires({ cmdrs: [] }), (err) => err.status === 400);
});

test('rôles du chef : identifiants stables, rangs du plus haut au plus bas, noms en double refusés', () => {
  assert.deepEqual(rolesValides([{ name: 'Amiral' }, { id: 'lieutenant', name: 'Lieutenant renommé' }, { name: 'Élève pilote' }]), [
    { id: 'amiral', name: 'Amiral', rank: 30 },
    { id: 'lieutenant', name: 'Lieutenant renommé', rank: 20 },
    { id: 'eleve-pilote', name: 'Élève pilote', rank: 10 },
  ]);
  assert.throws(() => rolesValides([{ name: 'A' }, { name: 'a' }]), (e) => e.status === 400);
  assert.throws(() => rolesValides([{ name: '' }]), (e) => e.status === 400);
  assert.throws(() => rolesValides('non'), (e) => e.status === 400);
});

// --- Partage automatique ---

const { reperesPartageables, genreRepere } = await import('./sources.js');
const REPERES = [
  { id: 1, label: 'Filon Rhino', category: 'mining', vehicle: 'srv', system: 'Système Test', body: 'Système Test 2 a', latitude: 1, longitude: 2, drills: 4, unprofitable: false, createdAt: 'x' },
  { id: 2, label: 'Anneau de glace', category: 'mining', vehicle: 'ship', system: 'Système Test', unprofitable: false },
  { id: 3, label: 'Point de vue', category: 'view', vehicle: 'srv', system: 'Système Test', unprofitable: false },
  { id: 4, label: 'Mauvais filon', category: 'mining', vehicle: 'srv', system: 'Système Test', unprofitable: true },
];

/** L'app d'un membre avec des repères (modifiables) comme source du partage automatique. */
async function appAuto(e, cmdr, reperes) {
  const token = await e.rejoindre(cmdr);
  const etat = { reperes, panne: false };
  const p = new Partage({
    dir: tmp(), fetch: e.fetch, acces: () => ({ base: BASE, token }),
    source: async (kinds) => {
      if (etat.panne) throw new Error('lecture locale en panne');
      return reperesPartageables(etat.reperes).filter((o) => !kinds?.length || kinds.includes(o.kind));
    },
  });
  p.activer(true);
  return { p, etat };
}

test('repères partageables : trois types, ni « pas rentable », ni suivi personnel', () => {
  const objets = reperesPartageables(REPERES);
  assert.deepEqual(objets.map((o) => o.kind + ':' + o.ref), ['repere-rhino:1', 'repere-minage:2', 'repere:3']);
  assert.deepEqual(objets[0].data, { label: 'Filon Rhino', category: 'mining', drills: 4, system: 'Système Test', body: 'Système Test 2 a', latitude: 1, longitude: 2, vehicle: 'srv' });
  assert.equal(genreRepere({ category: 'mining', vehicle: 'ship', siteNumber: 3 }), 'repere-rhino');
  assert.equal(genreRepere({ category: 'guardian', vehicle: 'srv' }), 'repere-gardien');
  assert.equal(reperesPartageables([{ id: 9, label: 'Structure active', category: 'guardian', system: 'Système Test' }])[0].kind, 'repere-gardien');
  assert.deepEqual(reperesPartageables('non'), []);
});

test('automatique : rien tant qu’aucun type n’est réglé ; un type réglé ne partage que le sien', async () => {
  const e = escadron();
  const { p } = await appAuto(e, 'Testeur', REPERES);
  const lecteur = await e.app('Testeur 2');
  const avant = e.appels.length;
  await p.synchroniser();
  assert.equal(e.appels.length, avant); // aucun type réglé : aucun appel
  p.reglerAuto('repere-rhino', { all: true });
  const vue = await p.synchroniser();
  assert.deepEqual(vue.miens.map((s) => s.title), ['Filon Rhino']);
  assert.deepEqual(vue.auto.find((a) => a.kind === 'repere-rhino'), { kind: 'repere-rhino', label: 'Repères de minage au Rhino', to: { all: true }, envoyes: 1 });
  assert.equal(vue.auto.find((a) => a.kind === 'repere-minage').to, null);
  assert.deepEqual((await lecteur.lire()).recus.map((s) => s.title), ['Filon Rhino']);
  // Passage suivant sans changement : aucun envoi de plus
  const puts = () => e.appels.filter((a) => a.method === 'PUT' && a.url.endsWith('/v1/shares')).length;
  const n = puts();
  await p.synchroniser();
  assert.equal(puts(), n);
});

test('automatique : un repère modifié est renvoyé, un repère supprimé ou devenu « pas rentable » est retiré', async () => {
  const e = escadron();
  const { p, etat } = await appAuto(e, 'Testeur', REPERES);
  const lecteur = await e.app('Testeur 2');
  p.reglerAuto('repere-rhino', { all: true });
  p.reglerAuto('repere-minage', { all: true });
  await p.synchroniser();
  assert.equal((await lecteur.lire()).recus.length, 2);
  etat.reperes = [{ ...REPERES[0], label: 'Filon Rhino corrigé' }, { ...REPERES[1], unprofitable: true }];
  await p.synchroniser();
  assert.deepEqual((await lecteur.lire()).recus.map((s) => s.title), ['Filon Rhino corrigé']);
});

test('automatique : une lecture locale en panne ne retire rien', async () => {
  const e = escadron();
  const { p, etat } = await appAuto(e, 'Testeur', REPERES);
  const lecteur = await e.app('Testeur 2');
  p.reglerAuto('repere-rhino', { all: true });
  await p.synchroniser();
  etat.panne = true;
  const vue = await p.synchroniser();
  assert.ok(vue.autoErreur);
  assert.equal((await lecteur.lire()).recus.length, 1);
});

test('automatique : ce que le joueur retire ou partage à la main n’est plus touché', async () => {
  const e = escadron();
  const { p } = await appAuto(e, 'Testeur', REPERES);
  await e.app('Testeur 2');
  p.reglerAuto('repere-rhino', { all: true });
  p.reglerAuto('repere-minage', { all: true });
  let vue = await p.synchroniser();
  // Il retire le Rhino : pas renvoyé au passage suivant
  await p.retirer(vue.miens.find((s) => s.kind === 'repere-rhino').id);
  vue = await p.synchroniser();
  assert.deepEqual(vue.miens.map((s) => s.kind), ['repere-minage']);
  // Il repartage l'anneau à une seule personne : l'automatique ne le remet pas « à tous »
  await p.envoyer({ kind: 'repere-minage', ref: '2', title: 'Anneau de glace', data: { system: 'Système Test' }, to: { cmdrs: ['Testeur 2'] } });
  vue = await p.synchroniser();
  assert.equal(vue.miens[0].audience, 'cmdrs');
  // « Reprendre » : tout revient dans le partage automatique
  p.reprendreAuto();
  vue = await p.synchroniser();
  assert.deepEqual(vue.miens.map((s) => s.kind + ':' + s.audience).sort(), ['repere-minage:all', 'repere-rhino:all']);
});

test('automatique : par rôle, coupé pour un type (ce qui est déjà partagé reste), type inconnu refusé', async () => {
  const e = escadron();
  const { p, etat } = await appAuto(e, 'Testeur', REPERES);
  const officier = await e.app('Officier');
  const recrue = await e.app('Recrue');
  await e.chef('/admin/roles', 'PUT', { roles: rolesValides([{ name: 'Officier' }, { name: 'Recrue' }]) });
  await e.chef('/admin/members/Officier/role', 'PUT', { role: 'officier' });
  p.reglerAuto('repere-rhino', { role: 'officier' });
  await p.synchroniser();
  assert.equal((await officier.lire()).recus.length, 1);
  assert.equal((await recrue.lire()).recus.length, 0);
  p.reglerAuto('repere-rhino', null);
  etat.reperes = [];
  const avant = e.appels.length;
  await p.synchroniser();
  assert.equal(e.appels.length, avant); // plus aucun type réglé : aucun appel, rien n'est retiré
  assert.equal((await officier.lire()).recus.length, 1);
  assert.throws(() => p.reglerAuto('build-secret', { all: true }), (err) => err.status === 400);
  assert.throws(() => p.reglerAuto('build', { all: true }), (err) => err.status === 400); // les builds : à la main seulement
  assert.throws(() => p.reglerAuto('repere', {}), (err) => err.status === 400);
});

test('automatique : coupé d’un coup avec le partage, et oublié en changeant d’escadron', async () => {
  const e = escadron();
  const token = await e.rejoindre('Testeur');
  let base = BASE;
  const p = new Partage({ dir: tmp(), fetch: e.fetch, acces: () => ({ base, token }), source: async () => reperesPartageables(REPERES) });
  p.activer(true);
  p.reglerAuto('repere-rhino', { all: true });
  p.activer(false);
  const avant = e.appels.length;
  await p.synchroniser();
  assert.equal(e.appels.length, avant);
  p.activer(true);
  base = 'https://autre-escadron.workers.dev';
  assert.equal(p.view().auto.every((a) => a.to === null), true);
});

// --- Builds et routes commerciales ---

const { buildsPartageables, routePartageable, lireSources } = await import('./sources.js');
const BUILD = {
  id: 7, name: ' Mineur Test ', shipId: 63, shipType: 'panthermkii', ship: 'Panther Clipper Mk II', gameShipId: 12, mine: true, notes: 'Pour le minage',
  createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-02T00:00:00Z', edsy: 'https://exemple.test/x',
  slots: { hardpoint: [{ modid: 1 }], utility: [], component: [{ modid: 2, bpid: 'a', grade: 5 }], military: [], internal: [null] },
};
const ROUTE_VUE = {
  route: { id: 5, name: 'Station Test ⇄ Port Test', goal: 7000000000, createdAt: '2026-10-28T14:21:15.860Z' },
  structure: {
    startSystem: 'Système Test', startStation: 'Station Test',
    stations: [{ system: 'Système Test', station: 'Station Test', pad: 'L' }, { system: 'Système Test 2', station: 'Port Test', pad: 'M' }],
    start: { buys: [{ commodity: 'indium', name: 'Indium', price: 2360, count: 1218 }, { commodity: 'gallium', name: 'Gallium', price: 2544 }] },
    stops: [{ system: 'Système Test 2', station: 'Port Test', pad: 'M', buys: [{ commodity: 'bauxite', name: 'Bauxite', price: 706 }], sells: [{ commodity: 'gallium', name: 'Gallium', price: 27164 }, { commodity: 'indium', name: 'Indium', price: 24599 }] }],
    arrival: { sells: [{ commodity: 'bauxite', name: 'Bauxite', price: 41661 }] },
    legs: [{ jumps: [{ system: 'A', dist: 18.5 }, { system: 'B', dist: 12.8 }], distance: 31.3 }, { jumps: [{ system: 'C', dist: 16.1 }], distance: 16.1 }],
    legCommodities: [{ commodity: 'indium' }, { commodity: 'bauxite' }],
    jumpsPerLoop: 3, longestJump: 18.5,
  },
  stats: { avgNet: 75516872, avgMinutes: 16.775, cargo: 1232, loopsCount: 8, balance: 123456789, trends: [{ commodity: 'indium', lastBuy: 2360, lastSell: 24467 }] },
  loops: [{ endAt: '2026-10-28T16:46:43.000Z', netGain: 1 }],
};

test('build partageable : le vaisseau et ses modules, pas le vaisseau réel visé ni les dates', () => {
  const [o] = buildsPartageables([BUILD, { id: 8, name: '', shipId: 1, slots: {} }, null, { id: 9, name: 'Sans modules', shipId: 1 }]);
  assert.deepEqual(o, { kind: 'build', ref: '7', title: 'Mineur Test', data: { name: 'Mineur Test', shipId: 63, slots: BUILD.slots, shipType: 'panthermkii', ship: 'Panther Clipper Mk II', notes: 'Pour le minage' } });
  assert.equal(buildsPartageables([BUILD, { id: 8, name: '', shipId: 1, slots: {} }]).length, 1);
});

test('route commerciale partageable : stations, marchandises au dernier prix, moyennes ; ni objectif ni solde', () => {
  const o = routePartageable(ROUTE_VUE);
  assert.equal(o.kind, 'route-commerce');
  assert.equal(o.ref, '5');
  assert.deepEqual(o.data.depart, { system: 'Système Test', station: 'Station Test', pad: 'L', achete: { name: 'Indium', prix: 2360 } });
  assert.deepEqual(o.data.etapes, [{
    system: 'Système Test 2', station: 'Port Test', pad: 'M', trajet: { sauts: 2, distance: 31.3 },
    vend: { name: 'Indium', prix: 24467 }, // la marchandise principale du trajet, au dernier prix relevé
    achete: { name: 'Bauxite', prix: 706 },
  }]);
  assert.deepEqual(o.data.retour, { trajet: { sauts: 1, distance: 16.1 }, vend: { name: 'Bauxite', prix: 41661 } });
  assert.equal(o.data.gainMoyen, 75516872);
  assert.equal(o.data.soute, 1218); // le tonnage de la boucle, pas la soute du vaisseau du moment (stats.cargo)
  assert.equal(o.data.releveLe, '2026-10-28T16:46:43.000Z');
  const texte = JSON.stringify(o);
  assert.ok(!texte.includes('7000000000') && !texte.includes('123456789'));
  assert.equal(routePartageable(null), null);
  assert.equal(routePartageable({ route: { id: 1, name: 'x' } }), null);
});

test('sources : seuls les types demandés sont lus, un module absent ne casse rien', async () => {
  const lus = [];
  const get = async (chemin) => {
    lus.push(chemin);
    if (chemin.endsWith('/builds')) return [BUILD];
    if (chemin.endsWith('/routes')) return null; // module absent
    return REPERES;
  };
  assert.deepEqual((await lireSources(get, ['build'])).map((o) => o.kind), ['build']);
  assert.deepEqual(lus, ['/api/modules/builder/builds']);
  assert.deepEqual((await lireSources(get, ['route-commerce'])), []);
  assert.deepEqual((await lireSources(get, ['repere-rhino'])).map((o) => o.ref), ['1']);
  assert.equal((await lireSources(get)).length, 4);
});

test('module : le partage automatique lit les repères par l’API locale et prend serveur et jeton du capteur', async () => {
  const { setup } = await import('./index.js');
  const { EventEmitter } = await import('node:events');
  const e = escadron();
  const token = await e.rejoindre('Testeur');
  const lecteur = await e.app('Testeur 2');
  const journal = new EventEmitter();
  journal.addInterest = () => {};
  const router = { get() {}, put() {}, post() {}, delete() {} };
  const locaux = [];
  const { sensor, partage } = setup({
    router, journal, broadcast: () => {}, dataDir: tmp(), fetch: e.fetch, sensorOptions: { gapMs: 0, saveDelayMs: 0 },
    selfUrl: 'http://127.0.0.1:3001',
    localFetchImpl: async (url) => {
      locaux.push(url);
      const corps = url.endsWith('/waypoints') ? REPERES : url.endsWith('/builds') ? [BUILD] : url.endsWith('/routes') ? [{ id: 5 }] : url.endsWith('/routes/5') ? ROUTE_VUE : null;
      return new Response(JSON.stringify(corps), { status: corps ? 200 : 404, headers: { 'content-type': 'application/json' } });
    },
  });
  sensor.setWorker(BASE);
  sensor.setToken(token);
  partage.activer(true);
  partage.reglerAuto('repere-minage', { all: true });
  const vue = await partage.synchroniser();
  assert.equal(vue.autoErreur, null);
  assert.deepEqual(locaux, ['http://127.0.0.1:3001/api/modules/waypoints/waypoints']); // seul le type réglé est lu
  assert.deepEqual((await lecteur.lire()).recus.map((s) => s.title), ['Anneau de glace']);
  // Bouton « Partager » d'un build et d'une route : la page ne donne que le type et le numéro, le contenu est lu ici
  await partage.envoyer({ kind: 'build', ref: '7', to: { all: true } });
  await partage.envoyer({ kind: 'route-commerce', ref: 5, to: { cmdrs: ['Testeur 2'] } });
  const recus = (await lecteur.lire()).recus;
  assert.deepEqual(recus.map((s) => s.kind).sort(), ['build', 'repere-minage', 'route-commerce']);
  assert.deepEqual(recus.find((s) => s.kind === 'build').data, { name: 'Mineur Test', shipId: 63, slots: BUILD.slots, shipType: 'panthermkii', ship: 'Panther Clipper Mk II', notes: 'Pour le minage' });
  assert.equal(recus.find((s) => s.kind === 'route-commerce').data.depart.station, 'Station Test');
  await assert.rejects(partage.envoyer({ kind: 'build', ref: '999', to: { all: true } }), (err) => err.status === 404);
  assert.ok(!locaux.some((u) => !u.startsWith('http://127.0.0.1:3001/api/modules/')));
  sensor.stop();
});

test('partage à une personne : chiffré de bout en bout, le serveur ne voit ni le titre ni le contenu', async () => {
  const e = escadron();
  const a = await e.app('Testeur');
  const b = await e.app('Testeur 2');
  const c = await e.app('Testeur 3');
  // Chacun ouvre l'app une fois : sa clé publique est publiée
  await a.lire();
  await b.lire();
  await c.lire();
  assert.equal(a.view().chiffrement, true);
  assert.deepEqual((await a.lire()).membres.map((m) => [m.cmdr, m.chiffrable]), [['Testeur', true], ['Testeur 2', true], ['Testeur 3', true]]);
  const vue = await a.envoyer({ ...REPERE, to: { cmdrs: ['Testeur 2'] } });
  assert.deepEqual(vue.dernierEnvoi, { chiffre: true, sansCle: [] });
  // Ce qui est parti au serveur : un titre neutre et une enveloppe, rien de lisible
  const envoi = e.appels.filter((x) => x.method === 'PUT' && x.url.endsWith('/v1/shares')).at(-1).body;
  for (const secret of ['Filon', 'platine', 'Système Test', '1.5', '-2.25']) assert.ok(!envoi.includes(secret), secret);
  assert.equal(JSON.parse(envoi).title, 'Partage chiffré');
  assert.equal(JSON.parse(envoi).data.e2e, 1);
  // L'auteur relit le sien en clair, le destinataire aussi, le troisième ne le reçoit pas
  assert.deepEqual([vue.miens[0].title, vue.miens[0].data, vue.miens[0].chiffre], [REPERE.title, REPERE.data, true]);
  const recu = (await b.lire()).recus;
  assert.deepEqual([recu.length, recu[0].title, recu[0].data, recu[0].chiffre], [1, REPERE.title, REPERE.data, true]);
  assert.equal((await c.lire()).recus.length, 0);
  // Le fichier local garde la clé privée, jamais envoyée : aucun appel ne la contient
  const privee = JSON.parse(fs.readFileSync(path.join(a.fichier, '..', 'escadron-partage.json'), 'utf8')).cle.privee;
  assert.ok(privee.length > 40);
  assert.ok(!e.appels.some((x) => (x.body ?? '').includes(privee) || x.url.includes(privee)));
});

test('destinataire sans clé (app pas à jour) : envoyé en clair, et la page le sait ; à tous ou à un rôle : en clair', async () => {
  const e = escadron();
  const a = await e.app('Testeur');
  await a.lire();
  // Un membre inscrit qui n'a jamais ouvert le partage : aucune clé publiée
  await e.rejoindre('Testeur 2');
  const vue = await a.envoyer({ ...REPERE, to: { cmdrs: ['Testeur 2'] } });
  assert.deepEqual(vue.dernierEnvoi, { chiffre: false, sansCle: ['Testeur 2'] });
  assert.equal(JSON.parse(e.appels.filter((x) => x.method === 'PUT' && x.url.endsWith('/v1/shares')).at(-1).body).title, REPERE.title);
  assert.equal(vue.miens[0].chiffre, undefined);
  const tous = await a.envoyer({ ...REPERE, ref: '13', to: { all: true } });
  assert.equal(tous.dernierEnvoi, null);
  assert.equal(JSON.parse(e.appels.filter((x) => x.method === 'PUT' && x.url.endsWith('/v1/shares')).at(-1).body).data.e2e, undefined);
});

test('partage chiffré pour une autre installation : montré comme illisible, sans contenu', async () => {
  const e = escadron();
  const a = await e.app('Testeur');
  const b = await e.app('Testeur 2');
  await a.lire();
  await b.lire();
  await a.envoyer({ ...REPERE, to: { cmdrs: ['Testeur 2'] } });
  // Le destinataire perd sa clé (réinstallation sans sauvegarde) : il en refait une, l'ancien partage n'est pas pour elle
  b.etat.cle = null;
  b.etat.clePubliee = null;
  const recu = (await b.lire()).recus;
  assert.deepEqual([recu.length, recu[0].title, recu[0].data, recu[0].illisible], [1, 'Partage chiffré', {}, true]);
});
