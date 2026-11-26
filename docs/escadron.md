# Escadron

> Partie de la notice d’Enova : sommaire dans le [README](../README.md#documentation).

## Module « Escadron »

Page `/escadron` (« Mes envois et mon apport »), avec deux cartes : « Envoi de mes mérites » (le capteur du Squadron
Tracker : son état, activer ou couper l'envoi) et « Mon apport à l'escadron ». On n'y rejoint pas d'escadron : le code,
et les réglages à la main (adresse du serveur, jeton donné par le chef), sont à un seul endroit, la page
`/escadron/rejoindre`. Pas encore inscrit, la carte d'envoi ne montre qu'un bouton vers cette page.

**Capteur du Squadron Tracker (désactivé par défaut).** L'app peut remplacer le plugin EDMC du
[Squadron Tracker](https://github.com/Cronisos/squadron-tracker). Elle envoie chaque gain de mérites Powerplay au
Worker de l'escadron (`https://<son serveur>/v1/merits`), avec le même contrat que le plugin.

- **Aucun serveur par défaut.** L'app est en libre service : elle ne connaît le serveur d'aucun escadron, et rien ne
  part tant que le joueur n'a pas réglé celui du sien. Les escadrons ne se mélangent pas : chacun monte son serveur
  sur son propre compte Cloudflare depuis l'app (page « Serveur de l'escadron »), avec ses clés, sa route et son
  Discord, tous gardés sur le PC de celui qui les a saisis. Un jeton sans serveur réglé est refusé (409).
- **Serveur de l'escadron.** Celui du code de l'escadron (voir plus bas), ou une adresse collée
  dans « Serveur de l'escadron » (`PUT /api/modules/escadron/worker {url}`, vide pour l'oublier). Elle
  doit être en https, sans chemin (ou `/v1/merits`), sans port ni paramètre, et sur un nom public : jamais une
  adresse IP ni un nom du réseau de la maison. Elle est ajoutée à la liste blanche de la passerelle. Changer de
  serveur **efface le jeton** : il n'a été donné que par l'ancien et ne part jamais ailleurs. L'app oublie aussi ce
  que l'ancien avait confirmé, pour que le nouveau reçoive le rattrapage. Une réponse de l'ancien qui arrive après le
  changement ne compte pas. Un réglage modifié à la main et refusé laisse l'app sans serveur, et le jeton ne part nulle part.
- **Rejoindre avec le code de l'escadron** (page « Rejoindre l'escadron », `/escadron/rejoindre`). Un seul code, le
  même pour tous, posté par le chef sur Discord : `ESC1.` + base64url de `{ u: serveur, p: mot de passe }`
  (`server/src/modules/escadron/code.js`, même format que le plugin EDMC). Sans `ESC1.`, le texte est le mot de passe
  seul, pour le serveur déjà réglé. « Rejoindre » règle le serveur du code (comme « Serveur de l'escadron »), puis
  envoie une fois ton nom de commandant (celui des journaux ; avec plusieurs, celui que tu choisis) et le mot de passe
  à `/v1/join` (`POST /api/modules/escadron/rejoindre {code, cmdr?}`). Le serveur répond par un jeton, enregistré comme
  un jeton collé. Ton nom est ton identifiant : on peut rejoindre depuis plusieurs PC, ou avec l'app et le plugin en
  même temps (chaque installation a son jeton, 10 au plus par commandant). Le code n'est ni gardé, ni écrit, ni
  journalisé, et ne suit pas de redirection. Refus expliqués : nom refusé (400), code faux (401), inscriptions fermées
  par le chef (403), inscription par code absente (404), serveur d'une ancienne version (409), trop d'essais ou déjà
  10 installations pour ce nom (429). S'inscrire n'active pas l'envoi. Un code de gestion (`EGC1.`) collé ici est
  refusé sans rien envoyer ; un mot de passe seul n'est accepté que si un serveur a été choisi. Limite assumée : le
  code ne prouve pas qu'on est le commandant qu'on dit, c'est un escadron qui se fait confiance (le chef retire les
  intrus, ferme les inscriptions).
