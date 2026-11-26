// Overlay : fenêtres sans bordure, transparentes et toujours au premier plan, qui laissent passer
// les clics vers le jeu. Chacune affiche une page de l'application (/hud/combat, /hud/glance…).
//
// Un seul overlay tourne à la fois. Lancé de nouveau, il transmet ses arguments à celui qui tourne :
//   --page=rescue          ajoute une fenêtre
//   --only=combat,glance   affiche exactement ces fenêtres (choix du mode de jeu dans l'application) ;
//                          vide, il ferme tout
// Une fois lancé, il reçoit les ordres du serveur par un canal permanent (canal.js), avec les mêmes arguments : plus
// aucun processus lancé à chaque ordre.
//
// Les fenêtres qui s'ouvrent et se ferment d'elles-mêmes à chaque saut (Signaux, refroidissement FSD et SCO,
// itinéraire : GARDEES) sont cachées au lieu d'être fermées, puis réaffichées telles quelles : pas de page rechargée
// (1,3 Mo de JS, React, lecture de l'API) à chaque arrivée, au moment où le jeu charge le système. Cachées depuis
// GARDE_MS, elles se ferment pour de bon.
//
// Le bouton ✥ d'une fenêtre passe en mode déplacement, 📌 fixe sa position (retenue pour la prochaine
// fois). Seul le survol de ce bouton rend la fenêtre cliquable. Les fenêtres libres (Coup d'œil) se
// redimensionnent aussi, avec leurs boutons en mode déplacement.
//
// Raccourcis, valables même en jeu, pour toutes les fenêtres :
//   Alt+Maj+C : mode déplacement / fixer, comme le bouton
//   Alt+Maj+H : masquer / afficher
//   Alt+Maj+P : photo de la zone des cadres de capture (contenu d'un EEP), envoyée à leur page
//   Alt+Maj+F : foreuse du Rhino posée ici, notée par la fenêtre du balayage (mode Minage Rhino)
//   Alt+Maj+K : mode souris : les fenêtres deviennent cliquables et prennent la main, le jeu relâche le curseur ;
//               de nouveau, ou un clic dans le jeu, rend la main au jeu
//
// Certaines fenêtres s'ouvrent cachées (liste des repères du minage) : un bouton d'une autre fenêtre les montre ou
// les cache, sans les fermer, pour qu'elles apparaissent tout de suite et gardent leur place.
//   Alt+Maj+Q : quitter (le serveur de l'app l'apprend d'abord, closed.js : il ne croit plus les fenêtres ouvertes ;
//               serveur arrêté, la fermeture est gardée et transmise au lancement suivant, avant d'ouvrir quoi que ce soit)
//
// Aucune fenêtre ne dépasse de l'écran : à l'ouverture, après un déplacement ou un redimensionnement, elle y est ramenée.
// Sans position fixée, une fenêtre s'ouvre à la première place libre (place.js) : les fenêtres ouvertes d'elles-mêmes
// (alerte des commandes, compagnon, vente de mérites, liste de courses…) ne s'ouvrent pas les unes sur les autres.
//
// Le jeu doit être en « plein écran fenêtré » : en plein écran exclusif, rien ne s'affiche par-dessus.
//
// Gardes (guards.js) : les fenêtres ne chargent que l'interface de l'app (http://127.0.0.1:5173), aucune autre requête ne
// part, aucun cadre ne navigue, et le cadre principal ne fait que se recharger. Aucune permission n'est accordée (micro,
// caméra, presse-papiers, notifications, ouverture d'applications externes…) : la copie passe par le pont ('copy').
// Le pont n'écoute que le cadre principal de chaque fenêtre. Seul le cadre de capture photographie sa zone, seul le
// Coup d'œil copie un texte, et seulement au clic (fenêtre affichée, curseur sur elle, ou mode souris) ; passer en mode
// déplacement (la fenêtre prend le clavier) demande aussi ce clic. Seules les fenêtres qui suivent leur contenu changent
// d'elles-mêmes de hauteur. Deux ordres du serveur qui se croisent (--at) : le plus ancien n'est pas appliqué.
// L'app ne répond plus (fermée, plantée) : au bout de 30 s les fenêtres se cachent (leurs valeurs seraient figées), au
// bout de 5 min l'overlay s'arrête.

const { app, BrowserWindow, Menu, Tray, clipboard, desktopCapturer, globalShortcut, ipcMain, nativeImage, screen, session } = require('electron');
// L'IA de bord répond à voix haute dans la fenêtre du Compagnon, sans clic dans cette fenêtre : Chromium bloquerait la
// synthèse vocale sans ce réglage (aucun son de page web n'est joué ici, seulement des fenêtres de l'app)
app.commandLine?.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // (absent dans les tests, Electron simulé)
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { findPlace } = require('./place.js');
const { UI_ORIGIN, allowedNavigation, allowedRequest, consoleEntry, fromMainFrame, ifRunning, orderTime, pageUrl, pointInside, screenSource, staleOrder, startupAction, userGesture, watchApp } = require('./guards.js');
const { dossierOverlay, ancienDossier, preparerDossier } = require('./dossier.js');

// Dossier de l'overlay rangé avec l'app (%APPDATA%\Elite Compagnon\overlay) : « Effacer mes données » le vide. Avant le
// verrou d'instance unique, qui se pose dans ce dossier.
const DOSSIER = dossierOverlay();
if (DOSSIER) {
  try {
    const repris = preparerDossier(DOSSIER, ancienDossier());
    if (repris.length) console.log(`Overlay : ${repris.length} réglage(s) repris de l'ancien dossier`);
    app.setPath('userData', DOSSIER);
  } catch (err) {
    console.warn(`Overlay : dossier ${DOSSIER} impossible (${err.message}), dossier par défaut d'Electron`);
  }
}
const { writeJsonAtomicSync } = require('./atomic.js');
const { demanderDemasque, envoyerJson, getJson, notifyClosed, sendPending, startArgs } = require('./closed.js');
const { VueJeu } = require('./vision.js');
const { calibrer, pourcentage, reglageValide } = require('./bouclier.js');
const { ouvrirCanal } = require('./canal.js');
const { plan: planRaccourcis } = require('./raccourcis.js');

