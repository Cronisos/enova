// Fenêtres de l'app de bureau : bascule et place du MAR, pages détachables, état relu (etat.js).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MAX_DETACHEES, basculer, boiteErreur, cheminDetachable, cheminNavigable, fondFenetre, jeuDansListe, lireEtat, outilsDevPermis, placeBarre, rectangle, reglageMar, reglagePave, surUnEcran, tailleDefaut } = require('./etat.js');

test('erreur qui arrête l’app : boîte au démarrage et fenêtre devant, bulle seulement le jeu devant', () => {
  // Démarrage, Node.js introuvable avant que la fenêtre de chargement ne s'affiche : la boîte, tout de suite
  assert.equal(boiteErreur({ pret: false, devant: false, tray: true, jeuLance: false }), true);
  // Démarrage pendant que le jeu tourne : pas de boîte qui prendrait la main au jeu
  assert.equal(boiteErreur({ pret: false, devant: false, tray: true, jeuLance: true }), false);
  // En plein vol, rien de l'app devant : bulle (jeu lancé ou non)
  assert.equal(boiteErreur({ pret: true, devant: false, tray: true, jeuLance: true }), false);
  assert.equal(boiteErreur({ pret: true, devant: false, tray: true, jeuLance: false }), false);
  // Une fenêtre de l'app devant : la boîte
  assert.equal(boiteErreur({ pret: true, devant: true, tray: true, jeuLance: true }), true);
  assert.equal(boiteErreur({ pret: false, devant: true, tray: true, jeuLance: true }), true);
  // Pas d'icône pour la bulle : la boîte, toujours
  assert.equal(boiteErreur({ pret: true, devant: false, tray: false, jeuLance: true }), true);
  assert.equal(boiteErreur(), true);
});

test('fenêtre principale : jamais plus grande que 90 % de l’écran à sa première ouverture', () => {
  assert.deepEqual(tailleDefaut({ width: 2560, height: 1400 }), { width: 1360, height: 860 });
  assert.deepEqual(tailleDefaut({ width: 1366, height: 728 }), { width: 1229, height: 655 }, 'portable 1366 × 768');
  assert.deepEqual(tailleDefaut({ width: 1280, height: 680 }), { width: 1152, height: 612 }, '1080p à 150 %');
  assert.deepEqual(tailleDefaut(null), { width: 1360, height: 860 });
});

test('fond : acrylique sous Windows 11 seulement, opaque ailleurs', () => {
  assert.deepEqual(fondFenetre('10.0.26200', '#0a0c0f', 'win32'), { backgroundColor: '#00000000', backgroundMaterial: 'acrylic' });
  assert.deepEqual(fondFenetre('10.0.22621', '#0a0c0f', 'win32').backgroundMaterial, 'acrylic');
  assert.deepEqual(fondFenetre('10.0.19045', '#0a0c0f', 'win32'), { backgroundColor: '#0a0c0f' }, 'Windows 10');
  assert.deepEqual(fondFenetre('', '#0a0c0f', 'win32'), { backgroundColor: '#0a0c0f' });
  assert.deepEqual(fondFenetre('6.5.0', '#0a0c0f', 'linux'), { backgroundColor: '#0a0c0f' });
});

test('jeu lancé : lu dans la liste des programmes de Windows', () => {
  assert.equal(jeuDansListe('"EliteDangerous64.exe","12345","Console","1","3 000 000 Ko"\r\n'), true);
  assert.equal(jeuDansListe('INFO : aucune tâche en service ne correspond aux critères spécifiés.'), false);
  assert.equal(jeuDansListe('"EDLaunch.exe","1","Console","1","1 Ko"'), false);
  assert.equal(jeuDansListe(null), false);
});

test('outils de développement (F12) : seulement sur demande du développeur', () => {
  assert.equal(outilsDevPermis({}, ['electron', '.']), false, 'chez un joueur : coupés');
  assert.equal(outilsDevPermis({ ELITE_OUTILS_DEV: '0' }, []), false);
  assert.equal(outilsDevPermis({ ELITE_OUTILS_DEV: '1' }, []), true);
  assert.equal(outilsDevPermis({}, ['electron', '.', '--outils-dev']), true);
});

