// Livraison Powerplay : chargements, livraisons, soute et mérites. Événements relevés dans le journal du 19 nov. 2026.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PowerDeliveryState, DELIVERY_EVENTS, MERIT_WINDOW_MS, QUOTA_WINDOW_MS } from './state.js';

const PRESSE = { Power: 'Aisling Duval', Type: 'aislingmediamaterials', Type_Localised: "Dossiers de presse d'Aisling" };
const ev = (event, timestamp, plus = {}) => ({ event, timestamp, ...plus });

function seance() {
  const s = new PowerDeliveryState();
  s.apply(ev('LoadGame', '2026-11-19T16:27:43Z'));
  s.apply(ev('Powerplay', '2026-11-19T16:27:50Z', { Merits: 1524285 }));
  s.apply(ev('PowerplayCollect', '2026-11-19T16:59:47Z', { ...PRESSE, Count: 99 }));
  s.apply(ev('PowerplayCollect', '2026-11-19T17:00:11Z', { ...PRESSE, Count: 169 }));
  return s;
}

test('séance du 19 nov. : 268 t chargées en deux fois, livrées d’un coup, 1 608 mérites', () => {
  const s = seance();
  let v = s.summary([{ name: 'AislingMediaMaterials', label: "Dossiers de presse d'Aisling", count: 268 }, { name: 'drones', label: 'Drone', count: 4 }]);
  assert.equal(v.collected, 268);
  assert.equal(v.delivered, 0);
  assert.deepEqual(v.hold, { count: 268, items: [{ label: "Dossiers de presse d'Aisling", count: 268 }] }, 'en soute : la ressource Powerplay seulement, pas les drones');

  s.apply(ev('PowerplayDeliver', '2026-11-19T17:07:18Z', { ...PRESSE, Count: 268 }));
  assert.equal(s.apply(ev('PowerplayMerits', '2026-11-19T17:07:18Z', { Power: 'Aisling Duval', MeritsGained: 1608, TotalMerits: 1525893 })), true);
  v = s.summary([]);
  assert.equal(v.delivered, 268);
  assert.equal(v.merits, 1608);
  assert.deepEqual(v.hold, { count: 0, items: [] });
  assert.deepEqual(v.types, [{ label: "Dossiers de presse d'Aisling", collected: 268, delivered: 268, merits: 1608 }]);
  assert.deepEqual(v.recent[0], { at: '2026-11-19T17:07:18Z', kind: 'Livré', label: "Dossiers de presse d'Aisling", count: 268, merits: 1608 });
  assert.equal(v.recent.length, 3);
  assert.equal(v.lastActionAt, '2026-11-19T17:07:18Z');
});

test('mérites : seulement ceux qui suivent une livraison ; ceux d’une autre activité ne comptent pas', () => {
  const s = seance();
  // Avant toute livraison : pas pour cette session
  assert.equal(s.apply(ev('PowerplayMerits', '2026-11-19T17:01:00Z', { MeritsGained: 50, TotalMerits: 1524335 })), false);
  s.apply(ev('PowerplayDeliver', '2026-11-19T17:07:18Z', { ...PRESSE, Count: 268 }));
  s.apply(ev('PowerplayMerits', '2026-11-19T17:07:19Z', { MeritsGained: 1608, TotalMerits: 1525943 }));
  // Bien après la livraison : une autre activité
  const tard = new Date(Date.parse('2026-11-19T17:07:18Z') + MERIT_WINDOW_MS + 1000).toISOString();
  assert.equal(s.apply(ev('PowerplayMerits', tard, { MeritsGained: 300, TotalMerits: 1526243 })), false);
  assert.equal(s.summary().merits, 1608);
});

test('plusieurs ressources, remise à zéro, et lignes mal formées', () => {
  const s = seance();
  const CONTRATS = { Power: 'Aisling Duval', Type: 'aislingsealedcontracts', Type_Localised: "Contrats sous scellé d'Aisling" };
  s.apply(ev('PowerplayCollect', '2026-11-19T17:20:00Z', { ...CONTRATS, Count: 40 }));
  assert.equal(s.apply(ev('PowerplayCollect', '2026-11-19T17:20:01Z', { ...CONTRATS, Count: -3 })), false);
  assert.equal(s.apply(ev('PowerplayDeliver', '2026-11-19T17:20:02Z', { Count: 5 })), false, 'sans type : ignorée');
  assert.equal(s.apply(ev('Docked', '2026-11-19T17:20:03Z')), false);
  assert.deepEqual(s.summary().types.map((t) => [t.label, t.collected]), [["Dossiers de presse d'Aisling", 268], ["Contrats sous scellé d'Aisling", 40]]);
  // Nouvelle session : les compteurs repartent, la ressource reste reconnue en soute
  s.apply(ev('LoadGame', '2026-11-20T09:00:00Z'));
  const v = s.summary([{ name: 'aislingsealedcontracts', label: "Contrats sous scellé d'Aisling", count: 40 }]);
  assert.equal(v.collected, 0);
  assert.equal(v.hold.count, 40);
  assert.equal(v.startedAt, '2026-11-20T09:00:00Z');
  s.apply(ev('Died', '2026-11-20T09:30:00Z'));
  assert.equal(s.summary().deaths, 1);
  assert.ok(DELIVERY_EVENTS.includes('PowerplayDeliver') && DELIVERY_EVENTS.includes('PowerplayMerits'));
  assert.deepEqual(new PowerDeliveryState().summary(null).hold, { count: 0, items: [] });
});

test('tranche d’allocation : au plus tard 30 minutes après le dernier chargement, gardée d’une session à l’autre (journal du 19 nov.)', () => {
  const s = new PowerDeliveryState();
  assert.equal(s.summary().quota, null, 'rien chargé : pas de période');
  s.apply(ev('LoadGame', '2026-11-19T16:27:43Z'));
  s.apply(ev('PowerplayCollect', '2026-11-19T16:59:47Z', { ...PRESSE, Count: 99 }));
  s.apply(ev('PowerplayCollect', '2026-11-19T17:00:11Z', { ...PRESSE, Count: 169 }));
  assert.deepEqual(s.summary().quota, { since: '2026-11-19T16:59:47.000Z', nextAt: '2026-11-19T17:30:11.000Z', taken: 268, sure: false });
  assert.equal(QUOTA_WINDOW_MS, 30 * 60_000);
  // Remise à zéro de la session : la période du jeu, elle, continue
  s.apply(ev('LoadGame', '2026-11-19T17:10:00Z'));
  assert.equal(s.summary().collected, 0);
  assert.equal(s.summary().quota.taken, 268);
  // Chargement suivant : une autre tranche (grille inconnue : aucune paire de pleins quotas rapprochés, grille.test.js). Le jeu refusait encore à 18:02, vingt minutes après
  s.apply(ev('PowerplayCollect', '2026-11-19T17:42:18Z', { ...PRESSE, Count: 250 }));
  const q = s.summary().quota;
  assert.deepEqual(q, { since: '2026-11-19T17:42:18.000Z', nextAt: '2026-11-19T18:12:18.000Z', taken: 250, sure: false });
  assert.ok(Date.parse(q.nextAt) > Date.parse('2026-11-19T18:02:00Z'), 'pas « possible » à 18:02, quand le jeu a refusé');
});