const HUD_SIZE = { width: 700, height: 124 };
// Sauvetage : une ligne en plus en bas (matériaux par grade)
const SIZES = { rescue: { width: 700, height: 150 }, waypoints: { width: 590, height: 124 }, carrier: { width: 340, height: 236 }, navroute: { width: 340, height: 236 }, fsdcool: { width: 572, height: 104 }, systeme: { width: 300, height: 140 }, ia: { width: 440, height: 150 } }; // HUD en carré (2 × 2) : taille propre
const FREE = { glance: { width: 480, height: 460 }, signals: { width: 360, height: 380 }, 'waypoints-list': { width: 380, height: 440 }, 'waypoints-guide': { width: 320, height: 210 }, 'waypoints-sweep': { width: 340, height: 470 }, capture: { width: 420, height: 260 }, 'colonisation-list': { width: 340, height: 420 }, bouclier: { width: 260, height: 200 } }; // fenêtres libres : taille par défaut, redimensionnables
const START_HIDDEN = new Set(['waypoints-list', 'waypoints-guide', 'waypoints-sweep', 'capture']); // ouvertes cachées, montrées au bouton
// Tiroirs : une fenêtre collée au bord d'une autre, de sa hauteur, qui la suit. Toujours là (transparente, les clics
// passent au jeu) tant que l'autre est visible ; « montrée » veut dire ouverte : la page fait glisser son panneau hors
// de derrière l'autre fenêtre. À gauche, sauf si l'écran s'arrête avant : alors à droite.
// Plusieurs tiroirs d'une même fenêtre s'empilent dans l'ordre de la table : un tiroir ouvert pousse les suivants vers
// l'extérieur (Top 10 ouvert : le repère posé sort à sa gauche).
const DOCKED = { 'waypoints-sweep-top': { to: 'waypoints-sweep', width: 270 }, 'waypoints-sweep-pose': { to: 'waypoints-sweep', width: 260 } };
const drawersOf = (page) => Object.keys(DOCKED).filter((d) => DOCKED[d].to === page);
const MIN = { width: 300, height: 200 };
const MINS = { capture: { width: 60, height: 30 } }; // un cadre de capture peut être tout petit
const STEPS = { capture: 10 }; // et se règle plus finement
const CAPTURE_ZONES = new Set(['capture']); // cadres dont Alt+Maj+P photographie la zone (et seules pages qui le demandent)
const COPY = new Set(['glance']); // seules pages qui copient un texte (nom du système) dans le presse-papiers
// Noms de page reçus en arguments : jamais une propriété d'Object (« constructor » casserait open())
const clean = (list) => list.map((p) => p.replace(/[^a-z0-9-]/gi, '')).filter((p) => p && !(p in Object.prototype));
// Noms de page reçus par IPC : seulement les propriétés propres des tables, jamais celles d'Object
// ('constructor', '__proto__', 'toString'… ne doivent rien trouver ni rien casser)
const own = (table, page) => (typeof page === 'string' && Object.hasOwn(table, page) ? table[page] : undefined);
/** Fenêtres qu'une page peut montrer ou cacher ('toggle-window') : celles ouvertes cachées et les tiroirs. */
const toggleable = (page) => typeof page === 'string' && (START_HIDDEN.has(page) || Object.hasOwn(DOCKED, page));
const placeFile = (page) => path.join(app.getPath('userData'), `position-${page}.json`);
// Alt+Maj+Q pressé pendant que le serveur de l'app était arrêté : fermeture gardée ici, transmise au lancement suivant
const pendingFile = () => path.join(app.getPath('userData'), 'fermeture-a-transmettre.json');
// Compagnon : petite fenêtre libre (avatar + bulle), à gauche vers le bas par défaut pour ne pas couvrir le Coup d'œil
FREE.compagnon = { width: 440, height: 180 };
// Fiche « Chez l'ingénieur » (module Ingénierie) : liste qui suit son contenu
FREE['engineering-visit'] = { width: 400, height: 420 };
FREE['engineering-passage'] = { width: 420, height: 150 };
// « À acheter ici » (module Colonisation) : ouverte par le serveur à quai, quand le marché lu vend ce qu'il manque
FREE['colonisation-station'] = { width: 400, height: 200 };
MINS['colonisation-station'] = { width: 300, height: 100 };
FREE.bilan = { width: 460, height: 190 }; // bilan de session ou de mode (modules/bilan) // alertes de passage (ingénieur, échangeur utiles ici)
// Alertes de la vigie des règles
FREE.vigie = { width: 420, height: 160 };
MINS.vigie = { width: 300, height: 100 };
MINS['engineering-visit'] = { width: 320, height: 160 };
MINS['engineering-passage'] = { width: 300, height: 90 };
MINS.bilan = { width: 320, height: 120 };
// Alerte « hangar sans véhicule » (modules/hangar), ouverte par le serveur au décollage
FREE['hangar-vide'] = { width: 440, height: 150 };
// Alerte « rares en stock » (modules/rares, catalogue), ouverte par le serveur après un relevé
FREE['rares-alerte'] = { width: 560, height: 170 };
MINS['rares-alerte'] = { width: 340, height: 100 };
// Site gardien en vue (modules/gardiens) : carte et ordre des pylônes
FREE['gardiens-site'] = { width: 520, height: 420 };
MINS['gardiens-site'] = { width: 320, height: 120 };
MINS['hangar-vide'] = { width: 300, height: 100 };
MINS.compagnon = { width: 200, height: 100 };
const FREE_PLACES = { compagnon: (area, size) => ({ x: area.x + 20, y: area.y + Math.round(area.height * 0.62) - size.height }) };
// Fenêtres qui prennent la hauteur de leur contenu (autoHeight de PanelOverlay, IPC 'fit-height') : elles grandissent
// vers le bas, la place par défaut des autres évite la colonne sous elles.
const GROWS = new Set(['glance', 'colonisation-list', 'colonisation-station', 'engineering-visit', 'engineering-passage', 'bilan', 'vigie', 'hangar-vide', 'rares-alerte', 'gardiens-site']);
// Seules ces fenêtres demandent leur hauteur (PanelOverlay autoHeight) : une autre page qui la demanderait (jusqu'à toute
// la hauteur de l'écran, pour photographier ou couvrir plus) est ignorée
const FIT_HEIGHT = GROWS;

const windows = new Map(); // page → { win, editing }
// Fenêtres ouvertes et fermées par leur module à chaque saut : cachées (rangées) au lieu d'être fermées
const GARDEES = new Set(['signals', 'fsdcool', 'navroute']);
const GARDE_MS = 10 * 60_000; // rangée depuis 10 min : fermée pour de bon (une page cachée garde sa mémoire)
// Chromium ne repeint pas une fenêtre cachée : réaffichée, Windows peut montrer un instant l'image d'avant le hide (le
// système d'avant). Elle reste transparente le temps que la page se repeigne.
const REPEINT_MS = 120;
const rangees = new Map(); // page → minuterie de sa fermeture
let canal = null; // canal des ordres du serveur (canal.js), une fois l'overlay prêt
let hidden = false;
let offline = false; // l'app ne répond plus : fenêtres cachées jusqu'à son retour
let mouseMode = false;
// « Disposer les fenêtres » (Paramètres de l'app, --disposer=1|0) : toutes visibles et en mode déplacement, avec un cadre
// nommé même vides ; à la fin, chaque place est enregistrée et l'état d'avant revient
let disposer = false;
const shown = new Set(); // fenêtres ouvertes cachées que l'on a montrées
// Celles que le joueur a laissées montrées (bouton 📍, 🎯, 💎…), gardées d'un lancement à l'autre : à la relance de l'app
// ou du jeu, elles reviennent comme il les avait laissées. Fermer le mode ne les oublie pas : elles reviennent avec lui.
const montreesFile = () => path.join(app.getPath('userData'), 'fenetres-montrees.json');
let montrees = null; // lu au premier besoin (app prête)
function lireMontrees() {
  if (montrees) return montrees;
  try {
    const l = JSON.parse(fs.readFileSync(montreesFile(), 'utf8'));
    montrees = new Set(Array.isArray(l) ? l.filter((x) => typeof x === 'string' && toggleable(x)) : []);
  } catch {
    montrees = new Set();
  }
  return montrees;
}
function retenirMontree(page, on) {
  const m = lireMontrees();
  if (on === m.has(page)) return;
  if (on) m.add(page);
  else m.delete(page);
  try {
    writeJsonAtomicSync(montreesFile(), [...m]);
  } catch (err) {
    console.error(`Fenêtres montrées non gardées (${err.message})`);
  }
}

