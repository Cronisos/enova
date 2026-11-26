// Tests du format des liens EDSY (edsyLink.js), sans les données de référence : nombres et noms codés, champ
// d'ingénierie, lecture d'une fiche complète (prix, valeurs saisies), écriture puis relecture.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LINK_GROUPS, CARGO_HATCH, COMPLETE_ROLL, encodeNumber, decodeNumber, encodeText, decodeText,
  packEngineering, unpackEngineering, readLink, writeLink,
} from './edsyLink.js';

test('nombres : base 64 à largeur fixe, aller-retour', () => {
  assert.equal(encodeNumber(0, 1), '0');
  assert.equal(encodeNumber(63, 1), '-');
  assert.equal(encodeNumber(64, 2), '10');
  assert.equal(encodeNumber(0x444, 2), 'H4');
  assert.equal(encodeNumber(CARGO_HATCH, 3), 'C0S');
  assert.equal(encodeNumber(5000, 2), '1E8'); // plus long que la largeur : jamais tronqué
  for (const n of [0, 1, 61, 62, 63, 64, 4000, 4095, 199907, 262143]) assert.equal(decodeNumber(encodeNumber(n, 3)), n);
  assert.equal(decodeNumber(''), 0);
  assert.equal(decodeNumber('!!'), 0); // caractères hors alphabet : 0
  assert.equal(decodeNumber('1!'), 64);
  // Entrées hors domaine : zéros, sans boucle infinie
  assert.equal(encodeNumber(-5, 2), '00');
  assert.equal(encodeNumber(NaN, 1), '0');
  assert.equal(encodeNumber(2.9, 1), '2');
});

test('noms : lettres et chiffres tels quels, ponctuation et accents codés, le reste retiré', () => {
  assert.equal(encodeText('Panther marchand'), 'Panther_0marchand');
  assert.equal(encodeText('é'), '-1g');
  assert.equal(decodeText(encodeText('a b-c_d.e/f ~`{}|\\"\'')), 'a b-c_d.e/f ~`{}|\\"\'');
  const last = String.fromCharCode(0x107e);
  assert.equal(decodeText(encodeText(`ÿĀ${last}`)), `ÿĀ${last}`);
  // Au-delà de U+107E, emoji, caractères de contrôle : retirés
  assert.equal(encodeText(`A${String.fromCharCode(0x107f)}B${String.fromCodePoint(0x1f680)}C${String.fromCharCode(10)}D`), 'ABCD');
  assert.equal(encodeText(''), '');
});

test('noms : lecture tolérante d\'un texte abîmé', () => {
  assert.equal(decodeText('ab!c'), 'abc'); // caractère hors alphabet ignoré
  assert.equal(decodeText('_'), ' '); // chiffre manquant : 0, l'espace
  assert.equal(decodeText('_W'), '~');
  assert.equal(decodeText('-0'), String.fromCharCode(0x7f));
  assert.equal(decodeText('a_Xb'), 'ab'); // rang de ponctuation hors liste : rien (l'ancien code écrivait « undefined »)
});

test('ingénierie : champ de bits dans les deux sens', () => {
  const e = { blueprint: 2, grade: 5, effect: 3, preengineered: false };
  assert.equal(packEngineering(e), (2 << 7) | (5 << 4) | 3);
  assert.deepEqual(unpackEngineering(packEngineering(e)), e);
  assert.deepEqual(unpackEngineering(packEngineering({ blueprint: 15, grade: 7, effect: 15, preengineered: true })), { blueprint: 15, grade: 7, effect: 15, preengineered: true });
  assert.equal(packEngineering({}), 0);
  assert.deepEqual(unpackEngineering(0), { blueprint: 0, grade: 0, effect: 0, preengineered: false });
});

test('lecture : fiche complète (prix saisi, valeurs de modification, saut d\'emplacements, nom)', () => {
  const n = encodeNumber;
  const priced = n(450, 3) + n(0x20, 1) + n(1 << 4, 1) + 'abc'; // en-tête de prix : 2 + 1 chiffres
  const values = n(43610, 3) + n(0x10, 1) + n(0, 1) + n(packEngineering({ blueprint: 2, grade: 5, effect: 3, preengineered: true }), 2) + n(4000, 2) + n(2, 1) + 'Ab12Cd34';
  const code = `${n(20, 1)}6zzzz,,,${priced}${n(199900 + 3, 3)}${values},,${n(462, 3)}00,Anaconda_0test`;
  const link = readLink(code);
  assert.equal(link.version, 20);
  assert.equal(link.shipId, 6);
  assert.equal(link.name, 'Anaconda test');
  assert.deepEqual(link.groups.hardpoint, []);
  const [cargo, fsd] = link.groups.component;
  assert.deepEqual([cargo.slot, cargo.modid, cargo.engineering], [0, 450, null]);
  assert.deepEqual([fsd.slot, fsd.modid, fsd.engineering.roll, fsd.engineering.values.length], [4, 43610, 4000, 2]);
  assert.deepEqual(unpackEngineering(fsd.engineering.bits), { blueprint: 2, grade: 5, effect: 3, preengineered: true });
  assert.deepEqual(link.groups.internal.map((r) => [r.slot, r.modid]), [[0, 462]]);
  // Code tronqué ou vide : lu sans erreur, champs manquants à 0
  assert.deepEqual(readLink('').groups.component, []);
  assert.equal(readLink('K').shipId, 0);
});

test('écriture : coque par défaut, trous, ingénierie ; relecture identique', () => {
  const link = {
    shipId: 6,
    name: 'Anaconda test é',
    groups: {
      component: [{ slot: 0, modid: 40113, engineering: null }, { slot: 3, modid: 43610, engineering: { bits: packEngineering({ blueprint: 2, grade: 5, effect: 3 }), roll: COMPLETE_ROLL } }],
      internal: [{ slot: 7, modid: 450, engineering: null }],
    },
  };
  const code = writeLink(link);
  assert.equal(code, 'K600000H4C0S00,,,9on00mpUAfQG05J_W0,,mpZ07200,Anaconda_0test_0-1g');
  const back = readLink(code);
  assert.equal(back.shipId, 6);
  assert.equal(back.name, link.name);
  for (const g of LINK_GROUPS) {
    assert.deepEqual(back.groups[g].map(({ slot, modid, engineering }) => ({ slot, modid, engineering: engineering && { bits: engineering.bits, roll: engineering.roll } })), link.groups[g] || [], g);
  }
  assert.equal(writeLink({ shipId: 1, groups: {} }), 'K100000H4C0S00,,,,,'); // sans nom : pas de 7e morceau
});