test('pages détachables : chemins de l’interface seulement', () => {
  for (const ok of ['/', '/minage', '/regles/vigie', '/expansion/ou-aller', '/a%C3%A9']) assert.equal(cheminDetachable(ok), ok);
  const refuses = ['', 'minage', '//evil.com', 'http://127.0.0.1:5173/', '/hud/glance', '/hud', '/a/../b', '/./x', '/a?b=1', '/a#b', '/a\\b', '/a b', 42, null, `/${'a'.repeat(250)}`];
  for (const non of refuses) assert.equal(cheminDetachable(non), null, String(non));
});

test('bascule : tout cacher, puis réafficher la même chose', () => {
  const f = (p, a, b) => [{ id: 'principale', visible: p }, { id: 'd1', visible: a }, { id: 'd2', visible: b }];
  let r = basculer(f(true, false, true), [], false);
  assert.deepEqual(r, { cacher: ['principale', 'd2'], montrer: [], memoire: ['principale', 'd2'], cache: true });
  r = basculer(f(false, false, false), r.memoire, true);
  assert.deepEqual(r, { cacher: [], montrer: ['principale', 'd2'], memoire: [], cache: false });
  // d2 fermée entre-temps : seulement la principale
  assert.deepEqual(basculer([{ id: 'principale', visible: false }], ['principale', 'd2'], true).montrer, ['principale']);
  // Aucune fenêtre visible (principale dans la zone de notification) : on cache quand même le reste de l'app
  r = basculer(f(false, false, false), [], false);
  assert.deepEqual([r.cacher, r.cache], [[], true]);
  // … et le ◆ suivant réaffiche l'interface : la principale
  assert.deepEqual(basculer(f(false, false, false), r.memoire, true).montrer, ['principale']);
  // Seule une détachée visible : on la cache, la principale cachée reste cachée au retour
  r = basculer(f(false, true, false), [], false);
  assert.deepEqual(basculer(f(false, false, false), r.memoire, true).montrer, ['d1']);
});

test('places relues sans confiance', () => {
  assert.deepEqual(rectangle({ x: 10.4, y: -5, width: 800, height: 600 }), { x: 10, y: -5, width: 800, height: 600 });
  for (const non of [null, {}, { x: 0, y: 0, width: 50, height: 600 }, { x: 'a', y: 0, width: 800, height: 600 }, { x: 0, y: 0, width: 99999, height: 600 }]) assert.equal(rectangle(non), null);
  const ecran = [{ x: 0, y: 0, width: 1920, height: 1040 }];
  assert.ok(surUnEcran({ x: 100, y: 100, width: 800, height: 600 }, ecran));
  assert.equal(surUnEcran({ x: 1900, y: 100, width: 800, height: 600 }, ecran), null); // 20 px visibles seulement
  assert.equal(surUnEcran({ x: -3000, y: 0, width: 800, height: 600 }, ecran), null); // écran débranché
  const e = lireEtat({
    principale: { place: { x: 0, y: 0, width: 1200, height: 800 }, agrandie: 'oui' },
    detachees: [{ chemin: '/minage', place: { x: 5, y: 5, width: 400, height: 300 } }, { chemin: '//evil' }, 'x', ...Array(20).fill({ chemin: '/a' })],
  });
  assert.equal(e.principale.agrandie, false);
  assert.equal(e.detachees[0].chemin, '/minage');
  assert.equal(e.detachees.length, MAX_DETACHEES);
  assert.deepEqual(lireEtat('n’importe quoi'), { principale: { place: null, agrandie: false }, detachees: [], mar: { coin: 'haut-gauche', decalage: 0, decalageY: 0, ecran: null }, pave: { actif: false, place: null, favoris: [] } });
  assert.deepEqual(lireEtat({ mar: { coin: 'bas-droite', decalage: 250.6 } }).mar, { coin: 'bas-droite', decalage: 251, decalageY: 0, ecran: null });
});

