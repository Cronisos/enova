import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessFromEvent, ModeAdvisor, DISMISS_MS } from './modeGuess.js';

const SRV = { Flags: 1 << 26 };
const SHIP = { Flags: 1 << 24 };

test('signes nets : Rhino, raffinage, prospection, primes, sauvetage', () => {
  assert.deepEqual(guessFromEvent({ event: 'LaunchSRV', SRVType: 'mev_rhino', SRVType_Localised: 'VRS Rhino' }), { mode: 'waypoints', reason: 'Rhino sorti' });
  assert.equal(guessFromEvent({ event: 'LaunchSRV', SRVType: 'testbuggy' }), null); // Scarab : pas forcément du minage
  assert.equal(guessFromEvent({ event: 'MiningRefined' }, { inSrv: true }).mode, 'waypoints');
  assert.equal(guessFromEvent({ event: 'MiningRefined' }, { inSrv: false }).mode, 'shipmining');
  assert.equal(guessFromEvent({ event: 'LaunchDrone', Type: 'Prospector' }).mode, 'shipmining');
  assert.equal(guessFromEvent({ event: 'LaunchDrone', Type: 'Collection' }), null);
  assert.equal(guessFromEvent({ event: 'Bounty' }).mode, 'combat');
  assert.equal(guessFromEvent({ event: 'FactionKillBond' }).reason, 'zone de conflit');
  assert.equal(guessFromEvent({ event: 'CollectCargo', Type: 'occupiedcryopod' }).mode, 'rescue');
  assert.equal(guessFromEvent({ event: 'CollectCargo', Type: 'gold' }), null);
  assert.equal(guessFromEvent({ event: 'UnderAttack' }), null); // un pirate en minant n'est pas du combat
  // Vaisseau pris : le grand hangar est celui du Rhino, même avec des lasers de minage ; le petit ne dit rien
  const loadout = (...items) => ({ event: 'Loadout', Modules: items.map((Item) => ({ Item })) });
  assert.equal(guessFromEvent(loadout('int_mkiilargebuggybay_size4_class3', 'hpt_mininglaser_fixed_small')).mode, 'waypoints');
  assert.equal(guessFromEvent(loadout('int_largebuggybay_size6_class3_free')).reason, 'vaisseau avec hangar à Rhino');
  assert.equal(guessFromEvent(loadout('hpt_mininglaser_turret_medium', 'int_dronecontrol_prospector_size3_class3')).mode, 'shipmining');
  assert.equal(guessFromEvent(loadout('int_buggybay_size2_class2', 'hpt_pulselaser_fixed_medium')), null);
});

test('colonisation : à quai à un chantier (nom ET service), ou livraison', () => {
  // Exemples documentés (fixture BGS-Tally, schémas) et journal de référence (établissement terminé) : pas un vrai dock de l’auteur
  const services = ['dock', 'commodities', 'colonisationcontribution'];
  assert.equal(guessFromEvent({ event: 'Docked', StationName: '$EXT_PANEL_ColonisationShip; Judson Depot', StationServices: services }).mode, 'colonisation');
  assert.equal(guessFromEvent({ event: 'Docked', StationName: 'Planetary Construction Site: Polak Relay', StationServices: services }).reason, 'à quai à un chantier de construction');
  assert.equal(guessFromEvent({ event: 'Docked', StationName: 'Gibbs Hydroponics Site', StationServices: services }), null); // service seul
  assert.equal(guessFromEvent({ event: 'Docked', StationName: 'Orbital Construction Site: X', StationServices: ['dock'] }), null); // terminé
  assert.equal(guessFromEvent({ event: 'Docked', StationName: 'Jameson Memorial' }), null);
  assert.equal(guessFromEvent({ event: 'ColonisationContribution', MarketID: 3950995714, Contributions: [] }).mode, 'colonisation');
});

function advisor(mode = 'combat') {
  let t = Date.parse('2026-11-07T10:00:00Z');
  const changes = [];
  const state = { mode };
  const a = new ModeAdvisor({ mode: () => state.mode, now: () => t, onChange: (s) => changes.push(s) });
  return { a, changes, state, tick: (ms) => (t += ms) };
}

test('proposer, accepter, refuser', () => {
  const { a, changes, state, tick } = advisor('combat');
  a.event({ event: 'LaunchSRV', SRVType: 'mev_rhino' }, SHIP);
  assert.equal(a.current().mode, 'waypoints');
  a.event({ event: 'MiningRefined' }, SRV); // même mode : pas de nouvelle annonce
  assert.equal(changes.length, 1);
  // Accepté : le mode passe, la proposition s'efface
  state.mode = 'waypoints';
  a.modeChanged();
  assert.equal(a.current(), null);
  // Déjà dans le bon mode : rien
  a.event({ event: 'MiningRefined' }, SRV);
  assert.equal(a.current(), null);
  // Refus : silence 30 min pour ce mode, pas pour les autres
  a.event({ event: 'Bounty' }, SHIP);
  assert.equal(a.current().mode, 'combat');
  a.dismiss();
  a.event({ event: 'Bounty' }, SHIP);
  assert.equal(a.current(), null);
  tick(DISMISS_MS + 1000);
  a.event({ event: 'Bounty' }, SHIP);
  assert.equal(a.current().mode, 'combat');
  // Sans réponse, elle s'efface au bout de 15 min
  tick(16 * 60 * 1000);
  assert.equal(a.current(), null);
});

