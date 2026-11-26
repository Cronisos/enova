// Ce que chaque page de l'interface et chaque fenêtre de l'overlay doit montrer, pour l'étape « pages et fenêtres »
// (etapes/75-pages.mjs). Deux passes, chacune sur son serveur isolé :
//
//   seances : le serveur a relu TOUTES les séances de référence (scripts/controle/seances), dans l'ordre des
//             journaux, comme l'historique d'un même commandant (Testeur) ; une route a été créée (comme au rejeu).
//   vide    : aucun journal (premier lancement, jeu jamais lancé) : les pages montrent leur état vide.
//
// Une entrée : { titre (h1 exact), onglet (lien actif exact), textes (dans les deux passes), seances, vide }, où
// seances / vide est une liste de textes, ou { textes, absents, toleres, url, depuis, rien }, ou false (pas ouverte
// dans cette passe). Les textes sont cherchés sans tenir compte des majuscules, des sortes d'espaces ni des
// apostrophes. vues : onglets à cliquer sur la page, chacun avec ses propres attendus.
//
// - url : adresse à ouvrir (route à paramètre), ou expression régulière que l'adresse doit vérifier après `depuis` ;
// - depuis : { url, cliquer } : on ouvre `url`, puis on clique le bouton ou le lien nommé (parcours d'utilisateur) ;
//   cliquer peut être une liste de gestes, chacun attendant son bouton ou son champ : un texte (clic), ou
//   { saisir: début du nom du champ, texte } (frappe au clavier) ;
//   ecrit: true si le parcours enregistre quelque chose (création d'un build…) : ces parcours passent à la fin, un par
//   un, quand toutes les lectures sont faites ;
// - toleres : réponses ≥ 400 attendues, { requete: 'GET /api/…', statut, raison } ;
// - rien : la fenêtre ne doit rien afficher (rien à suivre : l'overlay la ferme, ou ne l'ouvre pas) ;
// - styles : [{ selecteur, propriete, valeurs }] : style calculé de chaque élément visé (au moins un), parmi valeurs.
//
// Le réseau est coupé (ELITE_NO_NETWORK) : ce qui vient d'Internet (Ardent, Spansh, Inara) doit échouer proprement.

/** Toutes les pages de l'application (avec le cadre et la barre de menus). */
export const CADRE = {
  textes: ['Enova'],
  infobulles: ['Connecté au serveur'], // point vert du cadre : le temps réel est branché
  seances: ['CMDR Testeur', 'Solde 710,4 M'],
  vide: { absents: ['CMDR Testeur'] },
};

/** Réponses refusées faute de réseau (serveur isolé, ELITE_NO_NETWORK=1) : attendues partout où elles servent. */
export const RESEAU_COUPE = [
  { requete: 'GET /api/modules/waypoints/sweep/top-ores', statut: 503, raison: 'Ardent Insight injoignable (réseau coupé par le banc)' },
];

/**
 * Éditeur de rôle d'un vaisseau (core/ShipRole.jsx) aligné à gauche, comme partout : dans le Constructeur, il est rendu
 * dans une cellule alignée à droite (td.right), dont il héritait l'alignement (constat du 9 nov.).
 */
const EDITEUR_ROLE_A_GAUCHE = { selecteur: '.ship-role-edit', propriete: 'text-align', valeurs: ['left', 'start'] };

const ROUTE_TOLEREE = { requete: 'GET /api/modules/routes/routes/1', statut: 404, raison: 'aucune route dans cette passe : la page le dit' };

