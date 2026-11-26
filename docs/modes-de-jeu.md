# Modes de jeu et fenêtres en jeu

> Partie de la notice d’Enova : sommaire dans le [README](../README.md#documentation).

## Menu « Mode de jeu »

**Commerce** (Mes routes commerciales), **Minage Rhino** (Mes repères), **Minage vaisseau**, **Combat**, **Sauvetage**,
**Matériaux** ou **Colonisation**. Choisir un mode ouvre
sa page et son HUD par-dessus le jeu (overlay), et ferme celui de l'ancien mode. Passer d'un mode à un autre remet à zéro la session du nouveau (chrono et compteurs de Combat, Sauvetage, Matériaux ou Minage vaisseau). Cette remise à zéro, comme celle du bouton, tient jusqu'au prochain lancement du jeu, même si l'app redémarre (heure gardée dans `server/data/sessions.json`). Le chrono se met en pause de lui-même dans trois cas : à quai (station, porteur), quand le jeu est fermé, et après plus de 10 min sans action (« pause · inactif »). Une action, c'est un événement du journal, un déplacement de plus de 50 m ou un changement d'écran. Cette pause part de la dernière action et finit à la suivante (`server/src/core/activity.js`). On peut aussi mettre en pause au bouton « ⏸ Pause » de la page, ou dans la fenêtre en jeu : ⏸ à côté de ✥, ou un clic sur « en direct ». Un nouveau clic relance le chrono, y compris après une pause « inactif ». Les taux par heure ne comptent donc que le temps de jeu actif. Le Commerce n'a pas de HUD. « Fenêtre Coup d'œil » ajoute le Coup d'œil en
fenêtre libre, quel que soit le mode. Chaque page (Combat, Sauvetage, session de minage, Coup d'œil) a aussi un
bouton « Afficher la fenêtre » / « Masquer la fenêtre ». « Aucun » ferme tout : les fenêtres du mode, et celles que
les modules ont ouvertes d'eux-mêmes (itinéraire, saut du porteur, vente à quai, alerte du Coup d'œil…). Chacune de
celles-ci reste fermée jusqu'à ce que son module la ferme lui-même (arrivée, fin de l'alerte, départ du quai), puis
s'ouvre de nouveau à sa prochaine occasion ; « Fenêtre Coup d'œil », si elle est cochée, reste. Les pages des modes et
le Coup d'œil n'ont pas de bouton dans la barre : ils sont dans ce menu et sur l'accueil (Coup d'œil aussi par Alt+C). En bas du menu : le vaisseau où tu es
(nom donné dans l'app, sinon nom en jeu, sinon modèle) et son rôle, modifiable sur place (« ⚑ Rôle », voir « Rôles des
vaisseaux »).

Les fenêtres ouvertes par les modules sont enregistrées avec le choix du menu (`server/data/overlay.json`). L'overlay
garde ses fenêtres quand le serveur redémarre (plantage relancé par `npm run dev`, code modifié) : le serveur relancé
sait donc les fermer quand leur module le demande, et ferme, 10 s après son démarrage, celles qu'aucun module n'a
reprises (alerte dont la minuterie est perdue…). L'itinéraire et le Compagnon reprennent la leur si elle sert encore.
Avant, ces fenêtres restaient par-dessus le jeu jusqu'au prochain ordre. Un ordre qui ne fait que fermer une fenêtre
ne lance jamais l'overlay s'il ne tournait pas (`--if-running`, `overlay/guards.js`). `PUT /api/overlay` est vérifié :
`mode` (identifiant ou `null`), `pages` (au plus 16 identifiants), `glance` et `dismissExtras` (vrai ou faux) ; sinon
400 avec la raison, rien n'est changé.

Les modes sont déclarés à un seul endroit, `server/src/core/modes.js` (données pures, sans import) : identifiant, nom,
icône et fenêtres de l'overlay ouvertes avec le mode (son HUD, puis les fenêtres en plus du module). L'interface reprend
ce fichier tel quel (`client/src/core/modes.js`, intégré par Vite), chaque module client y renvoie par
`mode: modeInfo('<id>')`, et le serveur s'en sert pour ouvrir seul les fenêtres d'un mode. Un mode ajouté là devient
aussitôt un rôle de vaisseau possible. Concordance avec les modules clients (identifiant, page, HUD et `hudPages` =
fenêtres, dans l'ordre) vérifiée par `client/src/core/modes.test.js` et par le banc (étape `75-pages`, sur les
modules tels que Vite les charge). Une fenêtre qu'un module ouvre lui-même, quand son serveur le décide
(`ctx.overlay.setExtra`), et jamais avec le mode, se déclare à part dans `hudExtras` (« À acheter ici » de la
Colonisation) : elle a sa page `/hud/<page>` et son nom dans « Disposer les fenêtres », sans faire partie du mode.

- Chaque fenêtre a son bouton **✥** : on la fait glisser, puis **📌** fixe sa position, retenue pour la suite.
  La fenêtre Coup d'œil se redimensionne aussi en mode déplacement, avec ◂ ▸ ▴ ▾.
- Sans position fixée, une fenêtre s'ouvre à la première place libre (`overlay/place.js`) : les HUD en haut au
  centre, les uns sous les autres selon leur vraie hauteur ; les fenêtres libres en haut à droite, sinon à côté ou
  sous celles déjà ouvertes, hors de la colonne des HUD et jamais sous une fenêtre qui prend la hauteur de son
  contenu (Coup d'œil, liste de courses). Les fenêtres qui s'ouvrent d'elles-mêmes (alerte des commandes, compagnon,
  vente de mérites, SCO prêt, saut du porteur…) ne se couvrent donc pas. Écran plein : l'ancienne place par défaut.
