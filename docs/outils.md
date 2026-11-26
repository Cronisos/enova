# Outils

> Partie de la notice d’Enova : sommaire dans le [README](../README.md#documentation).

## Module « Applications externes »

Menu personnel par thème (commerce, ingénierie, vaisseaux, Powerplay…) ; chaque lien s'ouvre dans un nouvel
onglet. « Ici et maintenant » donne les pages Inara et Spansh du système et de la station où vous êtes. Les
stations d'une route et la base de l'ingénieur conseillé ont aussi leurs liens.

- Adresses **vérifiées** dans le code d'outils qui les utilisent (EDMarketConnector, EDDiscovery) : fiche
  système et station sur Inara, système et station sur Spansh ; pages d'accueil d'Inara, Spansh, EDSY, Coriolis.
- Inara bloque les accès automatisés : ses pages de menu n'ont pas pu être contrôlées. Elles sont listées dans
  « À vérifier » ; un clic sur « Ça marche » les fait entrer dans le menu.
- « Modifier la liste » : ajouter (Ardent Insight, etc.), renommer, réordonner, supprimer.

## Module « Règles du jeu »

Page `/regles` (📖 dans la barre des menus) : les règles de Powerplay 2.0, des mérites de vente (minage et commerce),
de la colonisation et des escadrons, en français. Chaque règle donne :

- l'énoncé, et le terme des guides anglais à côté du terme français (Consolidé ↔ Fortified, Forteresse ↔
  Stronghold, Sape ↔ Undermining…) ; un lexique en bas de page les reprend tous ;
- sa valeur et son unité (120 000 points de contrôle, 20 al, 390 mérites par million…) ;
- son statut : **mesurée par l'escadron** (relevée dans les journaux, à la date dite), **publiée** (Frontier ou un
  guide de joueurs, adresse donnée) ou **à vérifier** (cause inconnue, mesure ambiguë ou aucune source) ;
- la date de vérification, la source, les preuves datées, ce qu'il faut savoir, et les champs du journal qui
  permettent de la vérifier.

La recherche accepte le français et l'anglais, sans accents (« consolide », « Fortified », « 390 ») ; les boutons
filtrent par statut et par fiche. Colonisation : seulement ce qui est vérifié ; l'échéance de 4 semaines, la fenêtre
de revendication et les besoins des chantiers dans l'API de Frontier ne sont pas repris, faute de preuve.

Les règles sont des **données**, pas du texte de l'interface : `server/src/modules/regles/regles.json`, contrôlé au
démarrage par `referential.js` (identifiant, statut, dates, source exigée selon le statut). Une règle mal formée est
écartée et signalée dans la fenêtre du serveur. Pour corriger ou ajouter une règle : modifier ce fichier et relancer
le serveur. Une règle garde son identifiant pour toujours, car les autres modules y renvoient.

- **Lien profond** : `/regles#identifiant` ouvre la page sur la règle, encadrée en orange, même si la recherche la
  cachait (`/regles#mv-ennemi`, `/regles#pp-surplus-perdu` ; `/regles#powerplay` pour une fiche, `/regles#lexique`).
  Un futur bouton « pourquoi ? » d'un autre module n'a besoin que de cette adresse. « 🔗 Copier le lien » la copie.