test('MAR : pages ouvrables, place au coin haut gauche', () => {
  for (const ok of ['/vaisseaux', '/extension?onglet=vente', '/regles/vigie']) assert.equal(cheminNavigable(ok), ok);
  for (const non of ['/extension?onglet=Vente', '/extension?x=1', '/hud/glance', '//evil.com', 'https://inara.cz/', '/a?onglet=vente&x=1', null]) {
    assert.equal(cheminNavigable(non), null, String(non));
  }
  const zone = { x: 0, y: 0, width: 3440, height: 1400 };
  assert.deepEqual(placeBarre(zone, { width: 600.4, height: 40 }), { x: 8, y: 8, width: 600, height: 40 });
  assert.deepEqual(placeBarre(zone, { width: 99999, height: -5 }), { x: 8, y: 8, width: 1400, height: 30 });
  assert.deepEqual(placeBarre({ x: 1920, y: 40, width: 1920, height: 1040 }, { width: 'x', height: 500 }), { x: 1928, y: 48, width: 30, height: 500 });
  // Tout caché : le MAR réduit à son logo garde sa largeur, sans bande invisible à côté
  assert.deepEqual(placeBarre(zone, { width: 40, height: 40 }), { x: 8, y: 8, width: 40, height: 40 });
});

test('MAR : coin et décalage réglables, toujours dans l’écran', () => {
  const zone = { x: 0, y: 0, width: 3440, height: 1400 };
  const t = { width: 600, height: 40 };
  assert.deepEqual(placeBarre(zone, t, { coin: 'haut-droite', decalage: 0 }), { x: 2832, y: 8, width: 600, height: 40 });
  assert.deepEqual(placeBarre(zone, t, { coin: 'bas-gauche', decalage: 100 }), { x: 108, y: 1352, width: 600, height: 40 });
  assert.deepEqual(placeBarre(zone, t, { coin: 'bas-droite', decalage: 200 }), { x: 2632, y: 1352, width: 600, height: 40 });
  assert.deepEqual(placeBarre(zone, t, { coin: 'haut-gauche', decalage: 9999 }), { x: 2832, y: 8, width: 600, height: 40 }); // butée au bord
  assert.deepEqual(reglageMar({ coin: 'milieu', decalage: -5 }), { coin: 'haut-gauche', decalage: 0, decalageY: 0, ecran: null });
  assert.deepEqual(reglageMar(null), { coin: 'haut-gauche', decalage: 0, decalageY: 0, ecran: null });
});

test('pavé tactile : actif seulement à vrai, place lisible ou null', () => {
  assert.deepEqual(reglagePave({ actif: true, place: { x: 0, y: 1080, width: 800, height: 480 } }), { actif: true, place: { x: 0, y: 1080, width: 800, height: 480 }, favoris: [] });
  assert.deepEqual(reglagePave({ actif: 'oui', place: { x: 0, y: 0, width: 100, height: 100 } }), { actif: false, place: null, favoris: [] });
  assert.deepEqual(reglagePave(null), { actif: false, place: null, favoris: [] });
  assert.deepEqual(lireEtat({ pave: { actif: true } }).pave, { actif: true, place: null, favoris: [] });
});

test('favoris du pavé : pages et modes de jeu seulement, sans doublon, 8 au plus', () => {
  const r = reglagePave({ favoris: ['/combat', 'mode:rescue', '/combat', '//evil', 'mode:', 'mode:a b', '/hud/rescue', 42, '/extension?onglet=vente', ...Array(10).fill('/a').map((x, i) => `${x}${i}`)] });
  assert.deepEqual(r.favoris.slice(0, 3), ['/combat', 'mode:rescue', '/extension?onglet=vente']);
  assert.equal(r.favoris.length, 8);
});

