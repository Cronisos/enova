// Les tutoriels de l'app : un parcours par page (voir moteur.js pour la forme). Écrits pour quelqu'un qui ouvre l'app
// pour la première fois : une idée par étape, des phrases courtes, et un clic demandé seulement quand il ne change
// rien aux données du joueur (ouvrir un menu, oui ; « Marquer ici », non). Ajouter un tutoriel : une entrée ici, et
// il apparaît dans Paramètres. Les sélecteurs visent des éléments stables de la page (classes du cadre, ou attribut
// data-tuto posé exprès) ; une cible absente de l'écran est simplement sautée.

import { PARCOURS_VAISSEAUX } from './parcours/vaisseaux.js';
import { PARCOURS_INGENIERIE } from './parcours/ingenierie.js';
import { PARCOURS_MINAGE_COMMERCE } from './parcours/minage-commerce.js';
import { PARCOURS_ACTIVITES } from './parcours/activites.js';
import { PARCOURS_POWERPLAY } from './parcours/powerplay.js';
import { PARCOURS_OUTILS } from './parcours/outils.js';
import { PARCOURS_FENETRES_COUP_DOEIL } from './parcours/fenetres-coup-doeil.js';
import { PARCOURS_FENETRES_MINAGE } from './parcours/fenetres-minage.js';
import { PARCOURS_FENETRES_MODES } from './parcours/fenetres-modes.js';
import { PARCOURS_FENETRES_AUTO } from './parcours/fenetres-auto.js';

