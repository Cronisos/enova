# Mon ingénierie

> Partie de la notice d’Enova : sommaire dans le [README](../README.md#documentation).

## Module « Mon ingénierie »

1. Au premier lancement, l'onglet **Données** télécharge une fois les données de référence (coriolis-data,
   FDevIDs, EDSY, images ; environ 1 Mo). Bouton « Mettre à jour les données » pour les rafraîchir.
   Les versions sont **figées** : chaque dépôt est lu à un commit précis (relevé le 7 novembre 2026, voir
   `server/src/core/reference/download.js` et CREDITS.md), jamais sur `master`. `eddb.js` et les tables FDevIDs
   sont vérifiés par leur empreinte SHA-256, coriolis-data par l'empreinte de l'ensemble de ses fichiers ; une
   empreinte différente refuse tout le téléchargement et les données en place sont gardées. Changer de version
   = changer ce fichier (commit et empreintes). Les données **déjà en place** sont revérifiées à chaque chargement
   (`verifyReference`, environ 2 Mo relus) : commits notés dans `meta.json`, empreinte de chaque table FDevIDs,
   d'`eddb.js` et de l'ensemble coriolis-data. Une copie téléchargée avant le figeage des versions (depuis `master`,
   sans empreinte) ou modifiée depuis est signalée dans l'onglet Données (« pas exactement les versions vérifiées »,
   avec chaque écart), dans `GET /api/modules/engineering/status` (`integrity: { pinned, problems }`) et dans la
   console du serveur : des vaisseaux ou modules récents peuvent y manquer (Anaconda Mk II, Mk II Cargo Rack…).
   « Mettre à jour les données » la remplace par les versions figées.
2. **Créer un plan** : depuis la carte d'un vaisseau (Mes vaisseaux, « Créer un plan » charge sa config
   actuelle), ou dans **Ingénierie → Nouveau plan** : partir d'un vaisseau vierge, ou **importer un build EDSY**
   (lien `#/L=…`, version 15 et plus) ou un export JSON au format Loadout.