/** Fenêtre visible ? Toutes cachées (Alt+Maj+H), rangée (GARDEES), ou cachée tant qu'on ne l'a pas montrée. */
const visible = (page) => (own(DOCKED, page) ? visible(DOCKED[page].to) : !hidden && !offline && !rangees.has(page) && (!START_HIDDEN.has(page) || shown.has(page)));
/** Le tiroir ouvert accepte la souris (mode souris) ; fermé, jamais. */
const clickable = (page) => !own(DOCKED, page) || shown.has(page);

/**
 * Clics de la fenêtre rendus au jeu (`ignorer`) ou pris par elle. Pour savoir quand la souris arrive sur un bouton
 * pendant que les clics passent au jeu, Electron pose un crochet sur la souris de tout Windows (forward) : la souris du
 * jeu attend alors le fil principal de l'overlay. Il n'est demandé que pour une fenêtre affichée qui accepte la souris,
 * jamais pour une fenêtre cachée ni un tiroir fermé : tout caché (Alt+Maj+H, app absente, rien d'ouvert), plus de
 * crochet du tout. Remis à jour quand la fenêtre se montre ou se cache (événements show et hide, creerFenetre).
 */
const ignores = new WeakMap(); // fenêtre → clics rendus au jeu ?
function souris(page, win, ignorer, affichee = win.isVisible()) {
  if (win.isDestroyed()) return;
  ignores.set(win, ignorer);
  win.setIgnoreMouseEvents(ignorer, { forward: Boolean(ignorer && affichee && clickable(page)) });
}

/** Montre ou cache une fenêtre ouverte cachée, et prévient toutes les pages (état de leurs boutons). */
// Fenêtres qui se ferment avec une autre : cacher les repères du système range aussi la boussole, devenue inutile sur place
const CLOSE_WITH = { 'waypoints-list': ['waypoints-guide'], 'waypoints-sweep': ['waypoints-sweep-top', 'waypoints-sweep-pose'] };

function setShown(page, on) {
  if (on) shown.add(page);
  else shown.delete(page);
  retenirMontree(page, on);
  const entry = windows.get(page);
  if (entry) visible(page) ? entry.win.showInactive() : entry.win.hide();
  if (entry && own(DOCKED, page)) {
    souris(page, entry.win, !(mouseMode && on));
    entry.win.setFocusable(mouseMode && on);
  }
  // Ses tiroirs apparaissent et disparaissent avec elle ; un tiroir ouvert ou fermé décale ceux qui s'empilent après lui
  if (own(DOCKED, page)) for (const d of drawersOf(DOCKED[page].to)) if (d !== page) dock(d);
  for (const d of drawersOf(page)) {
    const drawer = windows.get(d);
    if (!drawer) continue;
    visible(d) ? drawer.win.showInactive() : drawer.win.hide();
    dock(d);
  }
  for (const { win } of windows.values()) win.webContents.send('window-shown', page, shown.has(page));
  if (!on) for (const child of own(CLOSE_WITH, page) || []) if (shown.has(child)) setShown(child, false);
}

/** Arguments de lancement : pages à ajouter, ou liste exacte (only) ; at : heure de l'ordre du serveur, ou null. */
function parseArgs(argv) {
  const value = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const at = orderTime(argv);
  const onlyIfRunning = ifRunning(argv); // ordre du serveur qui ne doit jamais lancer l'overlay (guards.js)
  // « Tout cacher » de l'app de bureau (--masque=1|0, joint par le serveur) : absent, l'état ne change pas
  const m = value('masque');
  const masque = m === '1' || m === '0' ? { masque: m === '1' } : {};
  const dsp = value('disposer');
  if (dsp === '1' || dsp === '0') masque.disposer = dsp === '1';
  // Rester lancé même sans fenêtre (app de bureau) : les raccourcis (Alt+Maj+K…) restent pris, jamais envoyés au jeu
  if (argv.includes('--rester')) masque.rester = true;
  const only = value('only');
  if (only != null) return { only: clean(only.split(',')), at, ifRunning: onlyIfRunning, ...masque };
  if (argv.includes('--only')) return { only: [], at, ifRunning: onlyIfRunning, ...masque }; // « --only= » vide, reçu sans le « = » par l'overlay déjà lancé
  return { add: clean([value('page') || 'combat']), at, ifRunning: onlyIfRunning, ...masque };
}

/** Position (et taille d'une fenêtre libre) fixée la dernière fois. */
function savedPlace(page) {
  try {
    const b = JSON.parse(fs.readFileSync(placeFile(page), 'utf8'));
    // Écran débranché depuis : on revient à la position par défaut
    const visible = screen.getAllDisplays().some(({ workArea: w }) => b.x >= w.x && b.y >= w.y && b.x < w.x + w.width && b.y < w.y + w.height);
    if (!visible) return null;
    return FREE[page] ? { x: b.x, y: b.y, width: b.width || FREE[page].width, height: b.height || FREE[page].height } : { x: b.x, y: b.y };
  } catch {
    return null;
  }
}

/** Fenêtre ramenée entièrement dans son écran, sans changer sa taille. */
function fitInside(b) {
  const area = screen.getDisplayMatching(b).bounds; // tout l'écran : en jeu, la barre des tâches est cachée
  const width = Math.min(b.width, area.width);
  const height = Math.min(b.height, area.height);
  return {
    x: Math.min(Math.max(b.x, area.x), area.x + area.width - width),
    y: Math.min(Math.max(b.y, area.y), area.y + area.height - height),
    width,
    height,
  };
}

/** Si la fenêtre dépasse de l'écran, on la remet dedans. */
function keepInside(win) {
  const b = win.getBounds();
  const fit = fitInside(b);
  if (fit.x !== b.x || fit.y !== b.y || fit.width !== b.width || fit.height !== b.height) win.setBounds(fit);
}

function savePlace(page, win) {
  keepInside(win);
  const { x, y, width, height } = win.getBounds();
  try {
    writeJsonAtomicSync(placeFile(page), FREE[page] ? { x, y, width, height } : { x, y }); // jamais un fichier coupé
  } catch (err) {
    console.error(`Position de ${page} non enregistrée (${err.message})`);
  }
}

/** Colle un tiroir au bord de sa fenêtre : à gauche, sinon à droite ; la page sait de quel côté glisser. */
function dock(page) {
  const d = DOCKED[page];
  const entry = windows.get(page);
  const parent = windows.get(d.to)?.win;
  if (!entry || !parent || entry.win.isDestroyed() || parent.isDestroyed()) return;
  const p = parent.getBounds();
  const area = screen.getDisplayMatching(p).bounds;
  const side = p.x - d.width >= area.x ? 'left' : 'right';
  // Tiroirs ouverts avant lui dans la table : il se colle au-delà
  const avant = drawersOf(d.to);
  const decale = avant.slice(0, avant.indexOf(page)).filter((x) => shown.has(x)).reduce((sum, x) => sum + DOCKED[x].width, 0);
  const b = { x: side === 'left' ? p.x - decale - d.width : p.x + p.width + decale, y: p.y, width: d.width, height: p.height };
  const now = entry.win.getBounds();
  if (now.x !== b.x || now.y !== b.y || now.width !== b.width || now.height !== b.height) entry.win.setBounds(b);
  if (entry.side !== side) {
    entry.side = side;
    entry.win.webContents.send('dock-side', side);
  }
}

function setEditing(page, on, { focus = true } = {}) {
  const entry = windows.get(page);
  const { win } = entry;
  entry.editing = on;
  souris(page, win, !on && !mouseMode);
  win.setFocusable(on || mouseMode);
  if (on && focus) win.focus();
  else savePlace(page, win);
  win.webContents.send('edit-mode', on);
}

