# Mes repères et Systèmes importants

> Partie de la notice d’Enova : sommaire dans le [README](../README.md#documentation).

## Module « Mes repères »

« 📍 Marquer ici » enregistre l'endroit où vous êtes au moment du clic, lu dans `Status.json` : système,
planète, latitude, longitude, altitude, cap, véhicule (vaisseau, SRV, à pied). Dans l'espace ou à quai, seuls le
système et la station sont gardés. « Modifier » complète ensuite le repère (nom, type : exobiologie, géologie, site
Gardien…, notes), on le retrouve par recherche ou par type, on le copie pour Discord.

La page se parcourt comme un menu de jeu, un écran à la fois : fil d'Ariane cliquable en haut, ↩ (ou Échap, ou le
bouton « précédent » de la souris) pour remonter. Chaque écran a son adresse :

- `/reperes` : le système, avec les raccourcis (tous mes repères, captures, sessions passées, systèmes prospectés),
  l'EEP ciblé en jeu s'il y en a un, et les planètes à EEP ;
- `/reperes/planete/<planète>` : verdict, « planète out », notes, grille des EEP (note sous le numéro, minerais au
  survol), classement des EEP notés (note, état, minerais), repères sans numéro d'EEP ;
- `/reperes/planete/<planète>/eep/<n>` : note de 1 à 10, minerais, notes, repères de cet EEP, « Marquer ici sur l'EEP n »,
  dernière capture, ◂ ▸ pour passer à l'EEP voisin ;
- `/reperes/repere/<id>` : guidage en direct, lancer la session, modifier, vidé, pas rentable, copier, supprimer ;
- `/reperes/liste` : tous les repères (onglets Repères, Taris, Pas rentables ; d'abord le système où vous êtes,
  « Tous les systèmes » pour les autres), regroupés par planète ; un clic ouvre le repère ;
- `/reperes/session`, `/historique`, `/captures`, `/systemes`.

**Prospection** (écran du système) : les planètes à EEP du système où vous êtes, d'après vos scans et Spansh, avec
un verdict pour chacune : ✓ Rentable, ⏳ Tarie, ◐ Petits gisements, ? À prospecter, ✗ Rien de bon vu, ⛔ Planète out. Les rentables
d'abord, les écartées en fin de liste et grisées. L'écran d'une planète montre la grille de ses EEP (vert rentable,
orange faible, bleu minerais connus mais pas encore noté, rouge rien d'intéressant, gris pas vu, 📍 repère enregistré,
contour orange : l'EEP où le jeu dit que vous êtes). Un clic sur un EEP ouvre sa fiche pour noter ce qu'on y a vu,
sans créer de repère : « Rien d'intéressant », ou une note de 1 à 10 pour l'EEP entier (il a plusieurs gisements)
et ses minerais. Un EEP est rentable à partir de 6/10. « Planète out » écarte une planète d'un coup. Les repères de minage existants
comptent : un repère avec un numéro d'EEP rend cet EEP rentable s'il a 3 foreuses ou plus (ou n'en dit rien), faible
s'il n'a que 1 ou 2 foreuses ou est « pas rentable ». Un repère vidé ne compte plus, sans tarir les autres : l'EEP
n'est tari que quand tous ses gisements le sont (de retour quand le dernier revient). Le repère « ⛏ Fin du dernier
minage » marque une position, pas un gisement : il ne compte pas. Le nom de ses repères compte parmi les
minerais de l'EEP. « Rien d'intéressant » ne vient que de toi : l'app ne le déduit jamais (avant, un EEP de petits
repères devenait « rien d'intéressant » sans moyen de l'enlever).
« Systèmes prospectés » liste les autres systèmes et leurs planètes rentables. Données : tables `MiningSite` et
`MiningBody` ; calcul des verdicts dans `server/src/modules/waypoints/survey.js`.