- **API**, en lecture seule : `GET /api/modules/regles` (tout), `GET /api/modules/regles/rules?statut=mesuree,publiee&fiche=powerplay&ids=…`
  et `GET /api/modules/regles/rules/<identifiant>` (404 si elle n'existe pas). C'est le référentiel de la future
  vigie des règles : les valeurs (`values`) sont ses constantes, `journal` dit quoi lire pour les comparer au jeu.
  Un relevé de système y est cité dans ses trois événements d'arrivée (`FSDJump`, `Location`, `CarrierJump`) :
  un relevé fait en arrivant avec un porteur compte aussi.
- **Statut honnête** : une règle mesurée dans un seul cas n'est pas étendue aux autres. Exemple : le surplus est
  perdu en prise (mesuré), mais ce que devient le surplus d'un palier de renforcement reste « à vérifier »
  (`/regles#pp-surplus-renforcement`), d'autant que la sape continue de faire baisser la jauge jusqu'au jeudi.

Rien n'est écrit et rien n'est envoyé sur Internet ; les liens vers les sources s'ouvrent dans le navigateur.

### Vigie des règles (outil de développement)

La vigie compare les règles du dépôt à ce que fait le jeu (`server/src/core/vigie.js`). Elle est coupée par défaut :
on l'allume dans **Paramètres → « Vigie des règles (outil de développement) »**, ou avec `ELITE_VIGIE=1` tant
qu'aucun choix n'est enregistré. Coupée : pas de fenêtre en jeu, pas d'entrée de menu, et son cadre n'apparaît pas
dans « Disposer les fenêtres ». Ses observations sont toujours écrites dans `vigie.jsonl`. Allumée : un onglet dans
Règles du jeu, et un lien depuis Paramètres.

## Module « Coup d'œil »

Bouton en bas à gauche, ou **Alt+C** sur n'importe quelle page (Échap pour fermer), ou page plein écran
`/coup-doeil` pour un second écran. Fenêtre en jeu : Crédits (orange), Mérites (jaune) et Soute (verte, comme la case Vaisseau du minage) sur une
ligne, valeurs centrées ; « À encaisser » en orange, avec seulement ce qu'il y a à aller chercher (primes, obligations de combat, exploration,
exobiologie : une catégorie à 0 n'apparaît pas, et la case disparaît si tout est à 0 ; total affiché à partir de deux) ; la case Missions n'apparaît que s'il y en a. Il affiche : crédits, Powerplay (puissance, rang, mérites), points de
mercenaire (saisie manuelle : absents du journal), ce qui reste à encaisser (primes, obligations de combat,
exploration, exobiologie), la soute, les missions, les ressources, des rappels (« 3 échantillons exobio à
vendre chez Vista Genomics : ne meurs pas ») et vos objectifs (possédé / il faut / manque).

- Une destruction efface ce qui n'était pas encaissé, comme en jeu.
- Exploration : estimation prudente (formule d'EDDiscovery), sans les ceintures d'astéroïdes ni le bonus de
  système complet : affichée « au moins ».
- Exobiologie : valeur reprise de vos propres ventes ; une espèce jamais vendue est « de valeur inconnue ».
- Objectifs communautaires (OC) : le journal ne liste que les OC rejoints (`CommunityGoal`, `CommunityGoalJoin`,
  `CommunityGoalDiscard`, `CommunityGoalReward`). Pour chaque OC en cours, une case turquoise (#3fd0d4) de la fenêtre
  en jeu, et un bloc du panneau, donnent le temps restant (mis à jour chaque minute), ta contribution, ta tranche
  (« top 75 % », « aucune tranche » sans contribution) et le palier atteint (« palier 3/6 »). La case passe en rouge
  avec « Contribution nulle » quand il reste 24 h ou moins et que tu n'as rien apporté (seule la ligne de cet OC est
  en rouge, les autres OC de la case gardent leur gris) ; un rappel le dit aussi. Un OC
  terminé avec contribution et palier atteint, sans `CommunityGoalReward`, entre dans « À encaisser » avec sa station
  (« OC · Homer Platform ») et le montant `Bonus` du journal (récompense de ta tranche au palier atteint), jusqu'à ce que
  la récompense soit touchée. Un OC abandonné, payé, ou terminé sans rien à réclamer disparaît ; sans contribution, il
  disparaît dès sa fin. Fin passée avec contribution mais
  résultats pas encore publiés par le jeu : « terminé · résultats en attente ». Aucune estimation de la tranche ou du
  palier suivant : leurs seuils ne sont pas publiés. Règles et sources : constantes de
  `server/src/modules/glance/communityGoals.js` ; à vérifier en jeu : récompense à réclamer à la station de l'OC,
  `Bonus` égal au `Reward` touché, aucune récompense sans contribution.
- Fenêtre en jeu, système de projet : quand le système où vous êtes est l'étape en cours d'une route du projet
  extension, la case « Système » garde sa forme et passe en bleu Empire (#4f9dff), nom du système compris (blanc
  ailleurs). Son titre donne l'étape et l'objectif : « Projet · étape 1/12 · objectif Consolidé ». Au milieu, deux gros chiffres côte à côte : les points actuels (sur le total du palier) et le reste, avec
  son équivalent en mérites (× 4), puis la jauge. Le détail (rythme, classement, mérites) reste dans l'app. Données lues par
  l'API du projet (`GET /api/modules/expansion/here?system=`, calcul `workSystem` dans `merits.js`).
- La fenêtre en jeu prend d'elle-même la hauteur de son contenu (`autoHeight` de `PanelOverlay`, IPC
  `fit-height`) : le coin haut-gauche et la largeur ne bougent pas, la largeur se règle toujours avec ◂ ▸.

### Rachat couvert et mode de jeu

Case « Rachat » (fenêtre en jeu, sous la première ligne) et bloc « Rachat » (panneau), calculés dans
`server/src/modules/glance/rebuy.js`, affichés par `client/src/modules/glance/Rebuy.jsx`. Tout est relu du journal au
démarrage : rien n'est enregistré sur le disque. Dans la fenêtre en jeu, la case n'apparaît que quand elle dit quelque
chose : rachat **non couvert**, décollage sans rachat, résurrection récente. Couvert, elle disparaît (toujours verte,
elle n'apprenait rien) ; le mode de jeu est tout à droite de la barre de titre de la fenêtre. Le panneau garde le bloc entier.

- **Rachat** du vaisseau piloté (`Loadout.Rebuy`, donné par le jeu) comparé à tes crédits (`Status.json` Balance, ou
  `LoadGame.Credits`) : vert « Couvert ✓ » avec le nombre de rachats d'avance, rouge « NON COUVERT » avec ce qui manque.
  Non couvert, un rappel rouge s'ajoute aux rappels du Coup d'œil : à quai, « Ne décolle pas avec » ; hors station, le
  risque de perdre le vaisseau et ses modules. Un rachat à 0 cr s'affiche « rachat gratuit ». Sans `Rebuy` dans le
  Loadout (jamais vu), le rachat est estimé à 5 % de la coque et des modules, suivi d'un « ? ».
- **Nom du vaisseau** : celui que tu lui as donné, puis son type. Le type vient du nom localisé du journal (`LoadGame`,
  `ShipyardSwap`, `ShipyardNew`), sinon des données de référence (comme Mon ingénierie) : une partie lancée dans le
  SRV ne nomme que le VRS Rhino, et le Loadout ne donne que « lakonminer » pour le Type-11 Prospector.
- **Alerte au décollage** : si tu décolles (`Undocked`) sans rachat couvert, la case clignote en rouge, le rappel dit
  « Tu as décollé sans pouvoir payer ton rachat : il manque… », et la fenêtre Coup d'œil s'ouvre d'elle-même par-dessus
  le jeu pendant 3 min (elle se referme à quai, à la mort ou au bout des 3 min ; ouverte avant, elle le reste). Pas
  d'alerte en taxi ni en équipage multiple : ce n'est pas ton rachat.
- **En jeu** : ce qu'une destruction coûterait, rachat + « à encaisser » perdu à la mort (primes, obligations,
  exploration, exobiologie) + valeur de la soute. La soute est chiffrée au dernier prix de vente ou d'achat de chaque
  marchandise vu dans le journal (`MarketSell`, `MarketBuy`, et `BuyDrones`, `SellDrones` pour les limpets) ; une
  marchandise jamais vendue ni achetée est comptée « sans prix ».
- **Mode de jeu** : Open (orange), Solo, ou groupe privé avec son nom (`LoadGame.GameMode` et `Group`), en haut à
  droite de la case. L'événement `GameModeChange` (MainGame, Operation) est autre chose : il n'est pas utilisé.
- **Après une résurrection** (`Resurrect`) : le coût payé (« Rachat payé : 20 559 981 cr. »), « Retour au vaisseau,
  sans frais » après une mort hors du vaisseau, ou la faillite (`Bankrupt`) en une phrase. S'y ajoute ce que la
  destruction a fait perdre (primes, obligations, exploration, exobiologie, tonnes de soute), relevé juste avant que le
  Coup d'œil ne l'efface. Pendant 30 min dans les rappels et la fenêtre en jeu ; la dernière reste dans le panneau.
- Règles du jeu utilisées, avec leur source et leur statut (mesurée, publiée, à vérifier), en tête de `rebuy.js` :
  taux de 5 % (plafond mesuré sur 232 Loadout), coût payé égal au dernier `Loadout.Rebuy` (mesuré, 3 rachats sur 3),
  options de `Resurrect` (`rebuy` et `rejoin` mesurées, les autres à vérifier), faillite (à vérifier), décollage en
  taxi ou en équipage multiple sans rachat à toi (à vérifier), soute gardée après une mort hors du vaisseau (mesurée une
  fois ; les données, à vérifier), événements de prix des limpets (mesurés). Chaque résurrection garde le rachat attendu
  (`expectedCost`) à côté du coût payé.

## Mes commandes (Outils › Commandes du jeu)

Page `/commandes/mes-commandes` : toutes les commandes de ton profil de commandes (le `.binds` choisi au démarrage
du jeu, **lu sans jamais être modifié**), avec tes touches en clair (« Clavier : Maj gauche + K », « X52 : bouton 3 »,
« chapeau 1 haut », « molette ↑ »).

- **Reclassées par intention** plutôt que par le menu du jeu : Piloter, Voyager, Atterrir et apponter, Combattre,
  Explorer, Soute et minage, Panneaux et interface, Conduire le VRS, À pied, Équipage et chasseur, Caméras et photo,
  Colonisation, Divers ; les réglages (sensibilités, zones mortes) à part, cachés par défaut.
- **Recherche intelligente** : sans accents, par le nom (« boost », « train »), par des synonymes et mots anglais
  (« fsd », « gear », « honk », « chaff », « srv »…), par une touche (« k » : la touche K, pas le k de « Clavier » ;
  « maj », « bouton 3 »). Chaque mot doit trouver sa place ; le nom passe avant la touche, la touche avant la section.
- **Où la régler dans le jeu** : un clic sur une commande donne Options › Commandes › section › sous-section, et ses
  voisines dans la liste du menu. **Approximatif** : déduit de l'ordre du fichier `.binds`, que le jeu écrit dans
  l'ordre de son menu (les commandes nouvelles se placent donc d'elles-mêmes) ; les intitulés exacts viendront de
  captures du menu Commandes.