export const APP = {
  '/': {
    // Tableau de bord « Maintenant » : un résumé de l'app, sans boutons de menu (les menus sont en haut)
    titre: 'Bienvenue, commandant',
    textes: ['À faire maintenant', 'Ingénierie'],
    absents: ['Modes de jeu'],
    seances: ['Système actuel', 'Mérites de la semaine'],
    vues: [
      // Menu « Mode de jeu » : les modes, puis le vaisseau où tu es et son rôle (core/ModeMenu.jsx)
      {
        cliquer: 'Mode de jeu',
        textes: ['Commerce', 'Minage Rhino', 'Aucun', "Fenêtre Coup d'œil", 'Vaisseau actuel'],
        seances: ['Type-11 Prospector', 'Sans rôle', '⚑ Rôle'],
        vide: ['Vaisseau inconnu pour l’instant : lance le jeu.'],
      },
      // Son rôle, modifiable sur place (core/ShipRole.jsx) : rien n'est écrit tant qu'on n'enregistre pas
      {
        cliquer: '⚑ Rôle',
        textes: ['Rôle principal', 'Rôles secondaires, 3 au plus', 'Colonisation', 'Enregistrer le rôle', 'Sans rôle, rien ne s’ouvre seul'],
        styles: [EDITEUR_ROLE_A_GAUCHE],
        vide: false,
      },
    ],
  },
  // Pages des rubriques (client/src/core/navigation.js) : une carte par page, sous-pages en liens
  '/activites': {
    titre: '◎ Activités',
    textes: ['Commerce', 'Minage Rhino', 'Minage vaisseau', 'Combat', 'Sauvetage', 'Colonisation'],
    // Menu en cascade (core/MenuCascade.jsx) : rubriques, puis leurs pages, puis les sous-pages (onglets compris)
    vues: [
      { cliquer: 'Menu', textes: ['Mes vaisseaux', 'Ingénierie', 'Powerplay & Escadron', 'Outils', 'Paramètres'], vide: false },
      { cliquer: 'Powerplay & Escadron', textes: ['Projet extension', 'Systèmes importants', 'Escadron'], vide: false },
      { cliquer: 'Projet extension', textes: ['Historique des mérites', 'Mérites à la vente', 'Calculateur de routes', 'Où agir cette semaine'], vide: false },
    ],
  },
  '/powerplay': { titre: '⚑ Powerplay & Escadron', textes: ['Projet extension', 'Mérites à la vente', 'Où agir cette semaine', 'Systèmes importants', 'Escadron'] },
  // La vigie des règles (outil de développement, M19) n'a plus d'entrée de menu, même allumée (ELITE_VIGIE=1 au banc)
  '/outils': { titre: '✦ Outils', textes: ['Sites et applications', 'Règles du jeu', 'Couleurs du HUD', 'Garde des commandes', 'Compagnon'], absents: ['Vigie des règles'] },
  '/parametres': {
    titre: 'Paramètres',
    textes: ['Dossier des journaux Elite Dangerous', 'Lecteur de journaux', 'Heures de jeu par soirée'],
    seances: ['Journal.2026-11-07T091533.01.log'],
    vide: ['Lance le jeu : les événements apparaîtront ici.'],
  },
  '/page-inconnue': { textes: ['Page introuvable.'] },

  // --- Mes routes commerciales ---
  '/routes': {
    onglet: 'Tableau de bord',
    textes: ['Crédits gagnés', 'Boucles'],
    seances: ['Route active', 'Port Draught ⇄ Meech Dock', '527 500 988 cr', '15 046'],
    vide: ["Aucune route pour l'instant."],
  },
  '/routes/nouvelle': { onglet: 'Nouvelle route', textes: ["J'ai fait ma route", "Fais d'abord ta route une fois en jeu"] },
  '/routes/liste': {
    onglet: 'Mes routes',
    seances: ['Port Draught ⇄ Meech Dock', 'ICZ KC-U b3-4 ⇄ Cemiess · Bauxite, Indium', '527,5 M cr', '7,00 Md cr'],
    vide: ['Aucune route sauvegardée.'],
  },
  '/routes/historique': {
    onglet: 'Historique',
    textes: ['Toutes les routes'],
    // Les boucles de référence du cahier des charges (22 h 39 et 23 h 35 UTC, soit 23:39 et 00:35 à Paris)
    seances: ['27 oct. 23:39', '74 591 507 cr', '2 053', '28 oct. 00:35', '78 548 150 cr', '2 176'],
    vide: ['Aucune boucle pour ces filtres.'],
  },
  '/routes/:id': {
    seances: {
      url: '/routes/1',
      textes: ['Port Draught ⇄ Meech Dock', '7 boucles enregistrées', 'Journal des boucles', '74 591 507 cr', '14,0 min', '78 548 150 cr', '12,7 min', 'Achat : Bauxite 1 232 t à 706 cr/t'],
    },
    vide: { url: '/routes/1', textes: ['Route introuvable.'], toleres: [ROUTE_TOLEREE] },
  },

  // --- Mon ingénierie ---
  '/ingenierie': { onglet: 'Tableau de bord', textes: ["Aucun plan pour l'instant.", 'Choisir un vaisseau'], absents: ['Ma flotte'] },
  // Nouveau plan : depuis un build ou un vaisseau vierge (le plan d'un vaisseau se crée aussi depuis sa carte, Mes vaisseaux)
  '/ingenierie/nouveau-plan': { onglet: 'Nouveau plan', textes: ['Importer un build', 'Créer un plan vierge', 'Lien EDSY', 'À partir d’un de mes vaisseaux'], seances: ['Créer un plan'] },

  // --- Mes vaisseaux (module vaisseaux) : la flotte, séparée de l'ingénierie ---
  '/vaisseaux': {
    onglet: 'Mes vaisseaux',
    textes: ['Builds'],
    absents: ['Tableau de bord', 'Importer un build', 'Config lue', 'Ma flotte'],
    // Carte du vaisseau actuel d'abord ; filtres par modèle ; un clic sur une carte ouvre sa fiche (lecture seule)
    seances: ['pad', 'Vaisseau actuel', 'Type-11 Prospector', 'À quai · TST-001 · Synuefe OU-E c28-2', 'Federal Corvette', 'TS-20', 'Garé à Synuefe BU-J b56-9', 'Sans rôle', 'Cobra Mk III', '×2', 'saut', 'soute'],
    vide: { textes: ['Aucun vaisseau pour l’instant : lance le jeu, ta flotte apparaîtra ici.'], absents: ['Vaisseau actuel'] },
    vues: [
      // Fiche du vaisseau actuel : stats d'abord (défense, saut…), rien à modifier (pas de « Créer un plan »)
      { cliquer: 'Vaisseau actuel', seances: ['Stats', 'Modules', 'Saut maximal', 'Boucliers', 'Coque', 'Rachat', 'Construire un build à partir de celui-ci', '⚑ Rôle'], absents: ['Créer un plan', 'Tout en G5'], vide: false },
      { cliquer: 'Modules', seances: ['Modules de base', 'Réacteur FSD', 'Propulseurs', '6E', 'Soute (64 t)×3', 'Surchargé G3/5', 'Pad M (moyen)'], vide: false },
      // Ses builds et ce qu'il te faut pour y arriver (constructeur : écart depuis la configuration actuelle)
      { cliquer: 'Ses builds', seances: ['Construire un build à partir de celui-ci'], absents: ['Configuration de ce vaisseau inconnue', 'Écart indisponible'], vide: false },
      // Son rôle, modifiable dans la fiche (core/ShipRole.jsx)
      { cliquer: '⚑ Rôle', seances: ['Rôle principal', 'Rôles secondaires, 3 au plus', 'Minage vaisseau', 'Enregistrer le rôle'], styles: [EDITEUR_ROLE_A_GAUCHE], vide: false },
    ],
  },
  // Plan du Type-11 tout en G5 : le support vital se fait chez Etienne Dorn, pas encore débloqué (compté au rang 1,
  // 0 %) : 5 + 5 + 5 + 5 + 5 applications au lieu de 1 + 2 + 3 + 4 + 5, soit 10 de plus, montées comprises. Le calcul
  // (« Rangs des ingénieurs » du plan) puis le Dashboard (même montée, comptée une fois) doivent le montrer.
  '/ingenierie/plan/:id': {
    seances: {
      depuis: { url: '/ingenierie/nouveau-plan', cliquer: ['Créer un plan', 'Modifier le plan', 'Tout en G5'], ecrit: true },
      url: /^\/ingenierie\/plan\/\d+$/,
      textes: ['Type-11 Prospector · TS-03', 'Matériaux réunis', 'Modules terminés', 'Supprimer le plan', 'dont 10 dues aux rangs des ingénieurs'],
    },
    vide: { url: '/ingenierie/plan/1', textes: ['Plan introuvable.'], toleres: [{ requete: 'GET /api/modules/engineering/plans/1', statut: 404, raison: 'aucun plan : la page le dit' }] },
    vues: [
      {
        cliquer: 'Calculer',
        seances: [
          'Rangs des ingénieurs compris : 10 applications et 19 matériaux en plus dus aux rangs',
          'Sous le rang 5, chaque grade demande plus d’applications',
          'Etienne Dorn (pas encore débloqué)',
          'compté comme après son déblocage : rang 1, 0 % · après le plan : rang 5',
          'G1 ×3 → rang 2 → G1 ×2, G2 ×3 → rang 3 → G2 ×2, G3 ×4 → rang 4 → G3 ×1, G4 ×4 → rang 5 → G4 ×1, G5 ×5',
          'Matériaux en plus dus aux rangs',
          'Chez Etienne Dorn (pas encore débloqué : compté au rang 1, comme après un déblocage) : G1 en 5 applications au lieu de 1 (3 au rang 1, puis 2 au rang 2)',
        ],
        vide: false,
      },
      {
        cliquer: 'Tableau de bord',
        seances: ['Rangs des ingénieurs (tous plans confondus)', '10 applications et 19 matériaux en plus dus aux rangs, déjà comptés ci-dessous', 'Etienne Dorn (pas encore débloqué)'],
        vide: false,
      },
    ],
  },
  // Itinéraire d'ingénierie (feat/16) : page, liste des 25 ingénieurs, fiche d'un ingénieur (Broo Tarquin, n° 300030)
  '/ingenierie/itineraire': { onglet: 'Itinéraire', textes: ['Itinéraire d’ingénierie'] },
  '/ingenierie/ingenieurs': { onglet: 'Ingénieurs', textes: ['Professor Palin', 'Mel Brandon', '25 ingénieurs de vaisseau', 'Armes thermiques', 'FSD et propulseurs', 'G5'], vues: [{ cliquer: 'Armes thermiques', textes: ['Broo Tarquin'], absents: ['Professor Palin'], vide: false }] },
  '/ingenierie/ingenieurs/:id': {
    seances: { url: '/ingenierie/ingenieurs/300030', textes: ['Broo Tarquin', 'Ce qu’il propose (grade maximal)'] },
    vide: { url: '/ingenierie/ingenieurs/300030', textes: ['Broo Tarquin', 'Ce qu’il propose (grade maximal)'] },
  },
  '/ingenierie/materiaux': {
    onglet: 'Matériaux',
    // Rangés comme dans les échangeurs : sous-catégories, du grade 1 au grade 5 ; les matériaux à 0 restent visibles
    textes: ['Matières premières', 'Manufacturés', 'Catégorie 1', 'Chimique', "Données d'émission"],
    seances: ['Recalé sur le jeu le 7 nov. 09:15', 'Carbone', '54/300', 'Vanadium', '250/250', 'Gardiens (hors échangeur)'],
    vide: ['Recalé sur le jeu le —', '0/300'],
    // Un clic sur une pastille de grade filtre : G5 seulement (aucune matière première n'est G5)
    vues: [{ cliquer: 'G5', textes: ['Isolants pharmaceutiques', 'Tous'], absents: ['Carbone', 'Unités de stockage chimique'], vide: false }],
  },
  '/ingenierie/rangs': {
    onglet: 'Rangs',
    // « comptent aussi » (mesurée) et « combien » (tiré des fourchettes de la table, à vérifier) : deux morceaux
    // Rang 4, G1 à G3 : c'est le maximum d'applications qui n'est pas chiffré (pas « le minimum ») ; report du surplus :
    // ce que 10 % valent au rang suivant, pas « 26 % du surplus » (qui se lirait « les trois quarts perdus »)
    textes: ['Ce que tes journaux montrent', 'Pour finir le grade (table)', 'Le rang ne monte qu\'à l\'atelier de l\'ingénieur', 'Les applications sous le grade maximal du rang comptent aussi', 'de 2,8 à 4,7 fois moins par grade en dessous', 'jamais vu dans les journaux de référence',
      'au moins 114 applications, sans maximum connu : chacune fait au plus 0,9 % du rang, et rien ne dit combien au moins (le calcul prudent prend le pire cas que permettent les montées lues dans les journaux de référence)',
      '10 % de surplus au rang 1 valent au plus 2,6 % du rang 2 ; au rang 2, au plus 3,2 % du rang 3 ; au rang 3, au plus 3,6 % du rang 4',
      // La colonne de la montée est la table (titre, nombre de séquences qui la fondent) ; les montées lues dans tes
      // journaux sont à côté, par rang
      'Pour passer au rang suivant (table : applications de ce grade, depuis 0 %)', 'déduit de 3 séquences des journaux de référence où ce grade a servi',
      'Montées dans tes journaux (ce rang)', '5 (11 mesures)'],
    // La table des règles vient des journaux de référence (source déclarée, au survol des badges) : un membre de l'escadron ne
    // doit pas lire qu'elle vient des siens ; « tes journaux » ne sert qu'aux mesures en direct. Un badge « à vérifier »
    // ou « inconnue » dit son motif : le rang 4 en G1 est mesuré 2 fois seulement, sans hypothèse ; au rang 4, la part
    // des G1 à G3 dans la montée, en mots de joueur (rien du modèle : ni « p4 », ni « seuil »)
    infobulles: [
      'Mesurée : journaux de référence, 24 oct.–5 nov. 2026 (808 applications, jeu 4.4.2.1).',
      'À vérifier. Mesurée 2 fois seulement (il en faut 3 pour la dire mesurée), sans hypothèse. Source : journaux de référence, 24 oct.–5 nov. 2026 (808 applications, jeu 4.4.2.1). À confirmer en jeu.',
      'Inconnue. Au rang 4, les G4 suffisent presque à expliquer chaque montée au rang 5 lue dans les journaux de référence : rien ne dit combien un G1, un G2 ou un G3 y fait monter le rang (peut-être presque rien). Le calcul prend le cas prudent.',
      'Déduite des mesures avec une hypothèse : à confirmer en jeu.',
      // Badge de la montée (rang 1, G1) : la déduction, sur combien de séquences, et la source
      'À vérifier. Déduite de 3 séquences des journaux de référence où ce grade a servi à ce rang, avec des hypothèses (rankModel.js). Source : déduit de 17 séquences (15 montées de rang) des journaux de référence (Tiana Fortune 28 oct., Lei Cheung, The Dweller et Selene Jean 1er nov., Broo Tarquin 2 et 5 nov.), hypothèses H1 à H6 de rankModel.js (points par grade, seuil par rang, surplus reporté en points, % entier tronqué), scripts/regles/deduire-rangs.mjs. À confirmer en jeu.',
    ],
    absents: ['jamais vu dans tes journaux', "le minimum n'est pas chiffré", '% du surplus (rang', 'La table des règles (à gauche)', 'application illisible'],
    // Séance des rangs (1er et 5 nov.) : montée de Lei Cheung par 12 G1, G3 à distance chez Broo Tarquin ; les mêmes
    // montées dans la colonne « Montées dans tes journaux », rang par rang
    seances: ['Lei Cheung, rang 2 : montée → rang 3', '12 × G1', 'Broo Tarquin, rang 3 : relevé 24 % → rang 4', '5 à distance', 'Liz Ryder', 'progression 49 %', 'grade max',
      '3 G1 depuis le déblocage, 1 fois', '12 G1 depuis la montée au rang 2, 1 fois', '16 G1, 5 G2 et 5 G3 (dont 5 à distance) depuis un relevé à 24 %, 1 fois'],
    vide: ['Aucune application dans tes journaux pour l’instant.', 'Aucun ingénieur débloqué dans tes journaux.', "Aucune pour l'instant", 'pas encore vue'],
  },
  '/ingenierie/donnees': {
    onglet: 'Données de référence',
    textes: ['Données de référence', 'Version coriolis-data', 'Mettre à jour les données', 'Règle des applications', '5 en G3 (mesuré dans les journaux de référence)'],
    absents: ['mesuré dans tes journaux'],
  },

  // --- Constructeur de builds ---
  '/builder': {
    onglet: 'Mes builds',
    textes: ['Nouveau build', "Aucun build. Pars d'un de tes vaisseaux ci-dessous, ou d'un vaisseau neuf."],
    seances: ['Type-11 Prospector', 'TS-03', 'Build depuis ce vaisseau', 'Sans rôle', '⚑ Rôle'],
    vide: { absents: ['Build depuis ce vaisseau', '⚑ Rôle'] },
    // Rôle du vaisseau, à côté de son nom (core/ShipRole.jsx)
    vues: [{ cliquer: '⚑ Rôle', textes: ['Rôle principal', 'Combat', 'Sauvetage', 'Enregistrer le rôle'], styles: [EDITEUR_ROLE_A_GAUCHE], vide: false }],
  },
  '/builder/nouveau': {
    onglet: 'Nouveau build',
    textes: ["Partir d'un de mes vaisseaux", 'Vaisseau neuf', 'Imperial Cutter'],
    seances: ['Federal Corvette', 'TS-20'],
    vide: ['Aucune configuration lue dans les journaux.'],
  },
  '/builder/comparer': {
    onglet: 'Comparer',
    textes: ['comparé à'],
    seances: ['Federal Corvette · Federal Corvette'],
    vide: ['Rien à comparer. Crée un build.'],
  },
  '/builder/build/:id': {
    seances: {
      depuis: { url: '/builder', cliquer: ['Build depuis ce vaisseau', { saisir: 'Nom du build', texte: 'Build du contrôle' }, 'Enregistrer le build'], ecrit: true },
      url: /^\/builder\/build\/\d+$/,
      // Modules de base avec la taille de leur emplacement (« Générateur 5 »)
      textes: ['Asp Explorer', 'Enregistrer comme nouveau', 'Saut', '30,04 al', 'Générateur 5'],
    },
    vide: { url: '/builder/build/1', textes: ['Build introuvable.'], toleres: [{ requete: 'GET /api/modules/builder/builds/1', statut: 404, raison: 'aucun build : la page le dit' }] },
  },

  // --- Mes repères (et le mode Minage Rhino) ---
  // Accueil : la recherche par minerai, sous les onglets de la page (refonte du 19 nov. 2026)
  '/reperes': {
    titre: 'Mes repères',
    textes: ['Tu es ici', 'Chercher', 'Ici', 'Cartes d’EEP', 'Guide'],
    vide: ['Position inconnue : lance le jeu.', 'Aucun gisement connu pour l’instant.'],
  },
  '/reperes/ici': {
    titre: 'Mes repères',
    textes: ['Tu es ici', 'Chercher', 'Ici'],
    seances: ['Synuefe OU-E c28-2', '3 planètes à EEP', 'Un EEP est rentable à partir de 6/10.'],
    vide: ['Position inconnue : lance le jeu.'],
  },
  '/reperes/guide': {
    titre: 'Mes repères',
    textes: ['Guide des ressources', 'Par type de monde', 'Par ressource'],
  },
  '/reperes/liste': {
    titre: 'Mes repères',
    textes: ['Taris (0)', 'Pas rentables (0)', 'Aucun repère. Sur place, clique sur « Marquer ici ».'],
    seances: ['0 repère dans Synuefe OU-E c28-2'],
    vide: ['Position inconnue : lance le jeu.'],
    vues: [{ cliquer: 'Taris (0)' }, { cliquer: 'Pas rentables (0)' }],
  },
  // EEP balayés : aucun balayage dans les séances ; la page le dit et propose l'import d'une carte
  '/reperes/eeps': { titre: 'Mes repères', textes: ['Chaque balayage d’EEP est gardé', '📥 Importer une carte', 'Aucun EEP balayé pour l’instant'] },
  '/reperes/captures': { titre: 'Mes repères', textes: ['0 photo', 'En mode Minage Rhino, l’overlay ouvre un cadre en pointillés'] },
  '/reperes/session': { titre: 'Mes repères', textes: ['Aucune session en cours : lance-la depuis un repère de minage.'] },
  '/reperes/historique': { titre: 'Mes repères', textes: ['Aucune session terminée.'] },
  '/reperes/systemes': { titre: 'Mes repères', textes: ['Aucun système prospecté pour l’instant.'] },
  '/reperes/planete/:body': {
    seances: { depuis: { url: '/reperes/ici', cliquer: '🪐 2' }, url: /^\/reperes\/planete\/[^/]+$/, textes: ['Synuefe OU-E c28-2', '🪐 2', '0 EEP vus sur 20', 'Emplacements'] },
    vide: { url: '/reperes/planete/Synuefe%20OU-E%20c28-2%202', textes: ['Aucun EEP connu sur cette planète.'] },
  },
  '/reperes/planete/:body/eep/:n': {
    seances: { url: '/reperes/planete/Synuefe%20OU-E%20c28-2%202/eep/1', textes: ['EEP 1', 'planète 2', 'Note de l’EEP', 'rentable à partir de 6'] },
    vide: { url: '/reperes/planete/Synuefe%20OU-E%20c28-2%202/eep/1', textes: ['Planète inconnue dans ce système.'] },
  },
  '/reperes/repere/:id': {
    seances: { depuis: { url: '/reperes/ici', cliquer: '📍 Marquer ici', ecrit: true }, url: /^\/reperes\/repere\/\d+$/, textes: ['TST-001 · 7 nov., 15:23', "C'est quoi ?", 'Notes'] },
    vide: { url: '/reperes/repere/1', textes: ['Repère introuvable (supprimé ?).'] },
  },

  // --- Modes de jeu ---
  '/minage-vaisseau': {
    titre: 'Minage vaisseau',
    textes: ['Soute', 'Drones', 'Raffinés', 'Prospectés'],
    seances: ['Session depuis 09:15', 'Iridium : 26 t', 'sur 268 t'],
    vide: ['Session non commencée', 'capacité inconnue'],
  },
  '/combat': {
    titre: 'Combat',
    textes: ['Ennemis abattus', 'Primes et obligations', 'Aucun kill pendant cette session.'],
    seances: ['Session depuis 09:15', 'hors combat : 47 251'],
    vide: ['Session non commencée'],
  },
  '/combat-au-sol': {
    titre: 'Combat au sol',
    textes: ['Kills', 'Gains', 'Mérites', 'Morts', 'Kills par faction', 'Derniers kills'],
    vide: ['Session non commencée'],
  },
  '/sauvetage': {
    titre: 'Sauvetage',
    textes: ['Récupérés', 'Livrés'],
    seances: ['Session depuis 09:15', '2 471 718 cr', '3 788', "Nacelle d'évacuation occupée", '1 208 805 cr'],
    vide: ['Session non commencée', 'rien à livrer'],
  },
  '/materiaux': {
    titre: 'Matériaux',
    textes: ['Récupérés', 'Bruts', 'Manufacturés', 'Encodés'],
    seances: ['Session depuis 09:15', 'Sélénium', 'Tellure', 'G1 : 45'],
    vide: ['Session non commencée'],
  },
  '/livraison-powerplay': {
    titre: 'Livraison Powerplay',
    textes: ['En soute', 'Livrées', 'Mérites / heure', 'Par ressource'],
  },
  '/commerce-rares': {
    titre: 'Commerce de rares',
    textes: ['Mérites / heure', 'Bénéfice', 'En soute', 'Par marchandise', 'Catalogue des rares'],
  },
  '/gardiens': {
    titre: 'Gardiens',
    textes: ['Planificateur', 'Booster de FSD gardien', 'Ce qu’il te faut'],
  },
  '/colonisation': {
    titre: 'Colonisation',
    textes: ['Chantiers suivis d\'après le journal'],
    seances: ['Bleae Thua ED-D c12-5', 'Judson Depot', '5,6 %', '20 583 t', 'Titanium 5 471 t', 'North America Sector PI-T c3-4'],
    vide: ["Aucun chantier suivi pour l'instant."],
  },
  '/colonisation/escadron': {
    titre: 'Colonisation de l’escadron',
    textes: ['Les chantiers choisis par le chef'],
  },
  '/colonisation/escadron/composer': {
    titre: 'Colonisation de l’escadron',
    textes: ['Les chantiers choisis par le chef'],
  },
  '/colonisation/:marketId': {
    seances: { depuis: { url: '/colonisation', cliquer: 'Vaisseau de colonisation · Judson Depot' }, url: /^\/colonisation\/\d+$/, textes: ['MarketID 3963439106', '1 220 t livrées sur 21 803', '20 583 t', 'Échéance et fin estimée'] },
    vide: { url: '/colonisation/1', textes: ['← Chantiers', 'Chantier inconnu (jamais vu dans le journal, ou oublié).'], toleres: [{ requete: 'GET /api/modules/colonisation/sites/1', statut: 404, raison: 'aucun chantier : la page le dit' }] },
  },

  // --- Outils ---
  '/systemes': {
    titre: 'Systèmes importants',
    textes: ['Mes systèmes (0)', 'Aucun système. Lance une recherche et ajoute les zones qui t\'intéressent.'],
    vues: [{ cliquer: 'Recherche multiplanète' }],
  },
  '/extension': {
    titre: 'Projet extension',
    textes: ['Historique des mérites', 'Du jeudi 5 novembre au jeudi 12 novembre', 'Rapport de la semaine'],
    seances: ['Synuefe OU-E c28-2', 'Exploité', '108 032', 'vendredi 6 novembre'],
    vues: [
      {
        cliquer: 'Mérites à la vente',
        textes: ['À quai : mérites prévus pour ta soute', 'Ventes mesurées'],
        seances: ['Ratios mesurés sur tes ventes', 'Iridium · 90 t', 'Reliques de Soontill'],
        vide: ["Aucune vente pour l'instant."],
      },
      {
        cliquer: 'Mérites par heure',
        textes: ['Mérites par heure active', 'Temps actif'],
        // 17 h 15 depuis la séance des rangs d'ingénieur (1er et 5 nov.) : 3 min de temps actif en plus dans
        // l'historique commun des séances (17 h 12 sans elle, vérifié le 8 nov. 2026), mérites inchangés
        seances: ['466 367 mérites', '17 h 15'],
        vide: ['0,0 min'],
      },
      { cliquer: "Routes d'extension", textes: ['Aucune route enregistrée.'] },
      {
        cliquer: 'Calculateur de routes',
        textes: ['Système de départ', 'Rayon (al)'],
        seances: ['Type-11 Prospector', '268 t', '75,4 M'],
        vide: ['lance le jeu pour le lire', 'aucune route active'],
      },
      {
        cliquer: 'Où agir cette semaine',
        textes: ['Que veux-tu faire ?', 'Prise (acquisition)', 'Renforcement', 'Sape'],
        seances: ['Aisling Duval', 'Synuefe OU-E c28-2', '71'],
        vide: ['inconnue : choisis-la', 'lance le jeu pour la lire'],
      },
    ],
  },
  '/regles': {
    titre: 'Règles du jeu',
    textes: ['39 règles', 'Lexique français ↔ anglais', 'Powerplay 2.0', 'Les quatre niveaux d\'un système', 'Forteresse ↔ Stronghold'],
  },
  // Vigie des règles : toutes les fiches du dépôt (server/src/regles/), par domaine ; pas d'alerte dans une séance rejouée
  '/regles/vigie': { onglet: 'Vigie des règles', textes: ['Vigie des règles', 'Résumé du jour', 'Powerplay', 'Ingénierie', 'Points de contrôle pour 1,0 de progression de prise', 'mesurée en jeu'] },
  '/escadron': {
    titre: 'Escadron',
    textes: ['Envoi de mes mérites', "Tu n'as pas encore rejoint d'escadron.", "Rejoindre l'escadron"],
    seances: ['Testeur · Synuefe OU-E c28-2', 'Mon apport à Escadron test', 'Rang : Pilote'],
    vide: ['Aucun relevé encore : le jeu écrit tes statistiques d\'escadron à chaque connexion.'],
  },
  // Bilans de session : reconstruits depuis le journal des séances ; sans journal, la page le dit
  '/bilans': {
    titre: 'Bilans de session',
    textes: ['Une session va du chargement de la partie à la fermeture du jeu'],
    seances: ['Durée', 'Mérites', 'Matériaux', 'mérites/h d’habitude (médiane)'],
    vide: ['Aucune session dans ton journal pour l’instant : lance le jeu.'],
  },
  // Mes commandes : le profil du banc (extrait de 35 commandes), reclassé par intention, lu sans être modifié
  '/commandes/mes-commandes': {
    titre: 'Mes commandes',
    onglet: 'Mes commandes',
    textes: ['lu sans jamais être modifié', 'Piloter', 'Avec une touche', 'approximatifs', 'Clavier : A'],
    vues: [{ cliquer: 'Sans touche', textes: ['aucune touche'], absents: ['Clavier : A'] }],
  },
  '/commandes': {
    titre: 'Garde des commandes',
    textes: ['Rapport du jeu', 'Missing devices: SaitekX52', 'Profils utilisés', 'Custom.4.2.binds'],
    seances: ["Rien d'anormal au dernier lancement du jeu", 'jeu lancé le 7 nov. 09:15, fermé le 7 nov. 15:18'],
    vide: ['Profil de commandes ignoré : manette SaitekX52 absente.', 'aucun lancement du jeu trouvé dans les journaux'],
  },
  // Site externe (modules/sites) : dans un navigateur, Inara refuse d'être encadré, la page donne le lien ; le vrai site
  // ne s'affiche que dans l'app de bureau
  '/inara': {
    titre: 'Inara',
    textes: ['Inara refuse d’être affiché dans une autre page web', 'Ouvrir Inara dans le navigateur ↗'],
  },
  '/applications': {
    titre: 'Applications externes',
    textes: ['EDSY (constructeur de builds)', 'Coriolis (constructeur de builds)', 'À vérifier'],
    seances: ['TST-001 · Synuefe OU-E c28-2', 'Système sur Inara', 'Station sur Spansh'],
    vide: ['Position inconnue : lance le jeu.'],
  },
  '/coup-doeil': {
    titre: "Coup d'œil",
    textes: ['Crédits', 'Rachat', 'Powerplay', 'À encaisser'],
    seances: ['710 436 236 cr', 'Couvert ✓', '1 296 017', 'Aisling Duval · rang 165', '11 978 147 cr', 'Opération commerciale de Faulcon DeLacy'],
    vide: ['Rachat inconnu', "Pas d'allégeance.", 'Aucune mission active.'],
  },
  '/couleurs-hud': {
    titre: 'Couleurs du HUD',
    textes: ['Choisis la couleur de l’interface du jeu', 'L’app prend la couleur de mon HUD'],
    seances: ['Jeu fermé : la couleur sera là au prochain lancement'],
    vide: ['État du jeu inconnu'],
  },
  '/compagnon': {
    titre: 'Compagnon',
    textes: ['Un petit copilote qui réagit à ce que tu fais en jeu.', 'Aperçu', 'Réglages', 'Bavardage', 'Copilote'],
  },
  // Moniteur PC et Alicia : seulement ce qui ne dépend pas du PC (ni carte graphique, ni Ollama installé)
  '/moniteur': { titre: 'Moniteur PC', textes: ['Ce que le jeu et le copilote IA prennent à ton PC', 'Pic de mémoire vidéo'] },
  '/ia': { titre: 'Copilote', textes: ['Ton IA de bord répond à tes questions', 'Le modèle tourne sur ton PC (Ollama) : rien ne part sur internet.'] },
  '/builder/vaisseaux': { onglet: 'Tous les vaisseaux', textes: ['Trier par', 'Doit pouvoir porter', 'Mandalay'] },
  // Escadron : les deux guides (membre, chef), sans rien envoyer
  '/escadron/rejoindre': { titre: "Rejoindre l'escadron", textes: ["Le code de l'escadron, posté par le chef sur Discord", 'Ce qui part de ton PC'] },
  '/escadron/chef': { titre: "Serveur de l'escadron", textes: ["Pas de console : l'app fait tout.", 'Le monter sur mon Cloudflare', 'Reprendre un serveur existant'] },
};

