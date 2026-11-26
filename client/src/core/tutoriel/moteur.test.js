// Tutoriels : quel parcours pour quelle page, quand il se lance, où se posent le cadre, les voiles et la bulle, et le
// contrôle de tous les parcours écrits.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aLancer, cadreAutour, concerne, defautsParcours, horsParcours, parcoursPour, placerBulle, voiles } from './moteur.js';
import { PARCOURS, parcoursParId } from './parcours.js';

const liste = [
  { id: 'accueil', chemin: '/' },
  { id: 'escadron', chemin: '/escadron' },
  { id: 'rejoindre', chemin: '/escadron/rejoindre' },
  { id: 'builder', chemin: '/builder', sousPages: true },
];

test('parcours de la page : exact, le plus précis d’abord, sous-pages seulement si demandé', () => {
  assert.equal(parcoursPour(liste, '/').id, 'accueil');
  assert.equal(parcoursPour(liste, '/escadron/').id, 'escadron');
  assert.equal(parcoursPour(liste, '/escadron/rejoindre').id, 'rejoindre');
  assert.equal(parcoursPour(liste, '/escadron/chef'), null, 'pas de sous-pages pour /escadron');
  assert.equal(parcoursPour(liste, '/builder/build/3').id, 'builder');
  assert.equal(parcoursPour(liste, '/builder'), null, 'sousPages : seulement ce qui est dessous');
  assert.equal(parcoursPour(liste, '/reperes'), null);
  assert.equal(concerne({ chemin: '/', sousPages: true }, '/reperes'), false, 'l’accueil ne vaut jamais pour toute l’app');
});

test('lancement automatique : jamais vu, et tutoriels actifs', () => {
  assert.equal(aLancer(liste, '/escadron', { actifs: true, vus: [] }).id, 'escadron');
  assert.equal(aLancer(liste, '/escadron', { actifs: true, vus: ['escadron'] }), null);
  assert.equal(aLancer(liste, '/escadron', { actifs: false, vus: [] }), null);
  assert.equal(aLancer(liste, '/escadron', null), null, 'état pas encore lu : rien ne se lance');
});

test('le tutoriel s’arrête si le joueur quitte la page (mais pas s’il ouvre une de ses sous-pages)', () => {
  const p = { chemin: '/reperes' };
  assert.equal(horsParcours(p, '/reperes'), false);
  assert.equal(horsParcours(p, '/reperes/liste'), false);
  assert.equal(horsParcours(p, '/builder'), true);
  assert.equal(horsParcours({ chemin: '/' }, '/reperes'), true);
});

const fenetre = { l: 1000, h: 700 };
const bulle = { l: 360, h: 200 };

test('la bulle : dessous, sinon dessus, sinon sur le côté, sinon au milieu ; toujours entière dans la fenêtre', () => {
  assert.equal(placerBulle({ x: 100, y: 50, l: 200, h: 40 }, bulle, fenetre).cote, 'bas');
  assert.equal(placerBulle({ x: 100, y: 600, l: 200, h: 40 }, bulle, fenetre).cote, 'haut');
  assert.equal(placerBulle({ x: 20, y: 10, l: 300, h: 680 }, bulle, fenetre).cote, 'droite');
  assert.equal(placerBulle({ x: 600, y: 10, l: 380, h: 680 }, bulle, fenetre).cote, 'gauche');
  assert.equal(placerBulle({ x: 0, y: 0, l: 1000, h: 700 }, bulle, fenetre).cote, 'milieu');
  assert.deepEqual(placerBulle(null, bulle, fenetre), { x: 320, y: 250, cote: 'milieu' });
  for (const cadre of [{ x: 0, y: 0, l: 30, h: 30 }, { x: 980, y: 300, l: 20, h: 20 }, { x: 400, y: 690, l: 50, h: 10 }]) {
    const p = placerBulle(cadre, bulle, fenetre);
    assert.ok(p.x >= 0 && p.y >= 0 && p.x + bulle.l <= fenetre.l && p.y + bulle.h <= fenetre.h, JSON.stringify([cadre, p]));
  }
});