/** Mode souris : toutes les fenêtres visibles cliquables, l'une d'elles prend la main (le jeu relâche le curseur). */
function setMouseMode(on) {
  mouseMode = on;
  for (const [page, entry] of windows) {
    if (entry.editing) continue;
    souris(page, entry.win, !(on && clickable(page)));
    entry.win.setFocusable(on && clickable(page));
  }
  if (on) [...windows].find(([page]) => visible(page))?.[1].win.focus();
  for (const { win } of windows.values()) win.webContents.send('mouse-mode', on);
}

/**
 * Alt+Maj+K : la souris sur les fenêtres en jeu, ou rendue au jeu. Tout caché (◆ de l'app de bureau, Alt+Maj+H) : le
 * raccourci réaffiche d'abord les fenêtres, puis donne la souris ; l'app de bureau en est prévenue (elle retire son ◆
 * et rouvre ce qu'il avait caché). Avant, il passait en mode souris sur des fenêtres invisibles : rien ne se voyait,
 * et il fallait Alt+Tab pour revenir à l'app.
 */
function basculerSouris() {
  if (!hidden) return setMouseMode(!mouseMode);
  hidden = false;
  for (const [page, { win }] of windows) if (!win.isDestroyed()) visible(page) ? win.showInactive() : win.hide();
  demanderDemasque();
  return setMouseMode(true);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Survol d'un bouton (IPC 'hover') : tant que la fenêtre accepte les clics, le curseur est suivi ; sorti de la
// fenêtre, elle les rend au jeu, même si la page n'a rien dit.
const SURVOL_MS = 300;
const survols = new Map(); // page → minuterie
function suivreSurvol(page, on) {
  clearInterval(survols.get(page));
  survols.delete(page);
  if (!on) return;
  const t = setInterval(() => {
    const entry = windows.get(page);
    if (!entry || entry.win.isDestroyed() || entry.editing || mouseMode) {
      clearInterval(t);
      survols.delete(page);
      return;
    }
    if (pointInside(screen.getCursorScreenPoint(), entry.win.getBounds(), 0)) return;
    souris(page, entry.win, true);
    clearInterval(t);
    survols.delete(page);
  }, SURVOL_MS);
  t.unref?.();
  survols.set(page, t);
}

// --- Vue du jeu pour l'IA de bord (vision.js : la SEULE fenêtre du jeu, jamais l'écran) ---
// L'overlay demande à l'app, toutes les secondes, si la vue est permise (réglage « vision » d'Alicia, coupé par défaut),
// si la jauge des boucliers est voulue et si une photo est demandée ; coupée, il ne redemande que toutes les 5 s et
// ne prend aucune image. La jauge est calculée ici (bouclier.js) : seul le pourcentage part à l'app.
const VISION_MS = 1000;
const VISION_COUPEE_MS = 5000;
const LARGEUR_JAUGE = 300; // zone de la jauge ramenée à 300 pixels de large au plus (même taille à chaque image)
let vue = null;
const bouclierFile = () => path.join(app.getPath('userData'), 'bouclier-jauge.json');
let jauge = null; // réglage de la jauge { zone, largeur, hauteur, masque, pixels }
let jaugePct = null;
let jaugeEnvoi = 0;
let jaugeTombes = null; // image « boucliers tombés » en attente de la « pleins »

function lireJauge() {
  try {
    const r = JSON.parse(fs.readFileSync(bouclierFile(), 'utf8'));
    const z = r?.zone;
    const zoneOk = z && ['x', 'y', 'l', 'h'].every((k) => Number.isFinite(z[k]) && z[k] >= 0 && z[k] <= 1);
    const ok = reglageValide(r);
    return zoneOk && ok ? { ...ok, zone: { x: z.x, y: z.y, l: z.l, h: z.h } } : null;
  } catch {
    return null;
  }
}

/** Zone du cadre « bouclier », en fractions de l'écran où il est (le jeu en plein écran fenêtré sur cet écran). */
function zoneDuCadre() {
  const win = windows.get('bouclier')?.win;
  if (!win || win.isDestroyed()) return null;
  const b = win.getBounds();
  const d = screen.getDisplayMatching(b).bounds;
  return { x: (b.x - d.x) / d.width, y: (b.y - d.y) / d.height, l: b.width / d.width, h: b.height / d.height };
}

async function tourVision() {
  let attente = VISION_COUPEE_MS;
  try {
    const etat = await getJson('/api/modules/ia/vision');
    if (!etat?.actif) {
      vue?.fermer(); // vue coupée : flux fermé tout de suite, plus aucune image
      return;
    }
    attente = VISION_MS;
    vue ||= new VueJeu({ electron: { desktopCapturer, BrowserWindow, session, ipcMain } });
    if (typeof etat.demande === 'string') {
      const img = await vue.image({ largeur: 1280 });
      await envoyerJson('/api/modules/ia/vision/image', img.erreur ? { id: etat.demande, erreur: img.erreur } : { id: etat.demande, jpeg: img.jpeg });
    }
    if (etat.bouclier && jauge) {
      const img = await vue.image({ zone: jauge.zone, largeur: LARGEUR_JAUGE, brut: true });
      const pct = img.erreur ? null : pourcentage({ largeur: img.largeur, hauteur: img.hauteur, px: img.px }, jauge);
      if (pct != null && (pct !== jaugePct || Date.now() - jaugeEnvoi > 10_000)) {
        jaugeEnvoi = Date.now();
        envoyerJson('/api/etat-jeu/boucliers', { pct });
      }
      jaugePct = pct;
      windows.get('bouclier')?.win.webContents.send('bouclier-pct', pct);
    }
  } catch (err) {
    console.warn(`Overlay : vue du jeu (${err.message})`);
  } finally {
    if (!quitting) setTimeout(tourVision, attente).unref?.();
  }
}

/** Version pour l'OCR : niveaux de gris inversés (texte sombre sur fond clair), agrandie si l'image est petite. */
function forOcr(image) {
  const { width, height } = image.getSize();
  const src = image.toBitmap(); // BGRA
  const out = Buffer.alloc(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const v = 255 - Math.max(src[i], src[i + 1], src[i + 2]); // le texte du HUD est coloré : on garde sa composante la plus forte
    out[i] = out[i + 1] = out[i + 2] = v;
    out[i + 3] = 255;
  }
  const gray = nativeImage.createFromBitmap(out, { width, height });
  const scale = Math.min(3, 2400 / Math.max(width, height));
  return scale > 1.2 ? gray.resize({ width: Math.round(width * scale), height: Math.round(height * scale), quality: 'best' }) : gray;
}

/**
 * Photo de l'écran sous une fenêtre (cadre de capture), le cadre caché le temps de la prise, affiché ou non.
 * @returns { image, ocr: [versions pour l'OCR], width, height } en PNG base64, ou null
 */
async function captureArea(page) {
  const entry = windows.get(page);
  if (!entry) return null;
  const { win } = entry;
  const b = win.getBounds();
  const display = screen.getDisplayMatching(b);
  const sf = display.scaleFactor;
  // Cadre affiché : on le cache le temps de la photo. Caché (bouton 📷 du HUD), sa zone se photographie quand même.
  const shown = win.isVisible();
  if (shown) {
    win.setOpacity(0);
    await wait(120); // le temps que le cadre disparaisse de l'écran
  }
  try {
    const thumbnailSize = { width: Math.round(display.size.width * sf), height: Math.round(display.size.height * sf) };
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize });
    // Seulement l'écran du cadre : jamais un autre écran pris à sa place (guards.js)
    const source = screenSource(sources, display.id, screen.getAllDisplays().length);
    if (!source) {
      console.warn(`Overlay : écran du cadre ${page} introuvable parmi ${sources.length} écran(s), pas de photo`);
      return null;
    }
    const image = source.thumbnail.crop({
      x: Math.round((b.x - display.bounds.x) * sf),
      y: Math.round((b.y - display.bounds.y) * sf),
      width: Math.round(b.width * sf),
      height: Math.round(b.height * sf),
    });
    const { width, height } = image.getSize();
    const png = (img) => img.toPNG().toString('base64');
    return { image: png(image), ocr: [png(forOcr(image))], width, height };
  } finally {
    if (shown && !win.isDestroyed()) win.setOpacity(1);
  }
}

