// Tests de la place par défaut des fenêtres de l'overlay (place.js), sans Electron : npm test -w overlay.

const test = require('node:test');
const assert = require('node:assert/strict');
const { findPlace, MARGIN, TOP } = require('./place.js');

const AREA = { x: 0, y: 0, width: 1920, height: 1040 }; // 1080p, barre des tâches de 40 px
const HUD = { width: 700, height: 124 };
// Mêmes tailles que overlay/main.js (HUD_SIZE, SIZES, FREE)
const SIZES = { waypoints: { width: 590, height: 124 }, carrier: { width: 340, height: 236 }, navroute: { width: 340, height: 236 }, fsdcool: { width: 572, height: 104 } };
const FREE = {
  glance: { width: 480, height: 460 }, signals: { width: 360, height: 380 }, 'waypoints-list': { width: 380, height: 440 },
  'waypoints-guide': { width: 320, height: 210 }, 'waypoints-sweep': { width: 340, height: 470 }, capture: { width: 420, height: 260 },
  'colonisation-list': { width: 340, height: 420 }, compagnon: { width: 440, height: 180 },
};
const GROWS = new Set(['glance', 'colonisation-list']);
const DRAWER = { 'waypoints-sweep': 270 }; // tiroir Top 10, collé à gauche
const compagnonPlace = (area, size) => ({ x: area.x + 20, y: area.y + Math.round(area.height * 0.62) - size.height });

const intersects = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const inside = (r, area) => r.x >= area.x && r.y >= area.y && r.x + r.width <= area.x + area.width && r.y + r.height <= area.y + area.height;

/** Ouvre les pages dans l'ordre, comme open() de main.js, et rend leurs rectangles (tiroirs compris). */
function openAll(pages, area = AREA, opened = []) {
  const wins = [...opened];
  for (const page of pages) {
    const size = FREE[page] || SIZES[page] || HUD;
    const p = findPlace({
      size,
      area,
      others: wins,
      free: Boolean(FREE[page]),
      preferred: page === 'compagnon' ? compagnonPlace(area, size) : null,
      drawer: DRAWER[page] || 0,
      grows: GROWS.has(page),
      hudWidth: HUD.width,
      hudIndex: wins.filter((w) => !w.free && !w.drawer).length,
    });
    wins.push({ page, ...size, ...p, free: Boolean(FREE[page]), grows: GROWS.has(page) });
    if (DRAWER[page]) wins.push({ page: `${page}-top`, x: p.x - DRAWER[page], y: p.y, width: DRAWER[page], height: size.height, drawer: true });
  }
  return wins;
}

function assertNoOverlap(wins, area = AREA) {
  for (const w of wins) assert.ok(inside(w, area), `${w.page} hors de l'écran : ${JSON.stringify(w)}`);
  for (let i = 0; i < wins.length; i++)
    for (let j = i + 1; j < wins.length; j++)
      assert.ok(!intersects(wins[i], wins[j]), `${wins[i].page} couvre ${wins[j].page} : ${JSON.stringify(wins[i])} / ${JSON.stringify(wins[j])}`);
}

test('écran vide : fenêtre libre en haut à droite, HUD en haut au centre (places d\'avant)', () => {
  const [glance] = openAll(['glance']);
  assert.deepEqual({ x: glance.x, y: glance.y }, { x: 1920 - MARGIN - 480, y: TOP });
  const [combat] = openAll(['combat']);
  assert.deepEqual({ x: combat.x, y: combat.y }, { x: (1920 - 700) / 2, y: TOP });
});

test('HUD les uns sous les autres, selon leur vraie hauteur, et le trou laissé par une fenêtre fermée resservi', () => {
  const wins = openAll(['combat', 'carrier', 'bindings']);
  assertNoOverlap(wins);
  const [combat, carrier, bindings] = wins;
  assert.equal(carrier.x, combat.x);
  assert.equal(carrier.y, combat.y + combat.height + 10);
  assert.equal(bindings.y, carrier.y + carrier.height + 10); // et non 40 + 2 × 134, qui couvrait le porteur (236 px)
  // Le porteur se ferme ; la vente de mérites s'ouvre : dans le trou, sans couvrir l'alerte des commandes
  const after = openAll(['expansion-sale'], AREA, [combat, bindings]);
  assertNoOverlap(after);
  assert.equal(after[2].y, combat.y + combat.height + 10);
});