- **Touches en double** dans un même contexte (vaisseau, VRS, à pied : le jeu n'en écoute qu'un à la fois), signalées ⚠.
- Une catégorie du jeu servie par un autre profil (à pied sur le profil « SaitekX52 » fourni avec le jeu…) est
  signalée : ses touches ne sont pas celles de ce fichier.
- Catalogue français de 515 commandes (`server/src/modules/bindings/catalogue.js`), testé sur la liste complète d'un
  profil 4.4 (`fixtures/commandes-4.2.txt`, noms seulement) ; noms anglais d'origine : EDRefCard (MIT, voir CREDITS.md).
  `GET /api/modules/bindings/assignations`.

## Module « Garde des commandes »

Quand une manette manque (débranchée, ou identifiant USB changé), le jeu ignore ton profil de commandes sans prévenir
et repasse aux commandes par défaut. Réassigner une commande à ce moment écrase le profil. Le module lit, **en lecture
seule**, le dossier `%LOCALAPPDATA%\Frontier Developments\Elite Dangerous\Options\Bindings` :

- `BindingLoadingErrors.log`, le rapport que le jeu écrit en chargeant les commandes : profil en erreur (« There where
  errors when loading preset file: Custom.4.2.binds »), manettes manquantes (« Missing devices: SaitekX52 »), commandes
  en double (« There are multiple entries of binding "MouseGUI" », sans gravité : le jeu garde la première) ;