- Le Minage affiche la session lancée depuis **Mes repères** : soute du vaisseau et du SRV, taux, matériaux.
- L'overlay peut aussi se lancer seul : `npm run overlay` (Combat) ou `npm run overlay:sauvetage`.
- Temps réel : toutes les fenêtres et toutes les pages ouvertes dans un même navigateur partagent **une seule**
  connexion au serveur (`client/src/core/streamWorker.js`, un SharedWorker). Un navigateur ne garde que 6 connexions
  par adresse : avec une connexion par fenêtre, le Minage Rhino (6 fenêtres), le Coup d'œil et le Compagnon les
  prenaient toutes, et plus aucune donnée ni aucune nouvelle fenêtre ne se chargeait. Sans SharedWorker, une page
  ouvre sa propre connexion, comme avant. Côté serveur (`server/src/core/realtime.js`), un client qui ne lit plus
  (console figée par une sélection de texte, script bloqué) est coupé dès que plus de 1 Mo l'attend, ou qu'il est
  bloqué depuis plus de 30 s : avant, le serveur lui gardait tout en mémoire jusqu'à la fermeture. Le navigateur se
  reconnecte de lui-même. Au-delà de 32 connexions ouvertes, une nouvelle est refusée (503, avec la raison).

**Mode proposé** : l'app regarde ce que tu fais et propose le mode qui va avec. Une devinette ne bascule jamais
d'elle-même : changer de mode remet à zéro les compteurs du nouveau, donc une fausse alerte les viderait. Seule
exception, voulue par le joueur : le rôle principal d'un vaisseau, à l'embarquement (voir « Rôles des vaisseaux »).
Les signes retenus :

| Mode proposé | Signes |
|---|---|
| Minage Rhino | vaisseau pris avec un grand hangar (`largebuggybay`, celui du Rhino), Rhino sorti, ou tonne raffinée en SRV |
| Minage vaisseau | vaisseau équipé de lasers de minage ou de prospection, astéroïde prospecté, drone de prospection, ou tonne raffinée en vaisseau |
| Combat | prime, ou victoire en zone de conflit |
| Sauvetage | capsule de survie ramassée, ou livraison de sauvetage |
| Matériaux | 5 matériaux ramassés en 10 min, hors SRV et sans minage |
| Colonisation | à quai à un chantier de construction (nom de chantier **et** service `colonisationcontribution`), ou livraison à un chantier |

Un pirate qui t'attaque pendant le minage ne propose pas le Combat. La proposition prend la ligne du bas du HUD
(« PROPOSÉ ⛏ Minage Rhino ? vaisseau avec hangar à Rhino [Oui] [Non] ») et s'affiche aussi à côté du menu
« Mode de jeu ». « Oui » ouvre le mode et ses fenêtres. « Non » fait taire ce mode 30 min. Sans réponse, la
proposition s'efface au bout de 15 min, et les fenêtres en sont prévenues (la ligne du HUD se vide d'elle-même). Un
changement de vaisseau efface la proposition en cours : elle venait de l'ancien. Les rôles des vaisseaux changent ce qui
est proposé (propositions discrètes, « Retenir comme rôle de ce vaisseau ») : voir ci-dessous. Logique dans
`server/src/core/modeGuess.js`.

En Minage Rhino, le HUD reste en « pause · 1re tonne » tant qu'aucune session ne tourne : le chrono démarre à ta
première tonne raffinée.

### Ce qu'une fenêtre de l'overlay peut faire

Les fenêtres de l'overlay restent au premier plan pendant tout le jeu. Ce qu'elles chargent ne vient que de
l'interface de l'app ; même une page piégée (une dépendance du client, un défaut du moteur de rendu) n'y gagne presque
rien (`overlay/main.js`, `overlay/guards.js`) :

- **Aucune permission** : ni micro, ni caméra, ni lecture du presse-papiers, ni notifications, ni position, ni
  périphériques, ni ouverture d'une application externe (`mailto:`…). Sans gestionnaire, Electron accordait tout sans
  rien demander. La copie du nom d'un système passe par l'overlay lui-même.
- **Aucune requête ailleurs** : seulement `http://127.0.0.1:5173` (pages, modules, API par son proxy, flux temps réel) et
  `ws://127.0.0.1:5173` (rechargement de Vite). Un autre site, un autre port de ce PC ou un fichier local : annulé
  avant de partir.
- **Navigation** : une page ne part jamais ailleurs ; elle peut seulement se recharger elle-même, comme Vite le demande
  après une mise à jour ou un redémarrage (avant, ce rechargement était bloqué aussi, et la fenêtre restait sur l'ancien
  code jusqu'à ce qu'on la ferme). Un cadre inclus (iframe) ne navigue jamais. Aucune fenêtre surgissante.
