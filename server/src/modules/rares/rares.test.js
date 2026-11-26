// Commerce de rares : seules les marchandises rares comptent ; mérites pris juste après un achat ou une vente.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MERIT_WINDOW_MS, RARES_EVENTS, RaresState } from './state.js';
import { RARES, cleMarchandise, estRare } from '../../core/rares.js';

const ev = (t, event, champs = {}) => ({ timestamp: t, event, ...champs });

test('relevé des rares : une bonne centaine, clés du journal, rien d’hérité d’Object', () => {
  assert.ok(Object.keys(RARES).length >= 120);
  assert.equal(RARES.kamitracigars, 'Cigares de Kamitra');
  assert.equal(estRare('KamitraCigars'), true);
  assert.equal(estRare('$kamitracigars_name;'), true);
  assert.equal(estRare('gold'), false);
  assert.equal(estRare('__proto__'), false);
  assert.equal(estRare(null), false);
  assert.equal(cleMarchandise('$AltairianSkin_Name;'), 'altairianskin');
  for (const [cle, nom] of Object.entries(RARES)) assert.ok(/^[a-z0-9_]+$/.test(cle) && nom, cle);
});

test('la séance du 23 nov. : 102 t de cigares achetées puis vendues, mérites de la vente', () => {
  const s = new RaresState();
  assert.ok(RARES_EVENTS.includes('MarketSell'));
  s.apply(ev('2026-11-23T16:00:00Z', 'LoadGame'));
  s.apply(ev('2026-11-23T16:00:01Z', 'Powerplay', { Merits: 100000 }));
  assert.equal(s.apply(ev('2026-11-23T16:30:00Z', 'MarketBuy', { Type: 'gold', Count: 50, TotalCost: 500000 })), false, 'pas une rare');
  assert.equal(s.apply(ev('2026-11-23T16:33:57Z', 'MarketBuy', { Type: 'kamitracigars', Type_Localised: 'Cigares de Kamitra', Count: 102, BuyPrice: 10116, TotalCost: 1031832 })), true);
  s.apply(ev('2026-11-23T16:46:01Z', 'MarketSell', { Type: 'kamitracigars', Type_Localised: 'Cigares de Kamitra', Count: 102, SellPrice: 24563, TotalSale: 2505426, AvgPricePaid: 10116 }));
  s.apply(ev('2026-11-23T16:46:03Z', 'PowerplayMerits', { MeritsGained: 1540, TotalMerits: 101540 }));
  // Mérites d'autre chose, longtemps après : pas comptés
  assert.equal(s.apply(ev('2026-11-23T17:10:00Z', 'PowerplayMerits', { MeritsGained: 80, TotalMerits: 101620 })), false);
  const v = s.summary([{ name: 'kamitracigars', label: 'Cigares de Kamitra', count: 12 }, { name: 'gold', label: 'Or', count: 50 }]);
  assert.deepEqual([v.bought, v.sold, v.cost, v.revenue, v.profit, v.merits], [102, 102, 1031832, 2505426, 2505426 - 10116 * 102, 1540]);
  assert.deepEqual(v.hold, { count: 12, items: [{ label: 'Cigares de Kamitra', count: 12 }] });
  assert.deepEqual(v.types, [{ label: 'Cigares de Kamitra', bought: 102, sold: 102, profit: 1473594, merits: 1540 }]);
  assert.deepEqual(v.recent.map((r) => [r.kind, r.count, r.merits]), [['Vendu', 102, 1540], ['Acheté', 102, 0]]);
  assert.equal(v.startedAt, '2026-11-23T16:00:00Z');
});

test('fenêtre des mérites, doublon retiré par le jeu, marchandise trouvée, session relancée', () => {
  const s = new RaresState();
  s.apply(ev('2026-11-23T10:00:00Z', 'Powerplay', { Merits: 1000 }));
  s.apply(ev('2026-11-23T10:00:10Z', 'MarketSell', { Type: 'altairianskin', Count: 10, TotalSale: 168640 }));
  assert.equal(s.summary().profit, 168640, 'sans prix payé : tout est bénéfice');
  const juste = new Date(Date.parse('2026-11-23T10:00:10Z') + MERIT_WINDOW_MS).toISOString();
  s.apply(ev(juste, 'PowerplayMerits', { MeritsGained: 200, TotalMerits: 1200 }));
  s.apply(ev(juste, 'PowerplayMerits', { MeritsGained: 200, TotalMerits: 1100 })); // le jeu corrige : −100
  assert.equal(s.summary().merits, 100);
  assert.equal(s.apply(ev('2026-11-23T10:05:00Z', 'Died')), true);
  assert.equal(s.summary().deaths, 1);
  s.apply(ev('2026-11-23T11:00:00Z', 'LoadGame'));
  assert.deepEqual([s.summary().merits, s.summary().sold, s.summary().types.length], [0, 0, 0]);
});

test('rare apprise d’un marché lu, absente du relevé', () => {
  const s = new RaresState();
  assert.equal(s.estRare('nouvelleraretest'), false);
  assert.equal(s.apprendre({ Items: [{ Name: '$NouvelleRareTest_Name;', Name_Localised: 'Rare de test', Rare: true }, { Name: '$gold_name;', Rare: false }, { Name: '$kamitracigars_name;', Rare: true }, null] }), true);
  assert.equal(s.apprendre({ Items: [{ Name: '$NouvelleRareTest_Name;', Rare: true }] }), false, 'déjà apprise');
  assert.equal(s.apprendre(null), false);
  assert.equal(s.apply(ev('2026-11-23T10:00:00Z', 'MarketBuy', { Type: 'nouvelleraretest', Count: 4, TotalCost: 4000 })), true);
  assert.equal(s.summary().types[0].label, 'Rare de test');
  assert.equal(s.estRare('gold'), false);
});
