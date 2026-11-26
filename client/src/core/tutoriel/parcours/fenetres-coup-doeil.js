// Tutoriels des fenêtres en jeu (voir ../moteur.js pour la forme d'un parcours) : la page d'accueil « Fenêtres en jeu »
// et la fenêtre Coup d'œil, montrée en démonstration. Aucun clic demandé : les cartes changent l'adresse, et le seul
// bouton de la fenêtre (copier le nom du système) écrit dans le presse-papiers.

const tuto = (nom) => `[data-tuto="${nom}"]`;
const GLANCE = 'glance';

export const PARCOURS_FENETRES_COUP_DOEIL = [
  {
    id: 'jeu-accueil',
    titre: 'Fenêtres en jeu',
    chemin: '/fenetres-en-jeu',
    etapes: [
      {
        titre: 'Les fenêtres en jeu',
        texte: 'Pendant que tu joues, l’app peut afficher de petites fenêtres par-dessus Elite Dangerous : un bandeau de chiffres, une liste, un résumé. Tu gardes l’œil sur le jeu, sans revenir à l’app.',
      },
      {
        cible: '.mode-button',
        titre: 'Tout part du mode de jeu',
        texte: 'Ces fenêtres s’obtiennent ici. Ce bouton ouvre la liste des modes de jeu : minage, combat, sauvetage… Quand tu en choisis un, ses fenêtres s’affichent par-dessus le jeu. « Aucun » les retire.',
      },
      {
        cible: tuto('fej-modes'),
        titre: 'Les voir sans lancer le jeu',
        texte: 'Cette page montre les mêmes fenêtres dans l’app, remplies de données d’exemple. Tu peux les regarder et cliquer dedans tranquillement : rien ne change chez toi.',
      },
      {
        cible: '.rub-carte',
        titre: 'Une carte par mode',
        texte: 'Chaque carte porte le nom d’un mode de jeu. Dessous, la liste des fenêtres qu’il affiche. Seuls les modes qui ont des fenêtres à montrer sont ici.',
      },
      {
        cible: '.rub-carte:last-child',
        titre: 'Le Coup d’œil, à part',
        texte: 'La dernière carte n’est pas un mode. Le Coup d’œil est une fenêtre de résumé que tu peux ajouter à n’importe quel mode, ou afficher seule.',
      },
      {
        cible: tuto('fej-modes'),
        titre: 'À toi',
        texte: 'Clique sur une carte pour ouvrir ses fenêtres. Un tutoriel te les expliquera alors une par une, bouton par bouton. Tu reviens ici par le lien « Autres modes ».',
      },
    ],
  },
  {
    id: 'jeu-glance',
    titre: 'Fenêtres en jeu : Coup d’œil',
    chemin: '/fenetres-en-jeu/glance',
    etapes: [
      {
        titre: 'Le Coup d’œil en jeu',
        texte: 'Cette fenêtre résume ta situation par-dessus le jeu : ton argent, tes mérites, ta soute, ce qu’il te reste à encaisser et le système où tu es. Elle s’ajoute à n’importe quel mode de jeu.',
      },
      {
        cible: '.mode-button',
        titre: 'L’ouvrir et la fermer',
        texte: 'Ouvre la liste des modes avec ce bouton et coche « Fenêtre Coup d’œil ». Décoche pour la fermer. La page Coup d’œil a aussi un bouton « Afficher la fenêtre ». En jeu, Alt+Maj+H masque et réaffiche toutes les fenêtres d’un coup.',
      },
      {
        fenetre: GLANCE,
        cible: tuto('fej-credits'),
        titre: 'Crédits',
        texte: 'Ton solde, en gros et arrondi, puis au crédit près dessous. Tout en haut à droite de la fenêtre, ton mode de jeu : Open, Solo ou groupe privé. Open, où tu croises d’autres joueurs, ressort en orange.',
      },
      {
        fenetre: GLANCE,
        cible: tuto('fej-merites'),
        titre: 'Mérites',
        texte: 'Tes mérites Powerplay. Dessous, la puissance que tu sers et ton rang chez elle. Sans allégeance, la case affiche un tiret et « pas d’allégeance ».',
      },
      {
        fenetre: GLANCE,
        cible: tuto('fej-soute'),
        titre: 'Soute',
        texte: 'Le nombre de tonnes à bord. Dessous, tes deux premières marchandises, ou « vide » comme ici. Si tu transportes des marchandises Powerplay, la ligne dit à la place ce que tu as à livrer.',
      },
      {
        fenetre: GLANCE,
        cible: tuto('fej-encaisser'),
        titre: 'À encaisser',
        texte: 'L’argent gagné mais pas encore touché : primes, obligations de combat, données d’exploration, échantillons d’exobiologie, récompense d’objectif communautaire avec sa station. Seul ce qui n’est pas à zéro s’affiche. Le total est en haut à droite.',
      },
      {
        fenetre: GLANCE,
        cible: tuto('fej-systeme'),
        titre: 'Le système où tu es',
        texte: 'Son nom, l’heure du relevé et, à droite, son état Powerplay et la puissance qui le tient. Le bouton ⧉ copie le nom. En jeu, la fenêtre laisse passer tes clics vers le jeu, sauf sur ce bouton. Alt+Maj+K rend les fenêtres cliquables, puis rend la main au jeu.',
      },
      {
        fenetre: GLANCE,
        cible: '.gw-ctrl',
        titre: 'Les points de contrôle',
        texte: 'La barre montre les points de contrôle du système, sur le total à atteindre pour l’état suivant, ici « Consolidé ». « Reste » dit combien il en manque. Ces chiffres sont relevés quand tu arrives dans le système.',
      },
      {
        fenetre: GLANCE,
        cible: tuto('fej-semaine'),
        titre: 'La semaine du système',
        texte: 'En vert, le renforcement de la semaine. En rouge, la sape. À droite, l’écart de points depuis ton relevé précédent de ce système. Une mention « Jeudi » s’ajoute quand une érosion est prévue.',
      },
      {
        fenetre: GLANCE,
        cible: '.gw',
        titre: 'Des cases qui vont et viennent',
        texte: 'D’autres cases n’apparaissent que quand elles ont quelque chose à dire. Avec des missions en cours, une case « Missions » donne leur nombre et le nom des deux premières. Dans cet exemple il n’y en a pas, donc pas de case.',
      },
      {
        fenetre: GLANCE,
        cible: '.gw',
        titre: 'Le rachat du vaisseau',
        texte: 'Si ton solde ne couvre pas le rachat de ton vaisseau, une case rouge « Rachat » le dit, avec ce qui manque. À côté, « En jeu » : ce qu’une destruction te coûterait, rachat, à encaisser et soute réunis. Rachat couvert, comme ici, la case reste absente.',
      },
      {
        fenetre: GLANCE,
        cible: '.gw',
        titre: 'Objectifs communautaires',
        texte: 'Quand tu as rejoint un objectif communautaire, une case donne son nom, sa station, le temps restant, ta contribution, ta tranche et le palier atteint. Elle passe au rouge si la fin approche et que tu n’as rien apporté.',
      },
      {
        fenetre: GLANCE,
        cible: '.hud-panel-foot',
        titre: 'Le pied : tes matériaux',
        texte: 'En bas, le compte de tes matériaux d’ingénierie, par famille : matières premières, manufacturés et données.',
      },
      {
        fenetre: GLANCE,
        cible: '.hud-panel-foot',
        titre: 'La déplacer',
        texte: 'En jeu, un bouton ✥ s’ajoute à ce pied (pas dans cette démonstration). Il passe la fenêtre en mode déplacement, avec ◂ et ▸ en haut pour régler sa largeur. 📌 fixe la place, retenue pour la prochaine fois. Alt+Maj+C fait de même au clavier.',
      },
    ],
  },
];