test('matériaux : une vraie chasse, pas ceux ramassés en minant', () => {
  const { a, tick } = advisor('combat');
  for (let i = 0; i < 6; i++) a.event({ event: 'MaterialCollected' }, SRV); // en SRV : minage
  assert.notEqual(a.current()?.mode, 'materials');
  const b = advisor('combat');
  for (let i = 0; i < 4; i++) {
    b.a.event({ event: 'MaterialCollected' }, SHIP);
    b.tick(60000);
  }
  assert.equal(b.a.current(), null);
  b.a.event({ event: 'MaterialCollected' }, SHIP);
  assert.equal(b.a.current().mode, 'materials');
  tick(0);
});

test('Loadout abîmé (modules qui ne sont pas une liste d’objets) : aucun mode suggéré, aucune exception', () => {
  for (const Modules of ['pas une liste', { Item: 'int_largebuggybay' }, 42]) {
    assert.equal(guessFromEvent({ event: 'Loadout', Modules }), null, JSON.stringify(Modules));
  }
  assert.equal(guessFromEvent({ event: 'Loadout', Modules: [null, 3, { Item: 'Int_MKIILargeBuggyBay' }] })?.mode, 'waypoints');
});

test('rôles du vaisseau : équipement ignoré quand un rôle est déclaré, hors rôle discret, « Retenir » sans rôle', () => {
  let ship = { id: 43, role: null };
  const a = new ModeAdvisor({ mode: () => null, now: () => 0, ship: () => ship, timers: null });
  const hangar = { event: 'Loadout', Ship: 'lakonminer', ShipID: 43, Modules: [{ Item: 'int_largebuggybay_size6_class3_free' }] };
  a.event(hangar, SHIP);
  assert.deepEqual(a.current(), { mode: 'waypoints', reason: 'vaisseau avec hangar à Rhino', shipId: 43, canRemember: true, at: 0 });
  a.set(null);
  ship = { id: 43, role: { primary: 'waypoints', secondary: [] } };
  a.event(hangar, SHIP);
  assert.equal(a.current(), null, 'le rôle prime sur l’équipement');
  a.event({ event: 'Bounty' }, SHIP);
  assert.deepEqual(a.current(), { mode: 'combat', reason: 'prime gagnée', discreet: true, at: 0 });
  a.event({ event: 'LaunchSRV', SRVType: 'mev_rhino' }, SHIP);
  assert.deepEqual(a.current(), { mode: 'waypoints', reason: 'Rhino sorti', at: 0 }, 'dans le rôle : normale, elle remplace la discrète');
  // Polyvalent : l'équipement propose comme sans rôle, sans « Retenir » (un rôle est déjà donné)
  ship = { id: 43, role: { primary: 'polyvalent', secondary: [] } };
  a.set(null);
  a.event(hangar, SHIP);
  assert.deepEqual(a.current(), { mode: 'waypoints', reason: 'vaisseau avec hangar à Rhino', at: 0 });
});

test("équipement : seulement celui du vaisseau où tu es (ni taxi, ni équipage, ni Loadout écarté par le suivi)", () => {
  let ship = { id: 43, role: null, away: null };
  const a = new ModeAdvisor({ mode: () => null, now: () => 0, ship: () => ship, timers: null });
  const hangar = (ShipID) => ({ event: 'Loadout', Ship: 'lakonminer', ShipID, Modules: [{ Item: 'int_largebuggybay_size6_class3_free' }] });
  a.event(hangar(12), SHIP);
  assert.equal(a.current(), null, 'autre numéro que ton vaisseau');
  ship = { id: null, role: null, away: 'crew' };
  a.event(hangar(12), SHIP);
  assert.equal(a.current(), null, 'vaisseau d’un autre CMDR');
  ship = null;
  a.event(hangar(12), SHIP);
  assert.equal(a.current(), null, 'vaisseau inconnu : le suivi a écarté ce Loadout');
  // En équipage, l'activité reste proposée, comme sans rôle (les rôles de ton vaisseau ne s'y appliquent pas)
  ship = { id: null, role: null, away: 'crew' };
  a.event({ event: 'Bounty' }, SHIP);
  assert.deepEqual(a.current(), { mode: 'combat', reason: 'prime gagnée', at: 0 });
  // Sans suivi du vaisseau (pas de dépendance ship) : comme avant les rôles
  const b = new ModeAdvisor({ mode: () => null, now: () => 0, timers: null });
  b.event(hangar(12), SHIP);
  assert.deepEqual(b.current(), { mode: 'waypoints', reason: 'vaisseau avec hangar à Rhino', at: 0 });
});