/** Fenêtres de l'overlay (/hud/<page>), ouvertes avec le pont simulé (pages/pont.mjs). */
export const HUD = {
  waypoints: { textes: ['⛏ Minage', 'le chrono démarre à ta première tonne raffinée'] },
  'waypoints-list': {
    textes: ['Repères', 'Systèmes'],
    seances: ['Synuefe OU-E c28-2', 'Planètes avec tes repères', 'Aucun repère dans ce système.'],
    vide: ['Aucun repère.', 'Tous les systèmes'],
  },
  'waypoints-guide': { textes: ['Guidage', 'Aucune destination.'] },
  capture: { textes: ['📷'] },
  'waypoints-sweep': { textes: ["Balayage de l'EEP", 'Je suis au centre'] },
  'waypoints-sweep-top': {
    textes: ['À chercher en priorité', 'Prix injoignables pour l’instant.'],
    toleres: RESEAU_COUPE,
    vues: [{ cliquer: 'Ce système', seances: ['vente dans Synuefe OU-E c28-2'] }],
  },
  'waypoints-sweep-pose': { textes: ['Nouveau repère', 'Pose un repère avec 📍 ou Alt+Maj+R.'] },
  shipmining: { textes: ['Minage vaisseau'], seances: ['26 t', 'pause · jeu fermé'], vide: ['en direct'] },
  'expansion-sale': { rien: true }, // pas à quai avec une soute à vendre : rien à prévoir
  // Fiche « Chez l’ingénieur » : titre toujours là ; à quai ailleurs ou sans itinéraire calculé, la raison (pas de tâche)
  'engineering-visit': { textes: ['Chez'] },
  // Alertes de passage : seulement après une arrivée en direct ; ouverte sans arrivée, elle le dit
  'engineering-passage': { textes: ['Utile ici pour tes plans', 'Rien pour tes plans dans ce système.'] },
  // Bilan en jeu : ouvert par le serveur à la fermeture du jeu ou au changement de mode ; ouvert sans bilan, il le dit
  bilan: { textes: ['Bilan de la session', 'Aucun bilan pour l’instant.'] },
  vigie: { textes: ['Règle à revoir', 'Aucune règle à revoir.'] },
  // Alerte de hangar : ouverte par le serveur à un décollage en direct ; ouverte sans alerte, elle le dit
  'hangar-vide': { textes: ['Hangar sans véhicule', 'Aucun hangar vide.'] },
  // Alerte de rares : ouverte par le serveur après un relevé du catalogue ; ouverte sans alerte, elle le dit
  'rares-alerte': { textes: ['Rares en stock', 'Aucune alerte de rares.'] },
  combat: { textes: ['⚔ Combat', "aucun kill pour l'instant"], seances: ['pause · jeu fermé'], vide: ['en direct'] },
  groundcombat: { textes: ['🪖 Combat au sol', 'Kills', 'Gains', 'Mérites'], vide: ['en direct'] },
  rescue: { textes: ['Sauvetage', 'Nacelles', 'Boîtes noires'], seances: ['3 788', '2,5 M', "Livré : 7 × Nacelle d'évacuation endommagée"], vide: ['en direct'] },
  materials: { textes: ['Matériaux', 'Bruts'], seances: ['G4 12', 'pause · jeu fermé'], vide: ['G4 0'] },
  colonisation: {
    textes: ['Colonisation'],
    seances: ['5,6 %', '20 583 t', 'Titanium 5 471 t'],
    vide: ['aucun chantier suivi : amarre-toi à un dépôt de construction'],
  },
  'colonisation-list': {
    textes: ['Liste de courses'],
    seances: ['Vaisseau de colonisation · Judson Depot', 'Titanium', '5 471 t', 'Superconductors'],
    vide: ['Aucun chantier suivi : amarre-toi à un dépôt de construction.'],
  },
  // « À acheter ici » : ouverte par le serveur quand un marché est lu en direct ; ouverte sans marché lu, elle le dit
  'colonisation-station': { textes: ['À acheter ici', 'Ouvre le marché d’une station'] },
  carrier: { rien: true }, // aucun saut programmé à l'heure figée
  signals: {
    seances: ['Synuefe OU-E c28-2', "Site d'extraction de ressources [Danger]", 'arrivée à 15:09'],
    vide: ["Aucun signal utile pour l'instant."],
  },
  navroute: { rien: true }, // pas d'itinéraire tracé (NavRoute.json absent des séances)
  powerdelivery: { textes: ['Livraison Powerplay', 'En soute', 'Mérites / h', 'Recharge'] },
  rares: { textes: ['Commerce de rares', 'En soute', 'Mérites / h', 'Bénéfice'] },
  gardiens: { textes: ['Gardiens', 'Plans', 'Ramassés'] },
  'gardiens-site': { textes: ['Site gardien', 'Aucun site gardien en vue.'] },
  fsdcool: { rien: true }, // pas de refroidissement en cours (Status.json absent des séances)
  bindings: {
    seances: { rien: true }, // le rapport d'erreurs date d'avant le dernier lancement : rien à signaler
    vide: ['Profil de commandes ignoré', 'SaitekX52'],
  },
  glance: {
    textes: ["Coup d'œil", 'Crédits', 'Soute'],
    seances: { textes: ['710 436 236 cr', '1 296 017', 'Aisling Duval · rang 165'], absents: ['Couvert ✓', 'NON COUVERT'] }, // case Rachat : seulement si le rachat pose problème
    vide: ["pas d'allégeance"],
  },
  compagnon: { textes: ['Copilote'] },
  systeme: { textes: ['Moniteur PC'] },
  ia: { textes: ['Copilote'] }, // Alicia porte le nom du Compagnon (« Copilote » par défaut)
  bouclier: { textes: ['Tombés', 'Pleins'] }, // cadre de réglage de la jauge des boucliers
};