/** Le cadre de l'app, les repères et l'escadron ; les autres rubriques ont chacune leur fichier (parcours/). */
const PARCOURS_BASE = [
  // La touche qui rend la souris en jeu : le tout premier tutoriel, parce que sans elle on ne peut ni cliquer ni déplacer
  // une fenêtre d'Enova pendant qu'on joue (l’auteur, 19 nov. 2026). Il se fait en deux temps : sur l'accueil, il envoie
  // dans Paramètres ; là, le second montre la ligne à régler. L'identifiant du second est celui de l'étape « Ta touche
  // pour la souris » des premiers pas (bienvenue.js, ID_SOURIS) : le finir la coche.
  {
    id: 'souris-accueil',
    titre: 'D’abord : ta touche pour la souris',
    chemin: '/',
    etapes: [
      {
        titre: 'Avant tout : ta touche pour la souris',
        texte: 'Pendant que tu joues, la souris appartient au jeu. Une combinaison de touches te la rend pour cliquer dans les fenêtres d’Enova et les déplacer, puis la rend au jeu. Sans elle, tu ne peux pas te servir des fenêtres en jeu : on la règle tout de suite, ça prend dix secondes.',
      },
      {
        cible: '.topbar-settings',
        action: 'clic',
        titre: 'Ouvre les Paramètres',
        texte: 'Clique sur « Paramètres » : je te montre où elle se règle.',
      },
    ],
  },
  {
    id: 'touche-souris',
    titre: 'Régler ta touche pour la souris',
    chemin: '/parametres',
    etapes: [
      {
        cible: '[data-tuto="parametres-raccourcis"]',
        titre: 'Les raccourcis',
        texte: 'C’est ici. Ces combinaisons marchent partout, même pendant que tu joues : c’est Enova qui les prend, elles n’arrivent jamais au jeu.',
      },
      {
        cible: '[data-tuto="raccourci-souris"]',
        titre: 'La touche de la souris',
        texte: 'La première ligne. Sa combinaison est affichée à droite (Alt + Maj + K au départ). Pour la changer : clique dessus, puis presse la combinaison que tu veux, avec Ctrl ou Alt. Choisis-en une que le jeu n’utilise pas et que tu trouves sans regarder.',
      },
      {
        cible: '[data-tuto="parametres-raccourcis"] .btn-primary',
        titre: 'Enregistrer',
        texte: 'Si tu l’as changée, clique sur « Enregistrer » : elle marche tout de suite, sans rien relancer.',
      },
      {
        titre: 'Essaie-la en jeu',
        texte: 'En jeu : presse ta combinaison, la souris apparaît et les fenêtres d’Enova se laissent cliquer et déplacer. Presse-la encore : la souris retourne au jeu. C’est le geste à connaître par cœur.',
      },
    ],
  },
  {
    id: 'accueil',
    titre: 'Découvrir l’app',
    chemin: '/',
    etapes: [
      {
        titre: 'Bienvenue dans Enova',
        texte: 'L’app lit les journaux que le jeu écrit sur ton PC et te montre où tu en es. Elle ne touche jamais au jeu. Ce petit tour dure une minute : tu peux le passer à tout moment, et le revoir dans Paramètres.',
      },
      {
        cible: '.topbar-state',
        titre: 'Ton commandant, en direct',
        texte: 'Ton nom, ton solde et l’endroit où tu es. Ces informations se mettent à jour toutes seules pendant que tu joues. Si elles sont vides, lance le jeu une fois.',
      },
      {
        cible: '.mode-button',
        action: 'clic',
        titre: 'Le mode de jeu',
        texte: 'C’est le bouton le plus important : tu dis à l’app ce que tu fais (minage, commerce, combat…). Clique dessus pour ouvrir la liste.',
      },
      {
        cible: '.mode-list',
        titre: 'Choisir ce que tu fais',
        texte: 'Chaque mode ouvre, par-dessus le jeu, les fenêtres qui vont avec : par exemple « Minage Rhino » affiche tes repères et le guidage. « Aucun » referme tout. L’app peut aussi te proposer un mode d’après ton vaisseau.',
      },
      {
        cible: '.topbar-nav',
        titre: 'Les rubriques',
        texte: 'Tout le reste est rangé ici : tes vaisseaux et tes builds, l’ingénierie, tes activités (minage, commerce, combat…), le Powerplay et l’escadron, et les outils.',
      },
      {
        cible: '.topbar-settings',
        titre: 'Paramètres',
        texte: 'Les réglages de l’app, le partage avec ton escadron, et la liste des tutoriels : tu peux y revoir celui-ci, ou les couper tous.',
      },
      {
        titre: 'À toi de jouer',
        texte: 'Chaque page a son propre tutoriel, qui se lance la première fois que tu l’ouvres. Bon vol, commandant.',
      },
    ],
  },
  {
    id: 'reperes',
    titre: 'Mes repères (minage au Rhino)',
    chemin: '/reperes',
    etapes: [
      {
        titre: 'Mes repères',
        texte: 'Un repère, c’est un endroit que tu veux retrouver : un bon coin de minage au Rhino, une épave, un site. L’app note le système, la planète et les coordonnées à ta place.',
      },
      {
        cible: '.wp-bar',
        titre: 'Tu es ici',
        texte: 'Ta position en direct : planète, latitude, longitude, altitude, et si tu es en vaisseau ou en Rhino. Elle n’apparaît que quand le jeu tourne.',
      },
      {
        cible: '.wp-bar .btn-primary',
        titre: 'Marquer ici',
        texte: 'Ce bouton enregistre l’endroit exact où tu te trouves. Il est grisé tant que l’app ne connaît pas ta position. Tu pourras ensuite lui donner un nom et une note.',
      },
      {
        cible: '.wp-menu',
        titre: 'Les écrans de la rubrique',
        texte: 'La liste de tous tes repères, les sites déjà balayés, tes captures, tes sessions de minage, et ce que ton escadron a partagé avec toi. Clique sur l’un d’eux quand tu veux.',
      },
      {
        cible: '.mode-button',
        titre: 'En jeu : le mode « Minage Rhino »',
        texte: 'Choisis ce mode ici avant de descendre sur une planète : l’app affiche par-dessus le jeu la liste de tes repères, le guidage vers celui que tu vises, et le balayage qui dessine la carte du site.',
      },
      {
        titre: 'Une session de minage',
        texte: 'Ouvre un repère de minage puis « Lancer la session » : l’app chronomètre et compte ce que tu ramasses. À la fin, tu sais ce que le coin rapporte à l’heure.',
      },
    ],
  },
  {
    id: 'escadron',
    titre: 'Mes envois et mon apport',
    chemin: '/escadron',
    etapes: [
      {
        titre: 'Ton escadron',
        texte: 'Cette page suit deux choses : l’envoi de tes mérites Powerplay au tableau de l’escadron, et ce que tu apportes à chaque classement.',
      },
      {
        cible: '.two-cols > .panel:first-child',
        titre: 'Envoi de mes mérites',
        texte: 'Une fois inscrit, chaque gain de mérites part au tableau de l’escadron : ton nom, le système, les mérites et l’heure. Rien d’autre, et rien du tout tant que tu ne l’as pas activé.',
      },
      {
        cible: '.two-cols > .panel:last-child',
        titre: 'Mon apport à l’escadron',
        texte: 'D’après les statistiques que le jeu écrit à chaque connexion : ta part dans chaque classement de l’escadron, entre deux dates que tu choisis.',
      },
    ],
  },
  {
    id: 'escadron-rejoindre',
    titre: 'Rejoindre l’escadron',
    chemin: '/escadron/rejoindre',
    etapes: [
      {
        titre: 'Rejoindre ton escadron',
        texte: 'Deux étapes, une seule fois. Il te faut seulement le code posté par ton chef sur Discord : il commence par « ESC1. ».',
      },
      {
        cible: '.guide-liste',
        titre: 'Ce qu’il te faut',
        texte: 'Le code de l’escadron, le même pour tout le monde, et avoir lancé le jeu au moins une fois sur ce PC.',
      },
      {
        cible: '#guide-code',
        titre: 'Coller le code',
        texte: 'Colle ici le code de ton chef, puis clique sur « Rejoindre ». Ton nom de commandant sert d’identifiant : aucun compte à créer, aucun mot de passe à retenir.',
      },
      {
        cible: '#guide-depuis',
        titre: 'Activer l’envoi',
        texte: 'Choisis depuis quand compter tes mérites, puis active l’envoi. « Des 30 derniers jours » fait aussi compter ce que tu as déjà gagné.',
      },
      {
        cible: '.topbar-settings',
        titre: 'Et le partage ?',
        texte: 'Dans Paramètres, tu peux aussi activer le partage avec l’escadron : repères de minage, builds et routes commerciales, à tout le monde, à un rôle, ou à quelques personnes.',
      },
    ],
  },
  {
    id: 'escadron-chef',
    titre: 'Serveur de l’escadron (chef)',
    chemin: '/escadron/chef',
    etapes: [
      {
        titre: 'Pour celui qui gère l’escadron',
        texte: 'Cette page installe tout ce qu’il faut pour l’escadron, sans rien taper dans une console : le serveur, le code à poster, la route et la carte Discord. Les membres, eux, n’ont jamais besoin de venir ici.',
      },
      {
        cible: '.guide-etapes',
        titre: 'Quatre étapes, dans l’ordre',
        texte: 'Une étape faite passe au vert, avec un résumé de ce qui est en place. Son bouton rouvre ses réglages si tu veux la modifier.',
      },
      {
        cible: '.guide-etapes > li:nth-child(1)',
        titre: '1. Le serveur',
        texte: 'Il tourne gratuitement sur ton compte Cloudflare. Il te faut une clé d’API, que l’app n’utilise que pendant l’installation et ne garde pas.',
      },
      {
        cible: '.guide-etapes > li:nth-child(2)',
        titre: '2. Le code de l’escadron',
        texte: 'Dès que le serveur existe, l’app affiche le code à épingler sur Discord. C’est tout ce que tes membres ont à coller pour rejoindre.',
      },
      {
        cible: '.guide-etapes > li:nth-child(3)',
        titre: '3. La route',
        texte: 'Reprise de ton Projet extension : les systèmes à prendre, dans l’ordre. Chaque nom est vérifié avant l’envoi.',
      },
      {
        cible: '.guide-etapes > li:nth-child(4)',
        titre: '4. La carte Discord',
        texte: 'Avec le lien d’un webhook et une clé GitHub, la carte de la route s’affiche dans ton salon et se met à jour toute seule, avec un rapport chaque jeudi et à chaque système validé.',
      },
    ],
  },
];

