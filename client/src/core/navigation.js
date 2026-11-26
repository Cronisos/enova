// Icônes : des symboles d'une seule couleur (jamais d'emoji en couleur), teintés en orange comme les panneaux du jeu.
// Plan de l'application, rangé par ce que veut faire le joueur (testé par navigation.test.js). Un seul endroit : le menu
// en cascade (bouton en haut à gauche), les rubriques de la barre du haut, leurs pages (cartes vers les sous-pages) et
// le fil d'Ariane en haut de chaque page en viennent. Ajouter une page : une entrée ici, à sa place.
//
// Une entrée : { id, titre, icone, chemin, description, enfants, cartes, module }. Une rubrique (premier niveau) a sa propre page,
// faite de cartes vers ses enfants, sauf si son chemin est celui d'une de ses pages (Ingénierie : le tableau de bord) ou
// si elle a déjà sa page à elle (cartes: false, Mes vaisseaux : la flotte). « module » : celui d'un module facultatif
// (l'IA de bord), sans qui l'entrée disparaît.

// Modules facultatifs présents (version complète : l'IA de bord ; la version escadron est construite sans). Une
// entrée qui porte « module » n'apparaît que si ce module est là. Hors de Vite (tests sous Node), tous comptés présents.
const FACULTATIFS = import.meta.env
  ? new Set(Object.keys(import.meta.glob('../modules/ia/index.js')).map((p) => p.split('/')[2]))
  : null;
/** Entrée (et ses enfants) sans celles d'un module facultatif absent ; null si elle-même est absente. */
function sansAbsents(e) {
  if (!e || (e.module && FACULTATIFS && !FACULTATIFS.has(e.module))) return null;
  return e.enfants ? { ...e, enfants: e.enfants.map(sansAbsents).filter(Boolean) } : e;
}