- **Pont** (`overlay/preload.js`) : il n'écoute que le cadre principal de chaque fenêtre, à son adresse. Les fonctions
  sensibles sont réservées aux pages qui en ont besoin, et à **ton clic** : la fenêtre est affichée et la souris est
  dessus (ou le mode souris, Alt+Maj+K, est actif). Seul le cadre de capture photographie sa zone, au clic sur 📷
  (Alt+Maj+P, décidé par l'overlay, photographie même le cadre caché) ; seul le Coup d'œil copie un texte ; passer en
  mode déplacement (✥, la fenêtre prend alors le clavier) demande aussi le clic, en sortir (📌) jamais. Seules les
  fenêtres qui suivent leur contenu (Coup d'œil, liste de courses) changent d'elles-mêmes de hauteur. Une page ne peut
  donc ni se photographier en boucle, ni remplacer ce que tu as copié, ni prendre le clavier du jeu.
- **Ordres du serveur** : une fois lancé, l'overlay reste branché sur le serveur de l'app (`GET /api/overlay/stream`,
  `overlay/canal.js` ; canal local en 127.0.0.1, rien ne quitte le PC). Les ordres d'ouvrir ou de fermer une fenêtre
  passent par ce canal : aucun programme n'est relancé à chaque saut, et l'overlay n'est lancé que s'il n'y est pas
  branché. Plusieurs changements dans le même instant (modules qui réagissent au même événement du journal, double
  clic) partent en un seul ordre, avec l'état complet (`server/src/core/overlay.js`, 120 ms). Chaque ordre porte son
  heure (`--at`) : si deux ordres se croisent quand même, l'overlay n'applique pas le plus ancien arrivé en dernier.
  Une fenêtre fermée puis rouverte aussitôt reste fermable (avant, elle devenait orpheline : plus fermable par l'app,
  boutons sans effet).
- **Fenêtres rangées pendant un saut** : Signaux, Refroidissement FSD et Itinéraire sont seulement cachées au départ
  d'un système, puis réaffichées à l'arrivée sans prendre la main au jeu. Rangées depuis 10 minutes, elles se ferment
  pour de bon.

- **App arrêtée ou plantée** : les fenêtres ne gardent pas des valeurs figées présentées comme en direct (« Couvert ✓ »,
  « tout compte », boussole…). Chaque page `/hud/…` passe par `client/src/core/hudConnection.js` : au bout de 10 s
  sans connexion au flux temps réel (coupure, ou aucun message depuis 15 s, `STALE_MS` de `core/streamSource.js` : le
  proxy de Vite garde ouverte la connexion d'un serveur arrêté), son contenu est grisé sous le bandeau « Connexion à
  l'app perdue : valeurs figées ». L'overlay, de son côté, demande `GET /api/state` toutes les 10 s (`watchApp` de
  `overlay/guards.js`) : sans réponse depuis 30 s, toutes ses fenêtres se cachent ; de retour, elles réapparaissent ;
  sans réponse depuis 5 min, l'overlay s'arrête. Un raccourci global déjà pris par un autre programme (Electron ne le
  dit pas) est écrit dans la console et, l'overlay lancé par le serveur n'en ayant pas, nommé par une icône dans la
  zone de notification, qui permet aussi de masquer les fenêtres et de quitter l'overlay (la seule sortie si
  Alt+Maj+Q est pris).

Reste ouvert tant que l'overlay charge ses pages depuis Vite : si Vite est arrêté et qu'un autre programme prend
`127.0.0.1:5173` (un autre compte Windows du même PC, par exemple), les fenêtres qui se chargent ou se rechargent à ce
moment-là affichent sa page. Les gardes ci-dessus limitent ce qu'elle peut faire ; le chargement depuis le disque
(version Electron de l'app) fermera ce cas. L'étape `26-overlay` de `npm run controle` essaie toutes ces gardes dans le
vrai Electron.

## Mode « Minage vaisseau »

Page `/minage-vaisseau` et HUD : soute et drones restants, tonnes raffinées et rythme sur la dernière demi-heure, et
surtout le **dernier astéroïde prospecté** : minerais en pourcentage, présence de matériaux, filon mère, déjà miné ou
non, et sa **valeur estimée par tonne collectée** : somme de la teneur de chaque minerai multipliée par son prix.
Verdict en couleur : bon dès 40 000 cr/t, moyen dès 15 000, à laisser en dessous. Les prix sont relevés une fois
(`server/src/modules/shipmining/ore-prices.json`, médiane des meilleures offres d'achat sur Ardent Insight) : ils servent
à comparer les minerais entre eux, pas à prévoir le gain exact. Sans prix connu, le verdict se fait sur la teneur. Le raffinage fait depuis le SRV n'est pas compté ici : il relève du mode
**Minage Rhino** (session de Mes repères).

## Mode « Matériaux »

Page `/materiaux` et HUD : matériaux récupérés pendant la session (bruts, manufacturés, encodés), par grade, et le
dernier récupéré. Les grades viennent des données de référence téléchargées par l'ingénierie.

## Mode « Livraison Powerplay »

Pour les ressources que ta puissance te confie (dossiers de presse, contrats sous scellé, programmes d'Aisling…), à
charger chez elle puis à livrer dans un système. Le bandeau en jeu (`/hud/powerdelivery`) a quatre cases : **En soute**
(tonnes, et le nom de la ressource), **Mérites** gagnés par tes livraisons (et les tonnes livrées), **Mérites / h**,
et **Recharge** : le temps restant avant de pouvoir recharger, puis « Possible » en vert. Le jeu donne un quota par
tranche fixe de 30 minutes, et ces tranches ne partent pas de ton chargement (mesuré du 19 au 25 nov. 2026 : 250 t
puis 250 t à 19 et 25 minutes d'écart ; deux pleins quotas pris à quelques secondes d'écart encadrent un changement
de tranche). L'app déduit donc la grille des paires récentes de pleins quotas rapprochés
(`server/src/modules/powerdelivery/grille.js`, 36 heures de mémoire : la grille tient d'un jour au lendemain mais se
décale sur plusieurs jours). Sans paire récente, elle donne la seule certitude, marquée « au plus tard » : 30 minutes
après le dernier chargement. Le plafond par tranche, qui dépend du rang, n'est pas connu (250 t aux rangs 193 à 212).
La ligne du bas montre le dernier chargement ou la dernière livraison. La page (Activités › Livraison Powerplay) ajoute
le détail par ressource (chargées, livrées, mérites, mérites par tonne) et les derniers mouvements.

Le jeu note chaque chargement (`PowerplayCollect`) et chaque livraison (`PowerplayDeliver`), avec le nom de la
ressource : rien n'est deviné. Les mérites comptés sont ceux que le jeu donne dans les dix secondes qui suivent une
livraison (le journal du 19 nov. 2026 les donne à la même seconde) ; ceux d'une autre activité ne sont pas mélangés.
Une ressource est reconnue en soute dès que tu l'as chargée ou livrée une fois depuis le lancement de l'app. Charger
des ressources Powerplay propose de passer dans ce mode (`server/src/modules/powerdelivery/`).

## Signaux du système

En mode **Sauvetage** ou **Matériaux**, une fenêtre s'ouvre d'elle-même par-dessus le jeu à chaque arrivée dans un
système, et se range au départ (cachée, puis réaffichée à l'arrivée suivante). Elle liste, au fur et à mesure qu'ils apparaissent (scan FSS ou balayage), les signaux
utiles : sources non identifiées (avec leur type, leur menace et le temps qu'il leur reste), sites au sol, zones de
conflit, sites d'extraction, mégavaisseaux, installations. Stations, porteurs et balises sont ignorés.

## Itinéraire

Dès qu'un itinéraire de plus de 2 sauts est tracé dans la carte de la galaxie, une fenêtre s'ouvre d'elle-même : sauts
restants, destination et distance, prochaine étoile, étoiles non récupérables sur la route (classes autres que
O, B, A, F, G, K, M) et dans combien de sauts arrive la première. Elle se ferme à l'arrivée ou quand l'itinéraire est
effacé.

**Carburant.** La case « Carburant » donne le niveau du réservoir (Status.json, en direct) et pour combien de sauts de
la route il suffit. Le calcul tient compte du **récupérateur de carburant** (Loadout) : sans lui, une étoile
récupérable ne sert à rien (la case de la prochaine étoile le dit) et le réservoir ne fait que baisser ; avec lui, on
suppose le plein refait à chaque étoile récupérable. Si le carburant ne couvre pas les **2 sauts suivants**, une
alerte rouge le dit (le saut qui ne passe pas, ce qui resterait, ce qu'il faudrait, pourquoi) et la fenêtre s'ouvre,
même pour une route courte.

Consommation d'un saut : carburant = k × (distance × masse)^exposant, la masse étant celle du vaisseau à vide + la
soute + le carburant. k est mesuré sur les 10 derniers sauts normaux du même vaisseau avec le même FSD (ingénierie
comprise ; sans les sauts boostés par une étoile à neutrons, une naine blanche ou une injection FSD), avec 15 % de
marge. L'exposant dépend de la taille du FSD, sauf pour les FSD Mk II (celui du Caspian : 2,45 quelle que soit la
taille, mesuré). Rejoué sur 958 sauts du joueur (10 nov. 2026) : jamais plus de 6 % sous la consommation réelle. Un
vaisseau qui n'a jamais sauté (ou un FSD changé) : « conso. connue au 1er saut ». Règles : `server/src/regles/saut.js`.

## Saut du porteur

Quand tu programmes un saut de ton vaisseau porteur, une fenêtre s'ouvre d'elle-même par-dessus le jeu (overlay) :
en carré, le compte à rebours jusqu'au départ en grand (heure donnée par le jeu dans le journal), la destination,
l'heure de départ et le tritium.
Elle s'ajoute au mode de jeu en cours et se ferme 2 min après le départ, à l'arrivée, ou à l'annulation du saut.
Comme les autres, elle se déplace avec ✥ et garde sa position. Il faut que l'app tourne au moment de la programmation.

**Cargaison estimée** (`server/src/modules/carrier/cargo.js`, `GET /api/modules/carrier/cargo`). Le jeu n'écrit nulle
part le contenu d'un porteur, seulement ce que tu y fais : le module l'estime, porteur par porteur (son MarketID),
depuis tout l'historique du journal. `CargoTransfer` à quai au porteur : « tocarrier » ajoute, « toship » retire,
« tosrv » est ignoré ; `MarketSell` à son marché ajoute, `MarketBuy` retire ; jamais sous zéro. Ton porteur est celui
de `CarrierStats`, qui donne aussi le total réel à bord (`SpaceUsage.Cargo`, vu à 1 748 t dans la séance de minage du
7 nov. 2026) : l'écart avec l'estimation est montré, jamais corrigé. Il vient de ce que tes journaux ne voient pas :
achats et ventes des autres joueurs à son marché, transferts d'autres membres, tout ce qui précède tes journaux. Un
porteur qui n'est pas le tien (escadron) est suivi à part, d'après tes seuls transferts. La Colonisation s'en sert
(voir [Colonisation](colonisation.md)). À vérifier avec un vrai journal : le sens « toship » à quai au porteur, et la
forme des noms de `CargoTransfer` (« steel » supposé, comme Cargo.json).

## Refroidissement FSD et « SCO prêt »

Sans fenêtre : un bandeau par refroidissement, d'après la maquette de Cronisos Lysiris (19 nov. 2026). Le moteur à
gauche, le titre (« Refroidissement FSD » ou « SCO »), le compte à rebours à droite, et la courbe de la chaleur qui
retombe, de l'orange au bleu : elle ne défile pas, elle fluctue sur place, et se vide de gauche à droite avec le temps écoulé. Seul le SCO a son bandeau (le jeu affiche déjà le
refroidissement du FSD normal, pas celui du SCO) ; il affiche « PRÊT » en vert une seconde, et son bouton de
déplacement apparaît quand la souris passe dessus (`client/src/modules/fsdcool/Jauge.jsx`, `vague.js`).
La jauge du FSD apparaît d'elle-même par-dessus le jeu pendant le refroidissement du FSD hors saut, par exemple
après une surcharge du supercruise (indicateur « FSD Cooldown », bit 18 de `Flags` dans `Status.json`). Le jeu ne
donne pas sa durée : le compte à rebours reprend celle des refroidissements déjà mesurés (`server/data/fsd-cooldown.json`).

**SCO prêt.** Le jeu ne dit pas non plus quand l'overdrive du supercruise (SCO) redevient disponible, et le bit
« FSD Cooldown » ne se lève pas après un SCO. À la coupure du SCO (bit 20 de `Flags2`, 0x00100000, qui retombe), la
même fenêtre montre « Prêt dans » en orange, puis **PRÊT** en vert pendant 1 s, et se ferme. Elle ne s'affiche qu'en
supercruise. Si le FSD refroidit en même temps, les deux comptes à rebours sont côte à côte.

La durée dépend de la génération du vaisseau (`Loadout.Ship`). Valeurs de départ d'après le plugin
[SCO-Cooldown](https://github.com/elitedangereuse/SCO-Cooldown) (9 oct. 2026), à mesurer :

| Vaisseaux | Durée |
|---|---|
| Nouvelle génération : Python Mk II, Type-8, Mandalay, Cobra Mk V, Corsair, Panther Clipper Mk II, Type-11 Prospector, Kestrel Mk II, Lynx Highliner | 9 s |
| Caspian Explorer (`explorer_nx`) | 7 s |
| Tous les autres | 17 s |
| Vaisseau pas encore connu | 9 s |

**Mesure.** Chaque coupure et la réactivation suivante sont notées dans `server/data/fsd-status.log`
(« SCO coupé : prêt dans 9.0 s », « SCO réactivé 10.2 s après la coupure »). Si le jeu refuse le SCO pendant son
refroidissement, cet écart borne la vraie durée par le haut. Les 20 derniers écarts de chaque vaisseau sont gardés
dans `server/data/sco-cooldown.json`. Un écart ne compte pas après une sortie du supercruise, un saut, un rechargement
du jeu ou un changement de vaisseau, ni s'il fait moins de 2 s ou plus de 60 s (le relevé note la raison). Dès que le
plus court écart d'un vaisseau passe sous la valeur de départ, il la remplace (la case « Durée » indique alors
« mesurée »). Premier relevé (5-7 nov. 2026, Type-11 Prospector) : 10,2 s au plus court sur 14 réactivations retenues,
compatible avec 9 s. Le nom du vaisseau affiché vient de `LoadGame` et des événements du chantier naval
(`ShipyardSwap`, `ShipyardNew`, `ShipyardBuy`), car `Loadout` ne le donne pas.
`GET /api/modules/fsdcool/sco` donne les règles en vigueur et les mesures par vaisseau. Constantes et sources :
`server/src/modules/fsdcool/sco.js`.

## Bilans de session (Activités › Bilans de session)

Page `/bilans` (module `bilan`) : chaque session de jeu, du chargement de la partie (`LoadGame`) à la fermeture du jeu
(`Shutdown`, ou le chargement suivant si le jeu s'est arrêté sans le dire), **reconstruite depuis le journal** :
l'historique est là dès le premier lancement. Pour chacune : durée, crédits (solde au chargement → au chargement
suivant, ou le solde en direct), crédits et mérites par heure, mérites Powerplay (doublons du jeu retirés,
`core/merits.js`), matériaux ramassés par grade, morts, sauts et distance, primes et obligations encaissées, vaisseaux
pilotés, et les modes de jeu joués avec leur durée. Les modes ne sont pas dans le journal : chaque changement est noté
dans `bilan-modes.json` à partir de maintenant. En haut : valeurs habituelles (médianes : un vaisseau acheté pendant
une courte session ne fausse rien) et records des sessions d'au moins 10 min ; chaque chiffre dit son écart à l'habitude.

**Jeu planté sans fermeture** : à la relance du jeu, la session d'avant est close à son dernier événement et marquée
« interrompue ». Sans relance, elle l'est après 2 h sans aucun signe de vie : ni ligne du journal, ni `Status.json`,
ni changement de mode. Une longue séance de minage sans saut garde donc ses modes, même après un redémarrage de
l'app : chaque changement de mode note le dernier signe de vie dans `bilan-modes.json`. Une session interrompue n'est
plus affichée « en cours » et compte dans les moyennes habituelles.

- **À la fermeture du jeu**, une fenêtre « Bilan de la session » s'ouvre par-dessus le bureau pendant 3 min (`/hud/bilan`).
- **Au changement de mode**, la même fenêtre donne le bilan du mode qu'on quitte (durée, mérites, matériaux, primes,
  sauts, morts) pendant 90 s, s'il a duré au moins une minute.
- L'accueil a une carte « Dernière session ». Calcul : `server/src/modules/bilan/state.js` (testé), textes :
  `client/src/modules/bilan/bilanVue.js` (testé). `GET /api/modules/bilan/sessions`.

## Module « Combat »

Page `/combat`, mise à jour en temps réel pendant le combat. Pour la session en cours, elle affiche les ennemis
abattus, les primes et obligations de combat gagnées, les mérites Powerplay gagnés en combat, le gain par heure
et les derniers kills (vaisseau, pilote, faction, gain).

- « Afficher la fenêtre » / « Masquer la fenêtre » : ouvre ou ferme le HUD par-dessus le jeu (kills, primes,
  mérites, chrono, dernier kill).
- **Overlay en jeu** : `npm run overlay` (l'app doit tourner) ouvre le même HUD sans bordure ni bandeau,
  transparent et toujours au premier plan ; les clics passent au jeu. Le jeu doit être en plein écran
  fenêtré. Le bouton **✥** passe en mode déplacement : on fait glisser le cadre, puis **📌** le fixe (la
  position est retenue). **Paramètres › Disposer les fenêtres en jeu** ouvre d'un coup toutes les fenêtres des
  modules (sans les tiroirs, qui suivent leur fenêtre), en mode déplacement et sans prendre le clavier, chacune dans un
  cadre à son nom, même celles qui ne s'affichent que quelques secondes (FSD prêt) ou à leur moment (saut du porteur,
  itinéraire, vente) ; « ✓ Terminé » enregistre chaque place et remet l'overlay comme avant (`POST
  /api/overlay/disposition`, `--disposer=1|0` ; le mode et ses fenêtres ne changent pas, rien n'est écrit dans
  overlay.json). Les fenêtres ouvertes cachées que tu laisses montrées (liste des repères, balayage, guidage, cadre de
  capture, Top 10…) sont gardées dans `fenetres-montrees.json` (dossier de l'overlay) : à la relance de l'app, du jeu,
  ou au retour du mode, elles reviennent montrées comme tu les avais laissées. Seul le survol de ce bouton rend la fenêtre cliquable. Raccourcis : **Alt+Maj+C**
  fait comme le bouton, **Alt+Maj+H** masque ou affiche, **Alt+Maj+Q** ferme (l'app l'apprend : elle ne croit plus
  les fenêtres ouvertes ; app arrêtée, l'overlay le lui dit à son lancement suivant : voir « Rôles des vaisseaux »). **Alt+Maj+K** passe en mode
  souris : toutes les fenêtres deviennent cliquables et prennent la main, le jeu relâche le curseur ; de nouveau,
  ou un clic dans le jeu, rend la main au jeu (le clavier parle à l'overlay tant que le mode est actif).
  Tout caché (◆ de l'app de bureau, ou Alt+Maj+H) : **Alt+Maj+K** réaffiche d'abord tout ce qui avait été caché
  (l'app de bureau retire son ◆), puis donne la souris ; plus besoin d'Alt+Tab pour revenir.
  L'API peut aussi demander à l'app de bureau de tout cacher ou réafficher, ou d'ouvrir une page (comme le MAR) :
  `GET /api/bureau` (`{ bureau, cache }`), `POST /api/bureau/cacher` (`{ cacher }`), `POST /api/bureau/ouvrir`
  (`{ chemin }`, une page de l'app, revérifiée par l'app de bureau) ; sans app de bureau : 409. C'est par là
  qu'Alicia agit (voir « IA de bord »).
  **Alt+Maj+F** (mode Minage Rhino) note la pose d'une foreuse du Rhino là où tu es ; **Alt+Maj+R** y pose un repère
  (fenêtre de balayage : nommé d'après le minerai raffiné, numéro d'EEP déduit, boutons de minerai pour le corriger).
  Aucune commande du profil de référence n'utilise Alt+Maj+R (R seul : poussée vers le haut, carte, recharger). Le jeu ne reçoit plus une
  combinaison prise par l'overlay : ne la mets sur aucune commande du jeu. Ces
  raccourcis marchent en jeu : on peut les mettre sur les boutons programmables d'une souris ou d'un HOTAS. Aucune
  fenêtre ne dépasse du bord de l'écran (elle peut passer sur la barre des tâches, cachée en jeu) : à l'ouverture, après un déplacement ou un
  redimensionnement, elle y est ramenée. Il
  utilise Electron (dossier `overlay/`, environ 270 Mo).
- La session commence au lancement du jeu. « Remettre à zéro » en ouvre une nouvelle jusqu'au prochain lancement
  du jeu, même si l'app redémarre.
- Kills comptés sur les primes, obligations, vaisseaux capitaux et joueurs. Un vaisseau abattu sans prime ni
  obligation (vaisseau « propre » d'une puissance ennemie) n'apparaît pas dans le journal : il n'est pas compté.
- Le journal ne dit pas d'où viennent les mérites : ils sont comptés en combat s'ils arrivent dans la minute qui
  suit un ciblage, une attaque ou un kill, et pas dans les 10 s qui suivent une vente, une livraison ou une mission.
- **Alerte du vaisseau** (`combat/vaisseau.js`, testé) : 4e case « Coque » du HUD et section de la page, avec un seuil
  réglable (5 à 95 %, 40 % par défaut, `GET`/`PUT /api/modules/combat/alerte`, gardé dans `combat-alerte.json`). La
  case clignote quand la coque passe sous le seuil, montre « boucliers ↓ » quand ils tombent, et prend un contour rouge
  si des modules sont sous le seuil ; la ligne du bas les liste alors (« FSD 32 % · relevé 15:02 ») à la place du
  dernier kill. Ce que le jeu permet, vérifié sur 58 journaux : la coque arrive en direct (`HullDamage`) mais par
  paliers d'environ 20 % ; l'état des modules n'est écrit que dans le `Loadout` (lancement du jeu, à quai, retour à
  bord, réarmement du SRV), jamais en plein combat : les modules sont donc ceux du dernier relevé, avec son heure.
  Réparations à quai (`RepairAll`, `Repair`) et AFMU (`AfmuRepairs`) les remettent à jour. Cet état ne repart pas de
  zéro avec la session.

## Module « Combat au sol »

Mode de jeu 🪖 Combat au sol (Odyssey), page `/combat-au-sol` et HUD `/hud/groundcombat` (`server/src/modules/groundcombat`,
testé). La session à pied, en temps réel : **kills** (obligations de combat des zones de conflit au sol, primes à pied)
et kills par heure, **gains** (obligations + primes) par heure, **mérites** gagnés à pied, **morts**, crimes à pied,
largages Frontline Solutions, kills par faction abattue, crédits par faction qui paie, **consommables** utilisés
(trousses, cellules d'énergie, grenades…) et les derniers kills. Le contexte : les **guerres** du système (guerre ou guerre
civile, factions, jours gagnés, enjeu), l'installation approchée et sa faction, la combinaison et ses armes.
- À pied ou pas : Disembark et Embark (Location au lancement). Les obligations et primes gagnées en vaisseau restent au
  module Combat ; les mérites gagnés à pied comptent ici. La suggestion de mode propose 🪖 sur un kill à pied
  (Status.json, Flags2 « à pied ») ou un largage de Frontline Solutions.
- Écrit d'après le format du journal Odyssey : aucun combat au sol dans les journaux de référence au moment de l'écrire, à
  vérifier à la première zone de conflit.

## Module « Sauvetage »

Page `/sauvetage`, sur le même modèle que Combat (session, bouton de fenêtre, overlay). Elle affiche les nacelles
d'évacuation, boîtes noires, débris et autres marchandises récupérés, ce qui reste en soute, les livraisons au
contact de recherche et sauvetage avec leurs récompenses, et les mérites Powerplay qui suivent.

- Overlay : `npm run overlay:sauvetage`. Si l'overlay de combat tourne déjà, la fenêtre s'y ajoute : les
  raccourcis Alt+Maj+C, H et Q agissent alors sur les deux. Chaque fenêtre a son bouton ✥ et sa position.
- Les mérites sont ceux reçus dans les 10 s qui suivent une livraison.
- Une marchandise livrée une fois au contact est ensuite reconnue comme marchandise de sauvetage.
- **Matériaux ramassés** pendant la session (épaves, débris : `MaterialCollected`), en bas du HUD : un compte par
  grade G1 → G5 (couleurs de la page Matériaux) et le total. Au survol, la liste (nom et nombre, du plus haut grade au
  plus bas) s'ouvre dans le cadre du HUD, de son haut jusqu'à la ligne, sans que la fenêtre change de taille. Ramasser un matériau
  compte comme une action (le chrono ne passe pas en pause « inactif »).

## Mode « Gardiens »

Le mode du module Gardiens (page et planificateur : docs/reperes.md). Il est proposé dès qu'un matériau des Gardiens est
ramassé (`MaterialCollected` dont le nom commence par `guardian_`, ou une donnée d'obélisque `ancient…data`) : on
n'en trouve que sur leurs sites.

La session (`server/src/modules/gardiens/session.js`) compte ce qui est ramassé sur les sites : matériaux gardiens,
données d'obélisque, segments de plan. Elle démarre au premier matériau gardien et **ne repart pas à zéro au lancement
du jeu** : revenir au menu puis relancer est la façon de refaire un site. Elle repart en passant au mode, ou au bouton
« Remettre à zéro » de la page.

Le bandeau en jeu (`/hud/gardiens`) a quatre cases. **Plans** : segments en stock sur ceux que demande ton plan (sans
plan coché : ceux gagnés pendant la session). Puis les trois matériaux de site qui manquent le plus à ton plan, en
« stock / besoin » (cellules, conduits, composants, pièces de sentinelle, données d'obélisque) ; quand il en manque
moins de trois, la place sert à ce qui a été ramassé pendant la session. Le calcul est celui du planificateur
(`besoins.js`, `resteSurSite.js`), avec le stock lu chez Ingénierie à chaque matériau ramassé. Les matières premières,
matériaux fabriqués et marchandises du plan ne sont pas dans le bandeau : ils ne se trouvent pas sur un site.

## Alerte « Hangar sans véhicule »

Si tu décolles (`Undocked`) avec un hangar acheté mais jamais garni, la fenêtre `/hud/hangar-vide` s'ouvre : le
vaisseau et les hangars concernés. Elle se ferme au bout de deux minutes, au retour à quai, à l'achat d'un véhicule, ou
au bouton ; « Il est plein » dit à l'app qu'elle se trompe (`POST /api/modules/hangar/plein`).

Le suivi (`server/src/modules/hangar/state.js`) est refait à chaque démarrage depuis l'historique du journal, vaisseau
par vaisseau :

- un hangar acheté (`ModuleBuy`, véhicules planétaires ou chasseurs) arrive vide : constaté le 22 nov. 2026 ;
- `RestockVehicle` (achat d'un véhicule) ne dit pas dans quel hangar il va : tous les hangars de ce genre du vaisseau
  actuel sont alors tenus pour garnis. Deux hangars achetés et un seul rempli : pas d'alerte (limite connue) ;
- un véhicule sorti (`LaunchSRV`, `LaunchFighter`) prouve qu'il y en avait un ;
- un hangar déjà là quand le suivi commence, ou ressorti du stockage : contenu inconnu, jamais d'alerte ;
- un véhicule détruit n'est pas suivi : un hangar peut en contenir plusieurs, et le journal ne dit pas combien.

`GET /api/modules/hangar/etat` montre le vaisseau actuel, ses hangars et ce que l'app en sait.

### Fenêtre « Site gardien » (`/hud/gardiens-site`)

À l'approche d'un site (`ApproachSettlement` dont le nom interne commence par `$Ancient`), le mode Gardiens est
proposé et cette fenêtre s'ouvre, même hors du mode : le nom du site, son corps, ses coordonnées (celles du journal, qui
font foi sur la liste de 2018), et quand on connaît son type de plan (`guides.js`), la carte et l'ordre des pylônes.
Elle reste ouverte au retour au menu (on relance pour refaire le site) et se ferme en quittant la planète, en
supercruise, au saut, ou au bouton (`server/src/modules/gardiens/site.js`).

**La carte est vivante, et c'est toi qui la fais.** Elle montre, nord en haut, ta position et ton cap (Status.json) et
les points du site placés d'après leurs coordonnées, avec la distance et le côté où tourner pour chacun. Les points se
marquent sur place, à l'endroit où tu es : « + Pylône », « + Machine », « + Relique » (`POST /site/points`), « Annuler »
retire le dernier. Ils sont gardés par site (corps et forme) dans `gardiens-points.json` et reviennent à chaque visite.
Pour Vela Dark Region DL-Y d91 5 A, les six pylônes relevés en 2018 sont montrés tant que tu n'as rien marqué toi-même.
Calcul : `client/src/modules/gardiens/carteSite.js` ; points : `server/src/modules/gardiens/points.js`.

**Schéma reconnu tout seul.** Pour les sites dont on connaît la carte (plans d'arme et plans de module), l'app garde
un schéma : la place de la machine et des six pylônes, relevée à l'œil sur les cartes de la communauté (seules ces
positions sont reprises, pas les images). Le joueur marque des points sans dire lesquels ; à partir de trois, l'app
essaie toutes les façons de poser le schéma dessus (types respectés, échelle de 0,2 à 1,6 m par pixel) et garde celle
qui colle au plus de points, chacun à 35 m près. Si deux poses font aussi bien, elle attend un point de plus plutôt que
de deviner. Une fois le schéma reconnu : chaque pylône prend son nom et son numéro (son rang dans l'ordre de charge du
guide), les points non marqués sont calculés (pointillés), un point marqué qui ne colle pas est signalé « hors schéma ».
`server/src/modules/gardiens/calage.js` (`reconnaitre`, `caler`).

**Tout ce qui se ramasse, des filtres, et un filtre d'erreurs.** Six types de points : pylône, machine, relique, panneau
(panneau ou pilier destructible, matériaux dedans), sentinelle (là où il en sort une), matériau (le reste). Le schéma
du site des plans d'arme porte aussi ses dix groupes de panneaux et ses trois sentinelles d'approche : une fois le
schéma reconnu, ils apparaissent d'office, calculés. Dans la fenêtre, un bouton par type montre ou cache ce type (choix
gardé sur le PC) ; la liste donne pylônes, machine et reliques en entier, et pour le reste les quatre plus proches.
À chaque marquage, un point posé avec le mauvais type (« relique » au pied d'un pylône du schéma, à moins de 20 m) est
corrigé d'office, et la fenêtre le dit (`points.corriger`, `reconnaitre` : `corrections`).

## Mode « Commerce de rares »

Pour le commerce de marchandises rares fait pour les mérites Powerplay. Le mode est proposé au premier achat d'une
marchandise rare (`MarketBuy`).

**Reconnaître une rare.** Le journal ne le dit pas : `MarketBuy` et `MarketSell` ne donnent que le nom. Le jeu le
marque en revanche dans `Market.json` (`"Rare": true`). L'app embarque donc un relevé (`server/src/core/rares.js`,
134 marchandises, tirées le 23 nov. 2026 d'un marché qui les listait toutes), et le module retient en plus toute rare
marquée dans un marché ouvert en jeu que le relevé n'aurait pas.

**Ce qui est compté** (`server/src/modules/rares/state.js`) : tonnes achetées et vendues, crédits dépensés et
encaissés, bénéfice (prix de vente moins prix moyen payé, donné par le jeu dans `MarketSell`), et les mérites : ceux
des lignes `PowerplayMerits` écrites dans les 15 secondes après un achat ou une vente de rares, rattachés à ce
mouvement. Des mérites gagnés autrement pendant la session ne sont pas comptés.

Le bandeau en jeu (`/hud/rares`) a quatre cases : **En soute** (tonnes de rares, et lesquelles), **Mérites** (avec
les tonnes vendues et les mérites par tonne), **Mérites / h**, **Bénéfice** (et son taux horaire). La page
(Activités › Commerce de rares) ajoute le détail par marchandise et les derniers mouvements.

**Taux à l'heure stables.** Dans ce commerce tout tombe d'un coup, à la vente : un taux recalculé chaque seconde
baisserait sans arrêt entre deux ventes. Les taux (mérites et bénéfice) sont donc une moyenne arrêtée à la dernière
vente, sur le temps actif écoulé jusqu'à elle, et ne changent qu'à la vente suivante ; rien avant la première vente
(`client/src/modules/rares/tauxStable.js`).

## Mode « Commerce » : alertes et questions seulement dans ce mode

Le module des routes commerciales suit les boucles dans tous les modes (elles se refont depuis le journal). En
revanche, ses deux interruptions en direct ne se déclenchent qu'en mode Commerce : l'alerte à l'achat (`routes:buy-check`,
marchandise mal vendue à l'étape suivante) et la question quand un amarrage ou un achat s'écarte de la route active
(`routes:question`). Dans un autre mode (commerce de rares, minage…), s'écarter de la route active est voulu
(`server/src/modules/routes/services/tracker.js`, `enModeCommerce`).

### Catalogue des rares et alerte de stock

La page du mode montre aussi le **catalogue des rares** : pour chaque marchandise rare, la station où elle s'achète,
le système, le pad, la distance de la station à l'étoile, la distance depuis ta position, la quantité en stock, le
prix d'achat et l'âge du relevé. Tri par distance, quantité, prix, nom ou relevé ; filtres de distance, de grand pad
et « au seuil seulement ».

**D'où viennent les données** (`server/src/modules/rares/catalogue.js`). De [Spansh](https://spansh.co.uk), lui-même
alimenté par les marchés que les joueurs relèvent (réseau EDDN). Une requête par rare
(`POST https://spansh.co.uk/api/stations/search`, sans clé), limitée aux stations : sans ça, les porte-vaisseaux qui
revendent des rares passent devant la source. Le relevé complet (142 rares) prend environ une minute, les requêtes se
suivent avec 0,3 s de pause. Il part **seulement à ta demande** (bouton), jamais deux fois en moins de 10 minutes, et
n'envoie que le nom de la marchandise : ta position ne part pas, la distance est calculée dans l'app d'après les
coordonnées du système source et celles de ton dernier saut. Le résultat est gardé dans `rares-catalogue.json`.

**Limites, à dire telles quelles.** La quantité est ce qu'il restait au dernier passage d'un joueur, pas ce que la
station te vendra (23 t de cigares affichées juste après un achat de 102 t). Une rare épuisée au moment du relevé ne
sort pas de la recherche : sa dernière ligne connue est gardée, stock à 0. Le prix de vente n'existe nulle part : une
station ne cote une rare que si on l'a en soute.

**Alerte.** Un seuil de quantité (100 t par défaut, réglable) : les rares à ce seuil sont surlignées dans le tableau.
Avec « Surveiller et m'alerter en jeu » (éteint par défaut), l'app refait le relevé toutes les 6 heures tant qu'elle
tourne, et ouvre la fenêtre `/hud/rares-alerte` quand une rare vient d'atteindre le seuil (elle n'y était pas au
relevé d'avant). La fenêtre se ferme seule au bout de 3 minutes, ou au ✕.

Routes : `GET /api/modules/rares/catalogue`, `POST …/catalogue/actualiser`, `PUT …/catalogue/reglages`
(`{ seuil, surveiller }`), `POST …/catalogue/alerte/fermer`. Diffusion : `rares:catalogue`.

**Historique des stocks** (`server/src/modules/rares/historique.js`, fichier `rares-historique.json`). Spansh ne
garde que le dernier relevé de chaque marché, alors que le stock d'une rare bouge beaucoup (16 t un jour, 400 t un
autre). L'app note donc chaque valeur qu'elle voit : à chaque relevé du catalogue (heure du passage du joueur, stock,
prix, état de la faction qui tient la station), une rare disparue du relevé (notée à 0), et chaque marché que tu
ouvres en jeu à une station qui produit une rare (`Market.json` : la mesure la plus sûre). 400 points au plus par
rare. Le tableau en tire « Plus haut vu » et le nombre de passages notés ;
`GET /api/modules/rares/catalogue/historique?nom=<nom anglais>` rend tous les points. C'est la matière pour
comprendre ce qui fait monter un stock ; aucune règle n'en est encore tirée.