/**
 * Laissés de côté, avec la raison. « outils-sites » : dans l'app de bureau, le site (Inara) est une vue posée
 * par-dessus la page ; la bulle du tutoriel serait cachée dessous.
 */
const ECARTES = new Set(['outils-sites']);

/** Tous les tutoriels de l'app, dans l'ordre des rubriques (celui de Paramètres › Tutoriels). */
export const PARCOURS = [
  ...PARCOURS_BASE,
  ...PARCOURS_VAISSEAUX,
  ...PARCOURS_INGENIERIE,
  ...PARCOURS_MINAGE_COMMERCE,
  ...PARCOURS_ACTIVITES,
  ...PARCOURS_POWERPLAY,
  ...PARCOURS_OUTILS,
  // Fenêtres en jeu, montrées en démonstration (page « Fenêtres en jeu ») : l'accueil, le Coup d'œil, puis chaque mode
  ...PARCOURS_FENETRES_COUP_DOEIL,
  ...PARCOURS_FENETRES_MINAGE,
  ...PARCOURS_FENETRES_MODES,
  ...PARCOURS_FENETRES_AUTO,
].filter((p) => !ECARTES.has(p.id));

/** Rubriques de la page Outils › Tutoriels, dans l'ordre : [nom, début des identifiants de ses tutoriels]. */
const RUBRIQUES = [
  ['Fenêtres en jeu', ['jeu-']],
  ['Mes vaisseaux et builds', ['vaisseaux-', 'builds-']],
  ['Ingénierie', ['ingenierie-']],
  ['Minage', ['reperes', 'minage-']],
  ['Commerce', ['commerce']],
  ['Autres activités', ['activites-']],
  ['Powerplay et escadron', ['powerplay-', 'extension-', 'escadron']],
  ['Outils et Paramètres', ['outils-', 'parametres-']],
];
const PREMIERS_PAS = 'Premiers pas';

/** Rubrique d'un tutoriel (« Premiers pas » pour le cadre de l'app). */
export function rubriqueDe(p) {
  return RUBRIQUES.find(([, debuts]) => debuts.some((d) => p.id.startsWith(d)))?.[0] ?? PREMIERS_PAS;
}

/** Les tutoriels rangés par rubrique, premiers pas d'abord : [{ rubrique, parcours }]. Aucun n'est oublié. */
export function parRubrique(liste) {
  return [PREMIERS_PAS, ...RUBRIQUES.map(([nom]) => nom)]
    .map((rubrique) => ({ rubrique, parcours: liste.filter((p) => rubriqueDe(p) === rubrique) }))
    .filter((g) => g.parcours.length);
}

/** Parcours par son identifiant, ou null. */
export const parcoursParId = (id) => PARCOURS.find((p) => p.id === id) ?? null;