- **Changer d'escadron sans rien perdre.** `POST /rejoindre/apercu {code}` dit, sans rien envoyer, à quel serveur
  mène le code. S'il en change alors qu'on est déjà inscrit, la page demande de confirmer en nommant l'hôte
  (`confirmerServeur`). L'inscription est essayée sur ce serveur sans toucher à l'état : le serveur et le jeton ne
  changent qu'ensemble, une fois l'inscription acceptée ; un refus laisse tout comme avant.
- **Opt-in.** Rien ne part tant que tu n'as pas collé ton jeton de membre **et** cliqué « Activer l'envoi ». C'est
  le seul envoi de l'app qui contient une donnée personnelle : ton nom de commandant.
- **Ce qui part.** Quatre champs, comme le plugin : `cmdr`, `system`, `merits` (le `MeritsGained` du journal) et
  `at` (l'heure du journal). Le jeton passe dans l'en-tête `Authorization: Bearer`, et aucune redirection n'est
  suivie : le jeton ne peut pas partir vers une autre adresse.
- **Jeton.** 43 caractères, vérifiés avant l'enregistrement. Il est gardé à part, dans
  `server/data/escadron-jeton.json`. L'état et la file d'attente sont dans `server/data/escadron.json`, qu'on peut
  montrer sans risque. Le jeton n'est jamais journalisé ni renvoyé par l'API : la page n'en montre que les 4
  derniers caractères.
- **File d'attente.** Un envoi à la fois, dans l'ordre du journal, 100 par minute au plus (le Worker refuse au-delà
  de 120). Si le serveur est injoignable, ou répond 429 ou 5xx, nouvel essai après 1 min (« Réessayer maintenant »
  pour ne pas attendre). Sur 400 ou 413, le gain est écarté. Sur 401 (jeton refusé), la file attend un nouveau
  jeton : rien n'est perdu.
- **Jeton d'un autre commandant (403).** Le Worker répond 403 quand le nom du journal n'est pas celui enregistré pour
  ce jeton. Le plugin jette alors le gain ; l'app, elle, garde en file tous les gains de ce commandant et n'en envoie
  plus aucun (un seul refus, pas un par gain). Ils repartent avec un nouveau jeton, ou après « Réessayer
  maintenant » si l'escadron a corrigé le nom. Si ce jeton est celui d'un autre de tes commandants, dis-le dans la
  page (« Commandant de ton jeton ») tant qu'aucun envoi n'a été accepté.
- **Jamais les gains d'un autre commandant sans ton choix.** Un seul commandant part : celui du jeton. Si tes journaux
  n'en connaissent qu'un (gains des 30 derniers jours, file d'attente, dernier `LoadGame`), c'est lui. S'ils en
  connaissent plusieurs (un second compte, un proche qui joue sur ce PC), **rien ne part** tant que tu n'as pas dit,
  dans la page, lequel est celui de ton jeton (à l'enregistrement du jeton, ou ensuite ; `PUT
  /api/modules/escadron/cmdr`, seulement un commandant des journaux). Le dernier commandant chargé n'est pas un choix.
  Une fois un envoi accepté par le Worker, le commandant du jeton est fixé : seuls ses gains partent, ceux des autres
  comptent dans « autre commandant ». Un nouveau jeton efface le choix. Avant, le gain d'un autre commandant du même
  dossier de journaux partait au Worker, nom, système et mérites compris, avant d'être refusé (403), qu'il soit le
  plus ancien de la file ou simplement le dernier chargé.
- **Rattrapage.** Au démarrage, l'app relit les journaux restés sur le disque. Elle envoie les gains pas encore
  confirmés depuis le point de départ choisi à l'activation : maintenant, le début de la semaine Powerplay, ou
  30 jours, le plus vieux que le Worker accepte. Un gain déjà envoyé est reconnu par commandant, heure et mérites,
  la même clé que le Worker. La file est aussi gardée sur le disque.
- **Comme EDMC**, rien ne part en galaxie Legacy (version 3.x) ni en bêta : seulement en galaxie Live (4.0 et plus).
- **Lignes non créditées.** Le jeu réécrit parfois une ligne PowerplayMerits sans la créditer : son TotalMerits ne
  bouge pas (12 fois du 24 oct. au 7 nov. 2026). L'app ne l'envoie pas, le plugin si. Plus souvent, la ligne
  suivante annule la précédente : son TotalMerits ne compte que le nouveau gain (ex. 2 015 puis 1 773 : le total ne
  prend que 1 773 ; 40 fois, 6 271 mérites). Un gain annulé encore dans la file (rattrapage, serveur injoignable,
  attente d'un jeton) ne part pas ; déjà envoyé, il reste compté, car le Worker n'accepte pas de retrait.
- **Limite de la clé du Worker** (le plugin a la même) : deux gains distincts, crédités dans la même seconde avec la
  même valeur, n'en font qu'un pour lui (28 fois, 245 mérites sur la même période). L'app ne les envoie qu'une
  fois, puisque le Worker ignorerait le second. Pour lever cette limite, il faudrait que le Worker mette
  TotalMerits ou un numéro d'ordre dans son identifiant.
- **Ce que ça donne sur 30 jours de journaux** (essai à blanc, réseau simulé) : 1 074 envois, 1 296 011 mérites,
  pour 1 296 073 réellement crédités d'après TotalMerits. L'écart de −62 additionne deux erreurs de sens opposés :
  −245 pour les gains fusionnés par la clé, +183 que le jeu a retirés en plus des gains annulés (5 fois). Avant la
  règle des gains annulés, c'était 1 089 envois et +3 484.
- **Avec le plugin EDMC en même temps**, il n'y a pas de double compte. Le Worker ne garde qu'une fois un même gain
  (`INSERT OR IGNORE` sur `sha256(commandant|heure|mérites)`), et l'app envoie le même triplet que le plugin. Pour
  le classement le plus juste, désactive quand même le plugin une fois l'app en place : il envoie les lignes non
  créditées.

**Mon apport à l'escadron.** Le jeu écrit `Statistics` à chaque connexion. Sa partie `Squadron` donne un cumul pour
chaque classement de l'escadron : minage, primes, Powerplay, exploration, commerce, colonisation, Aegis, BGS, CQC…
La carte montre l'écart entre deux relevés. On choisit la dernière séance, la semaine Powerplay, depuis l'arrivée,
ou deux relevés au choix. Ce que tu fais pendant une séance n'apparaît qu'à la connexion suivante. « Semaine
Powerplay » part donc du premier relevé après le passage de semaine (jeudi 7 h UTC) : il contient la dernière
séance de la semaine précédente, que le dernier relevé d'avant le passage aurait comptée à tort (+6 096 mérites
pour la semaine du 5 nov.). Si une séance était en cours au passage, ce qu'elle a apporté ensuite est déjà dans ce
relevé : la carte le signale, avec les mérites que le journal en connaît. Le recoupement avec le journal sépare les
mérites écrits mais non crédités : lignes en double, et gains annulés par la ligne suivante. Mesuré sur les
journaux du 24 oct. au 7 nov. 2026 :

- les valeurs ne baissent jamais et ne repartent pas à zéro le jeudi : ce sont des cumuls depuis l'arrivée dans
  l'escadron, malgré leur nom (`…_highestcontribution`) ;
- Powerplay : l'écart égale celui de TotalMerits sur le même intervalle, 22 fois sur 23. La carte le recoupe avec
  ton journal et signale un écart ;
- minage : l'écart égale celui de `Mining_Profits`, 8 fois sur 8 ;
- les autres classements (primes, combat, exploration, commerce…) restent « à vérifier » face au menu d'escadron du
  jeu. Un classement que l'app ne connaît pas encore (ajouté par une mise à jour) s'affiche quand même, marqué
  « inconnue ».

Le contrat du Worker et les règles du jeu utilisées sont regroupés dans `server/src/modules/escadron/rules.js`, avec
pour chacune son statut (mesurée, publiée ou à vérifier), sa source et sa date.

**Serveur de l'escadron (côté gestion, `/escadron/chef`).** Pour le chef, ou un membre qui gère pour tout l'escadron,
sans console (`server/src/modules/escadron/chef/`) :

- **Le monter** sur son compte Cloudflare (gratuit) avec une clé d'API (Workers Scripts et D1 en modification,
  paramètres du compte en lecture) : l'app crée la base D1 et ses tables, envoie le Worker embarqué
  (`chef/worker/`, copie du dépôt squadron-tracker) avec ses trois secrets (clé de chef et clé du suivi tirées au
  hasard, mot de passe choisi), et l'allume sur workers.dev. Le remonter le met à jour sans toucher aux membres, aux
  mérites ni à la route.
- **Un serveur déjà en place sur le compte** (monté à la main, ou depuis un autre PC) n'est jamais écrasé sans
  confirmation : l'app lit ses réglages, et refuse (409) tant qu'on ne l'a pas repris ou qu'on n'a pas coché
  « remplacer ». Remplacé, il garde sa base D1 (celle qui lui est liée). Repris avec ses clés puis remonté, il les
  garde : la carte Discord continue.
- **Ou le reprendre** avec un code de gestion (`EGC1.…` : adresse, clé de chef, clé du suivi, mot de passe), que
  celui qui l'a monté montre sur demande et envoie en privé. La clé est vérifiée auprès du serveur avant d'être
  gardée. Ainsi le chef peut héberger et un membre gérer, ou l'inverse. Sans code de gestion (serveur monté à la
  main), on le reprend avec son adresse et ses clés (ADMIN_TOKEN, et TRACKER_TOKEN pour garder la carte). Un serveur
  d'avant cette version ne sait pas confirmer la clé : elle est gardée quand même, la page le dit, et le remonter
  (étape 1) repose ces mêmes clés sur le serveur.
- **Le code de l'escadron** à poster s'affiche dès que le serveur est là.
- **La route** vit sur le serveur (`PUT /admin/route`) : reprise du Projet extension (rôles Consolidé, Forteresse,
  Prise ; les systèmes déjà tenus ne sont pas dessinés), chaque nom vérifié sur Spansh avant l'envoi. Un système
  change : on modifie le projet et on renvoie la route ; la page dit quand celle du serveur diffère du projet. La
  carte la prend au passage suivant et se recale sans fausse bannière « système validé » ; le rapport du jeudi
  compte l'avancement depuis le changement, en le disant.
- **La carte Discord** (GitHub, 24 h/24) : avec le lien du webhook et une clé GitHub (droits repo et workflow),
  l'app copie le projet sur le compte, y pose les secrets d'Actions scellés (`chef/sealed.js` : sealed box de
  libsodium, écrite ici et vérifiée contre tweetnacl), allume la tâche toutes les 15 minutes et lance un premier
  passage.
- **Les membres** : liste (avec le nombre d'installations), « couper ses installations » (ses mérites restent, il
  rejoint de nouveau), retrait (jetons coupés, mérites effacés), inscriptions ouvertes ou fermées, et un jeton à
  l'ancienne pour un plugin d'avant le code. **Le mot de passe** et **la clé de chef** se changent avec la clé
  Cloudflare ; une nouvelle clé de chef rend caducs les codes de gestion déjà donnés, sans arrêter la carte.
- **Le projet de colonisation** vit aussi sur le serveur (`PUT /admin/colonisation`) : les systèmes à coloniser et
  leurs chantiers par priorité, composés depuis la page « Colonisation de l'escadron » (menu Powerplay & Escadron), et tenus à jour par les relevés du dépôt
  qu'envoient les apps des membres qui le suivent (voir [Colonisation](colonisation.md#projet-de-lescadron)). Sa
  carte Discord (facultative) est écrite par le serveur lui-même, par un webhook, sans GitHub.
- **La carte GitHub** n'est installée que sur une copie du projet (un autre dépôt du même nom est refusé), sans
  toucher au réglage des actions permises. La page conseille une clé GitHub courte (1 à 7 jours), à supprimer une
  fois la carte en place.
- Tout ce qui appelle le serveur de l'escadron (membres, route, en ligne ?) passe par des requêtes POST avec
  l'en-tête de l'app : un lien ouvert depuis Discord ne déclenche jamais d'appel avec la clé de chef. La route n'est
  envoyée qu'une fois chaque système vérifié sur Spansh (Spansh en panne : on réessaie plus tard).

Les clés Cloudflare et GitHub ne servent que le temps de l'opération et ne sont jamais gardées. Le reste (adresse,
clé de chef, clé du suivi, mot de passe) est dans `escadron-chef.json`, jamais renvoyé à la page en dehors du code de
gestion demandé exprès, et jamais distribué (`scripts/distribution.mjs`).

Plus tard : les ordres d'escadron dans l'overlay (consignes du jour, avec accusé de réception), et un seul rapport
de séance en français, au lieu d'un rapport par plugin.

## Partage avec l'escadron

Un membre peut partager avec son escadron ses repères (minage au Rhino, minage en vaisseau, sites gardiens et autres repères, quatre
types séparés), ses builds de vaisseaux et ses routes commerciales. Chaque rubrique a son bouton « Partager à
l'escadron » sur la fiche de l'objet, et son écran « Escadron » pour ce qui est reçu : Mes repères › Escadron,
Builds › Escadron, Commerce › Escadron.

- **Repère** : le lieu et ta description. « Copier dans mes repères » l'enregistre chez celui qui le reçoit.
- **Build** : le vaisseau et ses modules, avec leurs modifications ; ni le vaisseau réel visé, ni le commandant. C'est
  la version enregistrée qui part, pas les modifications en cours. « Copier dans mes builds » passe par le Constructeur,
  qui le revérifie en entier.
- **Route commerciale** : les stations dans l'ordre, ce qu'on y achète et vend au dernier prix relevé, les sauts, et ce
  qu'elle rapporte en moyenne (gain par boucle, durée, tonnage par trajet). Ni ton objectif, ni ton solde, ni le détail de tes
  boucles. Elle se lit, sans copie : une route se suit depuis ses propres journaux, donc celui qui la reçoit la fait une
  fois en jeu puis la crée dans « Nouvelle route ».

Pour un build ou une route, la page ne donne que le type et le numéro de l'objet : le module Escadron compose le
contenu en lisant l'API locale de la rubrique (`server/src/modules/escadron/sources.js`), comme pour le partage
automatique.

**Opt-in.** Le partage est coupé par défaut (Paramètres, « Partage avec l'escadron »). Coupé, l'app ne demande rien au
serveur de l'escadron. Activé, elle ne parle qu'au serveur du code d'escadron que le joueur a collé, avec son jeton.
Un envoi vient d'un clic sur « Partager à l'escadron », ou du partage automatique d'un type que le joueur a lui-même
réglé (plus bas) : chaque type est sur « jamais » par défaut.

**À qui.** Tout l'escadron, un rôle et ceux au-dessus, ou des commandants précis (30 au plus). Le même objet repartagé
remplace l'ancien partage ; « Ne plus partager » le retire pour tout le monde.

**Partage automatique.** Dans Paramètres, chaque type se règle à part : repères de minage au Rhino, repères de minage en
vaisseau, autres repères, routes commerciales (30 routes lues au plus par passage). Les builds n'y sont pas, exprès :
un build se partage à la main, un par un. Pour chacun : jamais, à tout l'escadron, ou à un rôle et au-dessus. Un type réglé est lu
toutes les 2 minutes par l'API locale de sa rubrique (jamais son code) : un nouvel objet est partagé, un objet modifié
est renvoyé, un objet supprimé ou marqué « pas rentable » est retiré. Trente envois au plus par passage. Une lecture
locale en échec ne retire rien. Ce que le joueur retire ou partage lui-même à la main sort du partage automatique
(« Tout reprendre en automatique » l'y remet). Mettre un type sur « jamais » laisse en place ce qui est déjà partagé :
« Ce que je partage » le retire. Changer d'escadron efface ces réglages.

**Ce qui est reçu** reste à part, dans l'écran « Escadron » de la rubrique (Mes repères › Escadron) et dans
`escadron-partage.json`. Rien n'est ajouté aux données du joueur sans son clic sur « Copier dans mes repères ». Un
partage reçu peut être masqué, sur ce PC seulement. Changer de serveur d'escadron efface ce qui venait de l'ancien.

**Rôles.** Le chef crée les rôles de son escadron, du plus haut au plus bas, et en donne un à chaque membre (page du
chef, « Rôles et partage »). Un partage « à Lieutenant et au-dessus » est lu par les lieutenants et les rôles placés
plus haut. Un membre sans rôle ne reçoit que ce qui vise tout l'escadron ou lui-même.

**Chiffrement de bout en bout (partages à des personnes).** Un partage adressé à des personnes précises est chiffré
sur le PC de son auteur et déchiffré sur celui de ses destinataires (`server/src/modules/escadron/chiffre.js`,
node:crypto : X25519, HKDF-SHA256, AES-256-GCM). Chaque installation a sa paire de clés ; la clé privée ne quitte
jamais le PC, la clé publique est publiée sur le serveur (`PUT /v1/key`) à la première lecture. Le serveur ne reçoit
qu'un titre neutre (« Partage chiffré ») et une enveloppe : il ne peut lire ni le titre ni le contenu.

- Il faut que tous les destinataires aient une clé (elle se crée en activant le partage dans une app à jour). Sinon
  le partage part en clair, et la fenêtre de partage le dit avant l'envoi, en nommant ceux à qui il en manque une.
- Un partage « à tout l'escadron » ou « à un rôle » n'est pas chiffré de bout en bout : celui qui héberge le serveur
  pourrait le lire dans sa base.
- Le serveur voit toujours qui partage à qui, le type du partage et sa date.
- Le serveur distribue les clés publiques : un hébergeur malveillant pourrait en glisser une à lui. Rien ne protège
  de cela ici.
- Clé perdue (réinstallation sans sauvegarde) : les anciens partages chiffrés sont montrés « illisibles », l'auteur
  doit les partager de nouveau. Paramètres › Sauvegardes garde la clé avec le reste.

**Vie privée.** Le serveur ne rend un partage qu'à son auteur et à ses destinataires. La clé du chef ne lit aucun
partage : le chef voit ce qui lui est adressé, comme tout le monde. Tout membre confirmé voit la liste des membres et
leur rôle, pour choisir à qui partager. Limite à connaître : celui qui héberge le serveur possède la base chez
Cloudflare et pourrait la lire directement ; les partages ne sont pas chiffrés de bout en bout.

**Installations à confirmer.** Le code de l'escadron ne prouve pas qui s'inscrit. Une installation de plus sous un nom
déjà inscrit envoie ses mérites, mais ne lit ni n'écrit aucun partage tant qu'elle n'est pas confirmée : par le membre
lui-même depuis une installation déjà confirmée (Paramètres), ou par le chef.

**Serveur.** Le partage demande la version du serveur du 16 nov. 2026 (commit 3e7f9f0 du dépôt squadron-tracker) : le
chef le remonte depuis sa page (étape 1). Sur un serveur plus ancien, l'app dit que le chef doit le mettre à jour. Le
projet de colonisation demande celle du 19 nov. 2026, ajoutée à la copie de l'app (`chef/worker/`) et pas encore
reportée dans squadron-tracker.

API locale : `GET /api/modules/escadron/partage`, `PUT …/partage/actif`, `POST …/partage/lire`,
`POST …/partage/envoyer` (`{ kind, ref, title, data, to }`), `DELETE …/partage/:id`, `PUT …/partage/masques`,
`POST …/partage/installations/:id/confirmer`, `PUT …/partage/auto` (`{ kind, to }`), `POST …/partage/auto/passage`,
`POST …/partage/auto/reprendre` ; côté chef `POST …/chef/roles/lire`, `PUT …/chef/roles`,
`PUT …/chef/membres/:cmdr/role`, `POST …/chef/membres/:cmdr/confirmer` ; et `POST /api/modules/waypoints/waypoints/importer`.
