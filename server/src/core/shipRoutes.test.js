// API des rôles des vaisseaux et de la bascule (core/shipRoutes.js) : petit serveur Express en mémoire, avec la vraie
// garde de l'API locale, le vrai flux temps réel (SSE), de vrais rôles (fichier temporaire) et un faux overlay.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import express from 'express';
import { localGuard, jsonBody, bodyErrorMessage } from './localGuard.js';
import { broadcast, sseHandler } from './realtime.js';
import { mountShipRoutes } from './shipRoutes.js';
import { ShipRoles } from './shipRoles.js';
import { ShipTracker } from './boarding.js';
import { ModeAdvisor } from './modeGuess.js';
import { RoleSwitcher } from './roleSwitch.js';
import { windowsOf } from './modes.js';

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'elite-shiproutes-'));
process.env.ELITE_DATA_DIR = DATA;
const FILE = path.join(DATA, 'ship-roles.json');
const HEADER = { 'X-Elite-Compagnon': '1', 'Content-Type': 'application/json' };

let server;
let base;
let ctx;

before(async () => {
  const roles = new ShipRoles({ file: FILE, warn: () => {} }).load();
  const tracker = new ShipTracker();
  const overlay = {
    cur: { mode: 'combat', glance: false, pages: ['combat'] },
    activity: 'combat',
    chosen: null,
    state: () => ({ ...overlay.cur, installed: true, disabled: false }),
    snapshot: () => ({ ...overlay.cur, pages: [...overlay.cur.pages], activity: overlay.activity }),
    choice: () => overlay.chosen,
    show(next, { choice } = {}) {
      overlay.cur = { mode: next.mode ?? null, glance: Boolean(next.glance), pages: [...next.pages] };
      if (choice !== undefined) overlay.chosen = choice;
      if (overlay.cur.mode) overlay.activity = overlay.cur.mode;
      return overlay.state();
    },
    restore(snap, { choice } = {}) {
      overlay.cur = { mode: snap.mode, glance: snap.glance, pages: [...snap.pages] };
      overlay.activity = snap.activity;
      if (choice !== undefined) overlay.chosen = choice;
      return overlay.state();
    },
    closed({ choice } = {}) {
      overlay.cur = { mode: overlay.cur.mode, glance: false, pages: [] };
      if (choice !== undefined) overlay.chosen = choice;
      return overlay.state();
    },
  };
  let switcher = null;
  const advisor = new ModeAdvisor({ mode: () => overlay.cur.mode, onChange: (s) => broadcast('overlay:suggest', s), ship: () => switcher.advisorShip(), timers: null });
  switcher = new RoleSwitcher({ roles, tracker, advisor, overlay, broadcast, timers: null });
  ctx = { roles, tracker, overlay, advisor, switcher };
  const app = express();
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
  app.use('/api', localGuard({ port }));
  app.use(jsonBody());
  app.get('/api/stream', sseHandler);
  mountShipRoutes(app, { roles, tracker, switcher, advisor, broadcast });
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.publicMessage || bodyErrorMessage(err) || 'Erreur interne du serveur.' }));
});

after(() => {
  server.closeAllConnections();
  server.close();
  fs.rmSync(DATA, { recursive: true, force: true });
});