test('écrans : numérotés de gauche à droite, écran du MAR choisi, repli sur le principal', () => {
  const { listerEcrans, zoneEcran, centrerSur, reglageMar: mar } = require('./etat.js');
  const zone = (x, y, w, h) => ({ x, y, width: w, height: h });
  const ecrans = [
    { id: 2, workArea: zone(0, 0, 2560, 1400), size: { width: 2560, height: 1440 } },
    { id: 7, workArea: zone(2560, 200, 1920, 1040), size: { width: 1920, height: 1080 } },
    { id: 5, workArea: zone(-1920, 0, 1920, 1040), size: { width: 1920, height: 1080 } },
    { id: 9, workArea: null },
  ];
  const liste = listerEcrans(ecrans, 2);
  assert.deepEqual(liste.map((e) => [e.numero, e.zone.x, e.principal, e.taille]), [[1, -1920, false, '1920 × 1080'], [2, 0, true, '2560 × 1440'], [3, 2560, false, '1920 × 1080']]);
  assert.deepEqual(zoneEcran(liste, 3), zone(2560, 200, 1920, 1040));
  assert.deepEqual(zoneEcran(liste, null), zone(0, 0, 2560, 1400), 'pas de choix : le principal');
  assert.deepEqual(zoneEcran(liste, 6), zone(0, 0, 2560, 1400), 'écran débranché : le principal');
  assert.equal(zoneEcran([], 1), null);
  assert.deepEqual(zoneEcran(listerEcrans([ecrans[1]], 2), null), zone(2560, 200, 1920, 1040), 'aucun principal connu : le premier');
  // Le MAR se pose dans le coin de l'écran choisi
  assert.deepEqual(placeBarre(zoneEcran(liste, 1), { width: 600, height: 40 }, { coin: 'haut-gauche', decalage: 0, ecran: 1 }), { x: -1912, y: 8, width: 600, height: 40 });
  assert.equal(mar({ coin: 'haut-gauche', decalage: 0, ecran: 3 }).ecran, 3);
  for (const mauvais of [0, 9, 2.5, '2', -1, NaN]) assert.equal(mar({ ecran: mauvais }).ecran, null, String(mauvais));
  // Fenêtre principale envoyée sur un écran : centrée, jamais plus grande que lui
  assert.deepEqual(centrerSur(zone(2560, 200, 1920, 1040), { width: 1360, height: 860 }), { x: 2840, y: 290, width: 1360, height: 860 });
  assert.deepEqual(centrerSur(zone(-1920, 0, 1920, 1040), { width: 2500, height: 1400 }), { x: -1920, y: 0, width: 1920, height: 1040 });
});

test('MAR : second décalage, vers l’intérieur de l’écran depuis le haut ou le bas, toujours dans l’écran', () => {
  const { reglageMar: mar } = require('./etat.js');
  const zone = { x: 0, y: 0, width: 3440, height: 1400 };
  const t = { width: 600, height: 40 };
  assert.deepEqual(placeBarre(zone, t, { coin: 'haut-gauche', decalage: 100, decalageY: 250 }), { x: 108, y: 258, width: 600, height: 40 });
  assert.deepEqual(placeBarre(zone, t, { coin: 'bas-droite', decalage: 0, decalageY: 300 }), { x: 2832, y: 1052, width: 600, height: 40 });
  assert.equal(placeBarre(zone, t, { coin: 'haut-gauche', decalage: 0, decalageY: 99999 }).y, 1352, 'butée en bas');
  assert.equal(placeBarre(zone, t, { coin: 'bas-gauche', decalage: 0, decalageY: 99999 }).y, 8, 'butée en haut');
  assert.equal(mar({ decalageY: 120.6 }).decalageY, 121);
  for (const mauvais of [-5, 'x', null, undefined]) assert.equal(mar({ decalageY: mauvais }).decalageY, 0, String(mauvais));
  assert.equal(mar({ decalageY: 5000 }).decalageY, 2000);
});
