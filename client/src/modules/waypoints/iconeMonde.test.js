// Icône du type de monde : la clé choisie d'après le nom du type ou son identifiant du guide.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Le composant est un fichier JSX : seule sa fonction de classement est testée, lue telle quelle
const source = fs.readFileSync(new URL('./IconeMonde.jsx', import.meta.url), 'utf8');
const debut = source.indexOf('export function cleMonde');
const fin = source.indexOf('\n}\n', debut) + 2;
const cleMonde = new Function(`${source.slice(debut, fin).replace('export function cleMonde', 'return function cleMonde')}`)();

test('type de monde → icône : noms du relevé, noms du guide et identifiants', () => {
  assert.equal(cleMonde('Haute teneur en métaux'), 'hmc');
  assert.equal(cleMonde('Riche en métaux'), 'mrb');
  assert.equal(cleMonde('Rocheuse'), 'roc');
  assert.equal(cleMonde('Rocheux'), 'roc');
  assert.equal(cleMonde('Roche et glace'), 'rg');
  assert.equal(cleMonde('Glacée'), 'gl');
  assert.equal(cleMonde('Glacé'), 'gl');
  for (const id of ['hmc', 'mrb', 'roc', 'rg', 'gl']) assert.equal(cleMonde(id), id);
  assert.equal(cleMonde('Géante gazeuse'), 'autre');
  assert.equal(cleMonde(null), 'autre');
});