- `StartPreset*.start` : le profil choisi pour chaque catégorie (commandes générales, vaisseau, SRV, à pied) ;
- les `.binds` : les manettes utilisées par chaque profil, avec leur nombre de commandes ;
- les `.backup` : les sauvegardes que le jeu écrit lui-même quand un profil ne se charge pas, comparées au profil actuel.

Le rapport est daté par rapport au lancement du jeu (`Fileheader` du journal, partie 1 seulement) : il compte pour le
lancement en cours s'il a été écrit après son début (60 s de marge) et après la fermeture du lancement précédent. Le
7 novembre 2026, le jeu l'a écrit 4 s après le `Fileheader`, 1 min 30 avant le `LoadGame`. Le dossier est relu au
démarrage de l'app, au lancement, au chargement et à la fermeture du jeu, et dès qu'un fichier change (dates et tailles
regardées toutes les 3 s). Un `.binds` de plus de 512 Ko n'est pas lu (un vrai fait environ 65 Ko). La lecture du nom du
profil et des manettes se fait en temps linéaire (`parse.js`, et le décodage des entités de `core/text.js`) : un profil
partagé piégé (« <Root » répété sans « > », valeur « &amp;amp;… » démesurée) prenait des secondes à des minutes, au
démarrage puis à chaque relecture, et figeait tout le serveur.

Quand le rapport du lancement en cours signale une manette manquante :

- un bandeau rouge en haut de toutes les pages de l'app : « Profil de commandes ignoré : manette SaitekX52 absente. Ne
  réassigne rien : rebranche-la et relance le jeu. », avec la sauvegarde `.backup` du jeu et son dossier. Il fait partie
  de la barre du haut : il pousse la page au lieu de la couvrir, et les alertes flottantes (achats, questions de route)
  passent au-dessus ;