/**
 * Place d'une fenêtre sans position fixée : la première place libre (place.js). HUD en haut au centre, les uns sous les
 * autres ; fenêtre libre en haut à droite, sinon à côté ou sous les fenêtres déjà ouvertes, sans les couvrir.
 */
function defaultPlace(page) {
  const area = screen.getPrimaryDisplay().workArea;
  const size = FREE[page] || SIZES[page] || HUD_SIZE;
  // Fenêtres rangées (cachées, GARDEES) comptées comme absentes : pas de trou invisible dans la pile du HUD
  const presente = (p) => p !== page && !rangees.has(p);
  const others = [...windows]
    .filter(([p, { win }]) => presente(p) && !win.isDestroyed())
    .map(([p, { win }]) => ({ ...win.getBounds(), grows: GROWS.has(p) }));
  const place = findPlace({
    size,
    area,
    others,
    free: Boolean(FREE[page]),
    preferred: own(FREE_PLACES, page)?.(area, size) || null,
    drawer: drawersOf(page).reduce((sum, d) => sum + DOCKED[d].width, 0),
    grows: GROWS.has(page),
    hudWidth: HUD_SIZE.width,
    hudIndex: [...windows.keys()].filter((p) => presente(p) && !FREE[p] && !DOCKED[p]).length,
    hudStep: HUD_SIZE.height + 10,
  });
  return { ...size, ...place };
}

/**
 * Fenêtre de GARDEES que son module ferme : cachée, gardée telle quelle (sa page reste chargée et à jour par le flux
 * temps réel), fermée pour de bon après GARDE_MS. Le mode déplacement est quitté (sa place enregistrée).
 */
function ranger(page) {
  const entry = windows.get(page);
  if (!entry || entry.win.isDestroyed() || rangees.has(page)) return;
  if (entry.editing) setEditing(page, false);
  const minuterie = setTimeout(() => fermerRangee(page), GARDE_MS);
  minuterie.unref?.();
  rangees.set(page, minuterie);
  entry.win.hide();
}

function fermerRangee(page) {
  if (!rangees.has(page)) return;
  clearTimeout(rangees.get(page));
  rangees.delete(page);
  const entry = windows.get(page);
  if (!entry) return;
  windows.delete(page);
  shown.delete(page);
  if (!entry.win.isDestroyed()) entry.win.close();
}

/**
 * Fenêtre rangée redemandée : réaffichée sans prendre la main (jamais le focus du jeu), rien de rechargé. Sans place
 * fixée par le joueur, sa place par défaut est recalculée d'abord, comme pour une fenêtre neuve : une fenêtre ouverte
 * pendant qu'elle était rangée a pu prendre sa case.
 */
function ressortir(page) {
  clearTimeout(rangees.get(page));
  rangees.delete(page);
  const entry = windows.get(page);
  if (!entry || entry.win.isDestroyed()) return;
  if (!own(DOCKED, page) && !savedPlace(page)) {
    const { width, height } = entry.win.getBounds();
    const { x, y } = fitInside({ ...defaultPlace(page), width, height });
    entry.win.setBounds({ x, y, width, height });
  }
  if (visible(page)) {
    const { win } = entry;
    win.setOpacity(0);
    win.showInactive();
    const t = setTimeout(() => !win.isDestroyed() && win.setOpacity(1), REPEINT_MS);
    t.unref?.();
  }
  if (disposer) disposerFenetre(page); // disposition en cours : elle y entre comme une fenêtre qui s'ouvre
}