test('expiration : la proposition s’efface d’elle-même et les fenêtres sont prévenues', () => {
  let t = 0;
  const pending = [];
  const timers = { set: (fn, ms) => pending.push({ fn, ms }) && pending.length, clear: (id) => { pending[id - 1] = null; } };
  const changes = [];
  const a = new ModeAdvisor({ mode: () => null, now: () => t, onChange: (s) => changes.push(s), timers });
  a.propose({ mode: 'combat', reason: 'prime gagnée' });
  const timer = pending.at(-1);
  assert.ok(timer.ms > 15 * 60 * 1000);
  t = timer.ms;
  // Seule la minuterie agit ici : current() efface aussi une proposition trop vieille, il ne doit pas faire le travail à sa place
  const avant = changes.length;
  timer.fn();
  assert.equal(changes.length, avant + 1, 'diffusé par la minuterie');
  assert.equal(changes.at(-1), null, 'null diffusé : le HUD efface la ligne');
  assert.equal(a.suggestion, null);
  assert.equal(a.current(), null);
  // Une nouvelle proposition remplace la minuterie de la précédente
  a.propose({ mode: 'rescue', reason: 'x' });
  a.propose({ mode: 'materials', reason: 'y' });
  assert.equal(pending.filter(Boolean).length, 1);
});

test('même mode déjà proposé : la première raison reste, sauf pour monter d’un cran (discrète → normale, devinette → rôle)', () => {
  const a = new ModeAdvisor({ mode: () => null, now: () => 0, timers: null });
  a.propose({ mode: 'combat', reason: 'prime gagnée', discreet: true });
  a.propose({ mode: 'combat', reason: 'zone de conflit', discreet: true });
  assert.equal(a.current().reason, 'prime gagnée', 'même cran : la première raison reste');
  a.propose({ mode: 'combat', reason: 'zone de conflit' });
  assert.deepEqual(a.current(), { mode: 'combat', reason: 'zone de conflit', at: 0 }, 'la normale remplace la discrète');
  a.propose({ mode: 'combat', reason: 'prime gagnée', discreet: true });
  assert.equal(a.current().discreet, undefined, 'et pas l’inverse');
  // Devinette puis rôle du vaisseau (bascule devenue proposition) : la raison du rôle remplace celle de la devinette
  a.propose({ mode: 'combat', reason: 'rôle principal de « Cutter » : …', source: 'role', shipId: 5 });
  assert.deepEqual(a.current(), { mode: 'combat', reason: 'rôle principal de « Cutter » : …', source: 'role', shipId: 5, at: 0 });
  a.propose({ mode: 'combat', reason: 'prime gagnée' });
  assert.equal(a.current().source, 'role', 'une devinette ne remplace pas le rôle');
});

test('silence de « Non » : lisible par mode (la bascule au relog en dépend), et fini au bout de 30 min', () => {
  let t = 0;
  const a = new ModeAdvisor({ mode: () => null, now: () => t, timers: null });
  assert.equal(a.silenced('combat'), false);
  a.propose({ mode: 'combat', reason: 'prime gagnée' });
  a.dismiss();
  assert.equal(a.silenced('combat'), true);
  assert.equal(a.silenced('rescue'), false);
  t = DISMISS_MS;
  assert.equal(a.silenced('combat'), false);
  a.silence('rescue');
  assert.equal(a.silenced('rescue'), true);
  assert.equal(a.silenced('constructor'), false);
  assert.equal(a.silenced(undefined), false);
});

test('matériau des Gardiens ramassé : mode Gardiens dès le premier ; un autre matériau : rien', () => {
  assert.deepEqual(guessFromEvent({ event: 'MaterialCollected', Name: 'guardian_powercell', Count: 3 }), { mode: 'gardiens', reason: 'matériau gardien ramassé' });
  assert.equal(guessFromEvent({ event: 'MaterialCollected', Name: 'ancienttechnologicaldata', Count: 1 }).mode, 'gardiens');
  assert.equal(guessFromEvent({ event: 'MaterialCollected', Name: 'iron', Count: 3 }), null);
  assert.equal(guessFromEvent({ event: 'MaterialCollected' }), null);
});

test('approche d’un site gardien : mode Gardiens ; une colonie ordinaire : rien', () => {
  assert.deepEqual(guessFromEvent({ event: 'ApproachSettlement', Name: '$Ancient_Small_002:#index=1;' }), { mode: 'gardiens', reason: 'site gardien en vue' });
  assert.equal(guessFromEvent({ event: 'ApproachSettlement', Name: 'Gibbs Hydroponics Site' }), null);
});

test('marchandise rare achetée : mode Commerce de rares ; une marchandise ordinaire : rien', () => {
  assert.deepEqual(guessFromEvent({ event: 'MarketBuy', Type: 'kamitracigars', Count: 102 }), { mode: 'rares', reason: 'marchandise rare achetée' });
  assert.equal(guessFromEvent({ event: 'MarketBuy', Type: 'gold', Count: 50 }), null);
});
