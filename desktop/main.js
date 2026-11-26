// Enova, l'app de bureau (Electron). Un seul programme :
//  - lance le serveur (server/src/index.js) et l'interface compilée (desktop/interface.mjs) avec le Node du PC, données
//    dans %APPDATA%\Elite Compagnon\donnees (vides au premier lancement ; copiées depuis server/data seulement avec
//    ELITE_COPIER_DONNEES_DEV=1, sur le PC du développeur) ; l'overlay des HUD reste lancé par le serveur, comme avec
//    npm run dev ;
//  - fenêtre principale à navigation (cadre maison, style des panneaux du jeu) ;
//  - pages détachées : une page copiée dans sa propre fenêtre, déplaçable, au premier plan par-dessus le jeu ;
//  - MAR (menu d'accès rapide) en haut à gauche de l'écran, par-dessus le jeu : toutes les rubriques et leurs sous-menus,
//    un clic sur une page ouvre la fenêtre principale dessus ; son ◆ cache toute l'app, puis la réaffiche telle qu'elle était ;
//  - icône dans la zone de notification : fermer la fenêtre principale garde l'app ouverte, « Quitter » l'arrête ;
//  - « Copier pour Discord » : le rapport de la semaine en GIF animé, fabriqué hors écran (desktop/gif.js, partage.js).
//
// Sécurité : les fenêtres ne chargent que l'interface (http://127.0.0.1:5173, mêmes gardes que l'overlay) et la page
// de chargement (desktop/pages) ; les liens vers un site s'ouvrent dans le navigateur du joueur ; le pont (preload.js)
// ne vient que du cadre principal d'une de ces pages.

const { app, BrowserWindow, Menu, Tray, WebContentsView, dialog, ipcMain, screen, session, shell } = require('electron');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { allowedRequest, demoFrame, samePage } = require('../overlay/guards.js');
const { writeJsonAtomicSync } = require('../overlay/atomic.js');
const { NOM_APP, NOM_AFFICHE, dossierApp, dossierAppOuArret, dossierDonnees, repliDossierApp, sourceDev, donneesLaisseesDeCote, preparerDonnees, demanderEffacement, effacerSiDemande, dossierSauvegardes, demanderRestauration, restaurerSiDemande } = require('./donnees.js');
const { MAX_DETACHEES, basculer, boiteErreur, centrerSur, listerEcrans, zoneEcran, cheminDetachable, cheminNavigable, fondFenetre, jeuDansListe, lireEtat, outilsDevPermis, placeBarre, reglageMar, reglagePave, surUnEcran, tailleDefaut } = require('./etat.js');
const { trouverNode } = require('./noeud.js');
const { choisirPorts } = require('./ports.js');
const { SITES, limiteur, navigationPermise, partition: partitionSite, requetePermise, site: siteDe, versNavigateur, zone: zoneSite } = require('./sites.js');
const { journal, lancerEnfant, executer, quiTientLePort } = require('./processus.js');
const { encoderGifEnFond } = require('./gifFond.js');
const { avertissementEmplacement } = require('./emplacement.js');
const { verifierPaquet } = require('./version.js');
const { IMAGES_GIF, DELAI_GIF, DUREE_GIF, HAUTEUR_MAX_GIF, adresseCapture, commandePressePapiers, demandeRapport, fichierGif } = require('./partage.js');

const RACINE = path.resolve(__dirname, '..');
// Interface : 127.0.0.1:5173 d'habitude ; un autre port libre si 5173 est pris (ports.js, choisi au lancement)
let UI = 'http://127.0.0.1:5173';
const ICONE = path.join(RACINE, 'EliteApp.ico');
const PAGES = path.join(__dirname, 'pages');
const PAGE_LOCALE = (nom) => pathToFileURL(path.join(PAGES, nom)).href;
const PRELOAD = path.join(__dirname, 'preload.js');
const FOND = '#0a0c0f';

app.setName(NOM_APP);
app.setAppUserModelId(NOM_APP);
// Pas de dossier de ce PC pour l'app (%APPDATA% et %LOCALAPPDATA% sur le réseau) : un message clair, pas la boîte
// d'erreur d'Electron en anglais ; process.exit pour que rien de ce qui suit ne s'exécute
const DOSSIER_APP = dossierAppOuArret({ montrer: (titre, texte) => dialog.showErrorBox(titre, texte), arreter: (code) => process.exit(code) });
app.setPath('userData', DOSSIER_APP);
// Vérification « réseau local » de Chromium : la page d'un site (Inara) ne joint ni ce PC ni le réseau local, même par
// un nom DNS qui y mènerait (sites.js ne reconnaît que les adresses écrites). Les pages de l'app, sur 127.0.0.1, ne
// sont pas concernées (requêtes vers la même adresse).
app.commandLine.appendSwitch('enable-features', 'LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults');
const log = journal(path.join(DOSSIER_APP, 'bureau.log'));
const FICHIER_ETAT = path.join(DOSSIER_APP, 'bureau.json');
const OUTILS_DEV = outilsDevPermis();
const FOND_FENETRE = fondFenetre(os.release(), FOND);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Relancée par le joueur : l'app se montre, ou, arrêtée sur une erreur, montre cette erreur
  app.on('second-instance', () => (montrerErreur ? montrerErreur() : montrerTout()));
  app.whenReady().then(demarrer).catch((err) => echec(err));
}

let quitter = false;
let principale = null;
let barre = null; // MAR, menu d'accès rapide en haut à gauche de l'écran (page /barre de l'interface)
let mar = null; // son réglage (coin, décalage), Paramètres
let tailleMar = { width: 420, height: 40 }; // taille que la page demande
let pave = null; // pavé tactile : fenêtre de menus à gros boutons (page /pave), pour un petit écran tactile
let reglPave = null; // son réglage (actif, place), Paramètres
let tray = null;
let pret = false;
const detachees = new Map(); // id -> { win, chemin }
let memoireBascule = [];
let toutCache = false; // ◆ : toute l'app cachée (fenêtres, fenêtres en jeu, rubriques du MAR), sauf le ◆
let enfants = { serveur: null, interface: null };

// --- Démarrage ---