/**
 * Parcours en direct : une page de l'app ouverte sur un serveur sans journal, et le jeu qui écrit des séances une à une
 * pendant qu'elle est ouverte, entre des clics. Ce que la passe « séances » (historique) ne montre jamais : les
 * propositions de mode à côté du menu, et le menu « Mode de jeu » qui suit un changement de vaisseau.
 * etapes, dans l'ordre : { poser: séance (ses journaux, écrits en direct), cliquer: texte, textes, absents }. La page
 * s'ouvre après la première séance posée. Une étape qui échoue arrête le parcours (les suivantes en dépendent).
 */
export const EN_DIRECT = {
  url: '/',
  etapes: [
    // Mort en SRV du 29 oct. : le Panther (n° 31, sans rôle) a un hangar à Rhino : Minage Rhino proposé, avec
    // « Retenir » ; l'overlay est coupé (banc) : « Oui » ne pourrait rien ouvrir, c'est « Ouvrir la page »
    { poser: 'mort-srv-2026-10-29', textes: ['⛏ Minage Rhino ?', 'Ouvrir la page', 'Retenir comme rôle de ce vaisseau'] },
    { cliquer: 'Mode de jeu', textes: ['Vaisseau actuel', 'Panther Clipper Mk II', 'Sans rôle', '⚑ Rôle'] },
    { cliquer: '⚑ Rôle', textes: ['Rôle principal', 'Enregistrer le rôle'], styles: [EDITEUR_ROLE_A_GAUCHE] },
    // Minage Rhino du 7 nov., écrit pendant que l'éditeur est ouvert : le vaisseau devient le Type-11 (n° 43). L'éditeur
    // du Panther se referme : son brouillon ne doit jamais partir sur le Type-11
    { poser: 'minage-rhino-2026-11-07', textes: ['Vaisseau actuel', 'Type-11 Prospector', '⚑ Rôle'], absents: ['Enregistrer le rôle', 'Panther Clipper Mk II'] },
  ],
};