test('mode Colonisation avec le Coup d\'œil : la liste de courses et le Coup d\'œil côte à côte, jamais l\'un sous l\'autre', () => {
  const wins = openAll(['colonisation', 'colonisation-list', 'glance']);
  assertNoOverlap(wins);
  const list = wins.find((w) => w.page === 'colonisation-list');
  const glance = wins.find((w) => w.page === 'glance');
  // Les deux grandissent vers le bas : aucune ne commence sous l'autre dans la même colonne
  const sameColumn = list.x < glance.x + glance.width && glance.x < list.x + list.width;
  assert.ok(!sameColumn, 'les deux fenêtres qui grandissent sont dans des colonnes différentes');
  // Ni dans la colonne des HUD
  const column = { x: (1920 - 700) / 2, y: 0, width: 700, height: 1040 };
  assert.ok(!intersects(list, column) && !intersects(glance, column));
});

test('compagnon : sa place préférée (à gauche, sous le milieu), sauf si elle est prise', () => {
  const [cp] = openAll(['compagnon']);
  assert.deepEqual({ x: cp.x, y: cp.y }, compagnonPlace(AREA, FREE.compagnon));
  const blocker = { page: 'autre', x: 0, y: 400, width: 600, height: 300 };
  const wins = openAll(['compagnon'], AREA, [blocker]);
  assertNoOverlap(wins);
});

test('toutes les fenêtres ouvertes d\'elles-mêmes en même temps : aucune n\'en couvre une autre', () => {
  // Combat et Coup d'œil choisis, puis : compagnon, refroidissement FSD, alerte des commandes, vente de mérites,
  // saut du porteur, itinéraire, signaux
  const wins = openAll(['combat', 'glance', 'compagnon', 'fsdcool', 'bindings', 'expansion-sale', 'carrier', 'navroute', 'signals']);
  assertNoOverlap(wins);
});

test('Minage Rhino : HUD, repères, guidage, capture, balayage et son tiroir, Coup d\'œil, compagnon : rien ne se couvre', () => {
  const wins = openAll(['waypoints', 'waypoints-list', 'waypoints-guide', 'capture', 'waypoints-sweep', 'glance', 'compagnon']);
  assertNoOverlap(wins);
});

test('écran plus petit (1280 × 680) : toujours dans l\'écran, et l\'ancienne place quand il n\'y a plus de place libre', () => {
  const small = { x: 0, y: 0, width: 1280, height: 680 };
  const wins = openAll(['combat', 'glance', 'colonisation-list', 'signals', 'compagnon', 'bindings', 'fsdcool'], small);
  for (const w of wins) assert.ok(inside(w, small), `${w.page} hors de l'écran`);
  // Écran plein : place d'avant (en haut à droite pour une fenêtre libre, HUD empilés pour un HUD)
  const full = [{ page: 'mur', x: 0, y: 0, width: 1280, height: 680 }];
  assert.deepEqual(findPlace({ size: FREE.glance, area: small, others: full, free: true, hudWidth: 700 }), { x: 1280 - MARGIN - 480, y: TOP });
  assert.deepEqual(findPlace({ size: HUD, area: small, others: full, free: false, hudWidth: 700, hudIndex: 2, hudStep: 134 }), { x: 290, y: TOP + 268 });
});

test('second écran à gauche (coordonnées négatives) et fenêtres aux bornes illisibles ignorées', () => {
  const left = { x: -1920, y: 0, width: 1920, height: 1040 };
  const p = findPlace({ size: FREE.glance, area: left, others: [{ x: NaN, y: 0, width: 10, height: 10 }], free: true, hudWidth: 700 });
  assert.deepEqual(p, { x: -MARGIN - 480, y: TOP });
});