async function demarrer() {
  log.ecrire('bureau', `démarrage (Electron ${process.versions.electron})`);
  const repli = repliDossierApp(); // %APPDATA% sur le réseau : dossier de l'app sous %LOCALAPPDATA% (donnees.js)
  if (repli) log.ecrire('bureau', repli);
  Menu.setApplicationMenu(null);
  securiserSession();
  creerTray();
  creerPrincipale();
  // Dossier de l'app sous Program Files ou OneDrive : prévenu (journal, bulle de Windows qui ne prend pas la main)
  const avert = avertissementEmplacement(RACINE);
  if (avert) {
    log.ecrire('bureau', `attention : ${avert.long}`);
    tray?.displayBalloon?.({ iconType: 'warning', title: NOM_AFFICHE, content: avert.court, noSound: true });
  }
  const node = trouverNode();
  // « Effacer mes données » demandé au lancement d'avant : fait ici, avant que le serveur n'ouvre la base
  // « Restaurer une sauvegarde » demandé au lancement d'avant : fait ici, base fermée
  const restauree = restaurerSiDemande({ app: dossierApp(), cible: dossierDonnees(), sauvegardes: dossierSauvegardes() });
  if (restauree) {
    log.ecrire('bureau', restauree.erreur
      ? `restauration abandonnée : ${restauree.erreur}`
      : `sauvegarde « ${restauree.nom} » restaurée (${restauree.fichiers} fichiers) ; données d'avant gardées dans ${restauree.laisse}`);
  }
  const effaces = effacerSiDemande({ app: dossierApp(), cible: dossierDonnees() });
  if (effaces) {
    await session.defaultSession.clearStorageData().catch(() => {}); // réglages gardés par les pages
    await session.defaultSession.clearCache().catch(() => {});
    // Sites (Inara…) : cookies, connexion à ton compte, cache
    for (const id of Object.keys(SITES)) {
      const s = session.fromPartition(partitionSite(id));
      await s.clearStorageData().catch(() => {});
      await s.clearCache().catch(() => {});
    }
    log.ecrire('bureau', `données effacées à ta demande (${effaces.length} éléments, connexions aux sites comprises ; la référence est gardée)`);
  }
  // Copie de server/data (les données de npm run dev) seulement sur demande expresse du développeur
  // (ELITE_COPIER_DONNEES_DEV=1) : jamais déduite de l'app non empaquetée, qui tourne toujours depuis ses sources
  const source = sourceDev(RACINE);
  if (!source && !fs.existsSync(dossierDonnees()) && donneesLaisseesDeCote(RACINE)) {
    log.ecrire('bureau', 'server/data contient des données : pas copiées (seulement avec ELITE_COPIER_DONNEES_DEV=1), l’app démarre vide');
  }
  const donnees = preparerDonnees({ source, cible: dossierDonnees() });
  if (donnees.copie) log.ecrire('bureau', `données copiées depuis ${donnees.copie} vers ${donnees.dossier} (l'original reste en place)`);
  // Ports : ceux d'habitude, ou les premiers libres après eux (un autre programme tient 3001 ou 5173)
  const ports = await choisirPorts();
  for (const c of ports.changes) {
    const qui = quiTientLePort(c.habituel);
    log.ecrire('bureau', `port ${c.habituel} (${c.quoi}) déjà pris${qui?.nom ? ` par ${qui.nom}` : ''} : l'app prend le ${c.pris}`);
  }
  UI = `http://127.0.0.1:${ports.interface}`;
  const env = environnement(donnees.dossier, ports);
  // L'interface se prépare (et se compile si son code a changé) pendant la mise à jour de la base et le démarrage du
  // serveur, plutôt qu'après
  let compilation = false;
  const ui = lancerEnfant({
    node, script: path.join(__dirname, 'interface.mjs'), cwd: path.join(RACINE, 'client'), env, nom: 'interface', log,
    surMessage: (m) => {
      if (m?.type !== 'compilation') return;
      compilation = true;
      etape("Compilation de l'interface (son code a changé, une fois)…");
    },
    surSortie: () => !quitter && pret && echec(new Error("L'interface s'est arrêtée. Relance Enova.")),
  });
  enfants.interface = ui.enfant;
  ui.pret.catch(() => {}); // son échec est traité plus bas, une fois la base et le serveur prêts
  etape('Mise à jour de la base…');
  await executer({ node, script: path.join(RACINE, 'server', 'dbPush.mjs'), cwd: path.join(RACINE, 'server'), env, nom: 'base', log });
  etape('Démarrage du serveur…');
  await lancerServeur(node, env);
  etape(compilation ? "Compilation de l'interface (son code a changé, une fois)…" : "Préparation de l'interface…");
  await ui.pret;
  pret = true;
  log.ecrire('bureau', 'prêt');
  principale.loadURL(`${UI}/`);
  restaurerDetachees();
  creerBarre();
  if (etatAuLancement().pave.actif) creerPave();
}

/** Environnement des processus : celui du joueur, sans les réglages d'Electron ni ceux du banc de contrôle. */
function environnement(dossier, ports) {
  // Ni télémétrie de Prisma ni vérification de version de npm (comme Lancer EliteApp.cmd et server/dbPush.mjs)
  const env = { ...process.env, ELITE_DATA_DIR: dossier, CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', npm_config_update_notifier: 'false' };
  for (const k of Object.keys(env)) if (/^ELECTRON_/i.test(k)) delete env[k];
  // Ports de ce lancement, pour le serveur, l'interface (et son relais /api) et l'overlay (lancé par le serveur)
  env.ELITE_PORT = String(ports.serveur);
  env.ELITE_UI_PORT = String(ports.interface);
  // L'overlay reste lancé même sans fenêtre : ses raccourcis (Alt+Maj+K, la souris) marchent toujours
  env.ELITE_OVERLAY_TOUJOURS = '1';
  return env;
}

let relances = [];
async function lancerServeur(node, env) {
  const s = lancerEnfant({
    node, script: path.join(RACINE, 'server', 'src', 'index.js'), cwd: path.join(RACINE, 'server'), env, nom: 'serveur', log,
    // Alt+Maj+K pendant que tout est caché : l'overlay s'est réaffiché, l'app retire son ◆ et rouvre ce qu'il avait caché
    surMessage: (m) => {
      if (m?.type === 'overlay-demasque') return toutCache && basculerTout();
      // Ordres de l'IA de bord, par le serveur (/api/bureau) : comme le ◆ et le MAR
      if (m?.type === 'bureau-cacher') return m.cacher === true ? basculerTout(true) : toutCache && basculerTout();
      if (m?.type === 'bureau-ouvrir' && cheminNavigable(m.chemin)) return ouvrirPage(m.chemin);
      // « Effacer mes données » (Paramètres) : noté, puis l'app se relance et efface avant de rouvrir la base
      // « Restaurer une sauvegarde » (Paramètres) : notée, puis l'app se relance et restaure avant de rouvrir la base
      if (m?.type === 'bureau-restaurer') {
        if (!demanderRestauration(m.nom)) return null;
        log.ecrire('bureau', `restauration de la sauvegarde « ${m.nom} » demandée : relance`);
        app.relaunch();
        return toutQuitter();
      }
      if (m?.type === 'bureau-effacer') {
        demanderEffacement();
        log.ecrire('bureau', 'effacement des données demandé : relance');
        app.relaunch();
        return toutQuitter();
      }
      return null;
    },
    surSortie: () => {
      enfants.serveur = null;
      if (quitter || !pret || enEchec) return;
      // Plantage : relancé, au plus 3 fois en 5 minutes
      const now = Date.now();
      relances = relances.filter((t) => now - t < 5 * 60_000);
      if (relances.length >= 3) return echec(new Error("Le serveur s'est arrêté trois fois en cinq minutes. Regarde bureau.log, puis relance Enova."));
      relances.push(now);
      log.ecrire('bureau', 'serveur arrêté : relance');
      setTimeout(() => lancerServeur(node, env).catch(echec), 1000);
    },
  });
  enfants.serveur = s.enfant;
  await s.pret;
  // Serveur relancé pendant que tout est caché : il retrouve l'overlay masqué
  if (toutCache) appliquerCache(true);
}

let derniereEtape = 'Démarrage…';
function etape(texte) {
  derniereEtape = texte;
  if (principale && !principale.isDestroyed() && !pret) principale.webContents.send('bureau:etape', texte);
}

/**
 * Erreur qui arrête l'app. Une fenêtre de l'app est devant (page ouverte), ou l'app démarre sans le jeu lancé (Node.js
 * introuvable avant même que la fenêtre de chargement ne s'affiche) : la boîte d'erreur s'affiche (etat.js,
 * boiteErreur). Sinon (en plein vol, ou démarrage pendant que le jeu tourne) : jamais une boîte qui prendrait le clavier
 * et la souris du jeu ; une bulle de Windows le dit, l'icône de la zone de notification reste, et la boîte ne s'ouvre
 * qu'au clic sur la bulle ou l'icône, ou en relançant Enova.
 */
let enEchec = false;
let montrerErreur = null;
function echec(err) {
  const message = err?.message || String(err);
  log.ecrire('bureau', `erreur : ${message}`);
  if (quitter || enEchec) return;
  const texte = `${message}\n\nJournal : ${log.fichier}`;
  const devant = BrowserWindow.getAllWindows().some((w) => !w.isDestroyed() && w.isFocused());
  if (boiteErreur({ pret, devant, tray: !!tray && !tray.isDestroyed?.(), jeuLance })) {
    enEchec = true; // la fenêtre de chargement, pas encore affichée, ne s'ouvre plus derrière la boîte
    for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.hide();
    dialog.showErrorBox(NOM_AFFICHE, texte);
    toutQuitter();
    return;
  }
  enEchec = true;
  arreterEnfants();
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.hide();
  const montrer = () => {
    dialog.showErrorBox(NOM_AFFICHE, texte);
    toutQuitter();
  };
  montrerErreur = montrer;
  tray.removeAllListeners('click');
  tray.on('click', montrer);
  tray.once('balloon-click', montrer);
  tray.setToolTip(`${NOM_AFFICHE} : arrêté sur une erreur, clique pour voir`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Voir l’erreur', click: montrer },
    { label: 'Journal de l’app', click: () => shell.showItemInFolder(log.fichier) },
    { type: 'separator' },
    { label: 'Quitter', click: toutQuitter },
  ]));
  tray.displayBalloon?.({ iconType: 'error', title: `${NOM_AFFICHE} s'est arrêté`, content: `${message.slice(0, 160)} Clique ici pour voir.`, noSound: true });
}