test('le cadre a un peu d’air et reste dans la fenêtre ; les voiles couvrent tout sauf lui', () => {
  assert.deepEqual(cadreAutour({ left: 100, top: 50, right: 300, bottom: 90 }, fenetre), { x: 94, y: 44, l: 212, h: 52 });
  assert.deepEqual(cadreAutour({ left: 2, top: 1, right: 999, bottom: 699 }, fenetre), { x: 0, y: 0, l: 1000, h: 700 });
  const cadre = { x: 94, y: 44, l: 212, h: 52 };
  const v = voiles(cadre, fenetre);
  assert.equal(v.length, 4);
  const aire = v.reduce((s, r) => s + r.l * r.h, 0);
  assert.equal(aire, fenetre.l * fenetre.h - cadre.l * cadre.h);
  assert.deepEqual(voiles(null, fenetre), [{ x: 0, y: 0, l: 1000, h: 700 }]);
});

test('tous les parcours de l’app sont bien formés, sans doublon, et tutoient', () => {
  const ids = new Set();
  for (const p of PARCOURS) {
    assert.deepEqual(defautsParcours(p), [], p.id);
    assert.ok(!ids.has(p.id), `identifiant en double : ${p.id}`);
    ids.add(p.id);
    for (const e of p.etapes) {
      assert.ok(!/\b(vous|votre|vos)\b/i.test(`${e.titre} ${e.texte}`), `vouvoiement dans ${p.id} : ${e.titre}`);
      assert.ok(e.texte.length <= 320, `étape trop longue dans ${p.id} : ${e.titre}`);
    }
  }
  assert.equal(parcoursParId('accueil').chemin, '/');
  assert.equal(parcoursParId('inconnu'), null);
  assert.deepEqual(defautsParcours({ id: 'X', titre: '', chemin: 'x', etapes: [{ titre: '', texte: 'court', action: 'glisser' }] }),
    ['identifiant', 'titre', 'chemin', 'au moins deux étapes', 'étape 1 : titre', 'étape 1 : texte', 'étape 1 : action']);
});

test('onglets : un parcours d’onglet ne vaut que sur son onglet, un parcours sans onglet que sur l’onglet par défaut', () => {
  const onglets = [{ id: 'historique', chemin: '/extension' }, { id: 'vente', chemin: '/extension?onglet=vente' }];
  assert.equal(parcoursPour(onglets, '/extension', '').id, 'historique');
  assert.equal(parcoursPour(onglets, '/extension', '?onglet=vente').id, 'vente');
  assert.equal(parcoursPour(onglets, '/extension', '?onglet=routes'), null);
  assert.equal(aLancer(onglets, '/extension', { actifs: true, vus: ['historique'] }, '?onglet=vente').id, 'vente');
  assert.equal(horsParcours(onglets[1], '/extension', '?onglet=vente'), false);
  assert.equal(horsParcours(onglets[1], '/extension', '?onglet=routes'), true, 'autre onglet : le tutoriel s’arrête');
  assert.equal(horsParcours(onglets[0], '/extension', '?onglet=routes'), false, 'un parcours sans onglet ne s’arrête qu’en quittant la page');
  assert.equal(horsParcours(onglets[1], '/reperes', ''), true);
  // Un paramètre qui n'est pas un onglet (« ?modifier=1 ») ne change rien
  assert.equal(parcoursPour(onglets, '/extension', '?modifier=1').id, 'historique');
});

test('liste et fiche à la même adresse : chacune son parcours ; deux parcours pour une page se suivent d’une visite à l’autre', () => {
  const l = [
    { id: 'liste', chemin: '/colonisation' },
    { id: 'fiche', chemin: '/colonisation', sousPages: true },
    { id: 'editeur-1', chemin: '/builder/build', sousPages: true },
    { id: 'editeur-2', chemin: '/builder/build', sousPages: true },
    { id: 'routes', chemin: '/routes' },
    { id: 'route', chemin: '/routes', sousPages: true },
    { id: 'routes-liste', chemin: '/routes/liste' },
  ];
  const etat = (vus) => ({ actifs: true, vus });
  assert.equal(aLancer(l, '/colonisation', etat([])).id, 'liste');
  assert.equal(aLancer(l, '/colonisation', etat(['liste'])), null, 'la fiche ne se lance pas sur la liste');
  assert.equal(aLancer(l, '/colonisation/123', etat([])).id, 'fiche');
  assert.equal(aLancer(l, '/builder/build/7', etat([])).id, 'editeur-1');
  assert.equal(aLancer(l, '/builder/build/7', etat(['editeur-1'])).id, 'editeur-2');
  assert.equal(aLancer(l, '/builder/build/7', etat(['editeur-1', 'editeur-2'])), null);
  assert.equal(aLancer(l, '/routes/liste', etat([])).id, 'routes-liste');
  assert.equal(aLancer(l, '/routes/liste', etat(['routes-liste'])), null, 'jamais le parcours d’une fiche sur un écran qui a le sien');
  assert.equal(aLancer(l, '/routes/12', etat([])).id, 'route');
});

