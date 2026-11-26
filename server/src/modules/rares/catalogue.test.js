// Catalogue des rares : lecture d'une réponse Spansh, distance, fusion des relevés, alertes, relevé complet.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOMS, SEUIL_DEFAUT, TYPES, aSignaler, distance, fusionner, ligneDe, nomDeCle, nomFrancais, reglages, relever, requete } from './catalogue.js';

// Forme relevée sur Spansh le 25 nov. 2026 (réduite)
const station = (nom, extra = {}, cote = {}) => ({
  name: 'Hammel Terminal', system_name: 'Kamitra', type: 'Orbis Starport', system_x: 14.5, system_y: -30.2, system_z: -10.1,
  distance_to_arrival: 83.2, has_large_pad: true, large_pads: 4, medium_pads: 10, is_planetary: false,
  system_controlling_power: 'Aisling Duval', controlling_minor_faction: 'Faction Test', controlling_minor_faction_state: 'Boom', market_updated_at: '2026-11-25T09:20:52Z',
  market: [{ commodity: 'Gold', buy_price: 0, supply: 0 }, { commodity: nom, buy_price: 6592, supply: 23, is_rare: true, is_home_station: true, ...cote }],
  ...extra,
});

test('noms : 142 rares, sans doublon, avec leur nom français quand le relevé du jeu le connaît', () => {
  assert.equal(NOMS.length, 142);
  assert.equal(new Set(NOMS).size, NOMS.length);
  assert.equal(nomFrancais('Kamitra Cigars'), 'Cigares de Kamitra');
  assert.equal(nomFrancais('Azure Milk'), 'Lait d’Azure', 'nom interne différent du nom anglais');
  assert.equal(nomFrancais('Galactic Travel Guide'), 'Galactic Travel Guide', 'inconnue du relevé : nom anglais');
  assert.equal(nomDeCle('kamitracigars'), 'Kamitra Cigars');
  assert.equal(nomDeCle('bluemilk'), 'Azure Milk');
  assert.equal(nomDeCle('gold'), null);
});

test('requête : la rare en stock, dans les stations seulement (pas les porte-vaisseaux)', () => {
  const q = requete('Kamitra Cigars');
  assert.deepEqual(q.filters.market, [{ name: 'Kamitra Cigars', supply: { value: [1, 1000000], comparison: '<=>' } }]);
  assert.equal(q.filters.type.value, TYPES);
  assert.equal(TYPES.some((t) => /carrier/i.test(t)), false);
  assert.equal(q.reference_system, 'Sol', 'rien de ta position ne part');
});

test('ligne tirée de la réponse : la station source, son stock, son prix', () => {
  const l = ligneDe('Kamitra Cigars', { results: [station('Kamitra Cigars')] });
  assert.deepEqual(l, {
    nom: 'Kamitra Cigars', label: 'Cigares de Kamitra', station: 'Hammel Terminal', systeme: 'Kamitra', type: 'Orbis Starport',
    x: 14.5, y: -30.2, z: -10.1, arrivee: 83.2, grandPad: true, moyenPad: true, planetaire: false, puissance: 'Aisling Duval',
    faction: 'Faction Test', etat: 'Boom', stock: 23, prix: 6592, maj: '2026-11-25T09:20:52Z',
  });
  // Une revendeuse avant la source : la source (is_home_station) est préférée
  const revente = station('Kamitra Cigars', { name: 'Revente' }, { is_home_station: false, supply: 5 });
  assert.equal(ligneDe('Kamitra Cigars', { results: [revente, station('Kamitra Cigars')] }).station, 'Hammel Terminal');
  assert.equal(ligneDe('Kamitra Cigars', { results: [revente] }).station, 'Revente', 'faute de source : la première');
  assert.equal(ligneDe('Kamitra Cigars', { results: [] }), null);
  assert.equal(ligneDe('Kamitra Cigars', null), null);
});

test('distance depuis ta position, au dixième ; inconnue sans position', () => {
  assert.equal(distance({ x: 3, y: 4, z: 0 }, [0, 0, 0]), 5);
  assert.equal(distance({ x: 1, y: 1, z: 1 }, [0, 0, 0]), 1.7);
  assert.equal(distance({ x: 3, y: 4, z: 0 }, null), null);
  assert.equal(distance({ x: null, y: 4, z: 0 }, [0, 0, 0]), null);
});

test('fusion : une rare que le relevé ne retrouve pas est gardée, stock à 0', () => {
  const avant = [{ nom: 'A', label: 'A', stock: 120 }, { nom: 'B', label: 'B', stock: 40 }];
  const f = fusionner(avant, [{ nom: 'C', label: 'C', stock: 10 }, { nom: 'A', label: 'A', stock: 90 }]);
  assert.deepEqual(f, [{ nom: 'A', label: 'A', stock: 90 }, { nom: 'B', label: 'B', stock: 0, epuisee: true }, { nom: 'C', label: 'C', stock: 10 }]);
});

test('alerte : seulement ce qui vient d’atteindre le seuil', () => {
  const avant = [{ nom: 'A', stock: 120 }, { nom: 'B', stock: 40 }, { nom: 'C', stock: 99 }];
  const apres = [{ nom: 'A', stock: 130 }, { nom: 'B', stock: 100 }, { nom: 'C', stock: 99 }, { nom: 'D', stock: 250 }];
  assert.deepEqual(aSignaler(avant, apres).map((l) => l.nom), ['B', 'D'], 'A y était déjà, C n’y est pas');
  assert.deepEqual(aSignaler([], apres).map((l) => l.nom), ['A', 'B', 'D'], 'premier relevé : tout ce qui est au seuil');
  assert.deepEqual(aSignaler(avant, apres, 200).map((l) => l.nom), ['D']);
  assert.equal(SEUIL_DEFAUT, 100);
});

test('réglages remis dans leurs bornes', () => {
  assert.deepEqual(reglages(null), { surveiller: false, seuil: 100 });
  assert.deepEqual(reglages({ surveiller: true, seuil: '150' }), { surveiller: true, seuil: 150 });
  assert.deepEqual(reglages({ surveiller: 'oui', seuil: -3 }), { surveiller: false, seuil: 100 });
});

test('relevé complet : une requête par rare, les erreurs sautées, tout en erreur : levée', async () => {
  const appels = [];
  const fetchImpl = async (url, options) => {
    const nom = JSON.parse(options.body).filters.market[0].name;
    appels.push(nom);
    if (nom === 'B') throw new Error('coupure');
    if (nom === 'C') return { ok: false, status: 500 };
    return { ok: true, json: async () => ({ results: nom === 'D' ? [] : [station(nom)] }) };
  };
  const progres = [];
  const r = await relever({ noms: ['A', 'B', 'C', 'D'], fetchImpl, pause: 0, progres: (fait, total) => progres.push(`${fait}/${total}`) });
  assert.deepEqual(appels, ['A', 'B', 'C', 'D']);
  assert.deepEqual(r.lignes.map((l) => l.nom), ['A'], 'D : aucune station, pas de ligne');
  assert.equal(r.erreurs, 2);
  assert.deepEqual(progres, ['1/4', '2/4', '3/4', '4/4']);
  await assert.rejects(relever({ noms: ['B'], fetchImpl, pause: 0 }), /coupure/);
});
