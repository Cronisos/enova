// Suivi des routes : la chronologie est tenue au fil du journal (TimelineBuilder), sans garder les événements bruts.
// Avant, RouteTracker gardait tous les événements de route depuis le premier journal (un FSDJump pèse plusieurs Ko) et
// refaisait toute la chronologie à chaque événement. Extrait réel du journal (fixture), faux journal et fausse base.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import v8 from 'node:v8';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parseLines } from '../../../core/journalFiles.js';
import { ROUTE_EVENTS, TimelineBuilder, buildTimeline } from '../services/timeline.js';
import { RouteTracker } from '../services/tracker.js';

v8.setFlagsFromString('--expose-gc');
const gc = vm.runInNewContext('gc');

const fixture = fileURLToPath(new URL('./fixtures/port-draught-cemiess.log', import.meta.url));
const events = parseLines(fs.readFileSync(fixture, 'utf8'));

test('chronologie au fil du journal : la même que celle refaite d’un coup, événement par événement', () => {
  const builder = new TimelineBuilder();
  for (let i = 0; i < events.length; i++) {
    builder.add(events[i]);
    if (i % 97 === 0 || i === events.length - 1) assert.deepEqual(builder.entries, buildTimeline(events.slice(0, i + 1)), `après ${i + 1} événements`);
  }
  assert.doesNotThrow(() => builder.add(null));
  assert.doesNotThrow(() => builder.add({ event: 'Docked', timestamp: 'pas une date' }));
});

function fauxJournal() {
  const j = new EventEmitter();
  j.addInterest = () => {};
  j.stateData = {};
  return j;
}
const fausseBase = { route: { findMany: async () => [], findFirst: async () => null }, marketSnapshot: { findFirst: async () => null } };

test('RouteTracker ne garde pas les événements bruts : ceux de l’historique et du direct sont libérés', async () => {
  const journal = fauxJournal();
  const tracker = new RouteTracker({ prisma: fausseBase, journal, game: { snapshot: () => ({}) }, broadcast: () => {} });
  const set = new Set(ROUTE_EVENTS);
  const routeEvents = events.filter((e) => set.has(e.event));
  const half = Math.floor(routeEvents.length / 2);
  // Copies : les événements du fichier restent tenus par ce test
  const history = routeEvents.slice(0, half).map((e) => ({ ...e }));
  const live = routeEvents.slice(half).map((e) => ({ ...e }));
  const refs = [...history, ...live].map((e) => new WeakRef(e));
  // Dans une fonction à part : la variable de boucle d'une fonction async resterait tenue par le test lui-même
  const rejouer = () => {
    journal.emit('ready', { history });
    history.length = 0;
    for (const ev of live) journal.emit('event', ev);
    live.length = 0;
  };
  rejouer();
  assert.deepEqual(tracker.timeline, buildTimeline(routeEvents), 'même chronologie qu’avant');
  assert.equal(tracker.events, undefined, 'plus de liste d’événements');
  await new Promise((r) => setTimeout(r, 20)); // synchronisation des boucles (fausse base)
  gc();
  gc();
  const gardes = refs.map((r, i) => (r.deref() ? `${i} ${r.deref().event}` : null)).filter(Boolean);
  assert.deepEqual(gardes, [], `${gardes.length} événement(s) sur ${refs.length} encore en mémoire`);
  clearTimeout(tracker.syncTimer);
});

test('mérites de la chronologie : gain réel d’après le total du jeu, ligne annulée retirée (7 nov. 13:50)', () => {
  const timeline = buildTimeline([
    { event: 'Powerplay', timestamp: '2026-11-07T13:00:00Z', Merits: 1000000 },
    { event: 'PowerplayMerits', timestamp: '2026-11-07T13:50:13Z', MeritsGained: 2015, TotalMerits: 1002015 },
    { event: 'PowerplayMerits', timestamp: '2026-11-07T13:50:22Z', MeritsGained: 1773, TotalMerits: 1001773 },
    { event: 'PowerplayMerits', timestamp: '2026-11-07T13:55:00Z', MeritsGained: 30 }, // sans total : le gain annoncé
  ]);
  const merits = timeline.filter((e) => e.kind === 'merits').map((e) => e.merits);
  assert.deepEqual(merits, [2015, -242, 30]);
  assert.equal(merits.reduce((a, b) => a + b, 0), 1773 + 30);
  assert.ok(ROUTE_EVENTS.includes('Powerplay'), 'le total de départ est lu');
});

test('alertes d’achat et questions : seulement en mode Commerce ; le suivi, lui, continue dans tous les modes', async () => {
  const achat = { timestamp: '2026-11-23T16:33:57Z', event: 'MarketBuy', MarketID: 1, Type: 'kamitracigars', Count: 102, BuyPrice: 10116, TotalCost: 1031832 };
  const essai = (overlay) => {
    const journal = fauxJournal();
    const tracker = new RouteTracker({ prisma: fausseBase, journal, game: { snapshot: () => ({}) }, broadcast: () => {}, overlay });
    const appels = [];
    tracker.checkBuy = async () => { appels.push('achat'); return null; };
    tracker.askIfChanged = async () => { appels.push('question'); };
    journal.emit('event', { ...achat });
    journal.emit('event', { timestamp: '2026-11-23T16:40:00Z', event: 'Docked', StationName: 'Station Test', StarSystem: 'Système Test', MarketID: 2 });
    return { appels, tracker };
  };
  assert.deepEqual(essai({ mode: () => 'routes' }).appels, ['achat', 'question', 'question']);
  const rares = essai({ mode: () => 'rares' });
  assert.deepEqual(rares.appels, [], 'commerce de rares : ni alerte ni question');
  assert.ok(rares.tracker.timeline.length >= 1, 'la chronologie est tenue quand même');
  assert.deepEqual(essai({ mode: () => null }).appels, [], 'aucun mode');
  assert.deepEqual(essai(undefined).appels, ['achat', 'question', 'question'], 'sans overlay (serveur seul) : comme avant');
  await new Promise((r) => setTimeout(r, 400)); // laisse finir les synchronisations programmées
});