test('assemblage : au moins soixante parcours, chaque rubrique présente, aucun identifiant de groupe en double', () => {
  assert.ok(PARCOURS.length >= 60, String(PARCOURS.length));
  for (const prefixe of ['vaisseaux-', 'builds-', 'ingenierie-', 'reperes-', 'commerce', 'activites-', 'extension-', 'powerplay-', 'outils-', 'parametres-']) {
    assert.ok(PARCOURS.some((p) => p.id.startsWith(prefixe)), prefixe);
  }
  assert.equal(new Set(PARCOURS.map((p) => p.id)).size, PARCOURS.length);
  // Deux parcours de même adresse et de même sorte : seulement là où c'est voulu (ils se suivent)
  const cles = PARCOURS.map((p) => `${p.chemin}|${p.sousPages === true}`);
  const doubles = [...new Set(cles.filter((c, i) => cles.indexOf(c) !== i))];
  // L'accueil et Paramètres : la touche de la souris d'abord, puis le tour de la page à la visite suivante
  assert.deepEqual(doubles.sort(), ['/builder/build|true', '/fenetres-en-jeu/waypoints|false', '/parametres|false', '/|false']);
});

test('page Tutoriels : chaque tutoriel est dans une rubrique, une seule fois, premiers pas d’abord', async () => {
  const { parRubrique, rubriqueDe } = await import('./parcours.js');
  const groupes = parRubrique(PARCOURS);
  assert.equal(groupes[0].rubrique, 'Premiers pas');
  assert.deepEqual(groupes[0].parcours.map((p) => p.id), ['souris-accueil', 'touche-souris', 'accueil'], 'la touche de la souris avant tout');
  assert.equal(groupes.reduce((n, g) => n + g.parcours.length, 0), PARCOURS.length, 'aucun oublié, aucun en double');
  assert.equal(rubriqueDe({ id: 'reperes-liste' }), 'Minage');
  assert.equal(rubriqueDe({ id: 'escadron-chef' }), 'Powerplay et escadron');
  assert.equal(rubriqueDe({ id: 'jeu-combat' }), 'Fenêtres en jeu');
  assert.equal(rubriqueDe({ id: 'commerce' }), 'Commerce');
});

test('touche de la souris : premier tutoriel de l’accueil, il mène à Paramètres où le second montre la ligne à régler', async () => {
  const { aLancer } = await import('./moteur.js');
  const neuf = { actifs: true, vus: [] };
  const premier = aLancer(PARCOURS, '/', neuf);
  assert.equal(premier.id, 'souris-accueil');
  assert.deepEqual([premier.etapes.at(-1).cible, premier.etapes.at(-1).action], ['.topbar-settings', 'clic'], 'il finit par un clic sur Paramètres');
  const second = aLancer(PARCOURS, '/parametres', { actifs: true, vus: ['souris-accueil'] });
  assert.equal(second.id, 'touche-souris', 'avant le tour de la page Paramètres');
  assert.ok(second.etapes.some((e) => e.cible === '[data-tuto="raccourci-souris"]'), 'il encadre la ligne du raccourci de la souris');
  // Ensuite seulement : le tour de l'accueil, et celui de Paramètres
  assert.equal(aLancer(PARCOURS, '/', { actifs: true, vus: ['souris-accueil'] }).id, 'accueil');
  assert.equal(aLancer(PARCOURS, '/parametres', { actifs: true, vus: ['touche-souris'] }).id, 'parametres-page');
});