export const PLAN = Object.freeze([
  {
    id: 'vaisseaux', titre: 'Mes vaisseaux', icone: '▲', chemin: '/vaisseaux', description: 'Ta flotte, tes builds',
    // Sa propre page est la flotte (module vaisseaux), pas une page de cartes
    cartes: false,
    enfants: [
      {
        id: 'builds', titre: 'Builds', icone: '◇', chemin: '/builder', description: 'Tes builds, en créer, les comparer',
        enfants: [
          { id: 'mes-builds', titre: 'Mes builds', chemin: '/builder' },
          { id: 'nouveau-build', titre: 'Nouveau build', chemin: '/builder/nouveau' },
          { id: 'tous-vaisseaux', titre: 'Tous les vaisseaux', chemin: '/builder/vaisseaux' },
          { id: 'comparer', titre: 'Comparer', chemin: '/builder/comparer' },
          { id: 'builds-escadron', titre: 'Escadron', chemin: '/builder/escadron' },
        ],
      },
    ],
  },
  {
    id: 'ingenierie', titre: 'Ingénierie', icone: '⚙︎', chemin: '/ingenierie', description: 'Ingénieurs, matériaux, rangs',
    enfants: [
      { id: 'tableau', titre: 'Tableau de bord', icone: '▤', chemin: '/ingenierie', description: 'Où en sont tes plans' },
      { id: 'nouveau-plan', titre: 'Nouveau plan', icone: '+', chemin: '/ingenierie/nouveau-plan', description: 'Depuis un build ou un vaisseau vierge' },
      { id: 'ingenieurs', titre: 'Ingénieurs', icone: '◉', chemin: '/ingenierie/ingenieurs', description: 'Débloqués ou non, ton rang chez chacun, où les trouver' },
      { id: 'materiaux', titre: 'Matériaux', icone: '◈', chemin: '/ingenierie/materiaux', description: 'Ce que tu as, ce qu’il te manque' },
      { id: 'rangs', titre: 'Rangs', icone: '★', chemin: '/ingenierie/rangs', description: 'Monter de rang chez un ingénieur' },
      { id: 'itineraire', titre: 'Itinéraire', icone: '➤', chemin: '/ingenierie/itineraire', description: 'Le tour des ingénieurs pour tes plans' },
      { id: 'donnees', titre: 'Données de référence', icone: '⟳', chemin: '/ingenierie/donnees', description: 'Mettre à jour les modules, plans et ingénieurs' },
    ],
  },
  {
    id: 'activites', titre: 'Activités', icone: '◎', chemin: '/activites', description: 'Ce que tu fais en jeu',
    enfants: [
      { id: 'commerce', titre: 'Commerce', icone: '⇄', chemin: '/routes', description: 'Tes routes commerciales et leurs gains' },
      { id: 'commerce-rares', titre: 'Commerce de rares', icone: '◆', chemin: '/commerce-rares', description: 'Marchandises rares : mérites, taux horaire, bénéfice' },
      {
        id: 'minage', titre: 'Minage', icone: '⛏︎', chemin: '/reperes', description: 'Au Rhino ou en vaisseau',
        enfants: [
          { id: 'minage-rhino', titre: 'Minage Rhino', icone: '⛏︎', chemin: '/reperes', description: 'Tes repères de minage au sol' },
          { id: 'minage-vaisseau', titre: 'Minage vaisseau', icone: '☄︎', chemin: '/minage-vaisseau', description: 'Prospection, raffinage, soute' },
        ],
      },
      { id: 'combat', titre: 'Combat', icone: '⚔︎', chemin: '/combat', description: 'Primes, mérites, ennemis abattus' },
      { id: 'combat-sol', titre: 'Combat au sol', icone: '🪖', chemin: '/combat-au-sol', description: 'Zones de conflit à pied, kills, mérites' },
      { id: 'sauvetage', titre: 'Sauvetage', icone: '✚', chemin: '/sauvetage', description: 'Nacelles récupérées et livrées' },
      { id: 'collecte', titre: 'Collecte de matériaux', icone: '◈', chemin: '/materiaux', description: 'Matériaux récupérés pendant la session' },
      { id: 'livraison-powerplay', titre: 'Livraison Powerplay', icone: '▤', chemin: '/livraison-powerplay', description: 'Ressources de ta puissance : soute, livraisons, mérites' },
      {
        id: 'gardiens', titre: 'Gardiens', icone: '◬', chemin: '/gardiens', description: 'Ce que tu veux débloquer, ce qu’il te manque, les sites',
        enfants: [
          { id: 'gardiens-plan', titre: 'Planificateur', chemin: '/gardiens' },
          { id: 'gardiens-sites', titre: 'Sites', chemin: '/gardiens?onglet=sites' },
          { id: 'gardiens-methode', titre: 'Méthode', chemin: '/gardiens?onglet=methode' },
        ],
      },
      { id: 'colonisation', titre: 'Colonisation', icone: '▣', chemin: '/colonisation', description: 'Tes chantiers et ce qu’il leur manque' },
      { id: 'bilans', titre: 'Bilans de session', icone: '▦', chemin: '/bilans', description: 'Tes sessions de jeu, comparées' },
    ],
  },
  {
    id: 'powerplay', titre: 'Powerplay & Escadron', icone: '⚑', chemin: '/powerplay', description: 'Ta puissance, tes systèmes, ton escadron',
    enfants: [
      {
        id: 'extension', titre: 'Projet extension', icone: '⚑', chemin: '/extension', description: 'Mérites, ventes, routes, où agir',
        enfants: [
          { id: 'ext-historique', titre: 'Historique des mérites', chemin: '/extension' },
          { id: 'ext-vente', titre: 'Mérites à la vente', chemin: '/extension?onglet=vente' },
          { id: 'ext-heure', titre: 'Mérites par heure', chemin: '/extension?onglet=merites-heure' },
          { id: 'ext-routes', titre: 'Routes d’extension', chemin: '/extension?onglet=routes' },
          { id: 'ext-calculateur', titre: 'Calculateur de routes', chemin: '/extension?onglet=calculateur' },
          { id: 'ext-ou-agir', titre: 'Où agir cette semaine', chemin: '/extension?onglet=ou-agir' },
        ],
      },
      {
        // Pages du module Colonisation (les modules ne s'importent pas entre eux), rangées ici : c'est l'affaire de l'escadron
        id: 'colonisation-escadron', titre: 'Colonisation de l’escadron', icone: '▣', chemin: '/colonisation/escadron', description: 'Les chantiers de l’escadron, dans l’ordre du chef',
        enfants: [
          { id: 'colo-esc-projet', titre: 'Projet en cours', chemin: '/colonisation/escadron' },
          { id: 'colo-esc-composer', titre: 'Composer le projet (chef)', chemin: '/colonisation/escadron/composer' },
        ],
      },
      { id: 'systemes', titre: 'Systèmes importants', icone: '★', chemin: '/systemes', description: 'Les systèmes que tu suis' },
      {
        id: 'escadron', titre: 'Escadron', icone: '⛨', chemin: '/escadron', description: 'Ton apport à l’escadron, le rejoindre',
        enfants: [
          { id: 'esc-envois', titre: 'Mes envois et mon apport', chemin: '/escadron' },
          { id: 'esc-rejoindre', titre: 'Rejoindre l’escadron', chemin: '/escadron/rejoindre' },
          { id: 'esc-chef', titre: 'Serveur de l’escadron (chef)', chemin: '/escadron/chef' },
        ],
      },
    ],
  },
  {
    id: 'outils', titre: 'Outils', icone: '✦', chemin: '/outils', description: 'Sites, réglages du jeu, compagnon',
    enfants: [
      {
        // Les sites affichés dans l'app (core/sitesExternes.js) et les liens vers le reste : une seule entrée
        id: 'applications', titre: 'Sites et applications', icone: '↗', chemin: '/applications', description: 'Inara, Spansh, EDSY, Coriolis dans l’app, et tes liens pour ta position',
        enfants: [
          { id: 'applications-liens', titre: 'Liens', chemin: '/applications' },
          { id: 'inara', titre: 'Inara', icone: '◈', chemin: '/inara' },
          { id: 'spansh', titre: 'Spansh', icone: '✧', chemin: '/spansh' },
          { id: 'edsy', titre: 'EDSY', icone: '◇', chemin: '/edsy' },
          { id: 'coriolis', titre: 'Coriolis', icone: '⬡', chemin: '/coriolis' },
        ],
      },
      // La vigie des règles (/regles/vigie) n'a pas d'entrée : outil de développement, coupé par défaut, ouvert depuis
      // Paramètres ou l'onglet de la page quand il est allumé (server/src/core/vigie.js)
      { id: 'regles', titre: 'Règles du jeu', icone: '§', chemin: '/regles', description: 'Comment le jeu calcule, en français' },
      { id: 'coup-doeil', titre: 'Coup d’œil', icone: '◐', chemin: '/coup-doeil', description: 'La fenêtre en jeu qui résume tout' },
      { id: 'tutoriels', titre: 'Tutoriels', icone: '?', chemin: '/tutoriels', description: 'Tous les tutoriels : vus ou non, à revoir, à passer' },
      { id: 'fenetres-en-jeu', titre: 'Fenêtres en jeu', icone: '◫', chemin: '/fenetres-en-jeu', description: 'Ce que l’app affiche par-dessus le jeu, expliqué bouton par bouton' },
      { id: 'couleurs-hud', titre: 'Couleurs du HUD', icone: '◍', chemin: '/couleurs-hud', description: 'Changer les couleurs de ton cockpit' },
      {
        id: 'commandes', titre: 'Commandes du jeu', icone: '⌨︎', chemin: '/commandes', description: 'Tes touches, où les régler, ton profil',
        enfants: [
          { id: 'mes-commandes', titre: 'Mes commandes', chemin: '/commandes/mes-commandes' },
          { id: 'garde-commandes', titre: 'Garde des commandes', chemin: '/commandes' },
        ],
      },
      { id: 'compagnon', titre: 'Compagnon', icone: '☺︎', chemin: '/compagnon', description: 'Ton personnage, son avatar et ses phrases' },
      { id: 'moniteur', titre: 'Moniteur PC', icone: '▥', chemin: '/moniteur', description: 'Carte graphique, mémoire vidéo, processeur : la fenêtre en jeu' },
      { id: 'ia', titre: 'Alicia', icone: '✶', chemin: '/ia', description: 'Ton IA de bord, sur ton PC : pose-lui tes questions', module: 'ia' },
    ],
  },
].map(sansAbsents));

