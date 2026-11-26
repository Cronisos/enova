// Tutoriels du groupe ingénierie (voir ../moteur.js pour la forme d'un parcours).
// Les cibles sont des attributs data-tuto="ingenierie-…" posés dans client/src/modules/engineering.
// Ordre à garder : « ingenierie-ingenieurs » avant « ingenierie-ingenieur-fiche ». Les deux ont la même adresse, le
// second vaut aussi pour les sous-pages (la fiche d'un ingénieur) : sur la liste, c'est le premier des deux qui est pris.

const t = (nom) => `[data-tuto="ingenierie-${nom}"]`;

export const PARCOURS_INGENIERIE = [
  {
    id: 'ingenierie-tableau',
    titre: 'Ingénierie : tableau de bord',
    chemin: '/ingenierie',
    etapes: [
      {
        titre: 'Où en sont tes plans',
        texte: 'Un plan, c’est ce que tu veux faire modifier sur un vaisseau par les ingénieurs du jeu. Cette page résume tes plans : leur avancement et les matériaux qui te manquent encore.',
      },
      {
        cible: '.tabs',
        titre: 'Les pages de l’ingénierie',
        texte: 'Créer un plan, voir les ingénieurs, ton stock de matériaux, les rangs, l’itinéraire et les données de référence. Chaque page a son propre tutoriel.',
      },
      {
        cible: t('tdb-vide'),
        titre: 'Aucun plan pour l’instant',
        texte: 'Tant que tu n’as pas de plan, la page reste vide. Ce bouton t’emmène à Mes vaisseaux pour en choisir un. Tu peux aussi passer par l’onglet « Nouveau plan », juste au-dessus.',
      },
      {
        cible: t('tdb-plans'),
        titre: 'Tes plans suivis',
        texte: 'Une carte par plan : son avancement, ses modules terminés, les matériaux manquants. Clique sur le vaisseau pour ouvrir le plan. « Retirer » l’enlève du tableau de bord sans le supprimer.',
      },
      {
        cible: t('tdb-ajouter'),
        titre: 'Ajouter un plan',
        texte: 'Ouvre la liste de tes plans qui ne sont pas encore au tableau de bord, pour en ajouter un d’un clic. Tu peux aussi y créer un nouveau plan.',
      },
      {
        cible: t('tdb-chiffres'),
        titre: 'Les chiffres, tous plans confondus',
        texte: 'La part des matériaux déjà réunis, les modules terminés, le nombre de matériaux manquants, et les plans que tu peux finir tout de suite avec ton stock. Le stock est commun : un matériau n’est jamais compté deux fois.',
      },
      {
        cible: t('tdb-manque'),
        titre: 'Ce qui manque',
        texte: 'La liste des matériaux à aller chercher pour tous les plans du tableau de bord : combien il en faut, combien tu en as, combien il en manque, et comment les obtenir.',
      },
      {
        cible: t('tdb-echangeur'),
        titre: 'Échangeur de matériaux',
        texte: 'Pour chaque matériau manquant, ce que tu peux donner chez un échangeur du jeu sans toucher à ce que tes plans utilisent. En bas, les échangeurs connus les plus proches.',
      },
    ],
  },
  {
    id: 'ingenierie-nouveau-plan',
    titre: 'Ingénierie : nouveau plan',
    chemin: '/ingenierie/nouveau-plan',
    etapes: [
      {
        titre: 'Créer un plan',
        texte: 'Un plan dit, module par module, ce que tu veux obtenir des ingénieurs sur un vaisseau. Il y a trois façons d’en créer un. Une fois créé, le plan s’ouvre tout seul.',
      },
      {
        cible: t('np-mien'),
        titre: 'À partir d’un de tes vaisseaux',
        texte: 'Le cas le plus courant. Choisis un vaisseau dans la liste, puis « Créer un plan » : le plan part de ce qui est monté dessus aujourd’hui. Si ce vaisseau a déjà un plan, le bouton devient « Ouvrir le plan ».',
      },
      {
        cible: t('np-import'),
        titre: 'Importer un build',
        texte: 'Si tu as préparé un équipement ailleurs, colle ici son lien EDSY ou un export JSON au format Loadout. Quand tu as des builds dans le Constructeur de builds de l’app, une liste apparaît aussi pour en choisir un.',
      },
      {
        cible: t('np-cible'),
        titre: 'Appliquer le build à un vaisseau',
        texte: 'Choisis à quoi appliquer le build : un vaisseau vierge, ou l’un des tiens, dont la config actuelle sera prise en compte. « Importer » crée alors le plan. Si ce vaisseau a déjà un plan, l’app te demande avant de le remplacer.',
      },
      {
        cible: t('np-vierge'),
        titre: 'Vaisseau vierge',
        texte: 'Pour préparer un vaisseau que tu n’as pas encore : choisis son modèle, puis « Créer un plan vierge ». Le bouton reste grisé tant qu’aucun modèle n’est choisi.',
      },
    ],
  },
  {
    id: 'ingenierie-plan',
    titre: 'Ingénierie : un plan',
    chemin: '/ingenierie/plan',
    sousPages: true,
    etapes: [
      {
        titre: 'Le plan d’un vaisseau',
        texte: 'Ici tu vois, emplacement par emplacement, ce qui est à bord de ton vaisseau, ce que le plan vise et ce qui reste à faire. L’app calcule ensuite les matériaux et les ingénieurs qu’il te faut.',
      },
      {
        cible: t('plan-chiffres'),
        titre: 'Où en est ce plan',
        texte: 'La part des matériaux réunis, les modules déjà au niveau visé, les matériaux manquants, et le nombre d’applications restantes. Une application, c’est un passage de la modification chez l’ingénieur.',
      },
      {
        cible: t('plan-ligne'),
        titre: 'Un emplacement',
        texte: 'À gauche, ce qui est à bord aujourd’hui, d’après ton journal : il est lu quand tu montes dans le vaisseau. À droite, ce que vise le plan : le module, sa modification, son grade et son effet expérimental.',
      },
      {
        cible: t('plan-statut'),
        titre: 'Ce qui reste à faire',
        texte: 'Au bout de la ligne : une coche quand le module est au niveau visé, « à monter » quand le module visé n’est pas celui qui est à bord, et le nombre d’applications qui restent. Le signe « ≈ » veut dire que ce nombre est une estimation. Survole la pastille pour le détail.',
      },
      {
        cible: t('plan-actions'),
        titre: 'Les boutons du plan',
        texte: '« Modifier le plan » ouvre les réglages : le module, la modification, le grade et l’effet de chaque emplacement, « Tout en G5 » pour viser d’un coup le grade maximal, et « Revenir à la config actuelle », qui annule tes choix après confirmation. « Supprimer le plan » l’efface pour de bon, après confirmation aussi.',
      },
      {
        cible: t('plan-calculer'),
        action: 'clic',
        titre: 'Calculer',
        texte: 'Ce bouton affiche le détail du plan en bas de page : matériaux, rangs et ingénieurs. Il ne change rien à ton plan. Clique dessus.',
      },
      {
        cible: t('plan-materiaux'),
        titre: 'Matériaux nécessaires',
        texte: 'Tous les matériaux du plan : ce qu’il faut, ce que tu possèdes, ce qui manque, et comment l’obtenir. En vert ce qui est réuni, en rouge ce qui manque.',
      },
      {
        cible: t('plan-ingenieurs'),
        titre: 'Ingénieurs par module',
        texte: 'Pour chaque module qui reste à faire : les étapes, grade par grade, et l’ingénieur chez qui aller. Un rang trop bas chez un ingénieur demande des applications en plus, signalées ici.',
      },
      {
        cible: t('plan-valider'),
        titre: 'Valider le plan',
        texte: 'Quand le plan te convient, « Valider ce plan » calcule l’itinéraire des ingénieurs depuis ta position. Si tu modifies le plan ensuite, il faudra le revalider. Tu peux annuler la validation à tout moment.',
      },
    ],
  },
  {
    id: 'ingenierie-ingenieurs',
    titre: 'Ingénierie : ingénieurs',
    chemin: '/ingenierie/ingenieurs',
    etapes: [
      {
        titre: 'Les ingénieurs',
        texte: 'Tous les ingénieurs de vaisseau, du plus proche au plus lointain, avec où tu en es chez chacun : pas encore découvert, connu, invité ou débloqué.',
      },
      {
        cible: t('ing-region'),
        titre: 'Région',
        texte: 'Les ingénieurs sont dans deux régions de la galaxie : la Bulle et Colonia. Cette liste n’en garde qu’une.',
      },
      {
        cible: t('ing-debloques'),
        titre: 'Débloqués seulement',
        texte: 'Coche cette case pour ne voir que les ingénieurs chez qui tu peux déjà faire modifier tes modules.',
      },
      {
        cible: t('ing-qui'),
        titre: 'Qui fait quoi ?',
        texte: 'Choisis un module, puis une modification : il ne reste que les ingénieurs qui la proposent. Le grade maximal de chacun s’affiche alors sur son portrait.',
      },
      {
        cible: t('ing-familles'),
        titre: 'Les familles de modules',
        texte: 'Un clic sur une famille (armes thermiques, boucliers, FSD et propulseurs…) ne garde que les ingénieurs qui travaillent dessus. Clique à nouveau dessus, ou sur « Tous », pour revenir à la liste complète.',
      },
      {
        cible: t('ing-carte'),
        titre: 'La carte d’un ingénieur',
        texte: 'Son état chez toi et ton rang, sa base et son système, la distance en années-lumière, la taille de plateforme, le permis s’il en faut un. En dessous, ce qu’il modifie, avec le grade le plus haut qu’il propose.',
      },
      {
        titre: 'Ouvrir sa fiche',
        texte: 'Un clic sur une carte ouvre la fiche de l’ingénieur : comment le débloquer, ce qu’il peut faire pour tes plans, et ton épingle chez lui.',
      },
    ],
  },
  {
    id: 'ingenierie-ingenieur-fiche',
    titre: 'Ingénierie : fiche d’un ingénieur',
    chemin: '/ingenierie/ingenieurs',
    sousPages: true,
    etapes: [
      {
        titre: 'La fiche d’un ingénieur',
        texte: 'Tout ce que l’app sait de cet ingénieur : où il est, où tu en es chez lui, ce qu’il propose et ce qu’il peut faire pour tes plans.',
      },
      {
        cible: t('fiche-lieu'),
        titre: 'Où il est, et où tu en es',
        texte: 'Sa base, ses plateformes et son permis, puis ton état chez lui. La liste donne les conditions pour le découvrir, être invité et le débloquer, avec ce que tu as déjà.',
      },
      {
        cible: t('fiche-epingle'),
        titre: 'Ton épingle',
        texte: 'Le jeu n’écrit pas tes épingles dans ses journaux. L’app en déduit ce qu’elle peut, et tu peux lui dire ici ce que tu as épinglé chez cet ingénieur, puis « Enregistrer ». L’itinéraire s’en sert pour savoir ce qui peut se faire à distance.',
      },
      {
        cible: t('fiche-plans'),
        titre: 'Pour tes plans validés',
        texte: 'Les modules de tes plans validés que cet ingénieur modifie, et ce que le dernier itinéraire calculé prévoit chez lui. Vide tant que tu n’as validé aucun plan.',
      },
      {
        cible: t('fiche-offres'),
        titre: 'Ce qu’il propose',
        texte: 'Toutes les modifications qu’il sait faire, rangées par type de module, avec le grade le plus haut qu’il atteint.',
      },
      {
        cible: t('fiche-sources'),
        action: 'clic',
        titre: 'Les sources',
        texte: 'D’où viennent les informations de cette fiche. Clique sur la ligne pour déplier la liste.',
      },
    ],
  },
  {
    id: 'ingenierie-materiaux',
    titre: 'Ingénierie : matériaux',
    chemin: '/ingenierie/materiaux',
    etapes: [
      {
        titre: 'Ton stock de matériaux',
        texte: 'Tous les matériaux d’ingénierie que tu transportes, suivis en direct pendant que tu joues. Ils sont rangés comme chez les échangeurs du jeu.',
      },
      {
        cible: t('mat-recherche'),
        titre: 'Rechercher',
        texte: 'Tape quelques lettres pour ne garder que les matériaux qui correspondent. Le nom français et le nom anglais marchent tous les deux, avec ou sans accents.',
      },
      {
        cible: t('mat-grades'),
        action: 'clic',
        titre: 'Filtrer par grade',
        texte: 'Chaque matériau a un grade, de G1 à G5. Clique sur un grade pour ne montrer que lui. Tu peux en choisir plusieurs.',
      },
      {
        cible: '.mat-grades-tous',
        action: 'clic',
        titre: 'Revenir à tous les grades',
        texte: 'Ce bouton n’apparaît que quand un filtre est posé. Clique dessus pour revoir tous les grades.',
      },
      {
        cible: t('mat-date'),
        titre: 'D’où viennent ces chiffres',
        texte: 'Le stock est relu dans le jeu à chaque lancement, puis suivi en direct. Certaines récompenses, comme celles du Powerplay, n’apparaissent qu’à ta reconnexion suivante.',
      },
      {
        cible: t('mat-colonnes'),
        titre: 'Trois types de matériaux',
        texte: 'Matières premières, manufacturés et données. Dans chaque colonne, les matériaux sont groupés par catégorie, du grade 1 au grade 5.',
      },
      {
        cible: t('mat-ligne'),
        titre: 'Une ligne, un matériau',
        texte: 'Son grade, son nom, une barre de remplissage, puis ce que tu en as sur le maximum que tu peux porter. Un matériau à zéro reste affiché, en retrait. Survole la ligne pour savoir comment l’obtenir.',
      },
    ],
  },
  {
    id: 'ingenierie-rangs',
    titre: 'Ingénierie : rangs',
    chemin: '/ingenierie/rangs',
    etapes: [
      {
        titre: 'Les rangs chez les ingénieurs',
        texte: 'Chez chaque ingénieur tu as un rang, de 1 à 5. Plus il est haut, moins un grade demande d’applications. Cette page montre les règles que l’app utilise pour ses calculs, et ce que tes journaux mesurent.',
      },
      {
        cible: t('rangs-table'),
        titre: 'La table des règles',
        texte: 'Une ligne par rang et par grade : combien d’applications pour finir le grade, et combien pour passer au rang suivant. Les colonnes « (table) » sont les règles de l’app. Les colonnes « dans tes journaux » viennent de tes propres applications.',
      },
      {
        cible: t('rangs-regles'),
        titre: 'Les règles générales',
        texte: 'Par exemple : le rang ne monte qu’à l’atelier de l’ingénieur, pas à distance. Chaque règle porte une pastille qui dit si elle est mesurée, à vérifier ou inconnue. Survole la pastille pour savoir pourquoi.',
      },
      {
        cible: t('rangs-miens'),
        titre: 'Tes ingénieurs sous le rang 5',
        texte: 'Les ingénieurs débloqués chez qui tu peux encore monter, avec ton rang et ta progression. La liste reste vide tant que tes journaux ne montrent aucun ingénieur débloqué.',
      },
      {
        cible: t('rangs-montees'),
        titre: 'Tes montées de rang',
        texte: 'Chaque montée de rang lue dans tes journaux, avec le nombre d’applications qu’elle a demandé. Elles s’ajoutent en direct quand tu fais tes applications à l’atelier d’un ingénieur.',
      },
      {
        titre: 'Quand une mesure contredit la table',
        texte: 'Si une de tes mesures ne colle pas à la table des règles, un bloc « Écarts avec la table » apparaît sur cette page. La table ne change jamais d’elle-même.',
      },
    ],
  },
  {
    id: 'ingenierie-itineraire',
    titre: 'Ingénierie : itinéraire',
    chemin: '/ingenierie/itineraire',
    etapes: [
      {
        titre: 'Le tour des ingénieurs',
        texte: 'Cette page calcule le trajet à faire pour réaliser tes plans validés : chez quels ingénieurs passer, dans quel ordre, et quoi faire chez chacun.',
      },
      {
        cible: t('iti-plans'),
        titre: 'Tes plans validés',
        texte: 'Ici s’affichent tes plans validés, chacun avec sa case à cocher pour le compter ou non dans le trajet. S’il n’y en a aucun, ouvre un plan et clique sur « Valider ce plan ».',
      },
      {
        cible: t('iti-depart'),
        titre: 'Le point de départ',
        texte: 'D’où part le trajet : ta position, Sol, Colonia, ou la base d’un ingénieur que tu choisis dans la liste. « Ma position » est grisée tant que l’app ne sait pas où tu es.',
      },
      {
        cible: t('iti-calculer'),
        titre: 'Calculer l’itinéraire',
        texte: 'Ce bouton lance le calcul. Il est grisé tant qu’aucun plan n’est coché. Le calcul ne se refait que quand tu cliques, ou quand tu valides un plan : tes sauts ne le changent pas.',
      },
      {
        cible: t('iti-resume'),
        titre: 'Le résumé du calcul',
        texte: 'D’où et quand l’itinéraire a été calculé, ce qui a changé depuis, et ses chiffres. Un bouton « Recalculer » peut t’y proposer de repartir de ta position.',
      },
      {
        cible: t('iti-distance'),
        titre: 'À distance, quand tu veux',
        texte: 'Ce que tu peux faire sans aller chez l’ingénieur, depuis une station qui propose l’atelier à distance. À distance, ton rang ne monte pas et aucun effet expérimental ne se pose.',
      },
      {
        cible: t('iti-escale'),
        titre: 'Une escale',
        texte: 'Qui, où, et ce que tu vas y faire. Les cases se cochent toutes seules pendant que tu joues. « Fiche » ouvre la page de l’ingénieur. « Ne pas y passer » l’écarte et relance le calcul.',
      },
      {
        titre: 'En jeu',
        texte: 'Quand tu es à quai chez un ingénieur qui a des tâches pour toi, une fiche « Chez l’ingénieur » s’ouvre par-dessus le jeu. Elle s’affiche aussi en haut de cette page.',
      },
    ],
  },
  {
    id: 'ingenierie-donnees',
    titre: 'Ingénierie : données de référence',
    chemin: '/ingenierie/donnees',
    etapes: [
      {
        titre: 'Les données de référence',
        texte: 'Pour ses calculs, l’app a besoin d’une base : les vaisseaux, les modules et les recettes des ingénieurs. Elle est téléchargée une fois, puis gardée sur ton PC. Cette page dit où elle en est.',
      },
      {
        cible: t('don-etat'),
        titre: 'Ce qui est installé',
        texte: 'La version des données, la date de leur téléchargement et le nombre de fichiers. S’il n’y a encore rien, ou si la lecture a échoué, c’est écrit ici.',
      },
      {
        cible: t('don-verif'),
        titre: 'La vérification',
        texte: 'L’app vérifie que ces données sont exactement celles prévues pour ta version de l’app. En vert, tout va bien. Sinon, un avertissement t’explique ce qui cloche et te conseille de mettre à jour.',
      },
      {
        cible: t('don-sources'),
        titre: 'D’où elles viennent',
        texte: 'Les projets de la communauté qui fournissent ces données et les dessins des vaisseaux. Le détail est dans le fichier CREDITS.md de l’app.',
      },
      {
        cible: t('don-maj'),
        titre: 'Mettre à jour les données',
        texte: 'Ce bouton télécharge à nouveau les données sur internet. Sers-t’en seulement si un avertissement te le demande, ou si un vaisseau ou un module récent manque. Inutile de cliquer maintenant.',
      },
      {
        cible: t('don-regle'),
        titre: 'La règle des applications',
        texte: 'Un rappel de la règle que l’app utilise pour compter les applications : plus ton rang est haut chez un ingénieur, moins un grade en demande. Le détail et les mesures sont dans l’onglet « Rangs ».',
      },
    ],
  },
];