const put = (p, body, headers = HEADER) => fetch(`${base}${p}`, { method: 'PUT', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
const post = (p, headers = HEADER) => fetch(`${base}${p}`, { method: 'POST', headers });
const get = async (p) => (await fetch(`${base}${p}`)).json();

/** Ouvre le flux temps réel et rend { attendre(type) → données du prochain message de ce type, fermer() }. */
function flux() {
  let texte = '';
  const attentes = [];
  const req = http.get(`${base}/api/stream`);
  req.on('response', (res) => {
    res.setEncoding('utf8');
    res.on('data', (d) => {
      texte += d;
      for (const a of attentes.slice()) {
        const m = new RegExp(`event: ${a.type}\\ndata: (.*)\\n\\n`).exec(texte.slice(a.depuis));
        if (m) {
          attentes.splice(attentes.indexOf(a), 1);
          a.resolve(JSON.parse(m[1]));
        }
      }
    });
  });
  req.on('error', () => {});
  const pret = new Promise((r) => req.on('response', () => setTimeout(r, 50)));
  return {
    pret,
    attendre: (type) => new Promise((resolve) => attentes.push({ type, resolve, depuis: texte.length })),
    fermer: () => req.destroy(),
  };
}

test('lecture : rôles possibles (modes + Polyvalent), maximum, rôles des vaisseaux', async () => {
  const r = await get('/api/ships/roles');
  assert.deepEqual(r.roles.map((x) => x.id), ['routes', 'rares', 'waypoints', 'shipmining', 'combat', 'groundcombat', 'rescue', 'materials', 'powerdelivery', 'gardiens', 'colonisation', 'polyvalent']);
  assert.equal(r.maxSecondary, 3);
  assert.deepEqual(r.ships, {});
  assert.deepEqual(await get('/api/ships/current'), { shipId: null, type: null, model: null, name: null, nickname: null, title: null, role: null });
  assert.equal(await get('/api/overlay/switch'), null);
});

test('écriture sans l’en-tête X-Elite-Compagnon : refusée (403), rien d’écrit', async () => {
  const r = await put('/api/ships/43/role', { primary: 'waypoints', secondary: [] }, { 'Content-Type': 'application/json' });
  assert.equal(r.status, 403);
  assert.equal(fs.existsSync(FILE), false);
  assert.equal((await post('/api/overlay/switch/cancel', {})).status, 403);
});

test('écriture refusée (400), avec la raison en français', async () => {
  const cas = [
    ['/api/ships/abc/role', { primary: 'combat' }, /Vaisseau invalide : un numéro de vaisseau du jeu \(ShipID\), de 0 à 1000000/],
    ['/api/ships/-1/role', { primary: 'combat' }, /Vaisseau invalide/],
    ['/api/ships/043/role', { primary: 'combat' }, /Vaisseau invalide/],
    ['/api/ships/4293000002/role', { primary: 'combat' }, /Vaisseau invalide/],
    ['/api/ships/__proto__/role', { primary: 'combat' }, /Vaisseau invalide/],
    ['/api/ships/43/role', {}, /Rôle principal manquant/],
    ['/api/ships/43/role', [], /Rôle illisible/],
    ['/api/ships/43/role', { primary: 'minage' }, /Rôle principal inconnu : « minage »/],
    ['/api/ships/43/role', { primary: 'combat', secondary: ['combat'] }, /déjà le rôle principal/],
    ['/api/ships/43/role', { primary: 'polyvalent', secondary: ['rescue'] }, /Polyvalent » couvre déjà tous les modes/],
    ['/api/ships/43/role', { primary: null, secondary: ['combat', 'rescue', 'materials', 'routes'] }, /3 rôles secondaires au plus/],
    ['/api/ships/43/role', { primary: 'combat', note: 'x' }, /Champ inconnu : « note »/],
    ['/api/ships/43/role', '{"primary":"combat","__proto__":{"admin":true}}', /Champ inconnu : « __proto__ »/],
  ];
  for (const [p, body, raison] of cas) {
    const r = await put(p, body);
    assert.equal(r.status, 400, `${p} ${JSON.stringify(body)}`);
    assert.match((await r.json()).error, raison);
  }
  assert.equal(fs.existsSync(FILE), false, 'rien d’écrit');
  const illisible = await put('/api/ships/43/role', '{ pas du json');
  assert.equal(illisible.status, 400);
});

test('écriture : enregistrée, diffusée en temps réel (rôles et vaisseau actuel), effacée par primary: null', async () => {
  ctx.tracker.apply({ event: 'LoadGame', timestamp: '2026-11-08T09:00:00Z', Ship: 'LakonMiner', Ship_Localised: 'Type-11 Prospector', ShipID: 43, ShipName: '' });
  const f = flux();
  await f.pret;
  const roles = f.attendre('ships:roles');
  const courant = f.attendre('ships:current');
  const r = await put('/api/ships/43/role', { primary: 'waypoints', secondary: ['shipmining'] });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { shipId: 43, role: { primary: 'waypoints', secondary: ['shipmining'] } });
  assert.deepEqual(await roles, { ships: { 43: { primary: 'waypoints', secondary: ['shipmining'] } } });
  const c = await courant;
  assert.equal(c.shipId, 43);
  assert.equal(c.title, 'Type-11 Prospector');
  assert.deepEqual(c.role, { primary: 'waypoints', secondary: ['shipmining'] });
  const disque = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  assert.equal(disque.ships['43'].type, 'lakonminer', 'modèle noté avec le rôle');
  assert.deepEqual((await get('/api/ships/roles')).ships, { 43: { primary: 'waypoints', secondary: ['shipmining'] } });
  // Effacer
  const vide = f.attendre('ships:roles');
  const e = await put('/api/ships/43/role', { primary: null, secondary: [] });
  assert.deepEqual(await e.json(), { shipId: 43, role: null });
  assert.deepEqual(await vide, { ships: {} });
  f.fermer();
});

test('bascule par l’API : avis diffusé, Annuler, puis plus rien à annuler (409)', async () => {
  await put('/api/ships/43/role', { primary: 'waypoints', secondary: [] });
  const f = flux();
  await f.pret;
  const avis = f.attendre('overlay:switch');
  ctx.switcher.event({ event: 'ShipyardSwap', timestamp: '2026-11-08T09:01:00Z', ShipType: 'federation_corvette', ShipID: 26, StoreShipID: 43 });
  ctx.switcher.event({ event: 'ShipyardSwap', timestamp: '2026-11-08T09:02:00Z', ShipType: 'lakonminer', ShipID: 43, StoreShipID: 26 });
  const a = await avis;
  assert.equal(a.mode, 'waypoints');
  assert.equal(a.ship, 'Type-11 Prospector');
  assert.deepEqual(ctx.overlay.cur.pages, windowsOf('waypoints'));
  assert.equal((await get('/api/overlay/switch')).mode, 'waypoints');
  const fin = f.attendre('overlay:switch');
  const r = await post('/api/overlay/switch/cancel');
  assert.equal(r.status, 200);
  assert.equal((await r.json()).mode, 'combat');
  assert.equal(await fin, null);
  const encore = await post('/api/overlay/switch/cancel');
  assert.equal(encore.status, 409);
  assert.match((await encore.json()).error, /Rien à annuler/);
  assert.equal((await post('/api/overlay/switch/dismiss')).status, 200);
  f.fermer();
});

test('écriture impossible sur le disque : 500 lisible, rien de changé', async () => {
  const avant = (await get('/api/ships/roles')).ships;
  const bloque = path.join(DATA, 'fichier');
  fs.writeFileSync(bloque, 'x');
  const vrai = ctx.roles.file;
  ctx.roles.file = path.join(bloque, 'ship-roles.json');
  try {
    const r = await put('/api/ships/9/role', { primary: 'combat', secondary: [] });
    assert.equal(r.status, 500);
    assert.match((await r.json()).error, /^Rôle non enregistré : /);
    assert.deepEqual((await get('/api/ships/roles')).ships, avant);
  } finally {
    ctx.roles.file = vrai;
  }
});

test('rôles non relus au démarrage (fichier verrouillé) : 503 lisible, le fichier n’est pas écrasé', async () => {
  const vrai = ctx.roles.file;
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'elite-shiproutes-verrou-'));
  const file = path.join(d, 'ship-roles.json');
  const contenu = JSON.stringify({ version: 1, ships: { 3: { primary: 'combat', secondary: [] }, 7: { primary: 'rescue', secondary: [] } } });
  fs.writeFileSync(file, contenu);
  const lire = fs.readFileSync;
  fs.readFileSync = (f, ...args) => {
    if (path.resolve(String(f)) === file) throw Object.assign(new Error('EBUSY: simulé'), { code: 'EBUSY' });
    return lire.call(fs, f, ...args);
  };
  try {
    ctx.roles.file = file;
    ctx.roles.load();
    const r = await put('/api/ships/9/role', { primary: 'combat', secondary: [] });
    assert.equal(r.status, 503);
    assert.match((await r.json()).error, /^Rôle non enregistré : .*pas pu être relu.*rien n'est écrit/);
    assert.equal(lire.call(fs, file, 'utf8'), contenu, 'les rôles des autres vaisseaux sont gardés');
  } finally {
    fs.readFileSync = lire;
    ctx.roles.file = vrai;
    ctx.roles.load();
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test('overlay quitté par le joueur (Alt+Maj+Q) : POST /api/overlay/closed, avec l’en-tête ; état diffusé, mode gardé', async () => {
  ctx.overlay.cur = { mode: 'combat', glance: true, pages: ['combat', 'glance'] };
  const refuse = await fetch(`${base}/api/overlay/closed`, { method: 'POST' });
  assert.equal(refuse.status, 403, 'garde de l’API locale');
  assert.deepEqual(ctx.overlay.cur.pages, ['combat', 'glance']);
  const f = flux();
  await f.pret;
  const diffuse = f.attendre('overlay');
  const r = await post('/api/overlay/closed');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { mode: 'combat', glance: false, pages: [], installed: true, disabled: false, open: [] });
  assert.deepEqual((await diffuse).pages, []);
  assert.equal(ctx.overlay.chosen.kind, 'fermeture');
  f.fermer();
});

test('fermeture transmise après coup (Alt+Maj+Q pressé serveur arrêté) : { at } vérifié, réponse en français si illisible ; open : ce que l’overlay doit ouvrir', async () => {
  const envoyer = (body) => fetch(`${base}/api/overlay/closed`, { method: 'POST', headers: HEADER, body: typeof body === 'string' ? body : JSON.stringify(body) });
  ctx.overlay.cur = { mode: 'waypoints', glance: false, pages: windowsOf('waypoints') };
  for (const [body, motif] of [
    [{ at: 'hier soir' }, /Heure de fermeture illisible/],
    [{ at: 12 }, /Heure de fermeture illisible/],
    [{ at: `2026-11-07T21:30:00.000Z${' '.repeat(40)}` }, /Heure de fermeture illisible/],
    [{ at: '2026-11-07T21:30:00.000Z', pages: [] }, /Champ inconnu : « pages »/],
    [[], /Avis illisible/],
    ['"texte"', /Avis illisible|illisible/],
  ]) {
    const r = await envoyer(body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.match((await r.json()).error, motif);
    assert.deepEqual(ctx.overlay.cur.pages, windowsOf('waypoints'), 'refusé : rien ne change');
  }
  const r = await envoyer({ at: '2026-11-07T21:30:00.000Z' });
  assert.equal(r.status, 200);
  const corps = await r.json();
  assert.deepEqual([corps.mode, corps.pages, corps.open], ['waypoints', [], []]);
  assert.deepEqual([ctx.overlay.chosen.kind, ctx.overlay.chosen.at], ['fermeture', '2026-11-07T21:30:00.000Z'], 'notée à l’heure de la fermeture');
});

test('deux commandants, même ShipID (audit M7) : le rôle s’écrit pour le commandant chargé, la lecture montre ses rôles à lui', async () => {
  const t = (s) => `2026-11-08T1${s}:00:00Z`;
  const anaconda = [
    { event: 'LoadGame', timestamp: t(0), FID: 'F0000001', Commander: 'Testeur', Ship: 'Anaconda', ShipID: 1 },
    { event: 'Loadout', timestamp: t(1), Ship: 'anaconda', ShipID: 1, Modules: [] },
  ];
  ctx.switcher.replay(anaconda);
  assert.equal((await put('/api/ships/1/role', { primary: 'combat', secondary: [] })).status, 200);
  ctx.switcher.event({ event: 'Shutdown', timestamp: t(2) });
  ctx.switcher.event({ event: 'LoadGame', timestamp: t(3), FID: 'F0000002', Commander: 'Testeur 2', Ship: 'CobraMkIII', ShipID: 1 });
  assert.deepEqual((await get('/api/ships/roles')).ships, {}, 'la Cobra du second compte n’a pas le rôle de l’Anaconda');
  assert.equal((await get('/api/ships/current')).role, null);
  assert.equal((await put('/api/ships/1/role', { primary: 'rescue', secondary: [] })).status, 200);
  assert.deepEqual((await get('/api/ships/roles')).ships, { 1: { primary: 'rescue', secondary: [] } });
  assert.equal(ctx.roles.get(1, 'F0000002').type, 'cobramkiii');
  assert.equal(ctx.roles.get(1, 'F0000001').primary, 'combat', 'celui du compte principal reste');
  const disque = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  assert.deepEqual(Object.keys(disque.commanders).sort(), ['F0000001', 'F0000002']);
  assert.equal(JSON.stringify(await get('/api/ships/current')).includes('F000000'), false, 'aucun FID dans l’API');
});
