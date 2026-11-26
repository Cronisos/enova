// Logique des fenêtres de l'app de bureau, sans Electron (testée par etat.test.js) : bascule « tout cacher / tout
// réafficher » de l'icône du lanceur, pages qu'on peut détacher, état enregistré (places des fenêtres).

const MAX_DETACHEES = 12;

/**
 * Chemin d'une page de l'interface qu'on peut détacher dans sa propre fenêtre : « /minage », « /regles/vigie »… Jamais
 * une adresse complète, jamais une page de l'overlay (/hud/…), jamais « //autre-site ». Rend le chemin, ou null.
 */
function cheminDetachable(chemin) {
  if (typeof chemin !== 'string' || chemin.length > 200) return null;
  if (!/^\/[A-Za-z0-9/_\-.~%]*$/.test(chemin) || chemin.startsWith('//') || /(^|\/)\.\.?(\/|$)/.test(chemin)) return null;
  if (chemin === '/hud' || chemin.startsWith('/hud/')) return null;
  return chemin;
}

/**
 * Page que le MAR peut ouvrir dans la fenêtre principale : un chemin détachable, avec au plus un onglet
 * (« /extension?onglet=vente »). Rend le chemin, ou null.
 */
function cheminNavigable(chemin) {
  if (typeof chemin !== 'string') return null;
  const m = /^([^?#]*)(\?onglet=[a-z-]{1,40})?$/.exec(chemin);
  return m && cheminDetachable(m[1]) ? chemin : null;
}

/** Coins où le MAR peut se placer (réglage du joueur, Paramètres) ; haut gauche par défaut. */
const COINS_MAR = ['haut-gauche', 'haut-droite', 'bas-gauche', 'bas-droite'];
const MAR_DEFAUT = Object.freeze({ coin: 'haut-gauche', decalage: 0, decalageY: 0, ecran: null });
/** Écrans comptés au plus (numéro de 1 à MAX_ECRANS, de gauche à droite). */
const MAX_ECRANS = 8;

/**
 * Réglage du MAR relu sans confiance : coin connu, décalage entier de 0 à 3000 px le long du bord horizontal
 * (decalage) et de 0 à 2000 px vers l'intérieur de l'écran, depuis le haut ou le bas (decalageY), et écran : son
 * numéro de 1 à MAX_ECRANS (de gauche à droite), ou null pour l'écran principal de Windows.
 */
function reglageMar(r) {
  const o = r && typeof r === 'object' ? r : {};
  const coin = COINS_MAR.includes(o.coin) ? o.coin : MAR_DEFAUT.coin;
  const d = Number(o.decalage);
  const ecran = Number.isInteger(o.ecran) && o.ecran >= 1 && o.ecran <= MAX_ECRANS ? o.ecran : null;
  const dy = Number(o.decalageY);
  return {
    coin,
    decalage: Number.isFinite(d) ? Math.round(Math.min(3000, Math.max(0, d))) : 0,
    decalageY: Number.isFinite(dy) ? Math.round(Math.min(2000, Math.max(0, dy))) : 0,
    ecran,
  };
}

/**
 * Écrans du PC, numérotés de gauche à droite (puis de haut en bas) : [{ numero, zone, principal, taille }]. `ecrans` :
 * ce que rend Electron (screen.getAllDisplays()), `principalId` : l'identifiant de l'écran principal de Windows. Un
 * écran sans zone lisible est écarté ; MAX_ECRANS au plus.
 */
function listerEcrans(ecrans, principalId) {
  const lisible = (z) => z && [z.x, z.y, z.width, z.height].every(Number.isFinite) && z.width > 0 && z.height > 0;
  return (Array.isArray(ecrans) ? ecrans : [])
    .filter((e) => e && lisible(e.workArea))
    .sort((a, b) => a.workArea.x - b.workArea.x || a.workArea.y - b.workArea.y)
    .slice(0, MAX_ECRANS)
    .map((e, k) => ({
      numero: k + 1,
      zone: { x: e.workArea.x, y: e.workArea.y, width: e.workArea.width, height: e.workArea.height },
      principal: e.id === principalId,
      taille: `${e.size?.width ?? e.workArea.width} × ${e.size?.height ?? e.workArea.height}`,
    }));
}

/**
 * Zone de l'écran choisi (numéro de listerEcrans) ; écran débranché, numéro inconnu ou null : l'écran principal, et
 * à défaut le premier. Null seulement s'il n'y a aucun écran.
 */
function zoneEcran(liste, numero) {
  const choisi = liste.find((e) => e.numero === numero) ?? liste.find((e) => e.principal) ?? liste[0];
  return choisi ? choisi.zone : null;
}

/** Une fenêtre de cette taille, centrée sur cette zone et jamais plus grande qu'elle (pour l'envoyer sur un écran). */
function centrerSur(zone, { width, height }) {
  const w = Math.round(Math.min(Math.max(320, Number(width) || 0), zone.width));
  const h = Math.round(Math.min(Math.max(240, Number(height) || 0), zone.height));
  return { x: Math.round(zone.x + (zone.width - w) / 2), y: Math.round(zone.y + (zone.height - h) / 2), width: w, height: h };
}

/**
 * Place du MAR (menu d'accès rapide) : collé à un coin de l'écran (8 px du bord), décalé le long du bord horizontal
 * (decalage) et éloigné du haut ou du bas (decalageY), taille bornée et entière. En bas, il grandit vers le haut ; à droite, vers la gauche : le coin choisi ne bouge pas.
 */
function placeBarre(zone, { width, height }, mar = MAR_DEFAUT) {
  const borne = (v, min, max) => Math.round(Math.min(max, Math.max(min, Number.isFinite(v) ? v : min)));
  const { coin, decalage, decalageY } = reglageMar(mar);
  // Largeur minimale basse : tout caché, le MAR se réduit à son logo (38 px). Une fenêtre plus large que lui laissait
  // à sa droite une bande invisible qui prenait les clics du jeu (24 nov. 2026, minimum de 120 px).
  const w = borne(width, 30, Math.min(1400, zone.width - 16));
  const h = borne(height, 30, Math.min(900, zone.height - 16));
  const d = Math.min(decalage, Math.max(0, zone.width - 16 - w)); // jamais hors de l'écran
  const x = coin.endsWith('droite') ? zone.x + zone.width - w - 8 - d : zone.x + 8 + d;
  const dy = Math.min(decalageY, Math.max(0, zone.height - 16 - h)); // jamais hors de l'écran
  const y = coin.startsWith('bas') ? zone.y + zone.height - h - 8 - dy : zone.y + 8 + dy;
  return { x, y, width: w, height: h };
}

/**
 * Clic sur le ◆ du MAR. `fenetres` : [{ id, visible }] (principale et détachées), `memoire` : ids cachés au clic
 * précédent, `cache` : l'app est-elle déjà toute cachée. Pas cachée : on cache les fenêtres visibles (et le reste de
 * l'app : fenêtres en jeu, rubriques du MAR), on les retient, `cache` passe à vrai, même si aucune fenêtre n'était
 * visible. Cachée : on réaffiche celles qu'on avait cachées, la principale si rien n'est retenu.
 */
function basculer(fenetres, memoire = [], cache = false) {
  const existe = new Set(fenetres.map((f) => f.id));
  if (!cache) {
    const visibles = fenetres.filter((f) => f.visible).map((f) => f.id);
    return { cacher: visibles, montrer: [], memoire: visibles, cache: true };
  }
  const montrer = memoire.filter((id) => existe.has(id));
  return { cacher: [], montrer: montrer.length ? montrer : ['principale'], memoire: [], cache: false };
}

const entier = (v) => (Number.isFinite(v) ? Math.round(v) : null);

/** Rectangle lisible (x, y, largeur, hauteur entiers, taille minimale), ou null. */
function rectangle(r, { min = { width: 200, height: 120 } } = {}) {
  if (!r || typeof r !== 'object') return null;
  const [x, y, width, height] = [entier(r.x), entier(r.y), entier(r.width), entier(r.height)];
  if ([x, y, width, height].some((v) => v === null)) return null;
  if (width < min.width || height < min.height || width > 10000 || height > 10000) return null;
  return { x, y, width, height };
}

/** Rectangle visible sur un des écrans (au moins 120 × 40 px dedans), sinon null : on le replace par défaut. */
function surUnEcran(r, zones) {
  if (!r) return null;
  const ok = (zones || []).some((z) => {
    const w = Math.min(r.x + r.width, z.x + z.width) - Math.max(r.x, z.x);
    const h = Math.min(r.y + r.height, z.y + z.height) - Math.max(r.y, z.y);
    return w >= 120 && h >= 40;
  });
  return ok ? r : null;
}

/**
 * Pavé tactile (Paramètres) : fenêtre de menus à gros boutons, à poser sur un petit écran tactile (sous l'écran
 * principal, à la manière d'un Stream Deck). Réglage relu sans confiance : actif seulement s'il vaut vrai, place
 * lisible (au moins 240 × 200) ou null (place par défaut), favoris : la première page du pavé, composée par le joueur
 * (au plus MAX_FAVORIS, sans doublon) : une page de l'app (« /combat ») ou un mode de jeu (« mode:rescue »).
 */
const MAX_FAVORIS = 8;
const favoriValide = (f) => typeof f === 'string' && (cheminNavigable(f) !== null || /^mode:[a-z0-9-]{1,30}$/.test(f));
function reglagePave(r) {
  const o = r && typeof r === 'object' ? r : {};
  const favoris = [...new Set((Array.isArray(o.favoris) ? o.favoris : []).filter(favoriValide))].slice(0, MAX_FAVORIS);
  return { actif: o.actif === true, place: rectangle(o.place, { min: { width: 240, height: 200 } }), favoris };
}

/** État enregistré (bureau.json), relu sans faire confiance au fichier : ce qui est mal formé est ignoré. */
function lireEtat(brut) {
  const e = brut && typeof brut === 'object' ? brut : {};
  const p = e.principale && typeof e.principale === 'object' ? e.principale : {};
  const detachees = (Array.isArray(e.detachees) ? e.detachees : [])
    .map((d) => d && typeof d === 'object' && cheminDetachable(d.chemin) && { chemin: d.chemin, place: rectangle(d.place) })
    .filter(Boolean)
    .slice(0, MAX_DETACHEES);
  return { principale: { place: rectangle(p.place, { min: { width: 640, height: 400 } }), agrandie: p.agrandie === true }, detachees, mar: reglageMar(e.mar), pave: reglagePave(e.pave) };
}

/**
 * Taille de la fenêtre principale à sa première ouverture : 1360 × 860, mais jamais plus de 90 % de la zone utile de
 * l'écran (portable 1366 × 768, 1080p à 150 %) : sans cadre, elle passerait sous la barre des tâches.
 */
function tailleDefaut(zone, voulue = { width: 1360, height: 860 }, min = { width: 900, height: 560 }) {
  const w = Number(zone?.width);
  const h = Number(zone?.height);
  if (!(w > 0 && h > 0)) return { ...voulue };
  return {
    width: Math.max(Math.min(min.width, w), Math.min(voulue.width, Math.floor(w * 0.9))),
    height: Math.max(Math.min(min.height, h), Math.min(voulue.height, Math.floor(h * 0.9))),
  };
}

/**
 * Fond des fenêtres : acrylique translucide sous Windows 11 (build 22621 ou plus, où Electron sait le poser), sinon un
 * fond opaque, sans quoi la fenêtre serait entièrement transparente (Windows 10).
 */
function fondFenetre(release, opaque, platform = process.platform) {
  const build = Number(String(release || '').split('.')[2]);
  if (platform === 'win32' && Number.isFinite(build) && build >= 22621) return { backgroundColor: '#00000000', backgroundMaterial: 'acrylic' };
  return { backgroundColor: opaque };
}

/** Elite Dangerous tourne-t-il ? D'après « tasklist /FI "IMAGENAME eq EliteDangerous64.exe" /FO CSV /NH ». */
function jeuDansListe(sortie) {
  return /^"EliteDangerous64\.exe","\d+"/im.test(String(sortie || ''));
}

/**
 * Outils de développement (F12) : seulement pour qui développe, avec ELITE_OUTILS_DEV=1 ou --outils-dev (npm run
 * bureau). Coupés chez les joueurs : l'arnaque « appuie sur F12 et colle ce code » n'a pas de console où coller.
 */
function outilsDevPermis(env = process.env, argv = process.argv) {
  return String(env.ELITE_OUTILS_DEV ?? '').trim() === '1' || (Array.isArray(argv) && argv.includes('--outils-dev'));
}

/**
 * Erreur qui arrête l'app : boîte d'erreur tout de suite, ou bulle de Windows (la boîte s'ouvre au clic) ?
 * Boîte quand une fenêtre de l'app est devant, quand il n'y a pas d'icône dans la zone de notification pour la bulle,
 * ou au démarrage (pas encore prêt) sans le jeu lancé : le joueur vient de lancer l'app et attend sa fenêtre, qui
 * s'affiche peut-être juste après (Node.js introuvable, base qui ne se met pas à jour). Bulle seulement le jeu devant :
 * en plein vol, ou au démarrage pendant que le jeu tourne déjà.
 */
function boiteErreur({ pret = false, devant = false, tray = false, jeuLance = false } = {}) {
  if (devant || !tray) return true;
  return !pret && !jeuLance;
}

module.exports = { MAX_DETACHEES, MAX_FAVORIS, MAX_ECRANS, COINS_MAR, MAR_DEFAUT, listerEcrans, zoneEcran, centrerSur, reglageMar, reglagePave, cheminDetachable, cheminNavigable, placeBarre, basculer, rectangle, surUnEcran, lireEtat, tailleDefaut, fondFenetre, jeuDansListe, outilsDevPermis, boiteErreur };