/** Entrée du plan par son identifiant (à n'importe quel niveau), ou null. */
export function entree(id, plan = PLAN) {
  return aPlat(plan).find((c) => c.at(-1).id === id)?.at(-1) ?? null;
}

/**
 * Onglet allumé seulement sur sa propre page (`end`) quand un autre onglet vit sous son adresse (Tableau de bord,
 * /ingenierie, sous lequel sont /ingenierie/ingenieurs…) ; sinon aussi sur ses sous-pages (/builder/build/3).
 */
export const exact = (e, freres) => freres.some((f) => f !== e && f.chemin.startsWith(`${e.chemin}/`));

/** Rubrique qui a sa propre page de cartes (son chemin n'est la page d'aucun de ses enfants). */
export const aSaPage = (rubrique) => rubrique.cartes !== false && !rubrique.enfants.some((e) => e.chemin === rubrique.chemin);

/** Entrée qui est elle-même une page, en plus de ses sous-pages (Mes vaisseaux : la flotte) : son propre onglet. */
export const estUnePage = (e) => Boolean(e.enfants) && !e.enfants.some((x) => x.chemin === e.chemin);

/** Toutes les entrées, à plat, avec leur chaîne de parents ([rubrique, …, entrée]). */
export function aPlat(plan = PLAN) {
  const out = [];
  const tour = (entrees, parents) => {
    for (const e of entrees) {
      const chaine = [...parents, e];
      out.push(chaine);
      if (e.enfants) tour(e.enfants, chaine);
    }
  };
  tour(plan, []);
  return out;
}