// --- Sécurité des fenêtres ---

const pageLocale = (url) => typeof url === 'string' && url.startsWith(pathToFileURL(PAGES).href + '/');
const pageInterface = (url) => {
  try {
    return new URL(url).origin === UI;
  } catch {
    return false;
  }
};

function securiserSession() {
  const s = session.defaultSession;
  // Requêtes : l'interface seulement (mêmes gardes que l'overlay), les pages locales, et ce que Chromium fabrique lui-même
  s.webRequest.onBeforeRequest((details, callback) => {
    const u = details.url;
    const ok = allowedRequest(u) || pageLocale(u) || /^(data|blob|devtools|chrome-extension):/.test(u);
    if (!ok) log.ecrire('bureau', `requête bloquée : ${u.slice(0, 120)}`);
    callback({ cancel: !ok });
  });
  // Permissions : copier dans le presse-papiers depuis l'interface, rien d'autre (caméra, micro, position, notifications…)
  s.setPermissionRequestHandler((wc, permission, callback, details) => {
    callback(permission === 'clipboard-sanitized-write' && pageInterface(details?.requestingUrl || wc.getURL()));
  });
  s.setPermissionCheckHandler((wc, permission, origin) => permission === 'clipboard-sanitized-write' && origin === UI);
  gererTelechargements(s);
}

/**
 * Téléchargements. Dans l'app : seulement ce que l'interface fabrique elle-même au clic du joueur (blob: ou data: de
 * l'interface, comme l'image d'une carte d'EEP), avec la boîte « Enregistrer sous » de Windows. Depuis un site (Inara) :
 * jamais dans l'app, ni boîte qui s'ouvrirait par-dessus le jeu ; si le joueur est en train de s'en servir (page
 * affichée, fenêtre devant), le lien part dans son navigateur, qui gère le fichier comme d'habitude.
 */
function gererTelechargements(s, site = null) {
  s.on('will-download', (event, item) => {
    const url = String(item?.getURL?.() || '');
    if (!site && (url.startsWith(`blob:${UI}/`) || url.startsWith('data:'))) return;
    event.preventDefault();
    log.ecrire('bureau', `${site ?? 'app'} : téléchargement refusé (${url.slice(0, 120)})`);
    if (site) ouvrirDepuisSite(site, url);
  });
}

/** Lien vers un site : ouvert dans le navigateur du joueur, jamais dans l'app. */
function ouvrirDehors(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' || (u.protocol === 'http:' && !['127.0.0.1', 'localhost'].includes(u.hostname))) shell.openExternal(u.href);
  } catch {
    // adresse illisible : ignorée
  }
}