function open(page) {
  if (windows.has(page)) {
    if (rangees.has(page)) ressortir(page);
    return;
  }
  if (toggleable(page) && lireMontrees().has(page)) shown.add(page); // laissée montrée la dernière fois
  const url = pageUrl(page);
  const parentBounds = DOCKED[page] && windows.get(DOCKED[page].to)?.win.getBounds();
  const place = DOCKED[page]
    ? { width: DOCKED[page].width, height: parentBounds?.height || 400, x: parentBounds ? parentBounds.x - DOCKED[page].width : 0, y: parentBounds?.y || 0 }
    : fitInside({ ...(FREE[page] || SIZES[page] || HUD_SIZE), ...(savedPlace(page) || defaultPlace(page)) });
  const win = new BrowserWindow({
    ...place,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false, // une fenêtre transparente ne se redimensionne pas à la souris : boutons de la page
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: visible(page),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  windows.set(page, { win, editing: false, url });
  if (disposer) disposerFenetre(page);
  if (DOCKED[page]) dock(page);
  else win.on('moved', () => keepInside(win)); // lâchée en partie hors de l'écran : on la remet dedans
  // Ses tiroirs la suivent quand elle bouge ou change de taille (et se collent si elle s'ouvre après eux)
  if (drawersOf(page).length) {
    const follow = () => drawersOf(page).forEach(dock);
    win.on('move', follow);
    win.on('resize', follow);
    follow();
  }
  win.on('closed', () => {
    // Fermée puis rouverte aussitôt (deux ordres à quelques ms) : la table tient déjà la nouvelle fenêtre, on n'y touche
    // pas (sinon la nouvelle devenait orpheline : impossible à fermer, ses boutons ignorés)
    if (windows.get(page)?.win !== win) return;
    windows.delete(page);
    shown.delete(page); // rouverte plus tard : de nouveau cachée
    clearTimeout(rangees.get(page));
    rangees.delete(page);
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  souris(page, win, !(mouseMode && clickable(page)));
  if (mouseMode && clickable(page)) win.setFocusable(true);
  // Crochet sur la souris (souris) seulement fenêtre affichée : posé quand elle se montre, retiré quand elle se cache
  win.on('show', () => ignores.get(win) !== false && souris(page, win, true, true));
  win.on('hide', () => ignores.get(win) !== false && souris(page, win, true, false));
  // Mode souris : un clic dans le jeu (aucune fenêtre de l'overlay n'a plus la main) rend la main au jeu
  win.on('blur', () => setTimeout(() => {
    if (mouseMode && ![...windows.values()].some((e) => !e.win.isDestroyed() && e.win.isFocused())) setMouseMode(false);
  }, 100));
  win.loadURL(url);
  // App pas encore lancée : nouvel essai toutes les 3 s
  win.webContents.on('did-fail-load', () => setTimeout(() => !win.isDestroyed() && win.loadURL(url), 3000));
  // Erreurs de la page affichées dans le terminal de l'overlay (forme d'Electron 33 et celle d'Electron 35 et plus)
  win.webContents.on('console-message', (event, ...legacy) => {
    const { error, message } = consoleEntry(event, ...legacy);
    if (error) console.log(`[${page}] ${message}`);
  });
  let reessais = 0;
  win.webContents.on('did-finish-load', () => {
    console.log(`Overlay chargé : ${url}`);
    // Page chargée pendant que l'interface se recompilait (relance de l'app) : le document arrive, pas ses scripts, et la
    // fenêtre reste blanche sans erreur de chargement. React pas monté dans #root au bout de 5 s : on recharge (6 fois au plus).
    setTimeout(() => {
      if (win.isDestroyed()) return;
      win.webContents.executeJavaScript('Object.keys(document.getElementById("root") || {}).some((k) => k.startsWith("__reactContainer"))')
        .then((monte) => {
          if (monte) reessais = 0;
          else if (reessais < 6 && !win.isDestroyed()) {
            reessais += 1;
            win.webContents.reload();
          }
        })
        .catch(() => {});
    }, 5000);
    if (DOCKED[page] && windows.get(page)?.side) win.webContents.send('dock-side', windows.get(page).side);
  });
  // Aucune autre page ne s'ouvre dans l'overlay. Le cadre principal ne peut que se recharger (Vite le demande après une
  // mise à jour) ; un cadre (iframe) ne navigue jamais, ni vers un site ni vers une application externe (mailto:…).
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, target) => {
    if (!allowedNavigation(event?.url ?? target, url)) event.preventDefault();
  });
  win.webContents.on('will-frame-navigate', (event) => {
    if (!event.isMainFrame) event.preventDefault();
  });
}

let lastOrderAt = null; // heure du dernier ordre du serveur appliqué (--at), ou null

let resterActif = false; // ordre --rester reçu : pas d'arrêt quand il n'y a plus de fenêtre

/** Disposition : une fenêtre (pas un tiroir) montrée, en mode déplacement sans prendre le clavier, et son cadre affiché. */
function disposerFenetre(page) {
  const entry = windows.get(page);
  // Fenêtre rangée (cachée, GARDEES) : hors de la disposition, sinon sa place par défaut, que le joueur n'a ni vue ni
  // déplacée, serait enregistrée comme fixée à la fin
  if (!entry || own(DOCKED, page) || entry.win.isDestroyed() || rangees.has(page)) return;
  shown.add(page);
  if (visible(page)) entry.win.showInactive();
  setEditing(page, true, { focus: false });
  entry.win.webContents.send('disposition', true);
}

/** Fin de la disposition : chaque place enregistrée (setEditing), cadres retirés, fenêtres cachées de nouveau cachées. */
function finirDisposition() {
  disposer = false;
  for (const [page, entry] of windows) {
    if (entry.win.isDestroyed()) continue;
    if (entry.editing) setEditing(page, false);
    entry.win.webContents.send('disposition', false);
    if (START_HIDDEN.has(page) || own(DOCKED, page)) setShown(page, lireMontrees().has(page)); // comme avant la disposition
  }
}

function apply({ only, add, at = null, masque, rester, disposer: dsp }) {
  // Deux lancements du serveur qui se croisent : le plus ancien, arrivé en dernier, ne défait pas le plus récent
  if (staleOrder(at, lastOrderAt)) {
    console.warn(`Overlay : ordre périmé ignoré (parti ${lastOrderAt - at} ms avant le dernier appliqué)`);
    return;
  }
  if (at != null) lastOrderAt = at;
  if (rester) resterActif = true;
  if (dsp === false && disposer) finirDisposition(); // avant de fermer les fenêtres en trop : leurs places d'abord
  if (only) {
    // Liste vide : l'overlay s'arrête, sauf s'il garde une fenêtre rangée (refroidissement FSD, Signaux, itinéraire), qui
    // reviendra au prochain saut sans relancer Electron ; il s'arrêtera quand elle se fermera pour de bon (GARDE_MS).
    const garde = [...windows].some(([page, { win }]) => GARDEES.has(page) && !win.isDestroyed());
    if (!only.length && !resterActif && !garde) {
      canal?.fermer(); // le serveur le sait (liste vide) : son prochain ordre relancera l'overlay
      return app.quit();
    }
    for (const [page, { win }] of windows) {
      if (only.includes(page)) continue;
      if (GARDEES.has(page) && !win.isDestroyed()) {
        ranger(page); // cachée, pas fermée : elle reviendra au prochain saut
        continue;
      }
      windows.delete(page); // tout de suite : les fenêtres ouvertes juste après se placent sans elle
      shown.delete(page); // rouverte par l'ordre suivant : de nouveau cachée (son « closed » arrive après)
      win.close();
    }
    only.forEach(open);
  } else add.forEach(open);
  if (dsp === true) {
    disposer = true;
    for (const page of windows.keys()) disposerFenetre(page); // sauf les fenêtres rangées (disposerFenetre)
  }
  // Tout cacher / tout réafficher (app de bureau) : comme Alt+Maj+H, fenêtres gardées ouvertes
  if (typeof masque === 'boolean' && masque !== hidden) {
    hidden = masque;
    for (const [page, { win }] of windows) if (!win.isDestroyed()) visible(page) ? win.showInactive() : win.hide();
  }
}

/**
 * Alt+Maj+Q : tout disparaît tout de suite, le serveur de l'app en est prévenu (closed.js), puis l'overlay quitte.
 * Serveur arrêté : la fermeture est gardée (pendingFile), pour le lancement suivant.
 */
let quitting = false;
function quitByPlayer() {
  if (quitting) return;
  quitting = true;
  canal?.fermer(); // plus aucun ordre accepté : l'overlay s'en va
  for (const { win } of windows.values()) if (!win.isDestroyed()) win.hide();
  notifyClosed(() => app.quit(), { pendingFile: pendingFile() });
}

/**
 * Page de la fenêtre qui a envoyé un message : son cadre principal seulement, à l'adresse de la fenêtre ; jamais un
 * cadre inclus, détaché ou inconnu (guards.js).
 */
function pageFrom(event) {
  for (const [page, { win, url }] of windows) {
    if (win.webContents !== event?.sender) continue;
    return fromMainFrame(event, win.webContents, url) ? page : null;
  }
  return null;
}

/**
 * Le clic de l'utilisateur sur cette fenêtre, pour une fonction sensible du pont (guards.js) : fenêtre affichée, curseur
 * sur elle ou mode souris. Une page ne peut pas le simuler.
 */
function byUser(page) {
  const entry = windows.get(page);
  if (!entry || entry.win.isDestroyed()) return false;
  return userGesture({ shown: visible(page) && entry.win.isVisible(), mouseMode, cursor: screen.getCursorScreenPoint(), bounds: entry.win.getBounds() });
}

/**
 * Aucune permission pour les pages de l'overlay (ni caméra, ni presse-papiers, ni notifications…), sauf le micro, son
 * seul, pour la fenêtre de l'IA de bord (/hud/ia) : le joueur lui parle (Alt+Maj+V).
 */
const PAGE_MICRO = '/hud/ia';
function microPermis(wc, permission, types) {
  if (permission !== 'media' || !types.length || !types.every((t) => t === 'audio')) return false;
  try {
    const u = new URL(wc?.getURL?.() || '');
    return allowedRequest(u.href) && u.pathname === PAGE_MICRO;
  } catch {
    return false;
  }
}
function lockSession(ses) {
  ses.setPermissionRequestHandler((wc, permission, callback, details) => callback(microPermis(wc, permission, details?.mediaTypes || [])));
  ses.setPermissionCheckHandler((wc, permission, _origin, details) => microPermis(wc, permission, details?.mediaType ? [details.mediaType] : []));
  ses.setDevicePermissionHandler?.(() => false);
  // Seulement l'interface de l'app : tout autre site, port ou fichier est annulé avant de partir
  ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
    const ok = allowedRequest(details.url);
    if (!ok) console.warn(`Overlay : requête refusée vers ${String(details.url).slice(0, 120)}`);
    callback({ cancel: !ok });
  });
}

