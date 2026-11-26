// Guide des ressources : ce que les journaux disent des ressources raffinées en Rhino (guide.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GuideObservations, mondeDe } from './guide.js';

const ev = (event, plus = {}) => ({ timestamp: '2026-11-17T19:00:00Z', event, ...plus });
const raffine = (g, type, nom, n) => {
  for (let i = 0; i < n; i++) g.apply(ev('MiningRefined', { Type: `$${type}_name;`, Type_Localised: nom }));
};

test('types de mondes : ceux où le Rhino mine, les autres ignorés', () => {
  assert.equal(mondeDe('Icy body'), 'gl');
  assert.equal(mondeDe('High metal content body'), 'hmc');
  assert.equal(mondeDe('Metal rich body'), 'mrb');
  assert.equal(mondeDe('Rocky body'), 'roc');
  assert.equal(mondeDe('Rocky ice body'), 'rg');
  assert.equal(mondeDe('Sudarsky class I gas giant'), null);
  assert.equal(mondeDe(undefined), null);
});

test('une tonne raffinée en Rhino va à la planète approchée ; son type peut être scanné après', () => {
  const g = new GuideObservations();
  // Le Rhino sort sans que le vaisseau se pose : l'approche dit la planète
  g.apply(ev('ApproachBody', { Body: 'Système Test 1 a' }));
  g.apply(ev('LaunchSRV', { SRVType: 'mev_rhino' }));
  raffine(g, 'lowtemperaturediamond', 'Diamants basse température', 5);
  g.apply(ev('Scan', { BodyName: 'Système Test 1 a', PlanetClass: 'Icy body' }));
  g.apply(ev('DockSRV'));
  // En vaisseau (astéroïde) : pas pour le guide du Rhino
  raffine(g, 'lowtemperaturediamond', 'Diamants basse température', 3);
  g.apply(ev('MarketSell', { Type: 'lowtemperaturediamond', Type_Localised: 'Diamants basse température', SellPrice: 180000, Count: 5 }));
  g.apply(ev('MarketSell', { Type: 'lowtemperaturediamond', SellPrice: 201134, Count: 2, timestamp: '2026-11-18T10:00:00Z' }));
  g.apply(ev('MarketSell', { Type: 'lowtemperaturediamond', SellPrice: 150000, Count: 1, timestamp: '2026-11-18T11:00:00Z' }));
  assert.deepEqual(g.summary(), [{
    cle: 'lowtemperaturediamond', nom: 'Diamants basse température', tonnes: 5, mondes: { gl: 5 }, planetes: 1, sansType: 0,
    prix: { max: 201134, dernier: 150000, le: '2026-11-18T11:00:00Z', tonnes: 8 },
  }]);
});

test('plusieurs planètes, planète jamais scannée, saut et départ de la planète', () => {
  const g = new GuideObservations();
  g.apply(ev('Scan', { BodyName: 'A 1', PlanetClass: 'Metal rich body' }));
  g.apply(ev('Scan', { BodyName: 'A 2', PlanetClass: 'High metal content body' }));
  g.apply(ev('Touchdown', { Body: 'A 1' }));
  g.apply(ev('LaunchSRV'));
  raffine(g, 'rhodplumsite', 'Rhodplumsite', 4);
  g.apply(ev('DockSRV'));
  g.apply(ev('LeaveBody'));
  g.apply(ev('LaunchSRV'));
  raffine(g, 'rhodplumsite', 'Rhodplumsite', 9); // plus de planète connue : pas compté
  g.apply(ev('ApproachBody', { Body: 'A 2' }));
  raffine(g, 'rhodplumsite', 'Rhodplumsite', 2);
  g.apply(ev('FSDJump'));
  g.apply(ev('Location', { BodyType: 'Planet', Body: 'B 7' })); // jeu lancé sur une planète jamais scannée
  g.apply(ev('LaunchSRV'));
  raffine(g, 'rhodplumsite', 'Rhodplumsite', 1);
  raffine(g, 'iridium', 'Iridium', 1);
  const [rho, iri] = g.summary();
  assert.deepEqual([rho.nom, rho.tonnes, rho.mondes, rho.planetes, rho.sansType, rho.prix], ['Rhodplumsite', 7, { mrb: 4, hmc: 2 }, 3, 1, null]);
  assert.deepEqual([iri.nom, iri.tonnes, iri.mondes, iri.sansType], ['Iridium', 1, {}, 1]);
  // Lignes mal formées : ignorées sans erreur
  g.apply(ev('MarketSell', { Type: 'iridium', SellPrice: -5 }));
  g.apply(ev('MiningRefined', {}));
  g.apply(ev('Touchdown', { Body: 42 }));
  assert.equal(g.summary().find((r) => r.nom === 'Iridium').prix, null);
});