/** Une adresse (« /extension?onglet=vente ») : chemin et paramètres. */
function decouper(adresse) {
  const [chemin, recherche = ''] = String(adresse).split('?');
  return { chemin: chemin.replace(/\/$/, '') || '/', params: new URLSearchParams(recherche) };
}

/**
 * Fil d'Ariane de la page affichée : la chaîne [rubrique, …, entrée] qui lui correspond le mieux (chemin le plus long
 * qui la contient, paramètres compris s'il en a, entrée la plus profonde à égalité), ou [] (accueil, page hors plan).
 */
export function filDAriane(pathname, search = '', plan = PLAN) {
  const ici = decouper(`${pathname}${search ? (search.startsWith('?') ? search : `?${search}`) : ''}`);
  let meilleure = [];
  let score = -1;
  for (const chaine of aPlat(plan)) {
    const e = decouper(chaine.at(-1).chemin);
    const contient = ici.chemin === e.chemin || (e.chemin !== '/' && ici.chemin.startsWith(`${e.chemin}/`));
    if (!contient) continue;
    const paramsOk = [...e.params].every(([k, v]) => ici.params.get(k) === v);
    if (!paramsOk) continue;
    // Une entrée sans paramètre ne vaut pas pour un onglet qui en a un (Historique ≠ Vente)
    const sansParamPourOnglet = [...e.params].length === 0 && [...ici.params.keys()].some((k) => k === 'onglet');
    const s = e.chemin.length * 100 + [...e.params].length * 10 + chaine.length - (sansParamPourOnglet ? 50 : 0);
    if (s > score) {
      score = s;
      meilleure = chaine;
    }
  }
  return meilleure;
}

/** Rubrique de la page affichée (pour allumer son bouton dans la barre du haut), ou null. */
export function rubriqueActive(pathname, search = '', plan = PLAN) {
  const direct = plan.find((r) => decouper(r.chemin).chemin === (pathname.replace(/\/$/, '') || '/'));
  return direct || filDAriane(pathname, search, plan)[0] || null;
}