/** L'app répond-elle ? (lecture de l'état par l'interface, donc Vite et le serveur ensemble) */
function appAnswers() {
  return new Promise((resolve) => {
    const req = http.get(`${UI_ORIGIN}/api/state`, { timeout: 3000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(false));
  });
}

/** App injoignable : toutes les fenêtres cachées ; de retour : réaffichées. */
function setOffline(on) {
  if (offline === on) return;
  offline = on;
  console.log(on ? "Overlay : l'app ne répond plus, fenêtres cachées" : "Overlay : l'app répond de nouveau");
  for (const [page, { win }] of windows) if (!win.isDestroyed()) visible(page) ? win.showInactive() : win.hide();
}

const takenShortcuts = []; // raccourcis déjà pris par un autre programme (« Alt+Maj+Q »…)

/**
 * Raccourci global : un raccourci déjà pris par un autre programme est signalé (Electron ne dit rien) dans la console
 * et, l'overlay lancé par le serveur n'ayant pas de console, dans l'icône de secours (trayExit).
 */
let actionsRaccourcis = {}; // identifiant d'action → ce qu'elle fait (posé au démarrage)

/**
 * Prend auprès de Windows les raccourcis du réglage (overlay/raccourcis.js : revérifié, touches d'origine sans réglage
 * lisible), à la place de ceux d'avant. Un raccourci de page demande à l'app de bureau d'ouvrir cette page.
 */
function prendreRaccourcis(reglage) {
  globalShortcut.unregisterAll();
  takenShortcuts.length = 0;
  for (const r of planRaccourcis(reglage)) {
    if (r.action) {
      const fn = actionsRaccourcis[r.action];
      if (fn) shortcut(r.touche, fn);
    } else shortcut(r.touche, () => { envoyerJson('/api/bureau/ouvrir', { chemin: r.chemin }).catch(() => {}); });
  }
}

/** Relit le réglage du joueur sur le serveur de l'app (au démarrage, et à chaque changement : ordre « --raccourcis »). */
function chargerRaccourcis() {
  getJson('/api/raccourcis').then((reglage) => {
    if (reglage) prendreRaccourcis(reglage);
  }).catch(() => {});
}

function shortcut(accelerator, fn) {
  const ok = globalShortcut.register(accelerator, fn);
  if (!ok) {
    takenShortcuts.push(accelerator.replace('Shift', 'Maj'));
    console.warn(`Overlay : raccourci ${accelerator} déjà pris par un autre programme, inutilisable`);
  }
  return ok;
}

let tray = null;
/**
 * Icône de la zone de notification, posée seulement si un raccourci n'a pas pu être pris : elle dit lesquels, et
 * permet de masquer les fenêtres et de quitter l'overlay (la seule sortie si Alt+Maj+Q est pris).
 */
function trayExit() {
  try {
    const taken = `Raccourcis pris par un autre programme : ${takenShortcuts.join(', ')}`;
    tray = new Tray(path.join(__dirname, '..', 'EliteApp.ico'));
    tray.setToolTip(`Overlay Enova (${taken})`);
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: taken, enabled: false },
      { label: 'Masquer / afficher', click: () => { hidden = !hidden; for (const [page, { win }] of windows) visible(page) ? win.showInactive() : win.hide(); } },
      { label: "Quitter l'overlay", click: () => app.quit() },
    ]));
  } catch (err) {
    console.warn(`Overlay : icône de secours impossible (${err.message}) ; pour quitter, ferme Electron dans le Gestionnaire des tâches`);
  }
}

const first = parseArgs(process.argv);