function proteger(win) {
  const wc = win.webContents;
  wc.setWindowOpenHandler(({ url }) => {
    ouvrirDehors(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (event) => {
    const cible = event.url;
    // Rechargement de l'interface ou passage de la page de chargement à l'interface : permis. Le reste : refusé.
    if (pageInterface(cible) && (pageInterface(wc.getURL()) || pageLocale(wc.getURL()))) return;
    event.preventDefault();
    ouvrirDehors(cible);
  });
  wc.on('will-frame-navigate', (event) => {
    // Aucun cadre (iframe) ne navigue, sauf vers la démonstration d'une fenêtre en jeu (page « Fenêtres en jeu »)
    if (!event.isMainFrame && !demoFrame(event.url)) event.preventDefault();
  });
  wc.on('will-attach-webview', (event) => event.preventDefault());
  // Page de l'app rechargée (ou interface relancée) : la page d'un site affichée par-dessus disparaît avec elle
  wc.on('did-start-navigation', (event, ...ancien) => {
    const principal = event?.isMainFrame ?? ancien[2];
    const memeDocument = event?.isSameDocument ?? ancien[1];
    if (principal && !memeDocument) cacherSitesDe(win);
  });
}

// --- Sites externes (page « Inara »…) : desktop/sites.js ---
// Chaque site est une vue (WebContentsView) posée sur la zone que lui réserve sa page dans l'interface, dans la fenêtre
// de cette page (principale ou détachée). Sa session est la sienne : rien de l'app n'y est visible.

const vuesSites = new Map(); // id -> { vue, fenetre, visible, fermeture }
const sessionsPretes = new Set();
const dernieresAdresses = new Map(); // id -> adresse de la page quand sa vue a été fermée (rouverte là)
/** Page d'un site cachée depuis 3 min (ou sa fenêtre fermée) : sa vue est fermée, plus rien ne tourne en fond. */
const FERMETURE_SITE_MS = 3 * 60_000;
/** Le navigateur du joueur, ouvert par la page d'un site : au plus une fois toutes les 5 s. */
const ouverturePermise = limiteur(5000);

function sessionSite(id) {
  const s = session.fromPartition(partitionSite(id));
  if (sessionsPretes.has(id)) return s;
  sessionsPretes.add(id);
  s.webRequest.onBeforeRequest((details, callback) => {
    const ok = requetePermise(details.url);
    if (!ok) log.ecrire('bureau', `${id} : requête bloquée vers ${details.url.slice(0, 120)}`);
    callback({ cancel: !ok });
  });
  s.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  s.setPermissionCheckHandler(() => false);
  gererTelechargements(s, id);
  return s;
}

/**
 * Lien ou fenêtre demandés par la page d'un site, vers le navigateur du joueur : seulement si la page est affichée et
 * que sa fenêtre est devant (le joueur vient de cliquer dedans), et pas plus d'une fois toutes les 5 s. Un script
 * tiers qui navigue seul ou ouvre des fenêtres en boucle, page cachée ou jeu devant, ne fait donc rien surgir.
 */
function ouvrirDepuisSite(id, url) {
  const e = vuesSites.get(id);
  const enService = Boolean(e?.visible && e.fenetre && !e.fenetre.isDestroyed() && e.fenetre.isVisible() && e.fenetre.isFocused());
  if (!versNavigateur(url)) return;
  if (!enService || !ouverturePermise()) {
    log.ecrire('bureau', `${id} : ouverture dans le navigateur ignorée (${enService ? 'trop rapprochée' : 'page cachée ou fenêtre derrière'})`);
    return;
  }
  shell.openExternal(url);
}

/** Ferme la vue d'un site (elle sera recréée, à la même adresse, quand sa page reviendra). */
function fermerSite(id) {
  const e = vuesSites.get(id);
  if (!e) return;
  clearTimeout(e.fermeture);
  vuesSites.delete(id);
  try {
    const u = e.vue.webContents.getURL();
    if (navigationPermise(siteDe(id), u)) dernieresAdresses.set(id, u);
    if (e.fenetre && !e.fenetre.isDestroyed()) e.fenetre.contentView.removeChildView(e.vue);
    if (!e.vue.webContents.isDestroyed()) e.vue.webContents.close();
  } catch {
    // déjà fermée
  }
  log.ecrire('bureau', `${id} : page fermée (plus affichée)`);
}

/** Envoie l'état de navigation du site à la page qui l'affiche (adresse, titre, chargement, retour possible…). */
function etatSite(id) {
  const e = vuesSites.get(id);
  if (!e || !e.fenetre || e.fenetre.isDestroyed()) return;
  const wc = e.vue.webContents;
  const h = wc.navigationHistory;
  e.fenetre.webContents.send('bureau:site:etat', {
    id, url: wc.getURL(), titre: wc.getTitle(), chargement: wc.isLoading(), retour: h.canGoBack(), avancer: h.canGoForward(),
  });
}

function vueSite(id) {
  if (vuesSites.has(id)) return vuesSites.get(id);
  const s = siteDe(id);
  const vue = new WebContentsView({
    webPreferences: { session: sessionSite(id), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false, webviewTag: false },
  });
  vue.setBackgroundColor(FOND);
  const wc = vue.webContents;
  // Nouvelle fenêtre demandée par le site : sur ses adresses, dans la vue ; ailleurs, dans le navigateur (au clic du
  // joueur seulement : ouvrirDepuisSite)
  wc.setWindowOpenHandler(({ url }) => {
    if (navigationPermise(s, url)) wc.loadURL(url);
    else ouvrirDepuisSite(id, url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (event) => {
    if (navigationPermise(s, event.url)) return;
    event.preventDefault();
    ouvrirDepuisSite(id, event.url);
  });
  wc.on('will-redirect', (event) => {
    if (event.isMainFrame && !navigationPermise(s, event.url)) {
      event.preventDefault();
      ouvrirDepuisSite(id, event.url);
    }
  });
  wc.on('will-attach-webview', (event) => event.preventDefault());
  for (const ev of ['did-start-loading', 'did-stop-loading', 'did-navigate', 'did-navigate-in-page', 'page-title-updated']) wc.on(ev, () => vuesSites.get(id)?.vue === vue && etatSite(id));
  outilsDev({ webContents: wc });
  const e = { vue, fenetre: null, visible: false, fermeture: null };
  vuesSites.set(id, e);
  const reprise = dernieresAdresses.get(id);
  dernieresAdresses.delete(id);
  wc.loadURL(reprise && navigationPermise(s, reprise) ? reprise : s.accueil);
  return e;
}

/** Ferme la vue dans 3 minutes si `encore()` est toujours vrai à ce moment-là (`avant` juste avant de la fermer). */
function planifierFermeture(id, e, encore, avant = null) {
  clearTimeout(e.fermeture);
  e.fermeture = setTimeout(() => {
    if (vuesSites.get(id) !== e || !encore()) return;
    avant?.();
    fermerSite(id);
  }, FERMETURE_SITE_MS);
  e.fermeture.unref?.();
}

// Fenêtre cachée (fermée dans la zone de notification, réduite, ◆) avec la page d'un site affichée : la vue se ferme au
// bout de 3 minutes, et revient d'elle-même (même adresse, même place) quand la fenêtre est réaffichée, la page de
// l'app, elle, n'ayant pas bougé.
const fenetresSuivies = new WeakSet();
const sitesEnSommeil = new Map(); // id -> { fenetre, rect }
function suivreFenetre(fenetre) {
  if (fenetresSuivies.has(fenetre)) return;
  fenetresSuivies.add(fenetre);
  const cachee = () => fenetre.isDestroyed() || !fenetre.isVisible() || fenetre.isMinimized();
  const endormir = () => {
    for (const [id, e] of vuesSites) {
      if (e.fenetre === fenetre && e.visible) planifierFermeture(id, e, cachee, () => sitesEnSommeil.set(id, { fenetre, rect: e.rect }));
    }
  };
  const reveiller = () => {
    for (const e of vuesSites.values()) {
      if (e.fenetre === fenetre && e.visible) {
        clearTimeout(e.fermeture);
        e.fermeture = null;
      }
    }
    for (const [id, s] of [...sitesEnSommeil]) {
      if (s.fenetre !== fenetre) continue;
      sitesEnSommeil.delete(id);
      if (!fenetre.isDestroyed() && s.rect) afficherSite(id, fenetre, s.rect);
    }
  };
  fenetre.on('hide', endormir);
  fenetre.on('minimize', endormir);
  fenetre.on('show', reveiller);
  fenetre.on('restore', reveiller);
  fenetre.once('closed', () => {
    for (const [id, s] of [...sitesEnSommeil]) if (s.fenetre === fenetre) sitesEnSommeil.delete(id);
  });
}

function afficherSite(id, fenetre, rect) {
  const e = vueSite(id);
  clearTimeout(e.fermeture);
  e.fermeture = null;
  sitesEnSommeil.delete(id);
  suivreFenetre(fenetre);
  e.rect = rect;
  if (e.fenetre !== fenetre) {
    if (e.fenetre && !e.fenetre.isDestroyed()) e.fenetre.contentView.removeChildView(e.vue);
    fenetre.contentView.addChildView(e.vue);
    e.fenetre = fenetre;
    // Fenêtre fermée : la page du site n'a plus où s'afficher, elle se ferme avec elle
    fenetre.once('closed', () => {
      if (vuesSites.get(id) === e && e.fenetre === fenetre) {
        e.fenetre = null;
        fermerSite(id);
      }
    });
  }
  e.vue.setBounds(rect);
  e.vue.setVisible(true);
  e.visible = true;
  etatSite(id);
}

function cacherSite(id, fenetre = null) {
  const s = sitesEnSommeil.get(id);
  if (s && (!fenetre || s.fenetre === fenetre)) sitesEnSommeil.delete(id); // la page de l'app l'a retiré : il ne revient pas
  const e = vuesSites.get(id);
  if (!e || (fenetre && e.fenetre !== fenetre)) return;
  e.vue.setVisible(false);
  e.visible = false;
  // Toujours cachée dans 3 minutes : fermée (scripts et traceurs du site arrêtés ; la connexion reste dans sa session)
  planifierFermeture(id, e, () => !e.visible);
}

function cacherSitesDe(fenetre) {
  for (const id of [...vuesSites.keys(), ...sitesEnSommeil.keys()]) cacherSite(id, fenetre);
}

function commandeSite(id, commande) {
  const e = vuesSites.get(id);
  if (!e) return;
  const wc = e.vue.webContents;
  const h = wc.navigationHistory;
  if (commande === 'retour' && h.canGoBack()) h.goBack();
  else if (commande === 'avancer' && h.canGoForward()) h.goForward();
  else if (commande === 'recharger') wc.reload();
  else if (commande === 'accueil') wc.loadURL(siteDe(id).accueil);
  else if (commande === 'navigateur' && versNavigateur(wc.getURL())) shell.openExternal(wc.getURL()); // bouton « ↗ Navigateur » de l'app
}

// --- Fenêtres ---

/**
 * État des fenêtres tel qu'au lancement, lu une seule fois : la fenêtre principale réenregistre l'état dès qu'elle se
 * place (sans pages détachées, pas encore rouvertes), et le relire ensuite les perdait toutes.
 */
let etatLu = null;
let etatRestaure = false;
function etatAuLancement() {
  etatLu ??= lireEtatFichier();
  return etatLu;
}

function lireEtatFichier() {
  try {
    return lireEtat(JSON.parse(fs.readFileSync(FICHIER_ETAT, 'utf8')));
  } catch {
    return lireEtat(null);
  }
}

let minuterieEtat = null;
function enregistrerEtat() {
  clearTimeout(minuterieEtat);
  minuterieEtat = setTimeout(enregistrerMaintenant, 500);
}
function enregistrerMaintenant() {
  clearTimeout(minuterieEtat);
  // Pas avant que les pages détachées soient rouvertes : on écraserait leur liste (démarrage coupé, erreur)
  if (!etatRestaure || !principale || principale.isDestroyed()) return;
  const etat = {
    principale: { place: principale.getNormalBounds(), agrandie: principale.isMaximized() },
    detachees: [...detachees.values()].filter((d) => !d.win.isDestroyed()).map((d) => ({ chemin: d.chemin, place: d.win.getBounds() })),
    mar: mar ?? etatAuLancement().mar,
    pave: etatPave(),
  };
  try {
    writeJsonAtomicSync(FICHIER_ETAT, etat);
  } catch (err) {
    log.ecrire('bureau', `état non enregistré : ${err.message}`);
  }
}

const zones = () => screen.getAllDisplays().map((d) => d.workArea);
/** Écrans du PC, numérotés de gauche à droite (desktop/etat.js). */
const ecrans = () => listerEcrans(screen.getAllDisplays(), screen.getPrimaryDisplay().id);
/** Zone de l'écran choisi pour le MAR (le principal s'il n'y en a pas, ou s'il est débranché). */
const zoneMar = () => zoneEcran(ecrans(), mar?.ecran ?? null) ?? screen.getPrimaryDisplay().workArea;

/**
 * F12 : outils de développement de la fenêtre (pour lire une erreur de page), seulement pour qui développe
 * (ELITE_OUTILS_DEV=1, ou npm run bureau -- --outils-dev ; etat.js). Chez un joueur, F12 ne fait rien : l'arnaque
 * « appuie sur F12 et colle ce code » (la console a le pont de l'app et son API locale) n'a pas de console où coller.
 * Ouverts, la console avertit de ne jamais y coller un code reçu.
 */
const AVERTISSEMENT_CONSOLE = "console.log('%cStop !', 'color:#e33;font-size:28px;font-weight:bold', '\\nNe colle jamais ici un code que quelqu’un t’a envoyé : il aurait accès à ton app (jeton d’escadron, webhook, effacement de tes données).')";
function outilsDev(win) {
  if (!OUTILS_DEV) return;
  win.webContents.on('devtools-opened', () => win.webContents.executeJavaScript(AVERTISSEMENT_CONSOLE).catch(() => {}));
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      event.preventDefault();
      win.webContents.toggleDevTools();
    }
  });
}

function creerPrincipale() {
  const etat = etatAuLancement().principale;
  const place = surUnEcran(etat.place, zones());
  // Première ouverture : 1360 × 860, mais jamais plus de 90 % de l'écran (portable 1366 × 768 : sous la barre des tâches)
  const zoneEcran = screen.getPrimaryDisplay().workAreaSize;
  const taille = tailleDefaut(zoneEcran);
  principale = new BrowserWindow({
    ...(place || taille),
    minWidth: Math.min(900, taille.width),
    minHeight: Math.min(560, taille.height),
    frame: false,
    // Fond translucide (acrylique de Windows 11) : on voit, flouté, ce qu'il y a derrière ; la page le teinte
    // (styles.css). Windows 10 : fond opaque (etat.js), sinon la fenêtre serait entièrement transparente
    ...FOND_FENETRE,
    icon: ICONE,
    title: NOM_AFFICHE,
    show: false,
    webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  proteger(principale);
  if (!place) principale.center();
  if (etat.agrandie) principale.maximize();
  // Arrêtée sur une erreur avant d'être prête (bulle, le jeu devant) : la page de chargement ne s'ouvre jamais
  principale.once('ready-to-show', () => !enEchec && principale.show());
  // Page de chargement : l'étape en cours, même envoyée avant qu'elle soit prête
  principale.webContents.on('did-finish-load', () => {
    if (!pret && pageLocale(principale.webContents.getURL())) principale.webContents.send('bureau:etape', derniereEtape);
  });
  outilsDev(principale);
  principale.loadURL(PAGE_LOCALE('chargement.html'));
  // Fermer la fenêtre principale : l'app reste dans la zone de notification
  principale.on('close', (event) => {
    if (quitter) return;
    event.preventDefault();
    principale.hide();
  });
  for (const ev of ['move', 'resize', 'maximize', 'unmaximize']) principale.on(ev, enregistrerEtat);
  // Réduite ou fermée : le MAR propose de la rouvrir sur la même page (bouton ↺)
  for (const ev of ['minimize', 'restore', 'hide', 'show']) principale.on(ev, envoyerEtatPrincipale);
  principale.on('maximize', () => principale.webContents.send('bureau:agrandie', true));
  principale.on('unmaximize', () => principale.webContents.send('bureau:agrandie', false));
  // Interface pas encore là (serveur relancé) : nouvel essai
  principale.webContents.on('did-fail-load', (_e, _code, _desc, url, isMainFrame) => {
    if (isMainFrame && pageInterface(url)) setTimeout(() => !principale.isDestroyed() && principale.loadURL(url), 2000);
  });
}

let numero = 0;
function detacher(chemin, place = null) {
  if (!cheminDetachable(chemin) || detachees.size >= MAX_DETACHEES) return false;
  const id = `detachee-${++numero}`;
  const p = surUnEcran(place, zones());
  const win = new BrowserWindow({
    ...(p || { width: 520, height: 640 }),
    minWidth: 260,
    minHeight: 160,
    frame: false,
    // Fond translucide (acrylique de Windows 11) sinon opaque, comme la fenêtre principale
    ...FOND_FENETRE,
    icon: ICONE,
    title: NOM_AFFICHE,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  win.setAlwaysOnTop(true, 'screen-saver'); // par-dessus le jeu en plein écran fenêtré, comme l'overlay
  proteger(win);
  outilsDev(win);
  detachees.set(id, { win, chemin });
  win.on('closed', () => {
    detachees.delete(id);
    enregistrerEtat();
  });
  for (const ev of ['move', 'resize']) win.on(ev, enregistrerEtat);
  win.loadURL(`${UI}${chemin}?fenetre=detachee`);
  win.webContents.on('did-fail-load', (_e, _code, _desc, url, isMainFrame) => {
    if (isMainFrame && pageInterface(url)) setTimeout(() => !win.isDestroyed() && win.loadURL(url), 2000);
  });
  enregistrerEtat();
  return true;
}

function restaurerDetachees() {
  for (const d of etatAuLancement().detachees) detacher(d.chemin, d.place);
  etatRestaure = true;
  enregistrerEtat();
}

/**
 * MAR (menu d'accès rapide), en haut à gauche de l'écran principal, au premier plan comme l'overlay (par-dessus le jeu en plein écran
 * fenêtré). Elle affiche la page /barre de l'interface ; sa taille suit son contenu (menu fermé : une ligne ; menu ouvert :
 * la place des sous-menus), toujours collée au coin haut gauche. Un clic ailleurs referme son menu.
 */
/** Place le MAR selon son réglage et la taille de ce qu'il montre. */
function placerMar() {
  if (!barre || barre.isDestroyed()) return;
  const p = placeBarre(zoneMar(), tailleMar, mar);
  barre.setBounds(p);
  // Si Windows garde la fenêtre plus grande que demandé, seule la partie dessinée prend les clics : le reste les
  // laisse au jeu (sinon une bande invisible à côté du logo, tout caché)
  try {
    const reel = barre.getBounds();
    barre.setShape([{ x: 0, y: 0, width: Math.min(reel.width, p.width), height: Math.min(reel.height, p.height) }]);
  } catch {
    // pas de découpe sur ce système : la fenêtre garde sa taille
  }
}

let ecransSuivis = false;
function creerBarre() {
  mar = etatAuLancement().mar;
  const p = placeBarre(zoneMar(), tailleMar, mar);
  // Écran branché, débranché ou changé de définition : le MAR se replace (sur le principal si le sien a disparu)
  if (!ecransSuivis) {
    ecransSuivis = true;
    for (const evenement of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(evenement, () => placerMar());
  }
  barre = new BrowserWindow({
    ...p,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    // Jamais la main : un clic dans le MAR laisse le clavier et la souris au jeu, et la barre des tâches cachée
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  barre.setAlwaysOnTop(true, 'screen-saver');
  proteger(barre);
  barre.once('ready-to-show', () => barre.showInactive());
  // Le coin dit à la page dans quel sens ouvrir les menus (vers la droite ou la gauche, vers le bas ou le haut)
  barre.webContents.on('did-finish-load', () => {
    barre?.webContents.send('bureau:mar:coin', mar.coin);
    envoyerEtatPrincipale();
  });
  barre.on('closed', () => {
    barre = null;
  });
  barre.webContents.on('did-fail-load', (_e, _code, _desc, url, isMainFrame) => {
    if (isMainFrame && pageInterface(url)) setTimeout(() => barre && !barre.isDestroyed() && barre.loadURL(url), 2000);
  });
  barre.loadURL(`${UI}/barre`);
}

/** Réglage du pavé tactile, avec sa place actuelle s'il est ouvert. */
function etatPave() {
  const r = reglPave ?? etatAuLancement().pave;
  return pave && !pave.isDestroyed() ? { ...r, place: pave.getBounds() } : r;
}

/**
 * Pavé tactile : une fenêtre à part, à poser où l'on veut (sur le petit écran tactile sous l'écran principal, à la
 * manière d'un Stream Deck), avec de gros boutons pour les menus ; un bouton ouvre ses sous-menus, « Retour » remonte,
 * une page s'ouvre dans la fenêtre principale. Comme le MAR, il ne prend jamais la main : toucher un bouton laisse le
 * clavier et la souris au jeu. On le déplace par sa barre du haut, on le redimensionne par ses bords ; sa place est
 * gardée. Le ◆ ne le cache pas : il garde son propre ◆ pour tout réafficher.
 */
function creerPave() {
  if (pave && !pave.isDestroyed()) return;
  reglPave = { ...(reglPave ?? etatAuLancement().pave), actif: true };
  const place = surUnEcran(reglPave.place, zones());
  pave = new BrowserWindow({
    ...(place || { width: 520, height: 420 }),
    minWidth: 240,
    minHeight: 200,
    frame: false,
    backgroundColor: '#07090c',
    icon: ICONE,
    title: `${NOM_AFFICHE} · pavé`,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    minimizable: false,
    maximizable: false,
    show: false,
    webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  pave.setAlwaysOnTop(true, 'screen-saver');
  proteger(pave);
  outilsDev(pave);
  if (!place) pave.center();
  pave.once('ready-to-show', () => pave?.showInactive());
  pave.webContents.on('did-finish-load', () => {
    pave?.webContents.send('bureau:cache', toutCache);
    envoyerEtatPrincipale();
  });
  for (const ev of ['move', 'resize']) pave.on(ev, enregistrerEtat);
  pave.on('closed', () => {
    pave = null;
  });
  pave.webContents.on('did-fail-load', (_e, _code, _desc, url, isMainFrame) => {
    if (isMainFrame && pageInterface(url)) setTimeout(() => pave && !pave.isDestroyed() && pave.loadURL(url), 2000);
  });
  pave.loadURL(`${UI}/pave`);
}

function fermerPave() {
  reglPave = { ...etatPave(), actif: false };
  if (pave && !pave.isDestroyed()) pave.destroy();
  pave = null;
}

/**
 * Garde le MAR et les pages détachées devant le jeu. Quand le jeu passe au premier plan (lancement, retour d'un autre
 * programme), Windows met sa fenêtre devant, même devant une fenêtre « toujours au premier plan » : elle garde son
 * étiquette mais passe derrière (constaté le 10 nov. 2026 : MAR invisible sur le jeu, réapparu dès sa remise devant).
 * Jeu lancé : toutes les 2 s, on la remet devant (HWND_TOPMOST, sans l'activer : le jeu garde le clavier et la souris).
 * Jeu fermé : seulement toutes les 10 s (une autre fenêtre plein écran peut aussi passer devant). Le jeu est cherché
 * dans la liste des programmes de Windows toutes les 15 s, sans fenêtre et hors du fil principal.
 */
const GARDE_DEVANT_JEU_MS = 2000;
const GARDE_DEVANT_SANS_JEU_MS = 10_000;
const JEU_MS = 15_000;
let jeuLance = false;
function garderDevant() {
  const liste = [barre, pave, principale, ...[...detachees.values()].map((d) => d.win)];
  for (const w of liste) {
    if (!w || w.isDestroyed() || !w.isVisible() || w.isFocused() || !w.isAlwaysOnTop()) continue;
    // Repasser par « pas devant » : Electron ignore une demande qui ne change pas l'état
    w.setAlwaysOnTop(false);
    w.setAlwaysOnTop(true, 'screen-saver');
  }
}
function tourGarderDevant() {
  if (!quitter) garderDevant();
  setTimeout(tourGarderDevant, jeuLance ? GARDE_DEVANT_JEU_MS : GARDE_DEVANT_SANS_JEU_MS).unref?.();
}
function chercherJeu() {
  const tasklist = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tasklist.exe');
  execFile(tasklist, ['/FI', 'IMAGENAME eq EliteDangerous64.exe', '/FO', 'CSV', '/NH'], { windowsHide: true, timeout: 10_000 }, (err, sortie) => {
    const avant = jeuLance;
    jeuLance = !err && jeuDansListe(sortie);
    if (jeuLance && !avant) garderDevant(); // jeu qui vient de se lancer : tout de suite devant
    setTimeout(chercherJeu, JEU_MS).unref?.();
  });
}
setTimeout(tourGarderDevant, GARDE_DEVANT_SANS_JEU_MS).unref?.();
app.whenReady().then(chercherJeu).catch(() => {});

/**
 * Fenêtre principale montrée depuis le MAR (◆ ou une page) : devant le jeu, sans lui prendre la main (le jeu garde
 * clavier et souris, la barre des tâches reste cachée) ; un clic dedans la lui donne. Ouverte autrement (zone de
 * notification, raccourci), elle redevient une fenêtre ordinaire.
 */
function montrerPrincipaleSurLeJeu() {
  if (principale.isMinimized()) principale.restore();
  principale.setAlwaysOnTop(true, 'screen-saver');
  principale.showInactive();
}

/**
 * État de la fenêtre principale pour le MAR et le pavé : cachée (réduite ou fermée dans la zone de notification) et
 * sa page (chemin de l'interface), pour le bouton ↺ qui la rouvre là où elle était.
 */
function envoyerEtatPrincipale() {
  if (!principale || principale.isDestroyed()) return;
  const cachee = pret && (principale.isMinimized() || !principale.isVisible());
  let chemin = null;
  try {
    const u = new URL(principale.webContents.getURL());
    if (u.origin === UI) chemin = `${u.pathname}${u.search}`;
  } catch {
    // page de chargement : pas de chemin
  }
  const etat = { cachee: Boolean(cachee && chemin), chemin };
  barre?.webContents.send('bureau:principale', etat);
  pave?.webContents.send('bureau:principale', etat);
}

/** Ouvre une page dans la fenêtre principale (depuis le MAR) : la montre devant le jeu, y navigue. */
function ouvrirPage(chemin) {
  if (!principale || principale.isDestroyed()) return;
  montrerPrincipaleSurLeJeu();
  memoireBascule = [];
  appliquerCache(false);
  if (pageInterface(principale.webContents.getURL())) principale.webContents.send('bureau:naviguer', chemin);
  else if (pret) principale.loadURL(`${UI}${chemin}`);
}

function creerTray() {
  tray = new Tray(ICONE);
  tray.setToolTip(NOM_AFFICHE);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Afficher Enova', click: montrerTout },
    { label: 'Tout cacher', click: () => basculerTout(true) },
    { type: 'separator' },
    { label: 'Journal de l’app', click: () => shell.showItemInFolder(log.fichier) },
    { type: 'separator' },
    { label: 'Quitter', click: toutQuitter },
  ]));
  tray.on('click', montrerTout);
}

/** Fenêtres de l'app pour la bascule : la principale et les détachées (jamais la barre ni l'overlay des HUD). */
function fenetres() {
  const liste = [];
  if (principale && !principale.isDestroyed()) liste.push({ id: 'principale', win: principale });
  for (const [id, d] of detachees) if (!d.win.isDestroyed()) liste.push({ id, win: d.win });
  return liste;
}

/** État « tout caché » : le MAR ne garde que son ◆, les fenêtres en jeu (overlay, par le serveur) suivent. */
function appliquerCache(on) {
  toutCache = on;
  barre?.webContents.send('bureau:cache', on);
  pave?.webContents.send('bureau:cache', on);
  try {
    enfants.serveur?.send({ type: 'overlay-masque', masque: on });
  } catch {
    // serveur en train de redémarrer : l'overlay restera tel quel
  }
}

function basculerTout(forcerCacher = false) {
  if (forcerCacher && toutCache) return;
  const liste = fenetres();
  const visibles = liste.map((f) => ({ id: f.id, visible: f.win.isVisible() && !f.win.isMinimized() }));
  const r = basculer(visibles, memoireBascule, toutCache);
  memoireBascule = r.memoire;
  for (const f of liste) {
    if (r.cacher.includes(f.id)) f.win.hide();
    if (r.montrer.includes(f.id)) {
      if (f.id === 'principale') montrerPrincipaleSurLeJeu();
      else {
        if (f.win.isMinimized()) f.win.restore();
        f.win.showInactive(); // jamais la main : le jeu la garde
      }
    }
  }
  appliquerCache(r.cache);
}

function montrerTout() {
  memoireBascule = [];
  principale?.setAlwaysOnTop(false); // ouverte comme une fenêtre ordinaire (zone de notification, raccourci)
  for (const f of fenetres()) {
    if (f.win.isMinimized()) f.win.restore();
    f.win.show();
  }
  principale?.focus();
  appliquerCache(false);
}

/**
 * Demande l'arrêt du serveur et de l'interface ; rend la promesse de leur arrêt (4,5 s au plus). `quitter` : l'app
 * s'en va pour de bon, le serveur ferme aussi les fenêtres en jeu (sinon elles attendraient 5 min son retour, sans
 * rien d'affiché : le désinstalleur et l'installateur voyaient alors l'app « ouverte »).
 */
function arreterEnfants(quitter = false) {
  for (const [nom, e] of Object.entries(enfants)) {
    if (!e || e.exitCode !== null) continue;
    try {
      e.send({ type: 'arret', quitter });
    } catch {
      // canal déjà fermé
    }
    // Pas arrêté au bout de 4 s : coupé (le serveur referme sa base avant de sortir, d'ordinaire en moins d'une seconde)
    setTimeout(() => e.exitCode === null && e.kill(), 4000).unref();
    log.ecrire('bureau', `arrêt demandé : ${nom}`);
  }
  const attendre = Object.values(enfants).filter((e) => e && e.exitCode === null).map((e) => new Promise((r) => e.once('exit', r)));
  return Promise.race([Promise.all(attendre), new Promise((r) => setTimeout(r, 4500))]);
}

function toutQuitter() {
  if (quitter) return;
  quitter = true;
  enregistrerMaintenant();
  // Journal écrit jusqu'au bout (il s'écrit en arrière-plan), puis sortie
  arreterEnfants(true).then(() => Promise.race([log.attendre(), new Promise((r) => setTimeout(r, 1000))])).then(() => {
    tray?.destroy();
    app.exit(0);
  });
}

app.on('window-all-closed', () => {
  // Rien : l'app vit dans la zone de notification jusqu'à « Quitter »
});
app.on('before-quit', (event) => {
  if (quitter) return;
  event.preventDefault();
  toutQuitter();
});

// --- Pont avec les pages (preload.js) ---

/** Message venu du cadre principal d'une page de l'app (interface ou page locale), jamais d'un cadre inclus. */
function deConfiance(event, { locale = false, interfaceSeule = false } = {}) {
  const frame = event.senderFrame;
  const wc = event.sender;
  if (!frame || frame !== wc.mainFrame || !samePage(frame.url, wc.getURL())) return false;
  if (interfaceSeule) return pageInterface(frame.url);
  return pageInterface(frame.url) || (locale && pageLocale(frame.url));
}

ipcMain.on('bureau:fenetre', (event, action) => {
  if (!deConfiance(event, { locale: true })) return;
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win === barre) return;
  if (win === pave && action !== 'fermer') return; // le pavé : seulement « fermer » (qui le coupe, comme le réglage)
  if (win === pave) {
    fermerPave();
    enregistrerEtat();
    principale?.webContents.send('bureau:pave:etat', false);
    return;
  }
  if (action === 'reduire') win.minimize();
  else if (action === 'agrandir') (win.isMaximized() ? win.unmaximize() : win.maximize());
  else if (action === 'fermer') win.close();
  else if (action === 'premierPlan' && win !== principale) {
    const sur = !win.isAlwaysOnTop();
    win.setAlwaysOnTop(sur, 'screen-saver');
    event.sender.send('bureau:premierPlan', sur);
  }
});
ipcMain.handle('bureau:etat', (event) => {
  if (!deConfiance(event, { locale: true })) return null;
  const win = BrowserWindow.fromWebContents(event.sender);
  return { agrandie: Boolean(win?.isMaximized()), premierPlan: Boolean(win?.isAlwaysOnTop()), detachee: win !== principale };
});
// Version de l'app et empreinte de son paquet (Paramètres → Mon compte) : vérifiée une fois, en arrière-plan, à la
// première demande (version.js)
let versionApp = null;
ipcMain.handle('bureau:version', (event) => {
  if (!deConfiance(event, { interfaceSeule: true })) return null;
  versionApp ??= verifierPaquet(RACINE).catch(() => ({ version: null }));
  return versionApp;
});
ipcMain.handle('bureau:detacher', (event, chemin) => {
  if (!deConfiance(event, { interfaceSeule: true })) return false;
  return detacher(String(chemin ?? ''));
});
// Le MAR ou le pavé tactile : les deux menus de l'app (ouvrir une page, tout cacher, menu du lanceur)
const deLaBarre = (event) => (event.sender === barre?.webContents || event.sender === pave?.webContents) && deConfiance(event, { interfaceSeule: true });
ipcMain.on('bureau:basculer', (event) => {
  if (deLaBarre(event)) basculerTout();
});
// ↺ du MAR : la fenêtre principale réduite ou fermée revient, sur sa page, devant le jeu
ipcMain.on('bureau:principale:reafficher', (event) => {
  if (!deLaBarre(event) || !principale || principale.isDestroyed()) return;
  montrerPrincipaleSurLeJeu();
  memoireBascule = [];
  appliquerCache(false);
});
ipcMain.on('bureau:naviguer', (event, chemin) => {
  const c = cheminNavigable(chemin);
  if (c && deLaBarre(event)) ouvrirPage(c);
});
ipcMain.on('bureau:barre:taille', (event, width, height) => {
  if (!deLaBarre(event) || !barre || event.sender !== barre.webContents) return;
  tailleMar = { width: Number(width), height: Number(height) };
  placerMar();
});
// Réglage du MAR (Paramètres de la fenêtre principale) : lu, puis appliqué tout de suite et enregistré
ipcMain.handle('bureau:mar:lire', (event) => (deConfiance(event, { interfaceSeule: true }) ? (mar ?? etatAuLancement().mar) : null));
// Écrans du PC (numéro, taille, principal ou non), pour choisir celui du MAR et y envoyer la fenêtre principale
ipcMain.handle('bureau:ecrans:lire', (event) => (deConfiance(event, { interfaceSeule: true })
  ? ecrans().map(({ numero, principal, taille }) => ({ numero, principal, taille }))
  : null));
// Fenêtre principale envoyée sur un écran : centrée, à sa taille (jamais plus grande que lui), plus agrandie
ipcMain.on('bureau:principale:ecran', (event, numero) => {
  if (!deConfiance(event, { interfaceSeule: true }) || event.sender === barre?.webContents) return;
  const zone = zoneEcran(ecrans(), Number.isInteger(numero) ? numero : null);
  if (!zone || !principale || principale.isDestroyed()) return;
  if (principale.isMaximized()) principale.unmaximize();
  principale.setBounds(centrerSur(zone, principale.getBounds()));
  principale.show();
  enregistrerEtat();
});
ipcMain.on('bureau:mar:regler', (event, r) => {
  if (!deConfiance(event, { interfaceSeule: true }) || event.sender === barre?.webContents) return;
  mar = reglageMar(r);
  placerMar();
  barre?.webContents.send('bureau:mar:coin', mar.coin);
  enregistrerEtat();
});
ipcMain.on('bureau:menuLanceur', (event) => {
  if (!deLaBarre(event)) return;
  Menu.buildFromTemplate([
    { label: 'Afficher tout', click: montrerTout },
    { label: 'Tout cacher', click: () => basculerTout(true) },
    { type: 'separator' },
    { label: 'Quitter Enova', click: toutQuitter },
  ]).popup({ window: BrowserWindow.fromWebContents(event.sender) || barre });
});
// Pavé tactile (Paramètres) : activé, il s'ouvre tout de suite ; coupé, il se ferme ; gardé au lancement suivant
ipcMain.handle('bureau:pave:lire', (event) => (deConfiance(event, { interfaceSeule: true }) ? { actif: Boolean(pave && !pave.isDestroyed()), favoris: etatPave().favoris } : null));
// Favoris du pavé (sa première page), composés sur le pavé lui-même : relus sans confiance (etat.js), gardés
ipcMain.on('bureau:pave:favoris', (event, favoris) => {
  if (!pave || event.sender !== pave.webContents || !deConfiance(event, { interfaceSeule: true })) return;
  reglPave = { ...etatPave(), favoris: reglagePave({ favoris }).favoris };
  enregistrerEtat();
  pave.webContents.send('bureau:pave:favoris', reglPave.favoris);
});
ipcMain.on('bureau:pave:regler', (event, actif) => {
  if (!deConfiance(event, { interfaceSeule: true }) || event.sender === barre?.webContents || event.sender === pave?.webContents) return;
  if (actif === true) creerPave();
  else fermerPave();
  enregistrerEtat();
});

// Sites externes : l'interface réserve une zone et n'envoie que l'identifiant du site (registre desktop/sites.js)
const COMMANDES_SITE = new Set(['retour', 'avancer', 'recharger', 'accueil', 'navigateur']);
function fenetreDeLInterface(event) {
  if (!deConfiance(event, { interfaceSeule: true })) return null;
  const win = BrowserWindow.fromWebContents(event.sender);
  return win && win !== barre && !win.isDestroyed() ? win : null;
}
ipcMain.on('bureau:site:afficher', (event, id, rect) => {
  const win = fenetreDeLInterface(event);
  if (!win || !siteDe(id)) return;
  const [width, height] = win.getContentSize();
  const r = zoneSite(rect, { width, height });
  if (r) afficherSite(id, win, r);
});
ipcMain.on('bureau:site:cacher', (event, id) => {
  const win = fenetreDeLInterface(event);
  if (win && siteDe(id)) cacherSite(id, win);
});
ipcMain.on('bureau:site:commande', (event, id, commande) => {
  if (fenetreDeLInterface(event) && siteDe(id) && COMMANDES_SITE.has(commande)) commandeSite(id, commande);
});

// --- Rapport de la semaine en GIF pour Discord (desktop/gif.js, partage.js) ---
// La page de capture (/capture/rapport-semaine) est ouverte hors écran, jamais montrée : ni la fenêtre ni le curseur du
// joueur ne bougent. Ses animations sont figées à chaque instant de la boucle, capturées, puis assemblées en GIF.

let gifRapport = null; // dernier GIF fabriqué : { fichier, icone } (le glisser-déposer n'accepte que lui)
let gifEnCours = false;

/** La page de capture prête (ou en erreur), sous 20 s. */
async function attendreCapture(wc) {
  const fin = Date.now() + 20_000;
  while (Date.now() < fin) {
    const r = await wc.executeJavaScript('window.__eliteCapture ? (window.__eliteCapture.erreur ? { erreur: String(window.__eliteCapture.erreur) } : window.__eliteCapture.zone()) : null');
    if (r) return r;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Le rapport n’a pas fini de s’afficher.');
}

async function fabriquerGifRapport(demande) {
  const win = new BrowserWindow({
    show: false,
    width: 1000,
    height: HAUTEUR_MAX_GIF,
    useContentSize: true,
    backgroundColor: '#07060b',
    webPreferences: { offscreen: true, contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  proteger(win);
  try {
    const wc = win.webContents;
    wc.setAudioMuted(true);
    wc.setFrameRate(60);
    await win.loadURL(adresseCapture(UI, demande));
    const zone = await attendreCapture(wc);
    if (zone.erreur) throw new Error(zone.erreur);
    const rect = { x: Math.max(0, zone.x), y: Math.max(0, zone.y), width: Math.min(1000, zone.width), height: Math.min(HAUTEUR_MAX_GIF, zone.height) };
    if (!(rect.width > 0 && rect.height > 0)) throw new Error('Rapport vide.');
    const images = [];
    for (let i = 0; i < IMAGES_GIF; i++) {
      await wc.executeJavaScript(`window.__eliteCapture.instant(${((i * DUREE_GIF) / IMAGES_GIF).toFixed(4)})`);
      wc.invalidate();
      images.push(await wc.capturePage(rect));
    }
    const { width, height } = images[0].getSize();
    const bitmaps = images.map((im) => {
      const s = im.getSize();
      if (s.width !== width || s.height !== height) throw new Error('Captures de tailles différentes.');
      return im.toBitmap();
    });
    // Encodé dans un fil à part (gifFond.js) : les fenêtres de l'app ne se figent pas pendant ce temps
    const gif = await encoderGifEnFond({ largeur: width, hauteur: height, images: bitmaps, delai: DELAI_GIF, ordre: 'bgra' });
    const fichier = fichierGif(dossierDonnees());
    await fs.promises.mkdir(path.dirname(fichier), { recursive: true });
    await fs.promises.writeFile(fichier, gif);
    return { fichier, icone: images[0].resize({ width: 200 }), octets: gif.length, largeur: width, hauteur: height };
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

/** Le fichier dans le presse-papiers (comme un copier dans l'Explorateur) : Ctrl+V dans Discord l'envoie, animé. */
function copierFichier(fichier) {
  return new Promise((resolve) => {
    // PowerShell par son chemin complet, le chemin du fichier par l'environnement (partage.js)
    const c = commandePressePapiers(fichier);
    execFile(c.programme, c.args, { env: c.env, windowsHide: true, timeout: 15_000 }, (err) => {
      if (err) log.ecrire('bureau', `presse-papiers : ${err.message}`);
      resolve(!err);
    });
  });
}

ipcMain.handle('bureau:rapport:gif', async (event, d) => {
  if (!deConfiance(event, { interfaceSeule: true }) || event.sender === barre?.webContents || event.sender === pave?.webContents) return { erreur: 'Refusé.' };
  const demande = demandeRapport(d);
  if (!demande) return { erreur: 'Demande illisible.' };
  if (gifEnCours) return { erreur: 'Un GIF est déjà en préparation.' };
  gifEnCours = true;
  const debut = Date.now();
  try {
    const r = await fabriquerGifRapport(demande);
    gifRapport = { fichier: r.fichier, icone: r.icone };
    const copie = await copierFichier(r.fichier);
    log.ecrire('bureau', `rapport en GIF : ${r.largeur} × ${r.hauteur}, ${Math.round(r.octets / 1024)} Ko, ${Date.now() - debut} ms${copie ? ', copié' : ''}`);
    return { ok: true, copie, octets: r.octets, largeur: r.largeur, hauteur: r.hauteur };
  } catch (err) {
    log.ecrire('bureau', `rapport en GIF : ${err.message}`);
    return { erreur: `GIF impossible : ${err.message}` };
  } finally {
    gifEnCours = false;
  }
});
ipcMain.on('bureau:rapport:glisser', (event) => {
  if (!deConfiance(event, { interfaceSeule: true }) || !gifRapport || !fs.existsSync(gifRapport.fichier)) return;
  event.sender.startDrag({ file: gifRapport.fichier, icon: gifRapport.icone });
});