**Recherches en ligne** (`server/src/modules/waypoints/online.js`, fichier `server/data/waypoints-online.json`) :
Spansh (planètes à EEP du système) et Ardent Insight (prix des minerais du système) ne sont interrogés qu'au clic,
sur « Charger depuis Spansh » (écran du système) ou « Charger les prix d'Ardent » (Top 10, onglet « Ce système »).
Ce clic est une écriture, `POST /api/modules/waypoints/survey/load` (corps vide pour le système où tu es, ou
`{ "system", "systemAddress" }` pour un système choisi) et `POST /api/modules/waypoints/sweep/markets/load`, avec
l'en-tête `X-Elite-Compagnon` : ni la page d'un autre programme de ce PC (balise `<img>`), ni un lien ouvert dans le
navigateur (posté sur Discord, par exemple) ne peuvent le déclencher. Les lectures `GET /survey` et
`GET /sweep/markets` ne demandent jamais rien à ta place (`?online=1`, le clic des versions d'avant, n'y vaut plus
rien). Un seul chargement à la fois par système (un double clic ne fait qu'une requête), et 30 s au moins entre deux :
sinon 429, « réessaie dans N s », sans rien demander. Avant, une page d'un autre port faisait partir sans un clic le
système où tu es vers Spansh et Ardent, en boucle (775 requêtes en 3 s dans l'essai).
La première fois, la page propose d'activer les recherches automatiques, avec ce qu'elles envoient : activées, la
prospection demande d'elle-même à Spansh le système où tu es, à chaque nouveau système, et les prix d'Ardent suivent
le système du balayage ou le tien ; Spansh et Ardent voient alors ton adresse IP et la suite de tes systèmes. Une ligne
en bas de la page permet de changer d'avis (`GET`/`PUT /api/modules/waypoints/online`, `{ "auto": true }`). Sans
elles, une réponse déjà reçue sert encore, sans rien redemander : celle de Spansh tant que le serveur tourne (en
mémoire, 200 systèmes au plus ; activées, elle est redemandée au bout d'une heure, et 5 min après un échec), celle
d'Ardent pendant 15 min. Le SystemAddress envoyé à Spansh doit être un entier du jeu (64 bits) : `../`, `?` ou `%2e`
dans le paramètre ou le corps (`/survey`, `/survey/site`, `/survey/body`) sont refusés (400), avant toute requête.
Les réponses de Spansh sont typées et bornées : un nombre d'EEP qui n'est pas un entier de 0 à 100 est ignoré (la page
de la planète montre 999 cases au plus), et une page en erreur n'emporte plus toute l'interface
(`client/src/core/errorBoundary.js`).

En mode Minage Rhino, l'overlay ouvre aussi, cachée, une fenêtre « Repères » (📍 du HUD), où l'on navigue à la
souris (mode souris : Alt+Maj+K) : **systèmes → planètes où tu as des repères → EEP → repères**, un fil d'Ariane
cliquable en haut pour remonter (`client/src/modules/waypoints/navReperes.js`). Dans un système : les planètes avec
tes repères (verdict, meilleure note, bons minerais, nombre de repères et d'EEP ; 📍 celle près de laquelle tu es), et
les planètes prospectées sans repère. Sur une planète : ses EEP qui ont des repères (note, minerais, distance du plus
proche si tu y es ; 🎯 l'EEP ciblé en jeu). Sur un EEP : ses repères, du plus proche au plus loin, avec leurs forages,
leur distance et 🧭. La fenêtre **suit d'elle-même** où tu es (ton système, la planète près de laquelle tu es, l'EEP
ciblé s'il a des repères) ; un clic t'emmène ailleurs, jusqu'à ce que tu changes de système, de planète ou d'EEP
ciblé, ou « ◎ Suivre ». Les repères taris et pas rentables sont cachés : « ⏳ Taris (n) » les montre, marqués.
Le bouton 🧭 d'un repère montre une autre fenêtre ouverte cachée, « Guidage » : une flèche qui pointe vers le repère
par rapport à là où l'on regarde, la distance et le cap à suivre (« Cap 125° » ; « Tu y es » à moins de 100 m),
recalculés à chaque position ; 🧭 sur le même repère la cache. **Quitter la planète du repère** (après y avoir été)
cache le guidage et le repère n'est plus suivi ; choisir un repère d'une autre planète ne le cache pas. Cacher les
repères du système (📍 du HUD de minage) range aussi la boussole. Le repère suivi est gardé par le serveur
(`/guide-target`), partagé entre les fenêtres.

**Balayage d'un EEP** (bouton 🎯 du HUD de minage, fenêtre ouverte cachée avec le mode) : le jeu ne donne ni la
position ni la taille d'un EEP. On marque le centre (« ◎ Je suis au centre »), puis on roule jusqu'au bord du cercle
(« ◯ Je suis au bord ») : la distance entre les deux donne le rayon. L'app trace alors le parcours le plus court pour
que le scanner du SRV voie tout le disque, avec sa portée de détection : 1,5 km, mesurée en jeu (un gisement déjà
trouvé reste affiché jusqu'à 4,5 km, mais il n'est détecté qu'à 1,5 km). Personne ne suit un pointillé au mètre
près : les cercles sont espacés avec une **marge de conduite de 300 m** (`MARGE_SUIVI`), comme si le scanner portait
1,2 km. Le premier cercle passe à 1,2 km à l'intérieur du bord, chaque cercle suivant 2,4 km plus près du centre ; à
300 m du pointillé, d'un côté ou de l'autre, toute la bande du cercle est encore vue et ses tranches s'allument (avant,
à 190 m du pointillé une bande au bord restait non vue et la tranche n'atteignait jamais ses 90 %). S'il reste au centre
un disque plus grand que la marge, un passage au centre (EEP de 4,6 km : un cercle à 3,4 km, puis un à 1 km). Le dernier
cercle a de la marge quand il voit aussi le centre : tout rayon entre bord − 1,2 km et 1,2 km convient ; la fenêtre
affiche le plus court, et « Tout est vu ✓ » si tu roules ailleurs dans la marge. La fenêtre montre le disque vu de dessus, nord en haut, sous le
rayon de l'EEP en gros et en orange : les tranches de 10° déjà balayées en orange, le cercle à suivre en pointillés au milieu de sa route (bande de ± 300 m, verte quand tu roules dedans, presque
transparente quand tu en sors),
ta position et ton cap, et autour de toi un cercle bleu de la portée du scanner (ce qu'il voit d'où tu es).
Tes repères de la planète y sont aussi (ceux du disque et jusqu'à 20 % au-delà du bord), en losanges à la couleur de
leur minerai, toujours la même : Rhodplumsite rouge, Platine rose, Iridium violet, Osmium bleu, Palladium vert,
Or jaune, Argent gris-bleu, Hématite brun, Uranium vert clair, Titane turquoise ; blanc si le minerai n'est pas
reconnu, orange pour la fin du dernier minage. Le minerai se lit dans le nom du repère, fautes de frappe comprises
(« Iridiul », « rho »), sinon dans le premier raffiné de ses notes (`server/src/modules/waypoints/ores.js`). Un repère
tari ou pas rentable est un losange vide. Le nombre de foreuses, s'il est renseigné, s'affiche à côté (« 3F »), et
le survol donne le nom. Sous la carte, une légende ne liste que les minerais présents. Survoler un minerai de la
légende (ou un losange) ouvre par-dessus la carte une bulle « où le vendre dans le système » : une ligne par station,
celles qui en veulent vraiment d'abord (une demande de 0 ou 1 passe après, grisée « pas de demande »), puis de la
plus offrante à la moins offrante, avec le prix, la demande, la piste (S, M, L), la distance et l'âge du relevé.
Les prix viennent, station par station, du relevé le plus récent : Ardent Insight (prix des joueurs via EDDN, une
requête par système, 15 min de cache) ou le tien quand tu as été docké plus récemment (archive des Market.json du
module Routes, lue par sa route `GET /api/modules/routes/markets?system=`, et Market.json en direct). La bulle dit
lequel (« ton relevé · 15 h » ou « Ardent · 3 j »). Ardent injoignable : tes relevés seuls. Recherches automatiques
coupées (par défaut, voir « Recherches en ligne ») : Ardent n'est demandé qu'au clic sur « Charger les prix d'Ardent »
(Top 10, onglet « Ce système »), et la bulle le rappelle ; tes relevés s'affichent toujours. Les clés venues d'Ardent
sont lues dans des `Map` : une marchandise « constructor » ou « __proto__ » ne devient jamais un minerai. Calcul dans
`server/src/modules/waypoints/markets.js`, route `GET /api/modules/waypoints/sweep/markets` (le clic :
`POST …/sweep/markets/load`). Dans la bulle, le nom du
système et la demande sont en orange. Le bouton « 💎 Top 10 » fait sortir, de derrière la fenêtre de balayage, un
tiroir « À chercher en priorité » (page `/hud/waypoints-sweep-top`, `SweepTop.jsx`). C'est une fenêtre de l'overlay
collée au bord gauche de celle du balayage (à droite si l'écran s'arrête avant), de sa hauteur, qui la suit quand
elle bouge : toujours là mais transparente et sans prendre les clics tant qu'il est fermé, son panneau glisse en CSS
à l'ouverture et à la fermeture (le redimensionnement d'une fenêtre Electron saccade sous Windows). Il se ferme
avec la fenêtre de balayage, ne se déplace pas seul (Alt+Maj+C l'ignore), et se ferme au ✕ ou au même bouton
(`DOCKED` dans `overlay/main.js`). Hors de l'overlay, dans le navigateur, le panneau s'ouvre par-dessus la carte. Il a
deux onglets. « Galaxie » : les minerais du Rhino (la liste de prospection, hélium compris) classés par meilleure
offre d'achat du moment dans toute la galaxie, seulement là où la demande atteint 1 000 t (Ardent, relevés de moins
de 48 h, 30 min de cache), prix entre parenthèses, station et système dessous (`topOres.js`, route
`GET /api/modules/waypoints/sweep/top-ores`). « Ce système » : vendre sur place pour les mérites, chaque minerai
qu'une station du système achète, à son meilleur prix, avec la demande cumulée de toutes ses stations et sans seuil
(une demande de 50 t s'affiche). Les 10 premiers dans les deux cas. En dessous :
le cercle en cours, où tu en es du tour (« Un quart du tour · 27 % »), l'écart avec le cercle (« Sur le cercle ✓ »
à moins de 150 m près, plus et les cercles laisseraient des trous, sinon « Écarte-toi du centre : 500 m »), et une
flèche vers un point du cercle 600 m devant toi.
Le sens du tour se déduit de ta façon de tourner. Ce que le scanner a vu est compté sur une grille de 200 × 200 cases
au plus : chaque position en SRV marque tout ce qui est à moins de 1,5 km, trajet du centre au bord compris. Les
détours pour aller miner comptent donc, et le tour n'est fini que quand chaque tranche est vue à 90 %, pas quand on
repasse au point de départ. Seul le SRV balaie : en vaisseau ou à pied, rien ne compte. Calcul dans
`server/src/modules/waypoints/sweep.js`.

**Repère posé depuis le jeu** (grand bouton « 📍 Poser un repère ici » de la fenêtre de balayage, ou **Alt+Maj+R**) :
la position est prise au clic, mais **rien n'est enregistré avant ✓ OK** (✕ abandonne) ; un repère déjà posé à moins de
150 m est repris et mis à jour au lieu d'être recréé (`POST /waypoints/brouillon`, puis `/waypoints/brouillon/valider`). Un repère de minage là où tu
es, nommé d'après le minerai raffiné depuis le repère d'avant (« Repère » sinon). Il s'ouvre dans un tiroir collé à gauche de la
fenêtre de balayage (à gauche du Top 10 s'il est ouvert). En mode souris : le nombre de foreuses (1 à 6) et le minerai
s'enregistrent au clic ; le numéro d'EEP se tape au pavé et s'enregistre à ✓ OK. En SRV, le jeu ne donne jamais ce
numéro : tapé une fois, il complète l'EEP balayé et ses repères, et les repères suivants le prennent seuls.
Minerai : les minerais de **cet EEP** lus sur son panneau de cible (📷, en tête), les 12 courants d'un clic, ou
**« Autre… »** : une recherche (accents ignorés) dans les autres minerais du jeu (Tritium, Painite, et les minerais
planétaires du Rhino relevés sur le marché du jeu le 12 nov. 2026 : Dunite de périclase, Thortveitite, Diamant, Saphir,
Rubis, Hélium 3, Bastanäsite, Opale du vide), ceux que tu as raffinés, et ceux que l'app a **appris** : lus sur les
panneaux de cible (orthographe du jeu), ou tapés une fois. Un nom absent se tape : « ＋ Ajouter « … » » s'en sert et
le retient (`minerais-appris.json` dans le dossier des données, 200 au plus ; seulement un nom choisi dans le tiroir,
fait de lettres, chiffres, espaces, apostrophes et tirets : `nomMinerai`). Un repère qui porte exactement l'un de ces
noms a ce minerai (`waypoints/ores.js`, testé ; blanc sur la carte).

**Numéro d'EEP rempli tout seul** (`waypoints/numeroEep.js`, testé) : le jeu ne le donne que pour l'EEP ciblé dans le
HUD, ou au posé et au décollage du vaisseau (rare : le Rhino se déploie souvent en vol, 9 posés en tout dans les
journaux de référence). Un repère posé prend donc le numéro de l'EEP balayé qui le contient, sinon celui d'un repère numéroté
à moins de 3 km, sinon celui de l'EEP ciblé il y a moins de 20 min (une cible plus ancienne peut être celle d'un autre
EEP ; avant, elle restait jusqu'au saut suivant). Un numéro saisi à la main sur un repère complète l'EEP balayé qui le
contient ; et dès qu'un EEP balayé a son numéro, les repères de son disque qui n'en avaient pas le reçoivent (un numéro
déjà saisi n'est jamais changé).

**EEP balayés** (`waypoints/eeps.js`, testé ; Mes repères › 🎯 EEP balayés) : chaque balayage est **gardé**, jamais
écrasé par le suivant, avec sa planète, son système, son **numéro d'EEP** quand le jeu l'a donné (EEP ciblé, ou
« destination la plus proche » au posé et au décollage), son nom (✎), son centre, son rayon et ce que le scanner a
couvert (`eeps.json` ; l'ancien balayage unique `sweep.json` y est repris au premier lancement). Au sol, l'app
retrouve seule l'EEP dont le disque te contient (bord + 500 m) : sa carte s'affiche dans la fenêtre de balayage ;
ailleurs sur la planète, plus d'EEP actif (« Aucun EEP balayé ici »). En vol, rien ne change. « ◎ Nouveau centre »
dans un EEP déjà balayé le recommence (même EEP, même nom) ; ailleurs, il crée un nouvel EEP. ↺ (deux clics) efface
l'EEP actif de la bibliothèque, ses repères restent.

- **Liste** rangée par système et planète : numéro, nom, rayon, couverture, minerais de son disque, « tu es ici ».
- **🗺 Afficher la carte** : la carte ronde de l'EEP (`CarteEEP.jsx`, la même que la fenêtre en jeu), sans ta position.
- **Partager** : « 📤 Fichier de carte » (`.eep.json` : l'EEP et les repères de minerais de son disque, position,
  minerai, foreuses ; rien du joueur, ni nom ni notes), qu'un autre joueur ajoute avec **📥 Importer une carte** (un
  EEP « (reçu) » de plus, et ses repères, sauf là où il en a déjà un à moins de 30 m). Une carte reçue est vérifiée
  avant d'être lue. L'import est tout ou rien : l'EEP et ses repères entrent ensemble, ou rien n'entre ;
  « 🖼 Image » : la carte en PNG avec son titre, sa planète, son rayon et ses minerais, à poster sur Discord.
- `GET /api/modules/waypoints/eeps`, `GET /eeps/:id/carte`, `PATCH`/`DELETE /eeps/:id`, `GET /eeps/:id/export`,
  `POST /eeps/import`.

**Foreuses du Rhino** (fenêtre du balayage, et page de la session) : le jeu n'écrit dans le journal ni la pose
d'une foreuse ni sa position. Il écrit seulement chaque tonne raffinée (`MiningRefined`). Vider une foreuse donne
une rafale de raffinages sur place : le 7 nov. 2026, 12 rafales de 22 à 24 t en 40 s environ, toutes les 5 à
12 min. L'app reconnaît donc seule chaque vidange :
- une rafale, ce sont des raffinages en SRV séparés de moins de 40 s ;
- elle devient une vidange à 10 t (en dessous, c'est sans doute un ramassage à la main) ;
- l'heure et la position du SRV à ce moment (`Status.json`) sont celles de la foreuse ;
- à moins de 50 m d'une foreuse connue, c'est elle ; sinon c'est une nouvelle, au premier numéro libre de 1 à 6.
  Une 7e prend la place de la plus anciennement vidée (ramassée, sans doute) ;
- une rafale reprise au même endroit moins de 3 min après est la même vidange, faite en deux fois (12 t puis 11 t le
  7 nov.).

Une foreuse jamais marquée prend la position moyenne de ses vidanges. La pose peut aussi se marquer, en SRV : bouton
**⛏** de la fenêtre du balayage, ou **Alt+Maj+F** (raccourci global de l'overlay, valable en jeu, en mode Minage
Rhino). Une pose donne la position exacte. Marquée à moins de 50 m d'une foreuse connue, c'est elle qu'on a reposée,
et son cycle repart.

Le **cycle** se mesure de la fin d'une vidange au début de la suivante, sur la même foreuse. Un retour au vaisseau
(`DockSRV`) ou une nouvelle pose entre les deux annule la mesure : tu n'étais pas là pour vider. Chaque foreuse
prend la médiane de ses cycles ; sans cycle à elle, celle de la séance, toutes foreuses confondues. Sans aucun cycle
mesuré, l'app ne dit jamais « prête ».

La fenêtre du balayage montre une case par foreuse : son numéro, le temps depuis sa vidange, « prête » en vert, ou
le tonnage pendant qu'on la vide. La prochaine à vider est cerclée : la prête qui attend depuis le plus longtemps,
sinon la première qui le sera. En tête du bandeau : le cycle de la séance, la prochaine et sa distance. Les
foreuses sont aussi sur la carte, en ronds numérotés :
- sur la carte du balayage, quand il y en a un sur cette planète. La carte rétrécit un peu pour leur faire de la
  place ;
- sinon, sur une petite carte à elles, nord en haut, avec ta position et une échelle.

Un clic sur une case ouvre la boussole (la fenêtre « Guidage ») vers cette foreuse. **🧭** la fait suivre la
prochaine à vider : elle passe d'elle-même à la suivante après chaque vidange. Un nouveau clic la range. Choisir
un repère dans la liste (son 🧭) rend la boussole au repère, tout comme la boussole ouverte d'office au retour sur
la planète (« Fin du dernier minage »). ✕ (deux clics) oublie toutes les foreuses.

La page de la session (onglet Session) a un tableau « Foreuses du Rhino », une ligne par foreuse : état, dernière
vidange, nombre de vidanges, tonnes, tonnes par vidange, cycle, rendement et distance. Le rendement compte les
tonnes après la première vidange, rapportées au temps écoulé depuis. ✕ retire une foreuse ramassée ; « Tout
effacer » (deux clics) oublie toute la séance.

**Rayon de destruction** : 5 km d'après le seul auteur d'EDSMT, qui alerte à 3,5 et 4,8 km. Ce rayon n'a jamais été
mesuré. Rien n'est donc affiché ni signalé par défaut. Réglé dans le tableau (0,1 à 50 km), il apparaît en
pointillés rouges autour des foreuses, et un avertissement s'affiche dès 90 % de ce rayon.

**Séance** : une planète. Une vidange ou une pose sur une autre planète repart de zéro. Après 3 h sans pose ni
vidange, la séance est close : ses foreuses ne sont plus montrées, la boussole ne les suit plus, et la prochaine
vidange ou pose en ouvre une neuve (celle d'avant reste dans le fichier jusque-là). Un départ en
vaisseau n'efface pas les foreuses. Reste à vérifier en jeu qu'elles restent bien posées : le 7 nov., la
vidange de 11:05 est venue 6 min après la sortie du SRV, le journal ne dit pas si elles avaient été reposées.
Tout est gardé dans `server/data/drills.json` (écriture atomique) : poses, vidanges avec la position du SRV, réglage.
Le journal ne donne pas de position. Une vidange faite pendant que l'app était fermée est donc perdue, et un vieux
raffinage relu n'est pas compté (plus de 2 min).

Règles du jeu dans des constantes nommées, avec leur source, leur date et leur statut (mesurée, publiée, à
vérifier), regroupées et exportées dans `DRILL_RULES` pour une future vigie des règles. Les 40 s et les 3 min sont
des marges choisies, donc « à vérifier » : le journal du 7 nov. a montré au plus 25 s entre deux tonnes d'une
vidange, une reprise 41 s après, et au moins 4 min 47 entre deux vidanges (champ `measured`). Fichier :
`server/src/modules/waypoints/drills.js`. Branchement, routes et sauvegarde : `drillsApi.js`. Routes :
- `GET /api/modules/waypoints/drills` ;
- `POST /drills` : pose ici ;
- `DELETE /drills` et `DELETE /drills/:n` ;
- `PUT /drills/settings` (`{ destroyRadiusKm }`) ;
- `GET` et `PUT /drills/guide` (`{ target: 'next' | 1…6 | null }`).

Diffusion en direct : `waypoints:drills` et `waypoints:drill-guide`.

**Captures** : le mode Minage Rhino ouvre aussi, caché, un cadre en pointillés transparent, montré ou caché par le bouton 📷 du HUD de minage ; Alt+Maj+P photographie sa zone même caché. Placé (✥, flèches de 10 px, 📌)
sur le panneau du jeu qui montre le contenu de l'EEP ciblé, il photographie ce qu'il y a dessous au bouton 📷 ou à
**Alt+Maj+P**, même en jeu. Le cadre se cache le temps de la photo ; l'overlay capture l'écran du cadre et n'en
garde que la zone, en mémoire. L'image part au serveur, qui en lit le texte avec son lecteur intégré :
Tesseract (tesseract.js), dans un thread du serveur, avec les données de langue française livrées avec l'app
(`server/assets/tessdata/fra.traineddata`, version « fast » du dépôt officiel tesseract-ocr, empreinte SHA-256
vérifiée à chaque démarrage du lecteur). Rien n'est téléchargé ni lancé (ni PowerShell, ni autre programme).
Le panneau du jeu est vu de biais : ses lignes descendent vers la droite et Tesseract les lit mal telles quelles.
L'image est donc passée en gris (composante la plus forte, le HUD étant coloré), redressée selon les pentes de
lignes qu'on y trouve (3 au plus : une image large peut montrer une liste droite et le panneau penché), agrandie
×2 (2 600 px de côté au plus) et inversée (texte sombre sur fond clair) ; les lectures des différentes pentes
sont réunies en gardant, à chaque endroit, la plus sûre, et les mots douteux sont écartés
(`server/src/core/ocrImage.js`). La version agrandie et contrastée qu'envoie aussi l'overlay n'est plus lue
(même image). Une lecture prend 0,2 à 0,6 s ; le lecteur démarre en 0,15 s à la première capture, occupe
environ 40 Mo au repos et 80 à 120 Mo après quelques lectures, et s'arrête après 5 min sans capture.
L'ancien lecteur, l'OCR de Windows appelé par PowerShell (`server/src/core/ocr.ps1`), n'est plus appelé ; il
reste disponible en lançant le serveur avec la variable d'environnement `ELITE_OCR=windows` (réglage interne,
en attendant de décider de le retirer). La capture est rattachée à l'EEP ciblé (`Destination` de
Status.json). Les 30 dernières (image et texte) sont dans le panneau « Captures » de la page
(`server/data/captures/`). Les minerais lus (lignes de lettres seules, hors titre et nom du système, ramenées au
nom connu le plus proche : `captureOres.js`) sont ajoutés à la fiche de l'EEP ciblé, et le cadre affiche
« ✓ EEP 25 : Or, Hélium, Iridium, Titane ». Sans EEP ciblé, rien n'est rangé.
Le bouton 📍 du HUD de minage la montre ou la cache aussitôt, sans la fermer ; elle se déplace avec ✥ / 📌 comme les
autres. Un module déclare ces fenêtres en plus avec `hudPages` (ouvertes avec son mode) ; l'overlay ouvre cachées celles
de `START_HIDDEN` (overlay/main.js).

Minage planétaire : le jeu ne donne ni la position ni le contenu des emplacements (EEP). Le repère passe donc en type
« Minage » avec, en notes, le nombre d'emplacements de la planète et les minerais raffinés depuis le dernier repère
ou le dernier saut. Le numéro de l'EEP est rempli tout seul quand le jeu l'a donné sur cette planète : emplacement
le plus proche quand le vaisseau se pose ou décolle (`NearestDestination` de Touchdown / Liftoff), ou emplacement
ciblé dans le HUD (`Destination` de Status.json). Sinon il se saisit à la main (« Modifier »). Il s'affiche en
pastille « EEP 3 » dans la liste.

L'onglet « Simulation de vente » de la session calcule, minerai par minerai, le gain pour un tonnage et un prix saisis
(pré-remplis avec le reste à vendre et le dernier prix de vente). Les mérites sont une estimation à 390 par million
de crédits, mesurée sur deux ventes dans le système de minage ; le jeu ne publie pas de formule. Hors de ce système,
les ventes de minerai observées ont rapporté 0 mérite.

« Vidé aujourd'hui » range un repère de minage dans l'onglet « Taris » pendant 2 mois, avec sa date de retour ; il
revient ensuite tout seul dans la liste principale. « Pas rentable » range une zone dans son propre onglet, sans
limite de durée, jusqu'à annulation.

« ⛏ Lancer la session », sur un repère de minage, suit en direct : soute du SRV, soute du vaisseau, taux horaire
(actuel et moyenne), minerais raffinés et transférés, matériaux ramassés avec leur grade. Chaque `MiningRefined` du
journal compte pour une tonne. Le jeu n'écrit pas la soute du vaisseau tant qu'on est en SRV : elle est déduite du
dernier relevé et des transferts, dans l'état du jeu partagé par tous les modules (Coup d'œil compris). Il n'écrit pas non plus la capacité du SRV : la jauge utilise le plus gros
chargement vu. Une session survit à un redémarrage de l'app.

Le HUD de minage de l'overlay (590 px de large) montre, dans l'ordre, la soute du SRV, celle du vaisseau et le taux, valeurs centrées dans leur case. Au survol de la case du vaisseau, la ligne du bas du HUD (« Soute ») liste ce que contient sa soute, la plus grosse ligne d'abord (Hélium 135 t, Iridium 40 t… : la soute suivie par `core/gameState.js`, transferts du SRV compris), sans que rien ne bouge ni ne s'agrandisse ; ce qui était à bord avant de partir en SRV, que le jeu ne détaille pas, s'affiche en « non détaillé ». Le ↺ à côté du chrono (deux clics) remet le temps à zéro, et seulement le temps : soutes, compteurs et taux ne bougent pas ; il existe dans tous les HUD de mode. La case du SRV clignote en
rouge au-delà de 60 t : il est temps de vider dans le vaisseau. Celle du vaisseau prend un contour rouge discret, sans
clignoter, quand il y reste moins de 70 t de place (SRV compris).

Sans clic, la session démarre toute seule à la première tonne raffinée, en comptant la séance déjà commencée
(raffinages sans pause de plus de 15 min), et s'arrête au saut suivant (`FSDJump`). Elle se rattache à l'EEP ciblé
en jeu, sinon à celui du repère de minage le plus proche (moins de 3 km), et prend le nom de son repère. L'app
relancée en pleine séance (raffinage il y a moins de 15 min) la redémarre aussitôt.

Le chrono ne compte que le temps où tu joues. Toute action compte :
- un événement du journal (raffinage, transfert, SRV sorti ou rentré, atterrissage, saut…) ;
- un déplacement de plus de 50 m ;
- un changement d'écran en jeu.

Après plus de 10 min sans action, la session se met en pause d'elle-même (« pause · inactif »). La pause part de
la dernière action et dure jusqu'à la suivante, donc une nuit ne compte pas. Les 10 min d'attente avant la pause ne
comptent pas non plus : le chrono revient à ta dernière action. La fermeture du jeu (`Shutdown`) met en pause tout de
suite (« pause · jeu fermé »). L'attente des tourelles reste comptée tant qu'elle dure moins de 10 min.

Tout est recalculé depuis les journaux et les déplacements notés (`server/data/activity.json`, 3 jours,
`server/src/core/activity.js`). Une session déjà en cours est donc corrigée au redémarrage. Calcul dans
`activeSegments` (`mining.js`).

Un clic sur « en direct » dans le HUD (ou ⏸) met le chrono en pause, et un nouveau clic le relance. La période en
cours se ferme et une nouvelle commence à la reprise. Une tonne raffinée pendant cette pause relance le chrono
d'elle-même, en comptant cette tonne.

**Retour au minage** : chaque tonne raffinée en SRV note l'endroit, par planète (`server/data/last-mining.json`).
De retour sur cette planète, la boussole s'ouvre d'elle-même vers ce dernier coin de minage (`lastSpot.js`), aux
conditions suivantes :
- tu atterris (`Touchdown`) ou tu sors le SRV (`LaunchSRV`) ;
- la dernière tonne date de plus de 2 min ;
- tu es entre 150 m et 50 km de son emplacement.

Elle guide vers le repère « ⛏ Fin du dernier minage », un seul par planète, déplacé à chaque retour, et se range à
la tonne suivante.

Le taux actuel moyenne les 5 dernières boucles complètes. Une boucle commence au premier raffinage après plus de
40 s de pause : le nombre de tourelles n'entre pas dans le calcul, et l'attente qu'elles se remplissent ne fait
pas chuter le taux. S'il n'y a pas encore de boucle complète, ou aucune pause, il vaut les 10 dernières minutes.

Les ventes (`MarketSell`) comptent tant que la session tourne, dans la limite du tonnage raffiné pendant la session :
ce qui était déjà en soute n'est pas compté. Le gain horaire part du clic sur « Lancer la session ». Les mérites sont
tous ceux reçus pendant la session, quelle que soit leur origine. Ils suivent le total donné par le jeu. Quand le jeu
retire un doublon, la correction est faite là où le doublon avait été compté : un doublon d'avant la session ne lui
retire rien. « Reset » remet compteurs et chrono
à zéro. « Stop : session finie » range le bilan dans l'historique, d'où « Reprendre » la relance : les compteurs
continuent et le temps de pause n'est pas compté.

« Afficher la fenêtre » ouvre le HUD de minage par-dessus le jeu (overlay, voir « Mode de jeu ») : soutes du SRV et du
vaisseau, taux, chrono et matériaux par grade. « Masquer la fenêtre » le ferme.

« Y aller » : sur la même planète, distance au sol et cap à suivre (formule de haversine avec le rayon de la
planète), flèche qui tourne avec votre cap, mis à jour chaque seconde. Ailleurs, l'app indique le système ou la
planète à rejoindre.

## Module « Systèmes importants »

Des favoris d'un coup d'œil : chaque système ou zone garde une étiquette, une description de ce à quoi il sert et, le
cas échéant, ses planètes. On copie le nom pour la carte de la galaxie. La vue d'ensemble compare les zones : distance
depuis la position actuelle (`StarPos` du journal), estimation de sauts et de temps (saut maximal à vide, 65 s par
saut), planètes possibles et EEP connus.

« Recherche multiplanète » trouve les zones qui regroupent le plus de planètes posables d'un type donné : gravité
maximale, distance maximale de Sol, taille de la bulle (toutes les planètes d'une zone sont à moins de cette distance
les unes des autres), distance d'arrivée, puissance, EEP connus. Les données viennent de Spansh, relevées par les
joueurs : les EEP ne sont connus que sur les planètes déjà scannées, et rien n'indique si une veine est vide. Une
recherche ne contient que des données publiques, aucune donnée personnelle n'est envoyée. Elle est bornée
(`server/src/modules/systems/spansh.js`) : 200 requêtes et 5 min au plus, une tranche de distance jamais plus fine
que 0,5 al (au plafond de 10 000 résultats de Spansh, ses 10 000 premiers sont gardés et la réponse dit
`truncated: true`), arrêt dès qu'une page n'apporte rien de nouveau, et une réponse illisible (`count` absent ou pas
un entier, `results` absent) arrête tout avec une erreur 502 lisible. Avant, une réponse anormale de Spansh faisait
tourner la recherche sans fin.

## Guide des ressources (Mes repères › Guide des ressources)

Sur quel type de monde chercher, avec le Rhino, les ressources qui se vendent plus de 50 000 cr la tonne. Une carte par
type de monde (haute teneur en métaux, riche en métaux, rocheux, roche et glace, glacé) avec ce qu'on y trouve, puis
un tableau ressource par ressource. Deux sources, fondues (`client/src/modules/waypoints/guideRessources.js`) :

- **le tableau de la communauté** transmis par Cronisos Lysiris le 19 nov. 2026 : où une ressource a été trouvée
  (✓ en contour), où elle ne l'a pas été (✕). Il ne garantit pas sa présence à chaque emplacement ;
- **tes journaux** (`server/src/modules/waypoints/guide.js`, route `GET /guide`) : chaque tonne raffinée en Rhino,
  rangée sur la planète où tu étais (approche, atterrissage), dont le type vient de son scan. Case pleine, avec tes
  tonnes dessous. Le prix affiché est ton meilleur prix de vente (`MarketSell`).

Tes observations l'emportent : une case que le tableau dit vide, ou ne connaît pas, devient « raffinée par toi ». Ce
qu'aucune des deux ne dit reste « ? ». Une ressource que tu as vendue moins de 50 000 cr, ou jamais vendue, est citée
sous le tableau plutôt que dedans. Rien ne sort du PC pour ce guide, et rien n'est demandé à un site.

Ce guide a pris la place des captures dans le menu de Mes repères. Le cadre de capture n'est plus ouvert avec le mode
Minage Rhino (plus de bouton 📷 dans le bandeau) ; les captures déjà prises restent lisibles à `/reperes/captures`.

## Module « Gardiens » (Activités › Gardiens)

Une page, trois onglets (`/gardiens`, `?onglet=sites`, `?onglet=methode`).

**Planificateur.** Les 29 déblocages du courtier en technologie des Gardiens (6 modules, 14 armes, 6 armes modifiées,
3 chasseurs), à cocher. La page additionne les ingrédients des déblocages cochés, retire ce que tu as en stock (lu par
HTTP sur `/api/modules/engineering/inventory`, le module Ingénierie) et montre ce qu'il manque, rangé par genre :
matériaux gardiens, données d'obélisque, matières premières, matériaux fabriqués, marchandises. Une marchandise se
transporte en soute : son stock n'est pas connu, elle est toujours « à acheter ». « Prête » : tous les matériaux du
déblocage sont en stock, les déblocages cochés étant servis dans l'ordre sans compter deux fois le même matériau. Le
nombre de segments de plan manquants donne le nombre d'activations de structure à prévoir. Le choix est gardé dans
`gardiens-plan.json` (données de l'app), par `PUT /api/modules/gardiens/plan`.

- Recettes : `server/src/modules/gardiens/recettes.js`, recopiées d'EDEngineer le 22 nov. 2026. Les noms français des
  ingrédients sont notre traduction ; la page préfère le nom du jeu quand l'inventaire le donne.
- Calcul : `client/src/modules/gardiens/besoins.js` (testé).

**Sites.** Un site gardien est un repère de type « Site Gardien » du module Mes repères : la page les lit et les crée
par l'API des repères (`/waypoints`, `/waypoints/importer`), sans importer son code. Trois blocs : tes sites (avec
« Partager à l'escadron », genre de partage `repere-gardien`), ce que l'escadron a partagé (à copier dans tes sites),
et les structures connues : 49 structures de 2018 (`sites.js`, source galnet.fr d'après Canonn Research, 21 actives),
à ajouter à tes sites d'un clic. Cette liste n'est pas revérifiée en jeu et ne dit pas quel plan donne chaque
structure : c'est aux membres de le noter dans le repère puis de le partager.

**Méthode.** Les types de sites et l'activation d'une structure, d'après le même guide, et « Où aller » : pour chaque
type de plan (module, arme, vaisseau), le site conseillé, les liens vers les cartes des pylônes et l'ordre à suivre
(`guides.js`, `GET /api/modules/gardiens/guides`). Les cartes restent chez leurs auteurs : l'app n'en copie aucune.
Trois structures de la liste connue portent ainsi leur type de plan.
