// « Copier pour Discord » d'un build : le nom d'un build reçu par un lien EDSY partagé ne mentionne personne et
// n'affiche aucun lien masqué ; seul le lien EDSY fabriqué par l'app reste un lien.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REF_DIR } from '../../core/reference/download.js';
import { loadEddb, decodeEdsy, extractHash } from '../../core/reference/edsy.js';
import { decodedToBuild, encodeEdsy, stockBuild } from '../../core/reference/edsyBuild.js';
import { computeStats } from './stats.js';
import { shareText } from './share.js';

const PIEGE = '@everyone [EDSY](https://exemple.invalid/) <@&123456789012345678>';
const STATS = { shields: 512.4, dps: 87.25, jump: { unladen: 31.456 } };
const LIEN = 'https://edsy.org/#/L=abc';
const eddb = fs.existsSync(`${REF_DIR}/edsy/eddb.js`) ? loadEddb(REF_DIR) : null;
const withEdsy = eddb ? test : test.skip;

function sansDanger(text) {
  assert.ok(!/@(everyone|here)\b/.test(text), text);
  assert.ok(!/<@&?\d/.test(text), text);
  const liens = [...text.matchAll(/(^|[^\\])\[([^\]]*)\]\(([^)]*)\)/g)].map((m) => m[3]);
  assert.equal(liens.length, 1, `un seul lien masqué, celui de l'app : ${text}`);
  assert.match(liens[0], /^https:\/\/edsy\.org\/#\/L=/);
}

test('build ordinaire : texte inchangé', () => {
  assert.equal(shareText({ name: 'Panther marchand' }, 'Panther Clipper Mk II', STATS, LIEN),
    `**Panther marchand**\nPanther Clipper Mk II · 512 MJ de boucliers · 87,3 DPS · 31,46 al de saut\n[EDSY](${LIEN})`);
  assert.match(shareText({ name: '' }, 'Cobra Mk III', { ...STATS, dps: 0 }, LIEN), /^\*\*Cobra Mk III\*\*\nCobra Mk III · 512 MJ de boucliers · 31,46 al/);
});

test('nom piégé : ni mention, ni rôle, ni lien masqué de plus', () => {
  sansDanger(shareText({ name: PIEGE }, 'Cobra Mk III', STATS, LIEN));
  sansDanger(shareText({ name: `**${PIEGE}**\n# titre` }, 'Cobra Mk III', STATS, LIEN));
  // Nom fait seulement d'invisibles : le nom du vaisseau à la place
  assert.match(shareText({ name: '\u{200b}\u{202e}' }, 'Cobra Mk III', STATS, LIEN), /^\*\*Cobra Mk III\*\*/);
});

withEdsy('lien EDSY piégé, importé puis partagé : le nom reste un nom', () => {
  const id = Object.keys(eddb.ship)[0];
  const piege = { ...stockBuild(eddb, id, 'test'), name: PIEGE };
  const recu = decodedToBuild(eddb, decodeEdsy(eddb, extractHash(encodeEdsy(eddb, piege))));
  assert.match(recu.name, /@everyone/, 'le format EDSY garde bien le nom piégé');
  const text = shareText(recu, eddb.ship[id].name, computeStats(eddb, recu), encodeEdsy(eddb, recu));
  sansDanger(text);
});
