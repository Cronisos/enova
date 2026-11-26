// Premiers pas : les étapes selon l'état de l'app, et quand la carte se montre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ID_BIENVENUE, ID_SOURIS, etapesBienvenue, montrerBienvenue } from './bienvenue.js';

const neuf = { journal: { ready: false, file: null }, escadron: { hasToken: false, enabled: false }, mode: null };

test('app neuve : quatre étapes à faire, la touche de la souris juste après le jeu, chacune avec son lien', () => {
  const e = etapesBienvenue(neuf);
  assert.deepEqual(e.map((x) => [x.id, x.fait, x.lien]), [['jeu', false, '/parametres'], ['souris', false, '/parametres'], ['escadron', false, '/escadron/rejoindre'], ['mode', false, '/fenetres-en-jeu']]);
  assert.match(e[0].texte, /n’a pas trouvé les journaux/);
  assert.match(e[1].texte, /^Indispensable\. .*Alt \+ Maj \+ K te la rend/);
  assert.deepEqual([e[1].valider, e[1].boutonValider], [ID_SOURIS, 'J’ai compris']);
  assert.match(e[2].texte, /Facultatif/);
});

test('chaque étape se coche d’après l’état réel', () => {
  const tout = etapesBienvenue({ journal: { ready: true, file: 'Journal.log' }, escadron: { hasToken: true, enabled: true }, mode: 'combat', souris: { touche: 'Ctrl+Alt+M', vue: true } });
  assert.ok(tout.every((x) => x.fait && x.lien === null));
  assert.match(tout[1].texte, /^Ctrl \+ Alt \+ M te rend la souris/);
  assert.equal(tout[1].valider, null);
  // Aucune touche réglée : jamais « fait », même si le joueur avait dit la connaître, et pas de « J'ai compris »
  const sans = etapesBienvenue({ ...neuf, souris: { touche: '', vue: true } })[1];
  assert.deepEqual([sans.fait, sans.valider, sans.bouton], [false, null, 'Choisir une touche']);
  assert.match(sans.texte, /Aucune touche n’est réglée/);
  const dossierVide = etapesBienvenue({ ...neuf, journal: { ready: true, file: null } });
  assert.equal(dossierVide[0].fait, false);
  assert.match(dossierVide[0].texte, /aucun journal dedans/);
  const inscritSansEnvoi = etapesBienvenue({ ...neuf, escadron: { hasToken: true, enabled: false } })[2];
  assert.deepEqual([inscritSansEnvoi.fait, inscritSansEnvoi.bouton], [false, 'Activer l’envoi']);
});

test('version sans module Escadron : trois étapes seulement', () => {
  assert.deepEqual(etapesBienvenue({ ...neuf, escadron: null }).map((x) => x.id), ['jeu', 'souris', 'mode']);
});

test('la carte : montrée tant qu’il reste à faire et qu’elle n’a pas été fermée ; jamais avant de connaître l’état', () => {
  const aFaire = etapesBienvenue(neuf);
  assert.equal(montrerBienvenue({ actifs: true, vus: [] }, aFaire), true);
  assert.equal(montrerBienvenue({ actifs: true, vus: [ID_BIENVENUE] }, aFaire), false);
  assert.equal(montrerBienvenue(null, aFaire), false);
  const fini = etapesBienvenue({ journal: { ready: true, file: 'J.log' }, escadron: null, mode: 'combat', souris: { touche: 'Alt+Shift+K', vue: true } });
  assert.equal(montrerBienvenue({ actifs: true, vus: [] }, fini), false, 'tout fait : elle disparaît d’elle-même');
  assert.equal(montrerBienvenue({ actifs: false, vus: [] }, aFaire), true, 'couper les tutoriels ne cache pas les premiers pas');
});