3. Sur le plan : un tableau, une ligne par emplacement : **à bord aujourd'hui** (la config lue dans le journal la
   dernière fois que tu es monté dans le vaisseau), **visé par le plan**, **reste à faire** (« à monter » quand le
   module visé n'est pas celui à bord, puis le nombre d'applications ; une coche quand c'est fait). « Seulement ce qui
   reste à faire » cache le reste. La page est en lecture seule : un build se compose dans le constructeur.
   « Modifier le plan » ouvre les réglages pour une retouche (module, modification, grade, effet expérimental,
   « Revenir à la config actuelle », et « Tout en G5 », qui applique la modification actuelle ou la plus courante au
   grade maximum). « Calculer » donne les matériaux nécessaires,
   possédés et manquants, avec la méthode d'obtention et l'ingénieur à aller voir.
4. **Tableau de bord** : plusieurs vaisseaux à la fois, avec un stock commun (un matériau n'est jamais compté deux
   fois) et les plans faisables tout de suite. Seuls les plans ajoutés y sont, chacun en carte (image, nom, modèle,
   avancement) ; « − Retirer » l'en sort sans le supprimer. « Ajouter un plan » ouvre une modale : un clic sur un de
   tes autres plans l'ajoute, ou « Créer un nouveau plan ». Le tableau « Ce qui manque » est rangé comme les échangeurs (catégorie, grade).
   **Échangeur de matériaux** (sous « Ce qui manque ») : en tête, le verdict, en tournure impersonnelle : « Échanges suffisants » si tous les échanges proposés couvrent ce qui manque, sinon « Échanges insuffisants » avec la liste de ce qui reste à collecter et pourquoi (ne s'échange pas, rien à donner, pas assez à donner). Puis, pour chaque matériau manquant, quoi donner chez l'échangeur,
   en ne prenant que ce que les plans n'utilisent pas ; d'abord un matériau à son plafond (perdu à la prochaine
   collecte), puis la même catégorie (sans pénalité), puis le moins cher. Lots entiers comme au comptoir (13,5 pour 1 :
   2 donnés pour 27). Taux du dépôt des règles (`regles/echangeurs.js` : monter d'un grade 6 pour 1, descendre 1 pour
   3, autre catégorie ÷ 6), **mesurés sur les 127 échanges** des journaux du joueur. Et les échangeurs connus les plus
   proches de chaque type, appris dans le journal (`services/traders.js` : stations où tu t'es amarré qui en ont un ;
   type exact là où tu as déjà échangé, sinon déduit de l'économie de la station, marqué « ? »), à vol d'oiseau.
   **Alertes de passage** (fenêtre en jeu `/hud/engineering-passage`, `services/passage.js` testé) : en arrivant
   dans un système (saut, saut du porte-vaisseaux, chargement), si un ingénieur y a sa base et peut faire un grade
   encore à faire de tes plans du tableau de bord (« Etienne Dorn est ici (pas encore débloqué) : Support vital G1 →
   G5 · Corvette opti »), ou si un échangeur connu ici sert un échange proposé (« 2 Protection impériale → 9 Composants
   conducteurs »), une fenêtre s'ouvre par-dessus le jeu. Elle se ferme seule après 2 min, au saut suivant, ou à ✕.
   Jamais à la relecture du journal : seulement en direct.
5. **Matériaux** : rangés comme dans les échangeurs de matériaux du jeu, par type puis par catégorie (Catégorie 1 à 7
   pour les matières premières ; Chimique, Thermique, Chaleur… pour les manufacturés ; Données d'émission, Scans de
   sillage… pour les données), du grade 1 au grade 5 ; les matériaux sans échangeur (gardiens, thargoïdes, autres) à
   part. Les matériaux à 0 restent visibles en retrait ; un matériau jamais ramassé garde son nom anglais (le jeu ne
   donne le nom français qu'une fois en soute). Code couleur des grades partout : G1 gris, G2 vert, G3 bleu, G4 violet,
   G5 or (`materiauxVue.js`, testé).
6. **Rangs des ingénieurs** : « Ce que tes journaux montrent », les mesures par rang et par grade (voir plus bas).

Règles de calcul :

- Depuis la mise à jour 18.08 (7 août 2024), les applications sont fixes : pour finir un grade il faut
  grade + 5 − rang applications (au rang 5 : 1 en G1, 2 en G2… 5 en G5). Sous le rang 5, voir « Coût des rangs
  d'ingénieur ».
- Seul ce qui reste est compté : les grades au-dessus du grade actuel, et la fin d'un grade commencé (le grade
  suivant ne s'applique qu'à 100 %). Une qualité de 0 sur un grade déjà posé (ingénierie ancienne) compte comme
  finie. Changer de module ou de modification repart de G1.
- L'inventaire est recalé sur le jeu à chaque lancement (événement `Materials`) puis suivi en direct. Certaines
  récompenses (rangs Powerplay) n'apparaissent dans le journal qu'à la reconnexion suivante.
- Les vaisseaux sans dessin (Mandalay, Panther Clipper Mk II, Python Mk II, Caspian, Type-11…) ont une image
  par défaut ; « Changer l'image » sur le plan permet d'envoyer sa propre capture (gardée en local).

### Coût des rangs d'ingénieur

Sous le rang 5, un ingénieur demande plus d'applications par grade, et il faut le monter avant de viser un grade
au-dessus de son rang : il faut donc plus de matériaux que le calcul « au rang 5 ». Le calcul en tient compte, à
partir du rang réel de chaque ingénieur et de sa progression lus dans le journal.

**Table des règles** (`server/src/regles/ingenierie/rankRules.js`, dans le dépôt des règles, la seule source ; servie par
`GET /api/modules/engineering/ranks/rules`, et lue par la future vigie des règles). Une ligne par rang et par grade,
chaque valeur avec son statut (mesurée, à vérifier, inconnue) et sa source. Mesures : les journaux de référence du 24 oct.
au 5 nov. 2026 (808 applications, jeu 4.4.2.1), toutes après 18.08 : rien ne compare l'avant et l'après. Le numéro, la
date et la règle de 18.08 viennent de l'annonce officielle de Frontier sur Steam,
« Elite Dangerous | Type-8 Update (18.08) | Wednesday 7th August 2024 »
(https://store.steampowered.com/news/app/359320/view/5963413728353422199, lue le 9 nov. 2026 par l'API des
actualités Steam) : « Updated engineer rolls to consistently give a fixed roll depending on the grade of the recipe
and the commander rank with the engineer » (`UPDATE_18_08` dans `rankRules.js`, servi avec la table). La période des
mesures (`JOURNAUX_PERIOD`) est déclarée elle aussi, et chaque compte tiré des journaux s'y recompte (comptes jour par
jour dans `rankSequences.json`, vérifiés par un test) : par exemple, sur cette période, 52 relevés complets et 19
événements unitaires, aucun avec `RankProgress`.

| Rang | Pour finir G1 | G2 | G3 | G4 | G5 | Pour passer au rang suivant, depuis 0 % (applications du grade max) |
|---|---|---|---|---|---|---|
| 1 | 5 (9 mesures) | — | — | — | — | 3 G1 (3 fois sur 3) |
| 2 | 4 (15) | 5 (6) | — | — | — | 3 à 4 G2 (à vérifier) |
| 3 | 3 (22) | 4 (15) | 5 (11) | — | — | 3 à 4 G3 (à vérifier) |
| 4 | 2 (2, à vérifier) | 3 (5) | 4 (10) | 5 (14) | — | 3 à 4 G4 (à vérifier) |
| 5 | 1 (58) | 2 (107) | 3 (149) | 4 (146) | 5 (192) | — |

- Pour finir un grade : grade + 5 − rang applications, mesuré sur les 15 couples, sans aucun écart. L'exemple mesuré
  (rang 3, G3 : 5 applications au lieu de 3) est mesuré 11 fois. Rang 4 en G1 : « à vérifier » parce que mesuré 2
  fois seulement (il en faut 3 pour dire « mesurée »), sans aucune hypothèse ; la table porte ce motif (`why`) et
  l'infobulle le dit.
- Progression du rang : chaque application à l'atelier en fait une part, en % du rang. Au grade maximal du rang :
  33,3 à 50 % au rang 1 (G1), 28,9 à 36,1 % au rang 2 (G2), 26,6 à 39,3 % au rang 3 (G3), 28,9 à 50 % au rang 4 (G4).
  En dessous : 7,6 à 8,7 % (rang 2, G1) ; 8,4 à 9,3 % (rang 3, G2) et 2,0 à 2,5 % (rang 3, G1), soit de 2,8 à 4,7 fois
  moins par grade en dessous. Au rang 4, la part des G1 à G3 n'est **pas chiffrée** (au plus 0,9, 3,4 et 9,6 %) :
  les G4 suffisent presque à expliquer chaque montée au rang 5 lue, rien ne fixe la borne basse (0 reste possible) ;
  statut « inconnue », et la vue affiche par exemple « au moins 114 applications, sans maximum connu : chacune fait au
  plus 0,9 % du rang, et rien ne dit combien au moins ».
- Ces fourchettes sont **déduites** (à vérifier), et seulement de là : `rankModel.js` écrit les hypothèses (H1 points
  par grade, quel que soit le rang ; H2 seuil par rang ; H3 surplus reporté en points ; H4 rien à distance ni pour un
  effet expérimental ; H5 `RankProgress` en % entier tronqué ; H6 0 au déblocage), puis cherche, par programme
  linéaire, le plus petit et le plus grand gain compatibles avec les 17 séquences des journaux de référence (15 montées) à
  la fois (H6 : le 0 % au déblocage n'est pas lu, voir plus bas). Les séquences sont versionnées
  (`rankSequences.json` : ingénieurs, rangs, relevés, grades, rien du
  commandant) ; `node scripts/regles/deduire-rangs.mjs` les relit dans les vrais journaux et compare (`--ecrire`
  les réécrit) ; un test refait la déduction et vérifie chaque chiffre de la table (bornes basses arrondies vers le
  bas, hautes vers le haut).
- Report du surplus d'une montée sur le rang suivant (H3, à vérifier) : tout le surplus passe, en points, mais le
  rang suivant en demande plus (au moins 3,8 fois plus au rang 2 qu'au rang 1, 3,1 fois au rang 3, 2,7 fois au
  rang 4) : 10 % de surplus au rang 1 valent au plus 2,6 % du rang 2 ; au rang 2, au plus 3,2 % du rang 3 ; au rang
  3, au plus 3,6 % du rang 4 (`CARRY_RATIO` : 0,2599, 0,3183, 0,3596, déduit de même). Selon H3, rien n'est
  perdu : c'est seulement dilué dans un rang plus grand. Le calcul prudent ne reporte rien ; le favorable reporte ce maximum.
- Mesuré : le rang ne monte qu'à l'**atelier de l'ingénieur**. Le 5 nov., 5 applications de G3 faites à distance
  chez Broo Tarquin (rang 3, 24 %) ne l'ont pas fait monter ; la qualité, elle, avance pareil. Le texte du jeu le
  dit aussi (cité sur https://steamcommunity.com/app/359320/discussions/0/2248931052745593271).
- Mesuré : les applications sous le grade max comptent aussi (Lei Cheung, 1er nov. : 12 G1 au rang 2 l'ont fait
  passer au rang 3 ; combien : la fourchette déduite ci-dessus) ; le grade suivant ne s'applique qu'à 100 %
  (195 passages sur 196, un à 99 %), sans saut de grade ; une autre modification repart de G1.
- Un ingénieur débloqué démarre au **rang 1** (mesuré : Tiana Fortune le 28 oct., Lei Cheung le 1er nov., Broo
  Tarquin le 2 nov., 3 déblocages sur 3), **à 0 %** (à vérifier : `UNLOCK_RANK` et `UNLOCK_PROGRESS` dans la
  table). Le 0 % n'est pas lu : l'événement de déblocage n'écrit pas de progression, aucun relevé ne tombe entre un
  déblocage et la première application, et les 3 montées en 3 G1 qui suivent ne fixent pas le départ. C'est
  l'hypothèse H6 ; elle a un appui : Juri Ishmaak, rang 1 à 0 % à chacun des 52 relevés de la période, sans aucune
  application. Le calcul prudent part de là, le plus bas possible.
- Inconnu : refaire un grade déjà à 100 % (jamais vu dans les journaux, 0 cas : pour monter, le joueur a changé de
  modification et repris au G1) ; la part d'un effet expérimental dans la montée (comptée 0).
- La progression du rang (`RankProgress`, % entier) n'est écrite qu'au **chargement de la partie** ; une montée est
  écrite sur le moment, sans progression. Entre deux relevés, l'app l'estime avec la table.

**Calcul** (`calc.js`, `simulateEngineer`) :

- Par ingénieur, les modules du plan faits chez lui sont simulés application par application, à son rang réel et
  depuis sa progression. Ordre retenu, le moins coûteux : monter d'abord le rang avec les applications du plan au
  grade maximal du rang (module « moteur » : celui qui vise le plus haut, puis le plus avancé), et faire le reste
  quand le rang est le plus haut (un G1 coûte 3 applications au rang 3, 1 au rang 5). Une montée d'un rang au milieu
  d'un grade ne change pas son nombre d'applications : il garde celui du rang où il a commencé (mesuré, G3 commencé
  au rang 3 et fini au rang 4 : 3 + 2, 2 + 3, 1 + 4 ; chaque application va plus loin au rang 4, 25 % au lieu de
  20 %, mais l'arrondi l'annule : k au rang r, puis n − k). Ce qui économise, c'est de commencer un grade à un rang
  plus haut, ou de le reprendre deux rangs plus haut (un G3 commencé au rang 3, repris au rang 5 : 1 + 3 au lieu de 5).
- La montée est **partagée** : les applications du plan comptent pour elle, quel que soit le module ; seul le manque
  s'ajoute. Ce manque se fait sur un **autre module de ce type, neuf**, avec la modification d'un module du plan qui
  vise plus haut que le rang (la moins chère s'il y en a plusieurs) : G1, puis G2… jusqu'au grade du rang, chaque
  grade fini avant le suivant (mesuré), car un module du plan déjà à ce grade ne peut plus servir et refaire un grade
  fini est inconnu. Exemple : lance-missiles déjà en G3, visé G5, chez Liz Ryder (rang 3, 49 %) : 3 G1, 4 G2 et 1 G3
  en plus (8 débris mécaniques, 5 vanadium, 1 niobium), pas 2 G3. Ce module de montée est repris au rang suivant
  s'il en faut encore (ses grades faits restent) : au rang 1, un module en G4 visé G5 demande 5 G1, 5 G2, 5 G3 et
  4 G4 en plus (19 applications). Il te faut ce module (acheté, ou pris dans ta flotte), monté sur le vaisseau que
  tu amènes à l'atelier. Un module de ta flotte qui porte déjà cette modification au grade d'en dessous en
  demanderait moins : ce n'est pas compté (le calcul reste prudent). **À vérifier en jeu** : peut-on refaire un
  grade déjà à 100 % ? Seul le scénario favorable le suppose (bas de la fourchette, signalé). Un grade refait que tes
  journaux montrent est signalé dans « Ce que tes journaux montrent » (voir plus bas).
- Un module du plan qui vise **sous le rang** de l'ingénieur compte aussi pour la montée, s'il est fait tout de suite,
  à ce rang, avant le manque : il coûte alors plus d'applications qu'au rang final, mais chacune fait monter le rang
  et remplace une application en plus sur le module de montée. Les deux ordres (le garder pour le rang final, ou le
  faire d'abord) sont simulés jusqu'au bout, à chaque rang où la question se pose, et le moins cher en matériaux est
  retenu (à coût égal, le moins d'applications, puis le garder pour le rang final). Felicity Farseer au rang 3,
  relevée à 60 %, FSD déjà en G3 visé G5 et propulseurs neufs visés G2 : les propulseurs faits au rang 3 (3 G1 et
  4 G2, au moins 39,8 % du rang) font la montée. Avec la table seule, il ne manque qu'1 G1 en plus, au lieu de 3 G1,
  4 G2 et 1 G3 en plus et des propulseurs faits au rang 5 : 18 applications au lieu de 21. Au pire cas des journaux,
  que compte le calcul prudent, il n'en manque plus aucune : 17 applications et 41 matériaux au lieu de 20 et 46. Le
  détail du module le dit (« à faire au rang 3, avant la montée : elles comptent pour elle… »).
- Un ingénieur **pas encore débloqué** (invité, connu, ou absent du journal) : ses grades sont comptés comme après
  son déblocage, au rang 1 (mesuré) à 0 % (à vérifier), montée de rang comprise, dans les totaux, « dont rangs » et
  le Dashboard ; le module reste marqué bloqué. S'il y en a plusieurs, le moins cher. Un G5 de zéro : 25
  applications (5 par grade), pas 15. Il peut être retenu pour tout le module alors qu'un ingénieur débloqué propose
  les premiers grades, seulement s'il coûte strictement moins de matériaux en tout (montée de rang comprise) : la
  liste « Ingénieurs par module » le dit (« Ram Tah (pas encore débloqué) : compté après son déblocage…, plutôt que
  Liz Ryder (rang 1) ») au lieu d'écrire « aucun ingénieur débloqué ». Avec Liz Ryder au rang 5, le G1 se fait chez
  elle (1 application), puis Ram Tah monte au rang 2 par 3 G1 sur un module neuf : 24 au lieu de 25. Un rang non lu
  s'écrit « rang inconnu ».
- Deux scénarios : prudent pour les totaux et la liste de ce qui manque ; favorable (gain le plus haut, report au plus
  `CARRY_RATIO`, grade du rang refait permis) pour la fourchette affichée. Le prudent (progression la plus basse,
  sans report du surplus, module de montée neuf) compte la montée au **pire cas compatible avec les journaux** : elle
  ne vient que quand plus aucun modèle qui explique les 17 séquences à la fois (H1 à H6) ne permet de rester sous le
  seuil (`worstCaseModel` de `rankModel.js`, un programme linéaire par préfixe, réponses mémorisées), depuis le
  dernier relevé et avec les applications faites depuis. Les bornes basses de la table, elles, viennent chacune d'un
  modèle différent : additionnées, elles demandaient une ou deux applications de trop. Rang 4 relevé à 0 %, module en
  G4 visé G5 : 2 G1, 3 G2, 4 G3 et 3 G4 en plus au pire (12), pas 4 G4 (Selene Jean est montée avec 2 G4 depuis ce
  relevé, à moins de 1 %) ; à 5 % : 2 G4 ; rang 3 relevé à 4 %, module en G3 : 3 G1, 4 G2 et 2 G3 (Lei Cheung est
  montée avec 2 G1, 4 G2 et 2 G3). Le prudent ne monte jamais avant ce que montrent les journaux (test), ni plus tard
  que la table seule ; si les séquences se contredisaient (aucun modèle possible), la table seule compterait. Par
  matériau, le prudent n'est pas toujours
  le plus haut : en refaisant le grade du rang, le favorable prend d'autres grades (lance-missiles déjà en G3 chez Liz
  Ryder, rang 3, 49 % : 2 niobium au lieu de 1, mais 2 débris mécaniques au lieu de 8 ; à 70 %, 1 niobium que le
  prudent ne demande pas). Le tableau « Matériaux en plus dus aux rangs » ne cache alors pas ce chiffre dans une
  fourchette : il donne le prudent (compté dans « Nécessaire » et « Manquant »), puis à part « cas favorable : 2 » et
  ce qu'il manquerait par ce chemin, avec une note. Un rang non lu : prudent depuis le rang 1,
  favorable au rang 5, signalé. Après une montée sans nouveau relevé, la progression part de 0 (prudent) ou du plus
  grand report possible du dernier gain (favorable), et le texte le dit (« estimée depuis la montée au rang 3, report
  du surplus non compté en prudent »).
- Badge d'un ingénieur et « ≈ » d'un module : le statut le plus faible des règles **réellement utilisées** dans l'un
  des deux scénarios : finir chaque grade à chaque rang, et la progression de rang seulement s'il y a une montée ou
  des applications en plus, et seulement pour les applications faites à un rang d'où l'un des scénarios monte
  encore (au rang le plus haut atteint, leur part dans la montée ne change aucun compte). Une progression dont la
  borne basse n'est pas chiffrée (G1 à G3 au rang 4) ne rend le badge « inconnue » que si elle **change un compte** :
  le calcul refait la simulation avec la table seule, ces lignes à leur borne basse puis à leur borne haute, les
  autres au gain le plus bas puis au plus haut ; mêmes applications par grade et en plus, elle reste « à vérifier »
  (déduite). Rang 3, G2 visé, relevé à 0 % : « mesurée », sans « ≈ » (3 G1 et 4 G2, mesurés 22 et 15 fois) ; relevée à
  60 %, ou jamais lue : le rang peut monter en cours de plan, « à vérifier » et « ≈ » (les G2 faits au rang 4, rang
  final, ne comptent pas pour une montée). L'exemple mesuré, rang 3 et G3 de zéro (3 + 4 + 5 applications dans les
  deux scénarios) : « à vérifier », car seule la progression au rang 3 fixe le moment de la montée. Rang 4 et G5 de
  zéro (19 applications dans les deux scénarios), ou ingénieur pas encore débloqué et G5 de zéro (25) : « à
  vérifier » ; la part des G1 à G3 faits au rang 4 n'y change rien, car le rang ne monte qu'une fois pendant un grade.
  Rang 4 relevé à 50 % et G5 de zéro : « inconnue », car selon cette part la montée vient pendant les G3 (18) ou
  pendant les G4 (19).
  Au survol, un badge « mesurée » de la table donne sa source déclarée (les journaux de référence) : « tes journaux » ne
  désigne que les mesures en direct, celles de la personne qui regarde. Un badge « à vérifier » ou « inconnue » donne
  son motif : celui de la table (`why`), et pour un ingénieur du plan ou du Dashboard ceux des règles qui fixent son
  statut (`statusWhy` du calcul : « finir le G1 au rang 4 : mesurée 2 fois seulement…, sans hypothèse », « progression
  de rang : déduite… », « rang non lu dans le journal… »). Sans motif, « à vérifier » se lit « déduite des mesures avec
  une hypothèse » : c'est vrai de la progression de rang et du report, pas d'une valeur mesurée trop peu de fois.
- Choix de l'ingénieur : celui qui coûte le moins de matériaux, montée de rang comprise (module de montée neuf
  compris) et partagée avec les autres modules du plan (un ingénieur au rang 5 un peu plus loin peut coûter moins,
  ou garder chez un rang 3 un module qui le fait monter évite un module de montée). Un module peut être **partagé
  entre ingénieurs**, grade par grade : les premiers grades chez un rang 5 qui ne fait qu'eux, la suite chez celui qui
  fait tout. Fragmenteur à grande capacité visé G5, Marsha Hicks au rang 3 : tout chez elle, 56 matériaux et 22
  applications ; G1 et G2 chez Tod McQuinn (rang 5), puis G3 à G5 chez elle, que ses G3 font monter : 50 et 18. Au
  rang 4 : 50 et 19, contre 44 et 16 avec G1 à G3 chez Tod McQuinn. Les options d'un module ne dépendent pas des rangs
  (chaque grade chez un ingénieur débloqué qui le propose ; un ingénieur pas encore débloqué pour un grade que personne
  d'autre ne fait). Deux options qui confient les mêmes grades aux mêmes ingénieurs sous le rang 5 ne diffèrent que
  par la part faite au rang 5, qui s'additionne : seule la moins chère reste. Les modules ne dépendent les uns des
  autres que par un ingénieur sous le rang 5 (ou de rang inconnu, ou pas encore débloqué) ; chaque groupe de modules
  liés ainsi est choisi à part : toutes les combinaisons quand il y en a au plus 2048, sinon des coups qui font
  baisser le total, un module à la fois mais aussi « tout chez X » et « tout ce qui est chez A passe chez B » (une
  montée partagée peut demander de déplacer plusieurs modules ensemble). Un ingénieur sous le rang 5 ne fait qu'une
  suite de grades d'un module, et l'ordre entre deux ingénieurs (A avant B pour un module) ne tourne pas en rond :
  le plan se fait alors tout chez A, puis tout chez B. Ainsi, un rang ou une progression de plus ne renchérit jamais
  le plan (test sur des plans tirés au hasard). À coût égal : un seul ingénieur pour le module, puis le moins
  d'allers-retours, puis le plus haut rang.
- Détail par module, dans l'ordre où le faire : « Chez Liz Ryder (rang 3) : il faut d'abord 8 applications en plus
  sur un autre module de ce type, neuf (3 G1, 4 G2 et 1 G3), pour passer au rang 4, puis G4 en 5 applications au
  lieu de 4 (4 au rang 4, puis 1 au rang 5) » ; une montée en plus vient avant les grades au-dessus de son rang.
  Chaque grade dit à quels rangs faire ses applications (`byRank` du calcul, scénario prudent), car leur nombre n'est
  juste qu'à ces rangs ; quand un grade attend une montée faite par un autre module du plan, la ligne le dit. Deux
  lance-missiles chez Liz Ryder (rang 3, 49 %), le n°1 déjà en G3, le n°2 neuf, visés G5 : « G3 en 4 applications au
  lieu de 3 (1 au rang 3, puis 3 au rang 5, à reprendre après la montée au rang 5 faite avec « … n°1 ») » ; fini au
  rang 4, ce G3 en demanderait 5, donc une recette de plus.
- Partout où les besoins apparaissent : plan (tuile « Applications restantes », colonne « dont rangs », section
  « Rangs des ingénieurs » avec l'ordre conseillé et les matériaux en plus à part, détail par module), Dashboard
  (stock commun : une montée sert à tous les plans faits chez le même ingénieur, comptée une fois). Le Dashboard
  liste chaque ingénieur dont le rang coûte, rang inconnu et pas encore débloqué compris, avec le même résumé que le
  plan (`engineerRankSummary` : badge du statut, progression, rang après le plan, applications en plus et leur
  fourchette). Le module n'a ni fenêtre en jeu ni échanges de matériaux.
- Noms d'ingénieurs : coriolis écrit `Tod "The Blaster" McQuinn` et « Felicty Farseer » ; `engineersFor` les rend
  sous le nom du journal et de FDevIDs (`Tod 'The Blaster' McQuinn`, « Felicity Farseer »), sinon un ingénieur
  débloqué passerait pour verrouillé.

**Ce que tes journaux montrent** (onglet « Rangs des ingénieurs », `GET /api/modules/engineering/ranks`,
`ranks.js`) : pour chaque rang et chaque grade, la table et ce que tes applications mesurent (qualité gagnée par
application, nombre de mesures, à l'atelier ou à distance) ; tes ingénieurs sous le rang 5 et leur progression ;
chaque montée de rang lue (déblocage, relevé ou montée → montée, application par application). Tout est relu dans
le journal au lancement, puis complété à chaque application. Une mesure qui contredit la table (qualité gagnée
différente, grade fini d'un coup plus vite que la table, montée plus tôt ou plus tard que la fourchette ne le
permet) est signalée ; la table, elle, ne change pas d'elle-même. Une séquence en cours (aucune montée ni aucun relevé
ne la ferme encore) est vérifiée elle aussi, en direct : si la table prévoyait la montée avant la dernière application
(au gain le plus bas, applications sûrement faites à l'atelier seulement), c'est un écart, et la progression de
l'ingénieur n'est plus estimée (« progression inconnue : d'après la table, la montée aurait déjà dû venir… », comptée
depuis le dernier relevé en prudent). Prévue à la dernière application, ce n'est pas encore un écart : le jeu écrit la
montée dans la seconde (15 montées sur 15 dans les journaux de référence, seul un `ShipLocker` entre les deux). Sa pastille
dit « en cours », jamais « conforme » avant la fin. La note « les grades en dessous comptent aussi »
sépare ce qui est mesuré (qu'ils comptent) de ce qui est déduit (combien, tiré des fourchettes de la table). Le lieu
vient de l'**hôte** : la base où tu es à quai (`Docked`, ou `Location` à quai), reconnue par son MarketID, ou à défaut
par le nom de la station et son système (base de Chloe Sedesi, dont le MarketID n'est pas sûr), d'après les données
des ingénieurs (`data/engineers.json`, voir « Itinéraire d'ingénierie », règle R8). Une application est faite « à
l'atelier » si l'hôte en est l'auteur (le nom d'ingénieur qu'écrit le jeu est celui de la modification en place sur le
module), « à distance » sinon ; un effet expérimental est toujours posé à l'atelier de l'hôte. L'application reste
comptée pour son auteur. Si les données des ingénieurs sont illisibles, la station est comparée à la base de l'auteur
(FDevIDs `engineers.csv`), comme avant ; les deux règles donnent le même lieu à toute application sans effet quand les
MarketID concordent. Le module n'en garde que ce que lisent le calcul et l'hôte (événement, heure, `MarketID`, `Docked`,
nom et type de la station, système, `Taxi`, `Multicrew`, trois services), et un amarrage, un décollage ou un chargement
ne reconstruit rien : rien de ce qu'affichent les pages des rangs ne change avant la prochaine application, qui relit
le lieu. Seul un changement de système (arrivée, saut) est diffusé (`engineering:position`), pour l'itinéraire. Un
relevé au chargement de la partie (même rang) hors de la
fourchette de la table, trop bas comme trop haut, est un écart (« relevé à 10 % alors que la table prévoit 53 à
79 % »).

Le tableau sépare la table de tes mesures. Les colonnes « (table) » disent sur combien d'observations elles reposent :
« 5 (11 mesures) » pour finir le G3 au rang 3, « déduit de 3 séquences des journaux de référence où ce grade a servi » pour
passer au rang suivant, avec la source et le motif au survol du badge. À côté, **« Montées dans tes journaux »**, par
rang : chaque montée lue, regroupée quand le départ et les applications sont les mêmes (« 3 G1 depuis le déblocage,
1 fois », « 2 G1 et 3 G2 depuis la montée au rang 2, 1 fois », « · écart avec la table » sinon), mise à jour en
direct : c'est là que se lit, en nombre de fois, ce que coûte chaque palier d'un ingénieur que tu viens de débloquer.

Un **grade refait** alors qu'il était déjà à 100 % (même modification, même grade, qualité 1 avant et après) est la
mesure qui tranchera la règle « refaire un grade déjà fini », encore inconnue (0 cas dans les journaux de référence) : il est
relevé à part (ce n'est pas une mesure du pas de qualité), montré à côté de cette règle (« vu 2 fois dans tes
journaux… : la table dit encore « inconnue », à relire ») et dans les écarts, sans changer la table. Pour la
progression du rang, il compte 0 au plus bas (on ne sait pas s'il fait monter) et le gain de la table au plus haut.

Les valeurs que le jeu n'écrit jamais (ligne retouchée à la main, format inconnu) ne deviennent ni des mesures ni des
écarts : un rang hors de 1 à 5 ou une progression hors de 0 à 100 % ne sont pas lus ; une application dont le nom
d'ingénieur, le grade ou la qualité sont illisibles est comptée à part (« 1 application illisible… , sans mesure »),
et une séquence qui en contient une n'est pas vérifiée (elle a pu faire monter le rang). Dans les journaux de référence :
aucune (863 applications, qualité de 0,2 à 1, grade de 1 à 5).

### Itinéraire d'ingénierie

Une fois un plan **validé**, l'app calcule l'itinéraire pour faire toutes ses modifications depuis ta position : « le
plus proche est X dans Y, puis Z… », avec pour chaque escale ce que tu y feras, l'état de l'ingénieur (débloqué, rang,
conditions), ses particularités, et pourquoi lui plutôt qu'un autre. Distinct de la section « Itinéraire » (route de
navigation du jeu). Cette partie décrit le serveur (lot 1) ; l'interface (onglets Itinéraire et Ingénieurs, bloc
« Valider ce plan ») et la fiche « Chez l'ingénieur » viennent ensuite.

**Valider un plan** (`POST /plans/:id/validation`) : tu dis « ce plan est prêt ». La validation garde l'empreinte des
cibles du plan (vaisseau, modules visés, modifications, grades, effets : ni le nom, ni la case du Dashboard) et une
photo des modules visés au moment du clic (emplacement du journal, état actuel, auteur de la modification), qui servira
à la fiche chez l'ingénieur. Un plan modifié depuis sa validation n'est plus suivi (l'itinéraire le refuse, avec le
détail de ce qui a changé) tant que tu ne l'as pas revalidé. Un plan sans cible ne se valide pas ; un plan fini, si (il
sert à la vérification finale). Le clic **calcule une fois** l'itinéraire depuis ta position (les plans du dernier calcul
encore validés, plus celui-ci ; 10 au plus) ; position inconnue : aucun calcul, la réponse le dit. Annuler la
validation (`DELETE`) ne calcule rien. Un vaisseau vendu à l'achat d'un autre lui laisse son numéro (R17, 3 fois sur
3 dans les journaux de référence) : la config d'un autre type n'est jamais appliquée à un plan, et la flotte retire le
vaisseau vendu (`ShipyardBuy` avec `SellShipID`).

**Fichiers** (dossier des données, aucun changement de la base) : `engineering-validated.json` (validations),
`engineering-pins.json` (épingles que tu as saisies), `engineering-route.json` (dernier calcul). Écrits de façon
atomique (`core/atomic.js`, copie de celui d'integration), validés strictement à chaque lecture (`jsonStore.js`) :
fichier abîmé, trop gros ou de forme inattendue → mis de côté sous `<nom>.illisible-<date>`, jamais écrasé, et signalé ;
fichier qui ne peut pas être relu (OneDrive, antivirus) → rien n'est écrit (503), chaque requête retente ; fichier
d'une version plus récente de l'app → ni lu ni écrit. Rien n'est écrit au démarrage ni par une lecture.

**Calcul seulement au clic** (`POST /route`, ou la validation) : jamais en continu. Le résultat garde le point de départ
(ta position, Sol, Colonia ou le système d'un ingénieur), ta position au moment du calcul (à part : un départ choisi ne
fait jamais dire « tu as bougé ») et l'heure. `GET /route` relit ce résultat tel quel et dit ce qui a changé depuis
(position, plans modifiés ou dévalidés, nouvelle épingle, ingénieur débloqué ou monté de rang), avec les cases faites et
les matériaux qui manquent, à jour ; l'ordre et les choix, eux, datent du calcul.

**Coût** (al-éq., distance équivalente, réglages de l'app dans `ROUTE_SETTINGS`, à trancher) : distances à vol
d'oiseau (R10, pas de calcul de sauts), 100 par escale, 2 × √(distance à l'arrivée en sl) de supercroisière, 25 par
application en plus due aux rangs (calcul des rangs ci-dessus, montée partagée), 100 de plus pour une seconde visite
avec un autre vaisseau. Avant le coût, dans cet ordre : pas de traversée pour une référence, le moins de déblocages,
le moins d'étapes de déblocage (invité 1, connu 2, à découvrir 3 et la montée du parrain, permis 1).

**Recherche** (`routeSolver.js`, déterministe) : chemin **ouvert** depuis le départ (sans retour). Jusqu'à 16 points
(ingénieurs possibles et parrains à faire monter), la table de Held-Karp donne le plus court chemin exact de chaque
ensemble ; chaque ensemble d'ingénieurs qui couvre le travail est classé puis évalué (affectation des grades, ordre,
effets, vaisseaux) jusqu'à ce qu'aucun suivant ne puisse faire mieux. Au-delà de 16 points, ou de 200 000 évaluations :
glouton puis retraits, ajouts et échanges d'une escale, ordre par plus proche voisin puis 2-opt et Or-opt ; le résultat
le dit (`exact: false`). Parties, dans l'ordre : ta région (ingénieurs prêts : débloqués ou invités), « à préparer »
(à faire inviter ou découvrir, chaque parrain avant son filleul), la traversée, et le retour.

**Régions (R11)** : la Bulle et Colonia (1 000 al autour de Sol et de Colonia ; ailleurs, la plus proche, et la réponse
le dit). Jamais de traversée pour un travail qu'un ingénieur de ta région peut faire, même verrouillé : on te propose
de le débloquer, avec ses conditions (Lei Cheung plutôt que Mel Brandon pour les boucliers G5 depuis la Bulle). La
traversée ne porte que les grades que personne ne fait dans ta région ; elle est facultative et signalée (« N'y va que
si tu le veux »). Un ingénieur qui t'a banni ne compte pas : si c'était le seul, la traversée est proposée, avec la
raison. Un ingénieur que tu écartes (« Ne pas y passer ») se remet : ce que son retrait rend impossible est dit, jamais
remplacé par une traversée. Un parrain à faire monter dans l'autre région (joueur de Colonia qui n'a pas découvert Mel
Brandon) : la traversée est nécessaire, signalée, et la note dit qui ferait le travail là-bas.

**Épingles** (R2, R3, R9) : le jeu n'écrit aucun épinglage. Le plan épinglé chez un ingénieur se **déduit** de la
dernière application faite à distance chez lui (« déduite, dernier constat le JJ/MM ») ; ta saisie (« J'ai épinglé »,
« Aucun », « Je ne sais pas » : `PUT /engineers/:id/pin`) l'emporte si elle est plus récente, et une application à
distance plus récente que ta saisie la contredit (signalé). Une épingle vaut pour son type de module, toutes tailles ;
pour un autre type (autre arme, bouclier bi-tissé ou prismatique), elle n'est pas comptée. À distance, les grades
jusqu'au rang de l'ingénieur (dans la limite de son grade maximal), sans montée de rang ni effet. Une épingle qui ne
monte pas jusqu'au grade voulu sert quand même : les premiers grades à distance, le reste à une escale (« épingle
partielle » ; à coût égal, la distance d'abord ; sous le rang 5, l'escale garde les petits grades s'ils servent à sa
montée).

**Effets expérimentaux** : à un atelier seulement, chez tout ingénieur de ta région qui propose le plan, quel que soit
son grade maximal (R5, observé en jeu, à vérifier au-delà du grade max) et son rang. Ordre retenu : les grades à distance
d'abord, puis l'effet à l'escale (en cas de refus, aucun matériau perdu) ; l'autre ordre (effet d'abord sur un G1, puis
les grades à distance) est donné comme variante. Si l'hôte ne monte pas ce plan jusqu'au grade du module, la règle
« à vérifier » est signalée et un repli est donné (l'ingénieur de ta région le plus proche qui le monte jusque-là, et
ce qu'il coûte en al). Un effet n'est jamais posé avant la première application du plan (sinon il serait effacé).

**Découverte par référence** (R14) : un ingénieur pas encore découvert se fait connaître quand son parrain est au rang 3
et à la moitié de la barre vers le rang 4 (les sources disent un tiers ou environ la moitié : l'app vise la moitié). Le
parrain reçoit une escale « référence » : environ N applications d'un plan qu'il propose jusqu'au G3, sur un module de
ce type acheté exprès (jamais un module d'un plan : la première application effacerait ses grades).

**Escale à plusieurs vaisseaux** (R13, R16) : les bases d'ingénieurs n'ont pas de chantier naval (10 bases relevées dans
les journaux de référence) : on y vient avec un seul vaisseau, sur lequel on monte les modules des autres plans s'ils y
rentrent (taille, compartiment réservé, masse des propulseurs et du bouclier : données coriolis). Sinon, une seconde
visite est comptée.

**Données des ingénieurs** (`server/src/modules/engineering/data/engineers.json`, donnée séparée du code) : les 25
ingénieurs de vaisseau, faits publics seulement (identité, système, coordonnées, base, plateformes, région, découverte,
invitation, déblocage avec le symbole du jeu de chaque objet, permis, points incertains, sources). Validées strictement
au chargement (25 fiches, régions recalculées, chaîne des parrains sans boucle ; rien tiré des journaux d'un joueur :
clés et textes refusés). Illisibles : le serveur continue, la liste des ingénieurs et l'itinéraire répondent 503.
Objets de déblocage : la soute (symbole du jeu ou libellé, jamais la cargaison de mission), les matériaux, le solde ;
les primes et obligations de combat en attente ne se voient pas dans le journal : jamais « ✓ », vérifie-les dans le
jeu.

**Table des règles** (`services/itineraryRules.js`, servie par `GET /route/rules`, lue par la future vigie) : R1 à R17,
chacune avec son statut (mesurée, publiée, à vérifier, inconnue), son appui, sa source, ses observations et ce qu'il faut
regarder dans le journal pour la vérifier ; R1, R4b et R7a renvoient à la table des rangs. Recompter dans les vrais
journaux (lecture seule, hors du contrôle) : `node scripts/regles/verifier-itineraire.mjs`.

| Règle | Statut | En bref |
|---|---|---|
| R2a, R2b | publiée | un plan épinglé par ingénieur, à son atelier, débloqué |
| R2c, R2d | à vérifier | épingler sans le rang 5 (1 cas) ; une épingle remplace la précédente (témoignage) |
| R3a, R3c, R3d, R3e | mesurée | atelier à distance (208 applications), grade ≤ rang, mêmes applications, même type de module |
| R3b | publiée | depuis un porte-vaisseaux (0 application vue) |
| R3f | inconnue | épingle hors de son type : non comptée |
| R4a | mesurée | aucun effet à distance (32 sur 32 dans une base) |
| R5a | mesurée | effet chez un ingénieur qui ne monte pas le plan au G5 (8 cas) |
| R5b, R5c, R6c | à vérifier (observé en jeu) | effet au-delà du grade max ; à tout rang ; gardé en montant à distance |
| R6a, R6b | mesurée | effet sur un G1 ; gardé en montant à un atelier, même un autre (164 sur 164, dont 61) |
| R7b | mesurée | une autre modification efface l'effet (2 cas, et le wiki) |
| R7c, R8a, R12b, R13, R15, R16b | à vérifier | voir la liste ci-dessous |
| R12, R17 | mesurée | reprise au grade suivant chez un autre ; numéro du vaisseau vendu repris |
| R14, R16 | publiée | seuil de référence ; compatibilité des modules (coriolis) |

**Routes** (sous `/api/modules/engineering`, écritures avec `X-Elite-Compagnon: 1`, corps stricts : un champ inconnu ou
un identifiant impossible (« 1.5 », « 0x10 ») est refusé en 400 ou 404, en français, sans rien écrire) :
`GET /validations`, `POST` et `DELETE /plans/:id/validation`, `GET /engineers`, `GET /engineers/:id`,
`PUT` et `DELETE /engineers/:id/pin`, `GET /route`, `POST /route` (`{ planIds, from, exclude? }` ; `exclude` absent :
celui du dernier calcul), `GET /route/rules`. Temps réel : `engineering:update` (validation, épingle, calcul),
`engineering:position` (changement de système), `engineering:pin` (une application à distance montre une épingle qui
contredit ta saisie, ou une nouvelle).

**À vérifier en jeu** (sans bloquer le code ; l'app prévient et donne un repli) :

1. R5b : un ingénieur pose-t-il l'effet sur un module d'un grade au-dessus de son grade maximal pour ce plan (Professor
   Palin, Portée augmentée jusqu'au G3, sur un FSD G5 fait par Felicity) ? 0 cas.
2. R5c : effet chez un ingénieur sous le rang 5 : vu une fois (Broo Tarquin, rang 3) ; rangs 1 et 2 jamais vus.
3. R6c : monter à distance un module qui porte un effet le garde-t-il ? 0 cas : fais d'abord une seule application.
4. R12b : après des grades faits à distance, un autre ingénieur reprend-il au grade suivant ? 0 cas : regarde ce que
   l'atelier te propose avant de payer.
5. R2c, R2d : épingler sans le rang 5 (vu une fois) ; une nouvelle épingle remplace-t-elle l'ancienne ?
6. R3f : portée d'une épingle hors de son type (bouclier standard, bi-tissé, prismatique ; même plan sur une autre arme).
7. Atelier à distance depuis un porte-vaisseaux (0 cas), et depuis la base d'un autre ingénieur (0 cas).
8. R7c : un second effet sur le même plan remplace-t-il le premier ? Faut-il un G1 complet pour poser un effet ?
9. R13 : pas de chantier naval dans les 15 bases non relevées ?
10. R14 : seuil de la référence (un tiers ou la moitié de la barre) ; faut-il recharger la partie pour voir le nouvel
    ingénieur ?
11. R15 : sens de l'état « Acquainted » (compté comme « connu »).
12. R16b : le jeu refuse-t-il des propulseurs ou un bouclier trop légers pour la coque ? Les compartiments réservés
    sont-ils ceux de coriolis ?
13. Noms français du service « atelier à distance », des plans (« Résistance thermique » ou « bouclier antithermique »)
    et des rangs (EDMC).
14. Gain de rang d'un effet expérimental : inconnu, compté 0 (chez l'hôte s'il existe).
15. Données : réputation demandée par Liz Ryder et Zacariah Nemo ; montants de Juri Ishmaak et de Bris Dekker ; MarketID
    de Chloe Sedesi ; osmium et painite « extraits » : un objet acheté est-il refusé ?
16. Objets de déblocage rares (Brandy lavien, Thé de Fujin…) : aucune donnée de provenance.