/**
 * Toutes les fenêtres ouvertes ensemble dans une même session (comme dans Electron), sur un serveur sans journal ;
 * puis le jeu écrit cette séance pendant qu'elles sont ouvertes. Avant : l'état vide de HUD (passe vide). Après : ce
 * qui suit, par fenêtre (apres). Une fenêtre qui ne suit pas, ou qui ne peut plus interroger le serveur, est un défaut.
 */
const PROPOSE = '✚ Sauvetage ?'; // mode proposé d'après la séance (capsule ramassée) : message temps réel à toutes
export const FENETRES = {
  seance: 'minage-rhino-2026-11-07',
  attendus: {
    waypoints: { apres: ['⛏ Minage', PROPOSE] },
    // Position : envoyée aux fenêtres à chaque écriture de Status.json, absent des séances (journaux seuls)
    'waypoints-list': { apres: ['Repères'] },
    'waypoints-guide': { apres: ['Aucune destination.'] },
    capture: { apres: ['📷'] },
    'waypoints-sweep': { apres: ['Je suis au centre'] },
    'waypoints-sweep-top': { apres: ['Prix injoignables pour l’instant.'] },
    'waypoints-sweep-pose': { apres: ['Pose un repère avec 📍 ou Alt+Maj+R.'] },
    shipmining: { apres: ['26 t', 'pause · jeu fermé', PROPOSE] },
    'expansion-sale': { apres: { rien: true } },
    'engineering-visit': { apres: ['Chez'] },
    'engineering-passage': { apres: ['Utile ici pour tes plans'] },
    bilan: { apres: ['Bilan'] },
    vigie: { apres: ['Aucune règle à revoir.'] },
    'hangar-vide': { apres: ['Aucun hangar vide.'] },
    'rares-alerte': { apres: ['Aucune alerte de rares.'] },
    combat: { apres: ['pause · jeu fermé', PROPOSE] },
    groundcombat: { apres: ['Kills'] },
    rescue: { apres: ['Nacelles', 'Récompenses', '2,5 M', 'pause · jeu fermé', PROPOSE] },
    materials: { apres: ['Bruts', '76', 'pause · jeu fermé', PROPOSE] },
    powerdelivery: { apres: ['En soute', 'Mérites / h'] },
    rares: { apres: ['En soute', 'Mérites / h'] },
    gardiens: { apres: ['Plans', 'Ramassés'] },
    'gardiens-site': { apres: ['Aucun site gardien en vue.'] },
    colonisation: { apres: [PROPOSE] }, // pas de chantier dans cette séance
    'colonisation-list': { apres: ['Aucun chantier suivi'] },
    'colonisation-station': { apres: ['Ouvre le marché d’une station'] },
    carrier: { apres: { rien: true } },
    signals: { apres: ['Synuefe OU-E c28-2', "Site d'extraction de ressources [Danger]", 'arrivée à 15:09'] },
    navroute: { apres: { rien: true } },
    fsdcool: { apres: { rien: true } },
    bindings: { apres: { rien: true } }, // le jeu a été relancé après le rapport d'erreurs : l'alerte s'en va
    glance: { apres: ['710 436 236 cr', '1 296 017', 'Aisling Duval · rang 165'] },
    compagnon: { apres: ['Copilote'] },
    systeme: { apres: ['Moniteur PC'] },
    ia: { apres: ['Copilote'] },
    bouclier: { apres: ['Tombés', 'Pleins'] },
  },
};