- une petite fenêtre par-dessus le jeu (overlay, page `/hud/bindings`, taille d'un HUD), ouverte d'elle-même comme celle
  du saut du porteur, avec le même texte. ✕ la ferme, ✥ la déplace. Elle se ferme aussi à la fermeture du jeu, ou quand
  un nouveau rapport ne signale plus rien.

La fenêtre en jeu ne s'ouvre que si le jeu tourne vraiment. Un journal sans `Shutdown` ne suffit pas : chez le joueur,
9 journaux sur 49 finissent sans (jeu planté ou fermé autrement, 23 oct.-7 nov. 2026). Il faut aussi un signe de vie
depuis moins de 10 min : un événement du lancement, ou le journal actif ou `Status.json` écrits. Sinon le lancement est
tenu pour terminé, et la page dit « sans nouvelles depuis le … (fermé ou planté) ». Pendant un long moment calme en
partie, la fenêtre peut donc se fermer, puis se rouvrir au prochain signe de vie si tu ne l'as pas fermée.

Une erreur que l'app ne connaît pas est traitée de la même façon, en orange. Des doublons seuls ne sont signalés que sur
la page. Une alerte fermée (fenêtre ou bandeau, chacun à part) le reste après un redémarrage de l'app
(`server/data/bindings-guard.json`) ; le rapport du lancement suivant en ouvre une nouvelle. Jeu fermé, le bandeau reste
et dit « au dernier lancement du jeu ». Sans journal du jeu, le bandeau s'affiche, mais pas la fenêtre en jeu.

La page `/commandes` (accueil, « Outils ») donne le détail : rapport ligne par ligne, profils utilisés, manettes de chaque
profil, sauvegardes (identiques ou non au profil actuel) et la marche à suivre pour remettre une sauvegarde, à faire
soi-même, jeu fermé. L'app n'écrit jamais dans ce dossier et n'agit sur aucune commande du jeu.

Règles et sources dans `server/src/modules/bindings/rules.js`, chaque valeur marquée « mesurée », « publiée » ou « à
vérifier ». Reste à vérifier en jeu :

- ce que devient `BindingLoadingErrors.log` à un lancement sans erreur : vidé, supprimé ou laissé tel quel (l'app gère
  les trois cas) ;
- le séparateur entre plusieurs manettes sur la ligne « Missing devices: » (un seul cas vu) ;
- l'ordre des quatre lignes de `StartPreset.4.start` (supposé, sans source vérifiée) ;
- le délai de 10 min sans signe de vie au bout duquel un lancement sans `Shutdown` est tenu pour terminé ;
- que remettre une sauvegarde (copie renommée en `Custom.4.2.binds`, jeu fermé) suffit au jeu.

Plus tard : une carte des commandes en français pour un second écran, tirée du `.binds` (EDRefCard le fait en anglais, à
partir d'un fichier déposé à la main).

## Module « Couleurs du HUD »

Page `/couleurs-hud` (sur l'accueil, avec les outils) : choisir la couleur de l'interface du jeu, la voir, puis
l'appliquer. C'est la **seule exception** à « l'app ne modifie jamais les fichiers du jeu », voulue par le joueur et
limitée à son fichier d'options
`%LOCALAPPDATA%\Frontier Developments\Elite Dangerous\Options\Graphics\GraphicsConfigurationOverride.xml`.

**L'app à tes couleurs** (case « L'app prend la couleur de mon HUD », cochée par défaut) : les oranges de toute l'app
(fenêtre principale, pages détachées, MAR, pavé tactile, fenêtres en jeu) passent par la matrice du fichier du jeu,
comme l'orange du HUD : bleu dans l'app si ton HUD est bleu. Calcul du serveur (`modules/hudcolours/teinte.js`,
testé ; `GET`/`PUT /api/modules/hudcolours/teinte`), posé en variables CSS sur chaque page (`core/teinte.js` :
`--acc-rgb`, `--acc2-rgb`, `--accent-clair`, que `styles.css` et les fenêtres en jeu utilisent à la place de
l'orange). Une teinte trop sombre pour être lue est éclaircie. Restent orange : l'aperçu de cette page, l'image de
partage d'une route, la carte des routes d'extension et les couleurs de données (minerais, ventes).

- **La matrice** : le jeu passe toutes les couleurs de l'interface dans une matrice de 3 lignes (bloc
  `<GUIColour><Default>`). Chaque ligne est une couleur d'origine, ses trois nombres le rouge, le vert et le bleu
  affichés : `affiché = R × MatrixRed + V × MatrixGreen + B × MatrixBlue`, borné à 0…1. Sens vérifié dans le code de
  l'éditeur de référence ([arkku.com/elite/hud_editor](https://arkku.com/elite/hud_editor/)) et avec la sauvegarde
  « bleu » du joueur (0.2, 0.2, 1 / 0.1, 0.6, 0.1 / 1, 0.6, 0) : l'orange du HUD devient bleu, le bleu des
  boucliers devient orange. L'orange du HUD (≈ #FF7A00, beaucoup de rouge, un peu de vert) dépend surtout de
  `MatrixRed`.
- **Aperçu** : un faux HUD dessiné pour l'app en SVG (pas de capture du jeu), dans des teintes proches de celles
  d'origine : orange, orange sombre, blanc, bleu (boucliers, vitesse optimale), rouge (alertes, hostiles), vert
  (équipiers), jaune (repères). Seul le calque de l'interface passe dans un filtre `feColorMatrix` (la transposée
  de la matrice du jeu) ; l'espace et le cockpit ne changent pas. Curseur avant / après (avant = HUD actuel ou
  orange d'origine) et tableau de ce que devient chaque teinte. **L'aperçu est approché** : teintes de départ
  estimées, et calcul du jeu pas encore vérifié en jeu.
- **Calcul de l'aperçu** (à trancher une fois en jeu) : une même matrice ne donne pas la même teinte si elle
  s'applique aux valeurs de couleur telles quelles (sRGB, choix par défaut) ou à la lumière linéaire (ce que fait
  l'aperçu de l'éditeur arkku, dont le filtre reste en `linearRGB`). Avec la sauvegarde `.bleu.bak`, l'orange du HUD
  devient bleu soutenu `#3F7CFF` dans le premier cas, bleu pâle `#8199FF` dans le second. La page propose les deux
  et explique le test (restaurer `.bleu.bak`, relancer le jeu, comparer) ; le choix est gardé dans le navigateur
  (`localStorage`, simple préférence d'affichage) et s'applique à l'aperçu, aux pastilles, aux curseurs, aux
  préréglages et à l'alerte des teintes proches.
- **Réglages** : préréglages (orange d'origine, bleu, cyan, vert, violet, rose, rouge, or, blanc, bleu inversé),
  barre arc-en-ciel de la teinte, saturation, luminosité, couleur exacte, teinte des éléments bleus (automatique :
  décalée comme l'orange, pour rester distincte), et mode avancé avec les 9 nombres (de −3 à 3). Une couleur
  choisie donne une matrice où l'orange devient cette couleur dans le calcul choisi, le blanc reste blanc tant que
  la saturation ne dépasse pas 80 % environ (60 % en lumière linéaire), et aucun nombre n'est négatif (`colour.js`).
- **Teintes qui se ressemblent** : la page prévient quand la matrice rend trop proches (écart ΔE CIE76 sous 20,
  calculé sur les teintes de l'aperçu) des couleurs que le jeu distingue mieux à l'origine : rouge des alertes et
  des hostiles contre le reste du HUD (préréglages rouge et violet, par exemple), boucliers, alliés, ou hostiles
  contre alliés. Simple indication : l'orange et le rouge d'origine sont eux-mêmes à ≈ 34.
- **Appliquer** (confirmation, « relance le jeu pour voir le changement ») : copie horodatée du fichier à côté de
  lui (`GraphicsConfigurationOverride.xml.elite-compagnon-<date>.bak`, les 10 dernières gardées ; les copies
  faites à la main, `.bleu.bak`…, ne sont jamais effacées ; leur ordre est celui de leur numéro, toujours croissant, et
  non de la date du nom : une horloge qui recule, à l'heure d'hiver ou corrigée, ne fait plus effacer la copie qui vient
  d'être faite, et la page la montre en tête de ses copies), écriture atomique (fichier temporaire puis
  renommage), relecture. Seul le bloc `GUIColour/Default` est créé ou remplacé : autres réglages, commentaires,
  retours à la ligne et BOM restent octet pour octet (petit lecteur XML sans dépendance, `xml.js`). La page envoie
  la version du fichier qu'elle a affichée : s'il a changé entre-temps, rien n'est écrit.
- **Revenir à l'orange** retire le bloc (puis `GUIColour` s'il est vide) : le fichier d'origine
  `<GraphicsConfig />` revient tel quel. **Restaurer** une sauvegarde reprend ses couleurs sans toucher au reste du
  fichier actuel (s'il est illisible, la sauvegarde le remplace en entier, après copie).
- Fichier absent : créé ; vide : rempli ; illisible (XML cassé, autre racine, texte avant ou après la racine, pas en
  UTF-8, déclaration `DOCTYPE` ou `ENTITY`, référence d'entité autre que `&amp;` `&lt;` `&gt;` `&quot;` `&apos;`) :
  l'app refuse d'y toucher, sauf restauration (le jeu n'écrit jamais d'entité ; une entité déclarée changerait ce que
  le jeu lit sans que l'app le voie). Une ligne de matrice illisible (pas 3 nombres) est signalée
  et « Appliquer » reste possible, même sans changer de couleur, pour réécrire le bloc. Dossier absent : rien n'est
  créé (lancer le jeu une fois). Fichier en lecture seule (case « Lecture seule » de ses propriétés) : la page le
  signale et rien n'est écrit ; l'app ne retire jamais ce réglage elle-même. Un refus d'écriture (fichier changé,
  verrouillé, matrice refusée…) reste affiché jusqu'à l'action suivante du joueur : les relectures de l'état ne
  l'effacent pas.
- **Jeu ouvert ?** D'après le journal (`Fileheader`, `LoadGame`, `Shutdown`) et la dernière écriture du journal ou
  de `Status.json` (moins de 20 min : ouvert) : le jeu ne lit ce fichier qu'à son démarrage, la page dit s'il faut
  le relancer. Elle relit l'état chaque minute (et à chaque lancement ou fermeture du jeu).
- Limites rappelées sur la page : la matrice change toutes les couleurs de l'interface (boucliers, alertes, menus…),
  certains éléments ne la suivent pas (éclairage du cockpit, images, certains écrans selon la version), un mod
  comme EDHM peut passer par-dessus. API : `GET /api/modules/hudcolours/state`, `POST …/apply`, `…/reset`,
  `…/restore` (avec `confirm: true` et `version`). Code : `server/src/modules/hudcolours/`,
  `client/src/modules/hudcolours/`.

## Module « Compagnon »

Un petit personnage (« Copilote » par défaut, nom réglable) qui réagit à ce que tu fais en jeu : un avatar à
plusieurs humeurs et une bulle qui apparaît puis s'efface. **Sans IA et sans réseau** : des phrases écrites à
l'avance, au moins 5 par situation, tirées dans un sac mélangé (toutes passent avant qu'une revienne, jamais deux
fois de suite la même). Page `/compagnon` (barre des outils), réglages enregistrés dans `server/data/compagnon.json`.

Il apparaît à deux endroits, chacun avec sa case dans les réglages :

- **Fenêtre par-dessus le jeu** (page `/hud/compagnon` de l'overlay, fenêtre libre comme le Coup d'œil) : elle
  s'ouvre quand le jeu tourne et se ferme 15 s après la fermeture du jeu, ou après 20 min sans aucune nouvelle du
  jeu (ni journal ni `Status.json` : plantage, arrêt sans `Shutdown`) ; elle revient au prochain événement. Quand on
  coche la case, elle s'ouvre tout de suite pour qu'on la place, et se referme au bout de 5 min si le jeu ne tourne
  pas. ✥ pour la déplacer, ◂ ▸ ▴ ▾ pour la redimensionner en mode déplacement, 📌 pour la fixer. Par
  défaut à gauche, un peu sous le milieu de l'écran. Si l'overlay a été quitté (Alt+Maj+Q), décoche puis recoche
  la case pour la rouvrir.
- **Petit compagnon de l'application**, en bas à droite de chaque page (un clic ouvre ses réglages).

Dans l'**app de bureau**, le copilote a toujours sa propre fenêtre par-dessus le jeu, comme les modules (✥ pour la
déplacer où tu veux, 📌 pour la fixer), qu'il soit en jeu ou non ; il n'est plus dans la fenêtre principale. Le ◆ du
MAR la cache avec le reste.

Animation d'attente en CSS : respiration, léger balancement, clignement si le pack a une image « clignement »,
petit saut quand il parle, changement d'humeur en fondu. Après 15 min sans rien faire en jeu, il s'endort.

Réactions (chacune se coupe à part ; « ▶ Essayer » montre une phrase avec des valeurs d'exemple, sans rien
enregistrer, aussi dans la fenêtre en jeu si elle est ouverte) :

| Réaction | Déclencheur (journal ou `Status.json`) |
|---|---|
| Bonjour | `LoadGame` : nom du CMDR, modèle du vaisseau (`Ship_Localised`, rien à pied), selon l'heure (matin, après-midi, soir, nuit), ou « ça faisait longtemps » après 3 jours sans jouer |
| Bonne vente / très grosse vente | série de `MarketSell` (8 s sans nouvelle vente) : bénéfice = Σ (`SellPrice` − `AvgPricePaid`) × `Count`, au-dessus de 1 M / 20 M cr (réglables) |
| Vente à perte | même calcul, perte d'au moins 1 000 cr |
| Mérites gagnés | `PowerplayMerits` cumulés (20 s de calme), 10 au moins ; phrases à part au-delà de 2 000 |
| Fin d'une rafale de minage | `MiningRefined` : 5 t au moins puis 90 s sans raffinage ; phrases à part à partir de 20 t |
| Amarrage accordé / refusé | `DockingGranted` (plateforme) ; `DockingDenied` avec la raison en français (trop loin, trop grand…) |
| Interdiction | tentative en cours (indicateur de `Status.json`), `Interdicted` (soumission ou non), `EscapeInterdiction` ; jamais le nom d'un autre joueur |
| Boucliers / coque | `ShieldState` du vaisseau seulement (pas du VRS ni de la combinaison, pas posé, pas à quai, pas 45 s après un chargement), et seulement avec un signe de combat juste avant ou dans les 15 s (attaque, dégâts, « en danger ») : sinon ce sont des boucliers coupés ou une panne d'énergie ; puis rétablis. `HullDamage` du pilote sous 90 % et sous 35 % |
| Destruction / réapparition | `Died`, en vaisseau ou à pied (débarquement suivi dans le journal et `Status.json`) ; `Resurrect` avec le prix du rachat, gratuit, ou à pied (phrases sans vaisseau) |
| Carburant bas | indicateur « carburant bas » de `Status.json` (sous 25 %), en vaisseau et hors station |
| Promotion / ingénieur | `Promotion` ; `PowerplayRank` des 10 premiers rangs puis des rangs ronds ; `EngineerProgress` (invitation, déblocage, grade 5) |
| Porteur | `CarrierJumpRequest` (destination, heure de départ), `CarrierJump` |
| Nouveau système (rare) | `FSDJump` vers un système absent de tout l'historique, une fois sur trois environ, 20 min au moins entre deux |
| Longue inactivité / réveil / au revoir | 15 min sans action en jeu ; reprise ; `Shutdown` |

- **Bavardage** : discret (4 min au moins entre deux phrases, délais de chaque réaction × 2,5, et il ne parle
  qu'une fois sur deux environ), normal (1 min), bavard (20 s, délais × 0,4, plus souvent). Bonjour, promotions,
  ingénieurs, réapparition, au revoir et les alertes ne dépendent pas du bavardage.
- **Combat** (1 min après une attaque subie, une prime, une obligation, une interdiction, des dégâts, ou tant que
  le jeu indique « en danger » ; un saut hyperespace y met fin) : silence, sauf les alertes (boucliers, coque, carburant,
  interdiction, destruction), qui passent sans attendre le délai global. Une alerte plus grave peut couper la parole.
- **Gabarits** : `{cmdr}`, `{nom}` (le personnage) et les variables de chaque réaction (`{profit}`, `{station}`,
  `{systeme}`, `{merites}`…, liste sous « phrases » sur la page). Nombres au format français (`46 827 372 cr`,
  `38,4 al`, `22 %`, espace insécable avant l'unité) ; « de » et « que » s'élident devant une voyelle (« 1 232 t d'Indium ») ; une phrase dont une
  variable manque est remplacée par une autre.

### Avatars et packs

Le pack par défaut est un personnage original dessiné en SVG (petit pilote au casque rond) : neutre, content, ravi,
inquiet, triste, malicieux, surpris, endormi, et une image de clignement, même style et même cadrage.

Tes propres packs : un dossier par pack dans `server/data/compagnon/avatars/<pack>/` (lettres, chiffres, `-` et
`_`), avec une image par humeur nommée comme elle (`neutre.png`, `ravi.gif`…) et `clignement.png` facultatif.

- PNG, WebP ou GIF, reconnus à leur contenu (une extension qui ment est refusée) ; GIF et PNG animés (APNG) acceptés
  tels quels ; **4 Mo** et **2 048 × 2 048 px** au plus par image (dimensions lues dans l'en-tête, et dans chaque
  image d'un GIF animé : un PNG uni de 4 Mo peut faire 25 000 × 25 000 px, soit 2,5 Go une fois décodé). **Jamais de
  SVG** dans un pack du joueur (un SVG peut contenir du script). Liens symboliques et sous-dossiers ignorés.
- Conseillé : 512 × 512, fond transparent, personnage en buste, même cadrage sur toutes les images.
- Une humeur manquante reprend l'image neutre. Les erreurs s'affichent sous la carte du pack ; « ↻ Recharger la
  liste » après un ajout ou une modification : elle relit aussi les phrases du `pack.json` du pack choisi (tout
  comme « Enregistrer »).
- `pack.json` facultatif : `nom`, `auteur`, `humeurs` (fichier par humeur), `phrases` (mêmes catégories et même
  format que `phrases.json`, texte seul, 220 caractères au plus, 40 par réaction, variables et humeurs vérifiées) et
  `remplacerPhrases` (`true` : elles remplacent celles par défaut dans les réactions remplies).
- La page donne un guide « Fais ton propre avatar » avec un modèle de consigne pour un générateur d'images (les 8
  humeurs et le clignement du même personnage).

Les images sont servies avec `Content-Security-Policy: sandbox` et `X-Content-Type-Options: nosniff`.

Fichiers : `server/src/modules/compagnon/` (`triggers.js` journal → réaction, `engine.js` choix de la phrase,
`categories.js` liste des réactions, `phrases.json` phrases par défaut, `phrases.js` validation, `packs.js` avatars,
`settings.js` réglages, `avatars/defaut/`) et `client/src/modules/compagnon/` (page, fenêtre en jeu, petit
compagnon de l'app). API : `GET state`, `PUT settings`, `GET categories`, `GET packs`, `GET avatars/<pack>/<humeur>`,
`POST try` et `POST dire` sous `/api/modules/compagnon/` ; temps réel : `compagnon:say`, `compagnon:mood`,
`compagnon:settings`.

`POST dire` (`{ texte, humeur, source, parler, voix, vitesse, hauteur, volume, audio }`, 600 caractères au plus ;
`parler` : la fenêtre en jeu la dit à voix haute, avec la voix `voix` de Windows, ou joue `audio` s'il est donné : un son
déjà prêt, chemin de l'API locale d'un module seulement, `/api/modules/…`) fait dire au compagnon une phrase venue d'un autre
module, avec son avatar et sa bulle, plus longtemps qu'une réplique (4 à 30 s selon la longueur) : c'est par là que le
copilote IA répond. Le compagnon ne sait pas d'où elle vient ; coupé dans ses réglages, il ne dit rien. Si sa
fenêtre en jeu a été fermée par « Aucun », cette phrase la rouvre : dans l'app de bureau, rien d'autre ne le ferait.

## Synthèse de l’état du jeu

Un seul endroit lit **tout** ce que le jeu écrit (les journaux, et les fichiers d’état `Status.json`, `Cargo.json`,
`Market.json`, `NavRoute.json`, `ModulesInfo.json`, `ShipLocker.json`, `Backpack.json`) et en tient un résumé
compact, sans doublons, toujours à jour (`server/src/core/synthese.js`) : `GET /api/etat-jeu`, et le fichier
`etat-jeu.json` du dossier des données (réécrit au plus toutes les 2 s). Les lecteurs (l’IA de bord d’abord) lisent ce
résumé au lieu de refaire chacun leur tri ; `?partie=marche|materiaux|ingenieurs|missions|sac|casier|…` donne une
partie avec tout son détail.

- **En direct** : `Status.json` décodé en clair (`server/src/core/statusFlags.js`, tous les indicateurs des deux séries
  `Flags` et `Flags2`) : véhicule où tu es (vaisseau, chasseur, SRV, à pied, taxi), boucliers, train, armes,
  surchauffe, danger, interdiction, FSD, énergie SYS/MOT/ARM, écran ouvert, altitude, oxygène et santé à pied.
  **Dans le SRV, le carburant est celui du SRV** (le jeu ne le donne nulle part ailleurs).
- **Le reste** : vaisseau (coque, rachat, modules abîmés, puissance utilisée), soute du vaisseau et du SRV, position
  (sécurité, factions, Powerplay, station), route, missions en cours, rangs et progression, réputation, ingénieurs,
  matériaux (au lancement du jeu), porte-vaisseaux, dernier marché ouvert, casier et sac à dos, et les 15 derniers
  événements marquants (attaques, boucliers tombés, chaleur, interdictions…).
- **Doublons** : le jeu donne souvent la même chose deux ou trois fois (crédits, carburant, soute, casier, marché,
  itinéraire, boucliers) ; la règle est toujours « le plus récent gagne » (détail en tête de `synthese.js`).
- **Léger** : au démarrage, seul le dernier événement de chaque type est relu (plus les missions) ; sur 60 journaux,
  52 événements, 0,1 s, environ 4 Ko de résumé. Les noms d’autres joueurs (chat, ailiers, interdicteurs) ne sont
  jamais gardés. Rien n’est deviné : ce que le jeu ne dit pas reste absent.

## Module « Moniteur PC »

Ce que le jeu et le copilote IA prennent à ton PC, en direct, dans une petite fenêtre en jeu (Outils › Moniteur PC,
bouton « Afficher la fenêtre en jeu » ; déplaçable avec ✥ / 📌 comme les autres, le choix est gardé) :

- **GPU** : charge, température (ambre à 75 °C, rouge à 85), puissance ;
- **VRAM** : utilisée sur totale, puis libre (ambre sous 3 Go, rouge sous 1 Go : le copilote IA se décharge alors),
  ce que prend l'IA (Ollama), « jeu + Windows » (le reste : le pilote NVIDIA ne détaille pas par programme) et le pic ;
- **CPU** et **RAM** (tous les cœurs ; RAM d'Elite à part) ; la ligne **IA** n'apparaît que si Ollama tourne.

Relevés toutes les 2 s, seulement si la fenêtre est ouverte ou la page affichée. Sources : `nvidia-smi` (livré avec
le pilote NVIDIA ; sans lui, pas de ligne GPU ni VRAM), `os.cpus()` et `os.freemem()`, `tasklist` (mémoire
d'Elite), `http://127.0.0.1:11434/api/ps` (Ollama). Fichiers : `server/src/modules/systeme/` (`mesures.js`) et
`client/src/modules/systeme/` ; API sous `/api/modules/systeme/` : `GET mesure`, `GET reglages`, `PUT reglages`
(`{ fenetre, repartirPic }`) ; temps réel : `systeme:mesure`, `systeme:reglages`.