const startup = startupAction({ locked: app.requestSingleInstanceLock(), only: first.only, ifRunning: first.ifRunning, rester: first.rester });
if (startup === 'transmettre') {
  app.quit(); // l'overlay déjà lancé reçoit les arguments (second-instance)
} else if (startup === 'arreter') {
  app.quit(); // rien à fermer (aucun overlay ne tournait), ou ordre --if-running : l'overlay ne s'ouvre pas pour lui
} else {
  app.on('second-instance', (_event, argv) => app.whenReady().then(() => apply(parseArgs(argv))));

  app.whenReady().then(() => {
    lockSession(session.defaultSession);
    // Fermeture gardée (Alt+Maj+Q pressé serveur arrêté) : transmise d'abord, et le serveur dit quoi ouvrir maintenant
    // (rien, si rien n'a été voulu depuis : les fenêtres qu'il redemandait telles quelles ne reviennent pas). Pas de
    // fermeture gardée, serveur injoignable, ou lancé à la main (--page, npm run overlay) : ce qui est demandé.
    sendPending(pendingFile(), (r) => {
      const args = startArgs(first, r);
      apply(args.only ? { only: clean(args.only), rester: first.rester, disposer: first.disposer } : { ...args, rester: first.rester });
      // Puis le canal permanent : les ordres suivants du serveur arrivent par lui, sans lancer de processus (canal.js)
      if (!quitting) {
        canal = ouvrirCanal({
          onOrdre: (argv) => {
            // L'app de bureau quitte pour de bon : on s'en va tout de suite, sans attendre son retour
            if (argv.includes('--quitter')) {
              quitting = true;
              canal?.fermer();
              return app.quit();
            }
            // Raccourcis changés dans Paramètres : on les relit
            if (argv.includes('--raccourcis')) return chargerRaccourcis();
            return apply(parseArgs(argv));
          },
        });
      }
    });
    watchApp({ check: appAnswers, onDown: () => setOffline(true), onUp: () => setOffline(false), onGone: () => app.quit() });
    // Souris sur le bouton : la fenêtre accepte le clic. Ailleurs, les clics passent au jeu. Cliquable seulement si le
    // curseur est vraiment sur la fenêtre, et rendue au jeu dès qu'il en sort (survol suivi ici) : un bouton retiré
    // sous la souris (« Non ») ne prévient jamais la page, qui ne pouvait donc pas rendre les clics au jeu.
    ipcMain.on('hover', (event, on) => {
      const page = pageFrom(event);
      const entry = windows.get(page);
      if (!entry || entry.editing || mouseMode) return;
      const dedans = Boolean(on) && pointInside(screen.getCursorScreenPoint(), entry.win.getBounds(), 0);
      souris(page, entry.win, !dedans);
      suivreSurvol(page, dedans);
    });
    // Bouton ✥ / 📌. Passer en mode déplacement donne le clavier à la fenêtre (focus) : seulement au clic de
    // l'utilisateur (fenêtre affichée, curseur sur elle, ou mode souris), jamais sur la seule demande de la page.
    // En sortir (📌) reste toujours possible.
    ipcMain.on('toggle-edit', (event) => {
      const page = pageFrom(event);
      if (!page || own(DOCKED, page)) return; // un tiroir suit sa fenêtre
      const { editing } = windows.get(page);
      if (!editing && !byUser(page)) return;
      setEditing(page, !editing);
    });
    // Redimensionnement d'une fenêtre libre, par les boutons de la page
    ipcMain.on('grow', (event, dw, dh) => {
      const page = pageFrom(event);
      if (!own(FREE, page) || !windows.get(page).editing) return;
      const { win } = windows.get(page);
      const b = win.getBounds();
      const min = own(MINS, page) || MIN;
      win.setBounds(fitInside({ ...b, width: Math.max(min.width, b.width + Number(dw || 0)), height: Math.max(min.height, b.height + Number(dh || 0)) }));
    });
    // Bouton ↔ du mode déplacement : la fenêtre se centre de gauche à droite sur l'écran où elle est ; sa hauteur à
    // l'écran et sa taille ne changent pas. Jamais un tiroir (il suit sa fenêtre), jamais hors déplacement.
    ipcMain.on('center-h', (event) => {
      const page = pageFrom(event);
      const entry = page && windows.get(page);
      if (!entry || !entry.editing || own(DOCKED, page)) return;
      const b = entry.win.getBounds();
      const area = screen.getDisplayMatching(b).workArea;
      entry.win.setBounds({ ...b, x: area.x + Math.round((area.width - b.width) / 2) });
    });
    // Fenêtre ouverte cachée, montrée ou cachée par le bouton d'une autre page (liste des repères…)
    // Seulement depuis une fenêtre de l'overlay, et pour une fenêtre connue (sinon ignoré)
    ipcMain.on('toggle-window', (event, page) => {
      if (pageFrom(event) && toggleable(page)) setShown(page, !shown.has(page));
    });
    // Hauteur demandée par la page (contenu qui change) : le coin haut-gauche et la largeur ne bougent pas
    // Seulement les fenêtres qui suivent leur contenu (Coup d'œil, liste de courses)
    ipcMain.on('fit-height', (event, height) => {
      const page = pageFrom(event);
      const entry = windows.get(page);
      const h = Math.round(Number(height));
      if (!entry || !FIT_HEIGHT.has(page) || !Number.isFinite(h) || h < 60) return;
      const b = entry.win.getBounds();
      if (Math.abs(b.height - h) < 2) return;
      entry.win.setBounds(fitInside({ ...b, height: h }));
    });
    ipcMain.handle('window-shown', (_event, page) => toggleable(page) && shown.has(page));
    ipcMain.handle('dock-side', (event) => windows.get(pageFrom(event))?.side || 'left');
    // Cadre de capture : photo de sa zone, demandée par son bouton 📷 ; pas de redimensionnement plus fin
    // Seulement le cadre de capture, et à son clic : aucune autre fenêtre ne photographie l'écran sous elle, et aucune
    // page ne photographie d'elle-même, en boucle ou cachée (caché, c'est Alt+Maj+P, décidé ici et pas par la page)
    ipcMain.handle('capture', (event) => {
      const page = pageFrom(event);
      return CAPTURE_ZONES.has(page) && byUser(page) ? captureArea(page) : null;
    });
    ipcMain.handle('step', (event) => own(STEPS, pageFrom(event)) || null);
    // Cadre de la jauge des boucliers : noter l'image « tombés » puis « pleins » (au clic du joueur seulement)
    ipcMain.handle('bouclier-noter', async (event, quoi) => {
      if (pageFrom(event) !== 'bouclier' || !byUser('bouclier')) return { erreur: 'Refusé : seulement au clic, dans le cadre.' };
      if (quoi === 'oublier') {
        jauge = null;
        jaugeTombes = null;
        fs.rmSync(bouclierFile(), { force: true });
        return { ok: true };
      }
      const etat = await getJson('/api/modules/ia/vision');
      if (!etat?.actif) return { erreur: 'La vue du jeu est coupée : allume-la sur la page d’Alicia.' };
      const zone = zoneDuCadre();
      if (!zone) return { erreur: 'Cadre introuvable.' };
      vue ||= new VueJeu({ electron: { desktopCapturer, BrowserWindow, session, ipcMain } });
      const img = await vue.image({ zone, largeur: LARGEUR_JAUGE, brut: true });
      if (img.erreur) return { erreur: img.erreur };
      const image = { largeur: img.largeur, hauteur: img.hauteur, px: img.px };
      if (quoi === 'tombes') {
        jaugeTombes = { zone, image };
        return { ok: true, etape: 'tombes' };
      }
      if (quoi !== 'pleins') return { erreur: 'Inconnu.' };
      if (!jaugeTombes) return { erreur: 'Note d’abord l’image boucliers tombés.' };
      if (['x', 'y', 'l', 'h'].some((k) => Math.abs(jaugeTombes.zone[k] - zone[k]) > 0.002)) return { erreur: 'Le cadre a bougé entre les deux images : recommence par « tombés ».' };
      try {
        jauge = { zone, ...calibrer(jaugeTombes.image, image) };
      } catch (err) {
        return { erreur: err.message };
      }
      jaugeTombes = null;
      try {
        writeJsonAtomicSync(bouclierFile(), jauge);
      } catch {
        // gardée pour cette fois ; à refaire après une relance
      }
      return { ok: true, etape: 'pleins', pixels: jauge.pixels };
    });
    ipcMain.handle('bouclier-etat', (event) => (pageFrom(event) === 'bouclier' ? { regle: Boolean(jauge), tombes: Boolean(jaugeTombes), pct: jaugePct } : null));
    ipcMain.handle('mouse-mode', () => mouseMode);
    ipcMain.handle('disposition', () => disposer);
    // Copie demandée par une page (nom du système, pour le coller dans Inara…) : le Coup d'œil seulement, à son clic
    // (une page ne remplace pas en douce ce que tu as copié ailleurs)
    ipcMain.on('copy', (event, text) => {
      const page = pageFrom(event);
      if (COPY.has(page) && byUser(page)) clipboard.writeText(String(text).slice(0, 200));
    });
    // Ce que fait chaque action ; sa touche vient du réglage du joueur (Paramètres), à défaut des touches d'origine
    actionsRaccourcis = {
      deplacer: () => {
        const on = ![...windows.values()].some((w) => w.editing);
        for (const page of windows.keys()) if (visible(page) && !DOCKED[page]) setEditing(page, on); // pas les fenêtres cachées ni les tiroirs
      },
      masquer: () => {
        hidden = !hidden;
        for (const [page, { win }] of windows) visible(page) ? win.showInactive() : win.hide();
      },
      photo: async () => {
        for (const page of CAPTURE_ZONES) {
          const shot = await captureArea(page);
          if (shot) windows.get(page)?.win.webContents.send('captured', shot);
        }
      },
      souris: basculerSouris,
      // Foreuse posée : la fenêtre du balayage (ouverte, même cachée, avec le mode Minage Rhino) note ta position
      foreuse: () => windows.get('waypoints-sweep')?.win.webContents.send('drill-key'),
      // Repère posé ici (fenêtre de balayage, même cachée : elle le pose et propose son minerai quand on la montre)
      repere: () => windows.get('waypoints-sweep')?.win.webContents.send('mark-key'), // le repère s'ouvre dans son tiroir
      voix: () => windows.get('ia')?.win.webContents.send('ecoute-key'), // parler à l'IA : un appui pour commencer, un pour finir
      quitter: quitByPlayer,
    };
    // Tout de suite les touches d'origine (le serveur peut être en train de démarrer), puis le réglage du joueur
    prendreRaccourcis(null);
    chargerRaccourcis();
    if (takenShortcuts.length) trayExit();
    jauge = lireJauge();
    tourVision();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    canal?.fermer();
  });
  // Plus de fenêtre : on s'arrête, sauf si l'app de bureau demande de rester actif (raccourcis toujours pris). Le canal
  // d'abord : le serveur l'apprend tout de suite et relancera l'overlay au prochain ordre (dernière fenêtre rangée
  // fermée au bout de GARDE_MS).
  app.on('window-all-closed', () => {
    if (resterActif) return;
    canal?.fermer();
    app.quit();
  });
}
