# Développement

> Partie de la notice d’Enova : sommaire dans le [README](../README.md#documentation).

## Tests

```powershell
npm test
```

Les tests utilisent un extrait réel du journal (route Port Draught ⇄ Cemiess) et vérifient notamment les
boucles de référence : 74 591 507 cr et 78 548 150 cr, au crédit près. `npm test` lance ceux du serveur, du client
de l'overlay (place par défaut des fenêtres, gardes de `main.js` avec un Electron simulé : rien ne s'ouvre) et de l'app
de bureau ; chacun se lance aussi seul :
`npm test -w server`, `npm test -w client`, `npm test -w overlay`, `npm test --prefix desktop`.

Quelques tests gardent les textes et les fenêtres en jeu :

- `client/src/core/textes.test.js` vérifie le tutoiement dans `client/src`, `server/src`, `desktop` et `overlay`
  (formes en -ez, vous, votre, vos), sans tenir compte de la casse. Un nouveau message d'erreur du serveur s'affiche
  tel quel dans les pages : il doit donc lui aussi tutoyer.
- `server/src/core/textesVisibles.test.js` interdit un pseudo de joueur dans les textes visibles de `server/src`,
  `client/src`, `overlay/` et `desktop/` (les commentaires du code sont tolérés). Le module Escadron, en refonte, n'y
  est pas encore soumis.
- `client/src/core/animationsEnJeu.test.js` interdit une animation CSS sans fin dans le cadre des fenêtres en jeu et
  la jauge du FSD : elle ferait redessiner la fenêtre pendant toute la partie.

## Contrôles avant mise à jour

Avant chaque mise à jour (et avant de la distribuer à l'escadron) :

```powershell
npm run controle
```

Le contrôle exécute, dans l'ordre, les étapes du dossier `scripts/controle/etapes/` (une étape = un fichier), s'arrête
au premier échec avec un message en français (et les dernières lignes de la commande en cause), puis résume chaque
étape. Il finit par « Tout est vert : la mise à jour peut partir. » ou par l'étape qui a échoué ; le code de sortie
vaut 0 seulement si tout est vert. La sortie complète de chaque étape est gardée dans `%TEMP%\elite-controle-<date>\`.
Une étape réussie peut porter un **avertissement** : un point à décider qui ne bloque pas (une
dépendance hors suivi dont la mise à jour est prévue : Electron et Vite sont surveillés). Il est répété sous l'étape et à la fin, à chaque contrôle (« ⚠ … »).

| Étape | Ce qu'elle vérifie |
|---|---|
| `10-tests-serveur` | tests unitaires du serveur (`node --test`) |
| `20-tests-client` | tests unitaires de l'interface |
| `25-tests-overlay` | tests de l'overlay (place des fenêtres, gardes de `main.js` avec un Electron simulé, sans lancer Electron) |
| `26-overlay` | version d'Electron encore suivie ; gardes de l'overlay essayées dans le **vrai** Electron ; interface qui refuse un port déjà tenu et n'écoute que sur 127.0.0.1 (voir « Overlay dans le vrai Electron ») |
| `27-tests-bureau` | tests de l'app de bureau (copie des données, bascule et place de la barre de menu, pages détachables, Node du PC, processus et journal, encodeur GIF et partage du rapport pour Discord), sans lancer Electron |
| `30-tests-banc` | tests du banc de contrôle lui-même (anonymisation, normalisation, horloge figée, serveur isolé, orchestrateur) |
| `40-golden` | photo de référence du constructeur de builds et relevés EDSY, **obligatoires** (`GOLDEN_REQUIRED=1` : sans les données de référence figées, toutes vérifiées par leurs empreintes, c'est un échec, pas un test sauté) |
| `50-compilation-client` | `vite build` dans un dossier temporaire, effacé ensuite (`client/dist` n'est pas touché) |
| `62-distribution` | ce qui part chez les autres (fichiers suivis par git et nouveaux non ignorés : ceux qu'emporteront l'installateur et une copie pour l'escadron) ne contient rien du joueur. Aucun fichier de données à son nom (`server/data/*` sauf `.gitkeep`, base `.db` et ses copies, `escadron-jeton.json`, `.env`, `secret(s).json`, `route.local.json`, réglages et mémoire : `ia.json`, `ia-historique.json`, `bureau.json`…), aucun webhook Discord, ni ton vrai jeton d'escadron (lu en lecture seule, gardé en mémoire), et `server/data/*` toujours ignoré par git. Règles : `scripts/distribution.mjs`, que l'installateur reprendra ; `node scripts/distribution.mjs` le lance seul |
| `60-anonymat` | aucun fichier du dépôt (tous ceux suivis par git, les nouveaux non ignorés, et toutes les fixtures) ne contient une donnée réelle tirée de tes vrais journaux (lus en lecture seule, jamais écrits ni affichés : le rapport donne le fichier, la ligne et la sorte) : ni FID, ni escadron ou son numéro, ni porteur (nom, indicatif, identifiant), ni ami, coéquipier ou autre joueur, ni nom ou identifiant de vaisseau ; dans les fixtures, ni le nom du commandant, ni chat (voir « Anonymat du dépôt et de son historique ») |
| `70-rejeu` | les séances de référence rejouées sur un serveur isolé, chaque module interrogé par son API et comparé **exactement** aux résultats attendus, plus des vérifications écrites en dur |
| `72-memoire` | gros dossier de journaux (40 copies des séances, environ 150 Mo) : le serveur isolé démarre sous un tas de V8 plafonné à 220 Mo, et la mémoire qu'il garde une fois prêt croît d'au plus 0,4 Mo par Mo de journaux (voir « Mémoire au démarrage ») |
| `75-pages` | chaque page de l'interface et chaque fenêtre de l'overlay ouverte dans Chrome sans fenêtre : ni exception, ni erreur de console, ni réponse ≥ 400 imprévue, ni appel vers l'extérieur, et les éléments clés à l'écran (voir « Pages et fenêtres ») |
| `80-attaques` | attaques rejouées sur toutes les routes du serveur isolé et à travers le proxy de l'interface : chaque cas doit être refusé proprement (4xx, raison en français, rien d'écrit), sans fuite du jeton d'escadron, sans connexion sortante (voir « Attaques contre l'API locale ») |
| `85-base` | ta vraie base, **copiée** : le schéma du projet s'y applique sans perte, le serveur isolé lit tout dessus sans erreur, et chaque table garde ses lignes (voir « Base de données réelle ») |

Options : `npm run controle -- --liste` (les étapes, sans rien lancer), `--etape=rejeu` (seulement celles dont le nom
contient « rejeu » ; plusieurs : virgules), `--depuis=60` (à partir de cette étape).

### Ajouter une étape

Un fichier `scripts/controle/etapes/NN-nom.mjs` (NN : deux chiffres ou plus, qui fixent l'ordre ; minuscules,
chiffres et tirets). Un fichier mal nommé ou mal formé arrête le contrôle : une étape ne disparaît jamais en silence.

```js
// scripts/controle/etapes/80-pages.mjs
export default {
  titre: 'Pages de l’interface',
  async lancer(ctx) {
    // ctx.node(args, { cwd, journal: ctx.journal(), titre }) : lance node sans shell, sortie gardée, échec si code ≠ 0
    // ctx.suiteNodeTest({ titre, cwd, motifs, journal: ctx.journal() }) : une suite node --test, résumée
    // ctx.racine, ctx.serveur, ctx.client, ctx.controle : dossiers ; ctx.dire(texte) : une ligne de suivi
    if (problème) throw new ctx.EchecEtape('Ce qui ne va pas, en français', { details: 'lignes utiles' });
    return 'résumé d’une ligne'; // ou { saute: 'raison' } : l'étape compte comme sautée, le contrôle n'est pas vert
    // ou { resume, avertissement: 'point à décider' } : réussie, avertissement répété à la fin (ne bloque pas)
  },
};
```

Une étape qui a besoin du serveur démarre son propre serveur isolé (ci-dessous) et l'arrête à la fin, même en cas
d'échec (`try … finally`).

### Serveur isolé

Le vrai serveur de la worktree, mais avec tout à lui : rien n'est lu ni écrit dans `server/data`, dans tes vrais
journaux ni dans les options du jeu, et l'app qui tourne sur 3001 n'est pas touchée.

- port libre choisi au lancement (`ELITE_PORT`) ;
- dossier de données temporaire (`ELITE_DATA_DIR`) : copie de `server/data/reference` et base SQLite neuve, créée par
  la même mise à jour que l'app (`server/dbPush.mjs` : migrations versionnées). Les données de référence doivent être **les versions
  figées** (`scripts/controle/banc/reference.mjs`, mêmes empreintes que l'app) : sinon le serveur isolé ne démarre pas
  et le message dit chaque écart. Avant, une copie d'avant le figeage passait le contrôle sur des tables que « Mettre à
  jour les données » remplacera. `npm run controle:reference` télécharge les versions figées dans `server/data/reference`
  de cette copie du projet. Dans la copie du banc, la date de téléchargement de `meta.json` est remplacée par une date
  fixe (2026-11-07) : les attendus ne dépendent pas du jour du téléchargement ;
- journaux de test (`ELITE_JOURNAL_DIR`) : ceux d'une séance de référence, ou aucun ;
- options du jeu de test (`ELITE_GAME_OPTIONS_DIR`) : copie de `scripts/controle/options` (profil de commandes,
  rapport d'erreurs, `GraphicsConfigurationOverride.xml`), fichiers datés d'avance ;
- réseau coupé (`ELITE_NO_NETWORK=1`), overlay jamais lancé (`ELITE_NO_OVERLAY=1`). L'état de l'overlay
  (`GET /api/overlay`) porte alors `disabled: true`, et l'interface affiche « Fenêtres en jeu coupées
  (ELITE_NO_OVERLAY) » au lieu de conseiller l'installateur ;
- horloge figée (`CONTROLE_NOW`, heure ISO avec fuseau), `Math.random` à graine fixe (`CONTROLE_ALEA`), langue
  `fr-FR` (`CONTROLE_LANGUE`), fuseau Europe/Paris : préchargés par `scripts/controle/banc/figer.mjs`
  (`node --import`), pour que les résultats ne dépendent ni de l'heure ni du PC ;
- arrêt propre par un canal IPC (la base est refermée), puis effacement du dossier temporaire ; si le lanceur
  disparaît, le serveur s'arrête aussi ;
- au besoin, `memoire: true` (préchargement `banc/memoire.mjs`, avec `--expose-gc`) : `srv.demander('memoire')` rend
  la mémoire gardée après un ramasse-miettes complet ; `tasMo` plafonne le tas de V8 (`--max-old-space-size`).

En ligne de commande (Ctrl+C pour arrêter) :

```powershell
npm run controle:serveur -- --seance=minage-rhino-2026-11-07
npm run controle:serveur -- --seance=boucle-commerce-2026-10-27 --direct --maintenant=2026-10-28T00:10:00Z --garder
npm run controle:serveur -- --aide
```

`--direct` : les journaux sont écrits un à un après le démarrage, comme un jeu qui tourne pendant que l'app est
ouverte (sinon ils sont relus au démarrage) ; `--garder` : le dossier temporaire reste après l'arrêt ; `--bavard` :
la sortie du serveur s'affiche. Les écritures demandent l'en-tête `X-Elite-Compagnon: 1`, comme sur la vraie app.
Dans une étape, `demarrerServeur({ mode: 'direct', avantJournaux: async (srv) => … })` prépare le serveur par l'API (rôle
d'un vaisseau…) avant que le premier journal ne soit écrit.

Dans une étape ou un test :

```js
import { demarrerServeur, nettoyerBanc } from '../banc/serveur.mjs';
const srv = await demarrerServeur({ seance: 'minage-rhino-2026-11-07', mode: 'historique' });
try {
  const etat = await srv.get('/api/state');               // GET, erreur si statut ≥ 400
  const r = await srv.requete('POST', '/api/modules/routes/detect', {}); // { statut, type, corps }
} finally {
  await srv.arreter();   // arrêt propre et effacement
  nettoyerBanc();        // base modèle du processus
}
```

### Séances de référence

Dans `scripts/controle/seances/<id>/` : des journaux réels d'un joueur, **anonymisés**, et un `seance.json` (titre,
origine, heure figée, extraits). Minage Rhino du 7 nov., ventes Powerplay du 31 oct. (0 mérite à Synuefe GA-I b57-6)
et du 6 nov., boucle de commerce du 27 oct. (route de référence), mort en SRV puis du vaisseau le 29 oct., objectifs
communautaires du 26 oct., contribution à un ingénieur et amarrage refusé le 2 nov., saut de porteur le 1er nov.,
montées de rang d'ingénieur le 1er nov. (Lei Cheung du rang 1 au rang 5) et le 5 nov. (G3 à distance chez Broo Tarquin),
plus un journal construit avec les exemples documentés du module Colonisation.

### Anonymat du dépôt et de son historique

L'étape `60-anonymat` fouille **tous** les fichiers du dépôt (`git ls-files`, plus les nouveaux non ignorés et les
fixtures, même ignorées), avec les secrets relevés dans tes vrais journaux (`scripts/controle/anonymat/depot.mjs`) :

- partout : le FID (même au milieu d'un mot), et en mots entiers l'escadron et son numéro, les porteurs (nom,
  indicatif, identifiant), les amis, coéquipiers et autres joueurs, les noms et identifiants de vaisseaux ;
- dans les fixtures (séances, attendus, options et pages du banc ; `fixtures/` et `__golden__/`) : le nom du
  commandant aussi, même au milieu d'un mot ; ni chat ni indicatif de porteur non anonymisé dans les séances ;
- ailleurs, le nom du commandant n'est toléré que s'il est aussi le nom d'auteur des commits du dépôt (il est déjà
  public dans chaque commit et dans l'adresse du Worker de l'escadron) ; un autre commandant ne l'est jamais. Les noms
  de tenues ne sont pas cherchés (mots courants, remplacés dans leur champ par l'anonymisation des séances).

Avant, seules les fixtures étaient fouillées (le reste du dépôt pour le FID seulement) : de vraies données (porteur,
escadron, noms de joueurs) sont restées dans des tests et du code, étape au vert. Elles sont remplacées par des valeurs
fictives (« PORTEUR 1 », « TST-001 », 3700000001, « ESCADRON TEST »…). Un test utilise des valeurs de ce genre, jamais
une valeur de tes journaux.

L'**historique git** n'est pas réécrit (décision à venir) : d'anciennes versions de ces fichiers y restent, et un clone
complet les emporte. `npm run controle:historique` (`scripts/controle/historique.mjs`) le fouille avec les mêmes règles :
chaque version de chaque fichier, sur toutes les branches et étiquettes, et chaque message de commit. Il dit le
chemin, la version, le commit où elle est apparue et la sorte du secret, jamais la valeur ; il ne modifie rien, ne fait
pas partie de `npm run controle` (qui ne bloque donc pas dessus) et rend le code 1 s'il trouve quelque chose, pour
servir de garde avant un partage.

Anonymisation (`scripts/controle/anonymat/anonymiser.mjs`) : le chat est retiré (`ReceiveText`, `SendText`,
`Friends`) ; le nom du commandant devient « Testeur », le FID « F0000000 » ; l'escadron, les porteurs (nom, indicatif,
identifiant), les porteurs d'escadron croisés (« NOM | ÉTIQ » d'un signal → « PORTEUR ESC-001 | TS01 »), les amis,
coéquipiers et joueurs croisés, les noms et identifiants de vaisseaux et de tenues sont remplacés, partout et
toujours de la même façon. Les secrets sont relevés dans tous tes journaux et gardés en mémoire
seulement ; chaque fichier écrit est revérifié, et rien n'est écrit s'il en reste un. Les tests écrits à la main
prennent des valeurs inventées (« Escadre Fictive | ZZQA », « PORTEUR FICTIF ZQX-7W2 ») : `60-anonymat` y cherche les
secrets des autres joueurs relevés dans tes journaux (mots entiers ; étiquettes et indicatifs casse comprise). Un
nom qui n'est qu'un terme public du jeu (un porteur d'escadron resté « Squadron Carrier ») n'est pas cherché :
`scripts/controle/anonymat/termes-publics.json` (rien que des termes publics) et les libellés des règles
(`regles.json`). Une étiquette ou un indicatif sans lettre (« 2026 ») n'est cherché que là où le jeu le met (après
« | », après `SquadronID`), sinon toute date le trouverait. Un signalement donne le fichier, la ligne, le genre de
secret (joueur croisé, ami, porteur d'escadron, étiquette, indicatif) et un indice masqué (première lettre et
longueur), jamais la valeur. Pour refaire les séances
(sur ce PC, avec les vrais journaux) : `npm run controle:seances` (ou `-- <id>` pour une seule), puis relire
`git diff scripts/controle/seances`.

### Résultats attendus

`scripts/controle/rejeu/points.mjs` dit ce que le rejeu demande à chaque module ; les réponses, pour chaque séance et
chaque mode (historique, direct), sont dans `scripts/controle/attendu/<module>.json`. Seul ce qui change sans rien
dire du code est normalisé : le dossier temporaire (`<banc>`), le port (`<port>`), les UUID (`<uuid>`), l'heure réelle
du lancement (`<heure réelle>` : dates écrites par la base SQLite, fichiers créés pendant le contrôle) et la version
d'un fichier dans une adresse (`?v=<date du fichier>` : avatars du compagnon, datés par leur copie sur le disque, qui
change d'une worktree, d'un clone ou du dossier de l'app à l'autre). Les lectures
sont répétées jusqu'à deux passes identiques de suite (un module peut finir ses écritures en base après la lecture
des journaux) ; les scénarios (création d'une route, puis ce qu'on relit) passent une seule fois, à la fin. Un module
du serveur sans point de rejeu, une écriture hors scénario, une ligne d'erreur du serveur, une réponse 500 ou des
réponses qui ne se stabilisent pas en une minute font échouer l'étape.

Après un changement voulu : `CONTROLE_UPDATE=1 npm run controle -- --etape=rejeu` réécrit les attendus (refusé si une
vérification échoue), puis **relis** `git diff scripts/controle/attendu` avant de valider : un attendu faux rend le
contrôle inutile. Les vérifications écrites en dur (`scripts/controle/rejeu/verifications.mjs`) ne se regénèrent pas :
boucles de référence du cahier des charges (74 591 507 cr, 2 053 mérites, 14,0 min ; 78 548 150 cr, 2 176 mérites,
12,7 min), 0 mérite pour les 1 184 t d'iridium vendues à Synuefe GA-I b57-6 le 31 oct., rangs d'ingénieur des
1er et 5 nov. (G3 en 5 applications au rang 3, 12 G1 pour passer au rang 3, rang immobile à distance, aucun écart avec
la table), commandant anonymisé partout.

Les scénarios (`scripts/controle/rejeu/scenarios.mjs`) non plus : une séance rejouée en direct après une préparation
par l'API (option `avantJournaux` du serveur isolé), puis vérifiée en dur. Aujourd'hui : le Type-11 de la séance de
minage Rhino reçoit le rôle principal Minage Rhino ; l'overlay du banc étant coupé, la bascule doit devenir la
proposition « rôle principal de « Type-11 Prospector » : l'overlay est coupé… », sans avis de bascule ni mode ouvert, et
les activités hors rôle de la séance (raffinage, capsule) restent discrètes.

### Pages et fenêtres

L'étape `75-pages` compile l'interface de la worktree dans un dossier temporaire et la sert avec `vite preview`, avec
**le même proxy `/api`** que `client/vite.config.js`, dirigé vers un serveur isolé (`scripts/controle/banc/client.mjs`).
Elle l'ouvre dans Chrome sans fenêtre (`scripts/controle/banc/chrome.mjs` : profil temporaire, port de débogage choisi
par Chrome, pilotage par le protocole DevTools, sans dépendance). Ce Chrome n'est jamais le tien : profil à part, effacé
à la fin ; il ne sort pas de ce PC (tout ce qui ne va pas vers 127.0.0.1 passe par un proxy mort, et l'étape signale
la tentative). Son horloge part de l'heure figée du serveur, en fuseau Europe/Paris et en français.

Quatre passes, chacune sur son serveur isolé :

1. **séances rejouées** : le serveur a relu les journaux de **toutes** les séances de référence, dans l'ordre, comme
   l'historique d'un même commandant, et une route a été créée (comme au rejeu) ;
2. **sans journal** : premier lancement, chaque page doit montrer son état vide ;
3. **toutes les fenêtres ensemble** : toutes les fenêtres de l'overlay ouvertes en même temps dans une seule session
   (comme les fenêtres d'Electron, qui partagent leurs connexions), sur un serveur sans journal ; puis la séance du
   minage Rhino s'écrit pendant qu'elles sont ouvertes. Chacune montre son état vide, puis suit la séance sans être
   rechargée, et peut encore interroger le serveur à la fin ;
4. **parcours en direct** (`EN_DIRECT`) : l'accueil ouvert sur un serveur sans journal, et des séances écrites pendant
   qu'il est ouvert, entre des clics. La mort en SRV du 29 oct. fait proposer le Minage Rhino avec « Retenir comme rôle
   de ce vaisseau » et « Ouvrir la page » (overlay coupé) ; menu « Mode de jeu », « ⚑ Rôle » ; puis le minage Rhino du
   7 nov. change le vaisseau pendant que l'éditeur est ouvert : il doit se refermer, sans jamais garder le brouillon du
   Panther pour le Type-11. Rien n'est enregistré.

Les deux premières ouvrent chaque page des modules clients (et leurs sous-pages, déclarées par leurs `<Route>`), les
pages du cœur (accueil, paramètres, page inconnue), chaque onglet listé, et chaque fenêtre `/hud/<page>` (liste tirée
des modules clients : `Hud`, `hudPages` et `hudExtras`), deux fois : avec le pont de l'overlay simulé (`scripts/controle/pages/pont.mjs`,
mêmes fonctions que `overlay/preload.js`, comme dans le jeu), puis dans un navigateur ordinaire. Les routes à paramètre
sont ouvertes par un parcours d'utilisateur (« Build depuis ce vaisseau », nom tapé au clavier, « Enregistrer le
build » ; « Créer un plan » puis « Modifier le plan », « Tout en G5 », « Calculer » et le Dashboard, où le coût des rangs d'ingénieur doit
paraître ; « 📍 Marquer ici »…), joué à la fin, quand toutes les lectures sont faites, ou par une adresse qui n'existe
pas encore (« Build introuvable. »).

Une page échoue si elle lance une exception, écrit une erreur dans la console, reçoit une réponse ≥ 400 qui n'est pas
prévue dans ses attendus, appelle l'extérieur, **écrit quelque chose à sa seule ouverture**, affiche `NaN`,
`undefined`, `[object Object]`, `Invalid Date` ou « Erreur interne du serveur », reste blanche, ou ne montre pas ses
éléments clés : titre, onglet actif, voyant « Connecté au serveur », texte d'état vide ou valeurs des séances (les
boucles de référence 74 591 507 cr et 78 548 150 cr sur la page de la route, par exemple). Une ligne d'erreur du
serveur isolé fait aussi échouer.

Les attendus sont dans `scripts/controle/pages/attendus.mjs`. Une page, une sous-page ou une fenêtre ajoutée sans
attendu arrête l'étape (elle ne serait jamais ouverte), comme un attendu sans page ; une fonction ajoutée au pont de
l'overlay sans réponse simulée aussi, comme un écart entre les modes déclarés (`server/src/core/modes.js`) et les modules
clients (`concordanceModes` : un module par mode, sa page, `modeInfo`, fenêtres = HUD puis `hudPages`). Le menu « Mode de
jeu » (vaisseau actuel et son rôle) et l'éditeur « ⚑ Rôle » (accueil, Mes vaisseaux de l'ingénierie et du constructeur)
sont ouverts comme des onglets, sans rien enregistrer ; un attendu peut aussi exiger un style calculé (`styles` :
l'éditeur de rôle aligné à gauche partout, Constructeur compris, où il est rendu dans une cellule alignée à droite). Les captures (PNG, avec le texte lu à côté) restent pour revue dans le dossier
des journaux du contrôle, `%TEMP%\elite-controle-<date>\75-pages\` (un sous-dossier par passe, les temps de chaque
page, la sortie des serveurs), effacé au bout de deux jours comme le reste.

Chrome est cherché dans Program Files, puis dans AppData ; `CONTROLE_CHROME` donne un autre chemin. Sans Chrome,
l'étape échoue, sauf `CONTROLE_SANS_CHROME=1` (étape sautée : le contrôle n'est alors pas vert). Le serveur isolé
accepte l'origine de cette interface grâce à `ELITE_UI_PORT` (ci-dessous). Environ 75 s.

### Overlay dans le vrai Electron

L'étape `26-overlay` fait trois choses (`scripts/controle/electron/`, détail dans `26-overlay.log`) :

1. **Version d'Electron** (`version.mjs`) : le calendrier officiel est recopié dans le fichier (relevé le 9 nov. 2026 ;
   au-delà, estimé à une version majeure toutes les 8 semaines, chacune suivie jusqu'à la sortie de la troisième
   suivante). Une version qui n'a plus de correctifs de sécurité fait échouer l'étape, sauf si sa mise à jour est
   déclarée **en attente** (`ATTENTES`) : l'étape passe alors avec un avertissement, à chaque contrôle. Mise à jour
   faite le 9 nov. 2026 (étape M2) : Electron 33.4.11 (hors suivi depuis le 28 avril 2025) remplacé par **Electron
   45.2.3** (suivi jusqu'au 27 avril 2027), et Vite 5.4.21 par Vite 7.3.8, puis **Vite 8.3.7** (même jour, avec React 19 et react-router 7) (`scripts/controle/vite/version.mjs`,
   même règle), plus aucune attente. Une prochaine mise à jour se fait de même, par `npm install` dans l'app principale avec `CHECKPOINT_DISABLE=1` (voir
   Installation ; jamais depuis une worktree, dont `node_modules` est un lien vers l'app), en changeant
   `overlay/package.json` (`"electron": "^45…"`) et
   `allowScripts` du `package.json` racine. L'étape échoue aussi si ces deux-là ne suivent pas la version installée, et
   si l'attente n'est pas retirée une fois la mise à jour faite. À vérifier à ce moment-là : depuis Electron 35, les
   arguments de `console-message` sont dépréciés (`main.js` lit déjà les deux formes) ; en 45, les scripts de préchargement
   isolés ne chargent plus que `electron` (`overlay/preload.js` n'utilise que lui).
2. **Gardes dans le vrai Electron** (`essai.mjs`, `entree.cjs`) : le vrai `overlay/main.js` et le vrai preload, avec
   une page de sonde servie par le banc qui fait ce que ferait une page piégée : demander micro, caméra, notifications
   et presse-papiers, lister les périphériques, appeler un autre port de ce PC (fetch, image, WebSocket), ouvrir un
   cadre qui navigue puis va vers `mailto:`, partir vers une autre page, demander d'elle-même au pont une photo, une
   copie, le clavier et toute la hauteur de l'écran ; puis se recharger. L'essai joue aussi une fenêtre fermée puis
   rouverte dans le même instant et deux ordres du serveur qui se croisent. Sur ce PC, rien n'est affiché ni pris :
   dossier de données temporaire (jamais celui de ton overlay), fenêtres jamais affichées, aucun raccourci global,
   aucune photo de l'écran, presse-papiers intact, et chaque demande de permission est notée puis **toujours refusée**
   (c'est la réponse de `main.js` qui est jugée : rien ne s'ouvre, même si la garde manquait). Sur l'overlay d'avant ces
   gardes, l'essai relève 15 écarts sur 19 constats.
3. **Port de l'interface** (`port.mjs`) : le vrai `client/vite.config.js`, serveur de développement de Vite sur un port
   du banc (jamais 5173). Un autre programme tient déjà `127.0.0.1:<port>` : Vite doit refuser de démarrer ; port
   libre : il doit écouter sur `127.0.0.1` seulement.

Electron manquant : l'étape échoue (`npm install` dans l'app principale). Une quinzaine de secondes.

### Attaques contre l'API locale

L'étape `80-attaques` est un test de non-régression **défensif** : elle ne vise que le serveur isolé du banc
(127.0.0.1, port temporaire, données et options temporaires) et l'interface du banc reliée à lui. Les routes viennent
du serveur lui-même (par le canal IPC, `server/src/core/routeList.js`) : une route ajoutée est attaquée d'office, et
une route que le banc ne saurait pas remplir arrête l'étape. Chaque cas a son résultat attendu ; tout écart échoue.

| Famille | Résultat attendu |
|---|---|
| `Host` étranger (dont `[::1]`, `localhost.`, `127.0.0.1.nip.io`), `Origin` étranger ou `null`, `Sec-Fetch-Site: cross-site` | refus 403 de la garde, sur chaque route (à travers l'interface : Vite refuse lui-même un `Host` étranger) |
| `Sec-Fetch-Site: same-site` sans `Origin` (balise `<img>` d'une page d'un autre port de ce PC), avec `?online=1` sur chaque lecture, en direct et à travers le proxy de l'interface | refus 403 de la garde (« autre programme de ce PC »), sur chaque route ; aucune recherche au clic de Mes repères (sonde) |
| `Sec-Fetch-Site: none` (adresse tapée, lien ouvert depuis Discord) avec `?online=1`, sur chaque lecture | lecture permise, jamais d'erreur 500 ; aucune recherche au clic de Mes repères (sonde) ; une écriture sans l'en-tête reste refusée |
| écriture sans `X-Elite-Compagnon: 1` (valeur fausse, en-tête répété, méthode inconnue) | refus 403, sur chaque route d'écriture |
| corps trop gros (limite + 1 Ko, gzip qui gonfle, 100 Go annoncés), JSON invalide, encodage inconnu | 413, 400 ou 415 avec la raison |
| chemins piégés (`../`, `%2e%2e`, `\`, chemin absolu ou réseau, noms réservés de Windows, octet nul, flux NTFS), clés `__proto__` / `constructor` / `toString`, identifiants hors bornes, dans chaque paramètre | 400 avec la raison ou 404, jamais accepté ; aucun fichier créé |
| corps et requêtes piégés (champs relevés dans le code de chaque module) | jamais d'erreur 500, prototypes intacts |
| packs d'avatar piégés (SVG, faux PNG, plus de 4 Mo, 30 000 px, jonction, lien dur, chemin dans `pack.json`) | pack inutilisable avec sa raison, image jamais servie |
| XML des couleurs piégé (`DOCTYPE`, entité, plus de 1 Mo, pas en UTF-8), matrice NaN ou hors bornes, écriture sans confirmation | 409 ou 400, fichier inchangé, aucune sauvegarde (dans le dossier d'options **temporaire** ; celui du jeu est seulement relu, pour vérifier qu'il n'a pas bougé) |
| couleurs écrites avec 10 copies de l'app au nom plus tardif que l'heure actuelle (horloge qui a reculé : heure d'hiver, heure corrigée) | la copie annoncée existe et contient le fichier d'avant l'écriture ; 10 copies de l'app au plus (dossier temporaire) |
| nom de build piégé (`@everyone`, `@here`, `<@&rôle>`, lien masqué vers une autre adresse), texte « Copier pour Discord » du constructeur | ni mention, ni rôle, ni autre lien masqué que celui d'EDSY fait par l'app |
| image de vaisseau ou capture qui n'est pas une vraie image, vaisseau « nul », « com1 », « __proto__ » | 400, rien d'écrit |
| recherches en ligne de Mes repères sans choix du joueur (prospection et prix du système, réglage par défaut) ; lecture avec `?online=1` (adresse valide, autre adresse, sans adresse ; sans en-tête, lien `none`, image `same-site`, boucle de 20 images) ; clic sans l'en-tête ; second clic dans les 30 s ; dix clics du même instant ; SystemAddress piégé (`../../api/…`, `1?jsonp=a#`, `%2e%2e`) dans `/survey`, `/survey/load`, `/survey/site`, `/survey/body` | aucune tentative vers Spansh ni Ardent (canal `elite-compagnon:net`, relevé par la sonde) ; image d'un autre port : 403 ; au clic (`POST /survey/load`, `POST /sweep/markets/load`), une seule, à l'adresse exacte (`https://spansh.co.uk/api/dump/<entier>`, imports du système chez Ardent) ; second clic : 429 avec le délai, rien demandé ; dix clics : une seule tentative ; adresse piégée : 400 avec la raison, rien demandé |
| flux temps réel : un client TCP qui ne lit plus pendant que le journal reçoit de gros événements (16 Mo au plus) ; 40 connexions ouvertes sans fin | le client muet est coupé (« un client ne lit plus » dans la sortie), sa connexion fermée, l'écoute du banc reçoit tout ; au-delà de 32 connexions, 503 avec la raison, puis de nouveau 200 une fois les places libérées |
| `PUT /api/overlay` mal formé (pages qui ne sont pas une liste, plus de 16, page ou mode qui n'est pas un identifiant, `glance` qui n'est pas un booléen), overlay coupé | 400 avec la raison (la demande est vérifiée avant de savoir si l'overlay est là), jamais 500 ; une demande bien formée : 409 (overlay coupé) |
| écriture ratée dans une minuterie : `sweep.json` et `last-mining.json` en lecture seule, puis le SRV roule sur la planète du balayage et raffine une tonne | le serveur répond encore après les deux écritures différées ; chaque échec est écrit dans sa sortie (« Balayage : non enregistré », « Dernier coin de minage : non enregistré ») ; fichiers inchangés ; aucune « Erreur imprévue » |
| journal piégé : dans le journal suivi, en un seul lot, un `Loadout` sans `ShipID` (puis avec un `ShipID` texte, et deux vaisseaux valides aux modules qui ne sont pas une liste d'objets), des lignes `null`, `[1,2,3]` et `42`, un `StoredShips` abîmé, puis un saut et un amarrage ordinaires ; puis un autre serveur isolé démarré sur ce journal | le saut et l'amarrage reçus (état du jeu, derniers événements), aucune erreur du journal dans Paramètres, la flotte de l'ingénierie et « Mes vaisseaux » du constructeur lisibles (200), aucune « Erreur imprévue » ni module en échec dans la console ; l'autre serveur démarre et lit le journal jusqu'au bout |
| profil de commandes partagé piégé (`OptionsBindings` du banc) : XML valide de 490 Ko avec 40 000 « `<Root ` » dans un commentaire et des `PresetName`/`Device` de 25 000 « `&amp;` », plus un fichier de 600 Ko de « `<Root` » | `GET /api/modules/bindings/status` et un `GET /api/state` lancé pendant la lecture répondent en moins de 2 s (avant : 17 s et plus, tout le serveur figé), aucune « Erreur imprévue » |
| jeton d'escadron | jamais dans une réponse, le flux temps réel, la sortie du serveur ni un autre fichier que le sien |
| toutes les réponses | ni `X-Powered-By`, ni en-tête CORS, `sandbox` et `nosniff` sur chaque image, jamais « Erreur interne » pour un refus |

Les charges sont minimales et inertes (un `<script>` vide dans un SVG, une seule entité interne déclarée, aucune
adresse externe). Le serveur isolé est lancé avec la **sonde** (`scripts/controle/banc/sonde.mjs`) : toute
connexion hors de ce PC, tout programme lancé, toute lecture ou écriture hors du dossier du banc est refusé et relevé,
et l'étape échoue s'il y en a eu un seul. Après chaque groupe de refus, les fichiers et les lignes de la base sont
comparés : un refus n'écrit rien. Détail par famille dans `80-attaques.log`, écarts triables dans
`80-attaques-ecarts.json` (dossier des journaux du contrôle). Environ 30 s.

### Un module en panne n'aveugle pas les autres

Le lecteur de journaux publie chaque événement à chaque module dans son propre `try/catch`
(`server/src/core/journalService.js`, `emit`) : une exception dans un module est écrite dans la console (« Journal : un
module a échoué sur l'événement … »), et les autres modules reçoivent quand même l'événement, puis les lignes suivantes
du même lot. Avant, elle faisait perdre l'événement aux modules suivants et le reste du lot à tous (une vente absente
des boucles ou des mérites), sans rien dans la console ; dans un écouteur « ready », le serveur ne démarrait plus.
Une même erreur n'est écrite qu'une fois par minute au plus, avec le nombre de répétitions : un module qui échoue sur
chaque `Status.json` ne noie pas la console. Une ligne JSON qui n'est pas un objet (`null`, un nombre, un tableau) est
ignorée ; une erreur de lecture d'un tour s'efface au tour réussi suivant (elle restait affichée dans Paramètres) ; un
journal illisible au démarrage est passé, signalé et réessayé toutes les 10 s (voir « Lecture des journaux »). La flotte de l'ingénierie ignore un `Loadout` ou un vaisseau sans
`ShipID` entier : un seul suffisait à empêcher le serveur de démarrer tant que ce journal existait. L'état du jeu
(`core/gameState.js`) et le constructeur de builds (« Mes vaisseaux », `/fleet`) ignorent de même des modules qui ne
sont pas une liste d'objets (avant : une exception à chaque tel `Loadout`, et `/fleet` en erreur 500). Tests :
`journalIsolation.test.js`, `gameState.test.js`, `builder.test.js` ; étape `80-attaques` : « journal piégé ».

### Mémoire au démarrage

Au démarrage, le serveur relit tous les journaux (le jeu n'en efface jamais) pour reconstruire l'état de chaque module.
Un joueur de longue date peut en avoir des centaines de Mo, voire plusieurs Go.

- L'historique (`server/src/core/journalService.js`) est lu sans bloquer le serveur, par morceaux d'environ 1 Mo
  (`MORCEAU_OCTETS`), avec une pause entre deux morceaux. Il est remis aux modules une fois (« ready »), un module par
  tour, puis libéré : le gel restant est celui du module le plus lourd, pas la somme de tous. Une fois tous les
  modules passés, l'événement « pret » part, et `journal.ready` (`GET /api/state`) passe à vrai : aucune page ne lit
  l'état d'un module pas encore servi. Un changement de dossier pendant la lecture l'abandonne : un seul « ready »,
  celui du dernier dossier. Avant,
  la minuterie du suivi en direct le gardait par son contexte jusqu'à l'arrêt du serveur : environ 1,4 Mo de mémoire
  par Mo de journaux, sans plafond (avec moins de mémoire sur le PC, le serveur s'arrêtait à chaque lancement).
- Les modules gardent ce qu'ils en tirent, plus les événements entiers : le suivi des routes tient sa chronologie au fil
  du journal (`TimelineBuilder`, `modules/routes/services/timeline.js`), l'ingénierie sa flotte (`Fleet`, le dernier
  Loadout de chaque vaisseau), Mes repères des formes réduites pour rejouer une session de minage (`sessionEvent`,
  `modules/waypoints/mining.js` : nom, heure et les quelques champs lus).
- Un module peut demander de ne garder dans l'historique que ce qui lui sert (`journal.addInterest(noms, { history })`) :
  le dernier événement utile (`{ last: true, useful }`, le casier du Coup d'œil) ou ceux qui suivent le dernier saut
  (`{ since: [...] }`, les signaux du système actuel). Les autres sont lâchés pendant la lecture. Un type demandé par
  deux modules suit la règle la plus large. En direct, tout arrive toujours à tous.

Mesuré sur les séances de référence recopiées (serveur isolé, après un ramasse-miettes complet) : 367 Mo de journaux
gardent 81 Mo (contre 514 Mo avant) et démarrent sous un tas de 350 Mo (450 Mo n'y suffisaient pas avant). Sur dix
copies de vrais journaux (326 Mo, 9 nov. 2026) : 57 Mo gardés une fois prêt (contre 382 Mo), démarrage sous un tas de
300 Mo (il en fallait plus de 350).

Ce qui reste : pendant la lecture seulement, l'historique des événements que les modules relisent en entier (sauts,
`Loadout`, cibles, tonnes raffinées…), environ 0,8 à 0,9 Mo de mémoire par Mo de journaux au plus fort du démarrage.
Le seuil où le serveur manquerait de mémoire au lancement recule donc d'environ un tiers, sans disparaître (estimations
à partir de ces mesures) : vers 4,5 Go de journaux avec la limite de Node d'un PC bien doté (environ 4,3 Go de tas),
vers 2,2 Go avec 8 Go de mémoire (environ 2 Go de tas) ; avant, vers 3,5 et 1,7 Go. Le supprimer demande que chaque
module lise l'historique au fil des journaux au lieu d'une liste remise d'un coup. L'étape `72-memoire` vérifie à
chaque contrôle le démarrage sous un tas plafonné et la mémoire gardée.

### Base de données réelle

L'étape `85-base` contrôle **ta** base (`CONTROLE_BASE_REELLE` s'il est réglé, sinon celle de l'app de bureau, sinon
`server/data/elite.db` de l'app principale ; chemin et date de la base contrôlée dans le rapport) sans y toucher :
elle la lit octet pour octet (avec ses fichiers `-journal` et `-wal` s'il y en a ; jamais ouverte par SQLite là où
elle est), recommence si elle a bougé pendant la copie, vérifie la copie (`PRAGMA quick_check`), y applique la mise à
jour de l'app (`server/dbPush.mjs` : reprise d'une base d'avant les migrations, puis les migrations ; une migration qui
échoue remet la base d'avant et c'est une erreur), démarre le
serveur isolé dessus (sonde chargée, sans journaux), lit toutes les routes de lecture et la fiche de chaque ligne des
listes, puis recompte les lignes : chaque table doit avoir exactement les mêmes (la table de suivi des migrations,
`_prisma_migrations`, arrive avec une ligne par migration). Ce que la sonde relève sans que ce soit une faute est nommé
dans `lectureAttendue` : le Moniteur PC qui lit la carte graphique et la mémoire du jeu (`nvidia-smi`, `tasklist`), et
l'IA de bord qui regarde si ses outils de voix sont installés. La copie est effacée à la fin. Sans
base sur ce PC, l'étape est sautée avec un avertissement (le contrôle n'est pas vert). Quelques secondes.

### Base de données : migrations

Le schéma est dans `server/prisma/schema` (un fichier par module). Les changements de la base sont des **migrations
versionnées**, dans `server/prisma/migrations` : `0001_initial` (le schéma de départ), puis une par version de l'app
qui change le schéma. Au lancement, `server/dbPush.mjs` :

- ne fait rien si ni le schéma ni les migrations n'ont changé (empreinte notée dans `elite.db.schema`) ;
- sinon copie d'abord la base (`elite.db.avant-schema-<date>`, les 3 dernières gardées), puis applique les migrations
  pas encore appliquées (`prisma migrate deploy`). Une migration qui échoue remet la base d'avant, et un message dit
  quoi faire ;
- une base d'avant les migrations (créée par `prisma db push`, sans table `_prisma_migrations`) est d'abord calée
  exactement sur `0001_initial` (rien à faire pour une base de la version d'avant), marquée appliquée, puis les
  suivantes sont appliquées comme pour tout le monde.

Migrations : `0001_initial` (schéma de départ) ; `0002_commandant_des_vaisseaux` (colonne `commanderId` sur
`ShipNickname`, `EngineeringPlan` et `Build` ; `ShipNickname` passe à la clé `(commanderId, shipId)`). Les lignes
d'avant gardent leurs données avec `commanderId` vide, puis l'app les rattache au commandant le plus vu dans les
journaux dès que l'historique est relu.

Pourquoi : `db push` refusait tout changement qui aurait perdu des données (colonne obligatoire ajoutée, colonne
renommée…), et l'app restait bloquée chez le joueur. Une migration, elle, peut transformer les données (remplir une
nouvelle colonne, recopier l'ancienne) avant de changer la structure.

Pour le développeur, après un changement du schéma :

```powershell
cd server
node dbPush.mjs --nouvelle-migration "colonne rôle ajoutée"
```

écrit `prisma/migrations/0002_colonne_role_ajoutee/migration.sql` (le SQL qui mène des migrations existantes au
schéma). Relis-le et complète-le si des données doivent suivre. `dbPush.test.mjs` vérifie que les migrations mènent
exactement au schéma : un changement du schéma sans sa migration fait échouer les tests.

### Vaisseau d'un autre commandant

À bord du vaisseau d'un autre joueur (équipage multijoueur, ou ton SRV rentré dans son hangar), le jeu écrit dans ton
journal le `Loadout` de son vaisseau, avec son numéro et son immatriculation. Le lecteur des journaux l'écarte à la
source (`server/src/core/autrui.js`), de l'historique comme du direct : aucun module ne le voit, il n'entre ni dans la
flotte, ni dans l'état du jeu, ni dans le rachat. Il est reconnu à sa forme (ni `HullValue` ni `ModulesValue`, `Rebuy`
à 0) ou à la situation (du `JoinACrew` ou de l'`Embark` `Multicrew` jusqu'au retour dans ton vaisseau).

### Plusieurs commandants sur le même PC

Le ShipID du jeu n'est unique que pour un commandant : le vaisseau n° 1 d'un second compte n'est pas celui du compte
principal. Le cœur (`server/src/core/commander.js`) suit le commandant chargé, par le FID du `LoadGame` ou du
`Commander`, sinon par son nom. Le lecteur des journaux le note sur chaque événement, sans jamais l'écrire ni l'envoyer :
aucun FID dans l'interface ni dans l'API. Tout ce qui est rangé par vaisseau l'est par (commandant, ShipID) :

- rôles (`ship-roles.json` version 2, par commandant) ;
- noms donnés aux vaisseaux ;
- plans d'ingénierie ;
- builds liés à un vaisseau ;
- Loadout du constructeur et flotte de l'ingénierie ;
- nom du vaisseau du Coup d'œil ;
- consommation de carburant.

Un autre commandant compte toujours comme un changement de vaisseau ; le ménage « vaisseau vendu, numéro repris » ne
touche jamais le vaisseau d'un autre commandant. Les données d'avant cette version (sans commandant) sont rattachées
au commandant le plus vu dans les journaux, ou au seul. Un rôle rattaché ainsi est marqué « rattaché d'office » : il ne
s'applique pas à un vaisseau d'un autre modèle, mais n'est jamais effacé pour cette raison. Tant qu'aucun commandant
n'est connu, ou qu'un seul l'est, une donnée sans commandant vaut pour lui. L'inventaire des matériaux et les rangs
des ingénieurs ne sont pas rangés par commandant : ils se recalent à chaque connexion.

### Dossiers et réseau

Les dossiers sont décidés à un seul endroit, `server/src/core/paths.js` ; sans variable, rien ne change :

| Variable | Défaut |
|---|---|
| `ELITE_DATA_DIR` | `server/data` (fichiers des modules, captures, images, données de référence, base `elite.db`) |
| `ELITE_JOURNAL_DIR` | le dossier réglé dans Paramètres (au premier lancement : `Saved Games\Frontier Developments\Elite Dangerous`) ; la variable passe avant le réglage |
| `ELITE_GAME_OPTIONS_DIR` | `%LOCALAPPDATA%\Frontier Developments\Elite Dangerous\Options` (`Bindings` et `Graphics` en dessous) |

Une valeur doit être un chemin absolu de ce PC : relatif, réseau ou de périphérique, le serveur refuse de démarrer.
L'app de bureau range ses données dans `%APPDATA%\Elite Compagnon\donnees`. `server/dbPush.mjs` met à jour la base du
dossier des données (`ELITE_DATA_DIR`, sinon `server/data`) ; tout code du dépôt qui lance la CLI de Prisma doit
couper sa télémétrie (`PRISMA_ENV`), et `depot.test.mjs` le vérifie. Le serveur écoute sur `ELITE_PORT` s'il est réglé (1024 à 65535), sinon sur 3001. Il n'accepte que
l'origine de l'interface du port 5173, ou celle du port `ELITE_UI_PORT` s'il est réglé (l'interface du banc, ouverte
dans Chrome sans fenêtre) : une seule à la fois, celle du 5173 est alors refusée comme les autres.

Chaque fichier de `server/data` est écrit d'un coup par `server/src/core/atomic.js` (copie CommonJS pour l'overlay,
`overlay/atomic.js`) : fichier temporaire unique à côté, écriture, `fsync`, puis renommage par-dessus l'ancien, réessayé
si un antivirus tient le fichier un instant, jamais une écriture en place. Un serveur tué en pleine écriture (relance de
`dev.js`, fenêtre « EliteApp serveur » fermée, coupure de courant) laisse l'ancienne version entière. Un fichier
illisible au lancement est mis de côté sous `<nom>.illisible-<date>`, avec un avertissement, au lieu d'être écrasé à la
prochaine écriture. Un fichier verrouillé à la lecture est relu plusieurs fois. S'il reste illisible, une copie de
l'ancien fichier est gardée sous `<nom>.non-relu-<date>` avant la prochaine écriture : tes réglages d'avant y restent.
L'original garde son nom jusqu'au renommage final : si l'écriture échoue, il est relu au lancement suivant. Un test (`atomic.test.js`) refuse toute autre écriture de fichier dans le code du serveur, sauf
quelques exceptions nommées avec leur raison. Les captures de Mes repères (`server/data/captures/`) : l'image n'est
écrite qu'une fois le texte lu et la base à jour, juste avant la liste ; au lancement et après chaque capture, le
dossier est rapproché de la liste (`capturesStore.js`) : une image sans entrée y revient sans texte lu, une entrée sans
image en sort, et la limite de 30 vaut pour toutes les images.

Tout appel sortant passe par une passerelle unique, `server/src/core/net.js` : liste blanche explicite des hôtes
(`api.ardent-insight.com`, `spansh.co.uk`, `api.github.com`, `raw.githubusercontent.com`, le Worker du Squadron
Tracker, `api.cloudflare.com` et `discord.com` pour le côté gestion de l'escadron, seulement quand on y colle une clé),
en https sur le port 443 seulement. Deux hôtes peuvent s'y ajouter, par un réglage du joueur : le serveur de son
escadron, et celui qu'il gère (module Escadron, `setUserHost`). Ce doit être un nom public, jamais une adresse IP, `localhost` ni un nom
local (`.local`, `.lan`, `.home`…) ; délai maximal de 60 s ; réponse limitée à 16 Mo ; redirections suivies
une à une et revérifiées (le jeton de l'escadron ne suit jamais une redirection). Un hôte hors liste est refusé avec
une erreur claire, et `ELITE_NO_NETWORK=1` refuse tout. Aucun module n'appelle `fetch` lui-même (un test le vérifie) ;
le seul appel du serveur à lui-même (prix archivés par le module Routes, lus par Mes repères) passe par `localFetch`,
limité à `127.0.0.1`. Chaque tentative, refusée ou non, est annoncée avec son adresse exacte sur le canal de
diagnostic `elite-compagnon:net` (`node:diagnostics_channel`, sans effet sans abonné) : la sonde du banc la relève, si
bien que `npm run controle` voit ce que le serveur aurait demandé même réseau coupé (étape « attaques » : aucune
recherche en ligne sans choix du joueur, jamais un SystemAddress piégé vers Spansh).

## Structure

La notice : `README.md` (installation, lancement, premiers pas, sommaire) et un fichier par sujet dans `docs/`.

Interface : chaque page, chaque fenêtre en jeu et chaque bandeau d'un module est chargé quand il sert (`lazy` dans
`client/src/modules/<module>/index.js`, `Suspense` dans `App.jsx`) ; une fenêtre en jeu ne lit que le cadre commun et
son propre fichier, sans texte d'attente au-dessus du jeu.

```
docs/                  la notice, un fichier par sujet (sommaire dans README.md)
client/                React + Vite
  src/core/            cadre, accueil, paramètres, temps réel (une connexion partagée par toutes les pages et
                       fenêtres : stream.js, streamWorker.js), HUD de session (commun), textes du jeu en
                       français propre (text.js, jumeau de celui du serveur), bandeau de la langue du jeu, menu
                       « Mode de jeu » (ModeMenu.jsx), modes de jeu (modes.js : la déclaration du serveur, reprise
                       telle quelle), noms et rôles des vaisseaux (ShipNickname.jsx, ShipRole.jsx, shipRole.js,
                       useShips.js)
  src/modules/routes/  module « Mes routes commerciales »
  src/modules/vaisseaux/   module « Mes vaisseaux » : la flotte (cartes des vaisseaux, lues par l’API de l’ingénierie)
  src/modules/engineering/  module « Ingénierie » (tableau de bord, nouveau plan, ingénieurs, matériaux, rangs…)
  src/modules/builder/ module « Constructeur de builds »
  src/modules/waypoints/ module « Mes repères » (et le mode Minage Rhino : balayage, foreuses, boussole)
  src/modules/shipmining/ mode « Minage vaisseau »
  src/modules/systems/ module « Systèmes importants »
  src/modules/expansion/ module « Projet extension », avec les onglets Historique des mérites, Mérites à la vente,
                       Mérites par heure, Routes d'extension, Calculateur de routes et Où agir cette semaine
  src/modules/regles/  module « Règles du jeu » : fiches, recherche, filtres, lexique, liens /regles#identifiant
  src/modules/escadron/ module « Escadron » : capteur du Squadron Tracker, mon apport à l'escadron
  src/modules/combat/  module « Combat »
  src/modules/rescue/  module « Sauvetage »
  src/modules/materials/ mode « Matériaux »
  src/modules/colonisation/ module « Colonisation » : page, HUD et liste de courses de l'overlay, mise en forme (view.js)
  src/modules/carrier/ fenêtre en jeu du saut du porteur
  src/modules/signals/ fenêtre en jeu des signaux du système
  src/modules/navroute/ fenêtre en jeu de l'itinéraire
  src/modules/hangar/  alerte en jeu au décollage avec un hangar acheté mais sans véhicule
  src/modules/fsdcool/ fenêtre en jeu du refroidissement FSD et du « SCO prêt »
  src/modules/bindings/ module « Garde des commandes » : bandeau, fenêtre en jeu, page /commandes
  src/modules/links/   module « Applications externes »
  src/modules/glance/  module « Coup d'œil » : fenêtre, panneau, rachat, objectifs communautaires
  src/modules/hudcolours/ module « Couleurs du HUD » : aperçu SVG, préréglages, calcul des matrices
  src/modules/compagnon/ module « Compagnon » : page des réglages, fenêtre en jeu, petit compagnon de l'app
overlay/               Electron : overlay transparent par-dessus le jeu (pages /hud/...) ; place.js : place par
                       défaut des fenêtres, sans qu'elles se couvrent ; guards.js : adresse de l'interface, requêtes,
                       navigations et fonctions du pont permises ; closed.js : avis « overlay quitté » envoyé au
                       serveur à Alt+Maj+Q, gardé si le serveur est arrêté et transmis au lancement suivant
                       (tests : npm test -w overlay)
desktop/               app de bureau « Enova » (Electron de l'overlay) : main.js lance la base, le serveur
                       et l'interface (interface.mjs : compilée si besoin, vite preview sur 127.0.0.1:5173), fenêtre
                       principale, pages détachées, barre de menu, zone de notification ; donnees.js : copie unique
                       de server/data dans %APPDATA% ; etat.js : bascule et places ; sites.js : sites externes
                       (Inara) et leur sécurité ; pages/ : chargement
                       (tests : npm test --prefix desktop)
server/                Node.js + Express
  prisma/schema/       schéma commun + un fichier par module
  src/core/            lecteur de journaux, état du jeu, temps réel (SSE), paramètres, noms des vaisseaux, garde de l'API
                       locale, textes du jeu en français propre (text.js), langue du jeu (language.js), dossiers de
                       l'app (paths.js), passerelle réseau unique (net.js), fichiers JSON écrits d'un coup
                       (jsonFile.js), minuteries (timers.js), modes de jeu et rôles (modes.js, seule déclaration,
                       partagée avec l'interface), proposition de mode (modeGuess.js), rôles des vaisseaux
                       (shipRoles.js), vaisseau actuel et embarquement (boarding.js), bascule vers le rôle principal
                       (roleSwitch.js) et son API (shipRoutes.js), silences des propositions gardés d'un démarrage à
                       l'autre (silences.js), overlay (overlay.js)
  src/core/reference/  données de référence partagées : téléchargement, coriolis-data, format EDSY (liens,
                       lecture d'eddb.js comme une donnée, sans exécution : jsLiteral.js)
  src/modules/routes/  module Routes : détection, boucles, calculs, API, tests
  src/modules/engineering/  module Ingénierie : flotte, inventaire, calcul des matériaux, rangs des ingénieurs
                       (table des règles rankRules.js, mesures du journal ranks.js), itinéraire d'ingénierie
                       (règles itineraryRules.js, calcul route.js et routeSolver.js, épingles pins.js, plans validés
                       validation.js, magasins JSON jsonStore.js) et données publiques des ingénieurs (data/engineers.json)
  src/modules/builder/ module Constructeur : statistiques (formulas.js, attributes.js), builds, comparaison, tests,
                       photographie de vérification (__golden__)
  src/modules/planner/ module Calculateur : client Ardent Insight, calcul des routes, tests
  src/modules/waypoints/ module Mes repères : position, guidage, balayage, foreuses du Rhino (drills.js), tests
  src/modules/shipmining/ mode Minage vaisseau : prospection, drones, raffinage, tests
  src/modules/systems/ module Systèmes importants : favoris, recherche Spansh, zones denses, tests
  src/modules/expansion/ module Projet extension : routes Powerplay, portée des sauts, historique des mérites, mérites
                       prévus à la vente (sale*.js, cargoLots.js), mérites par heure (rates*.js), tests
  src/modules/regles/  module Règles du jeu : référentiel des règles (regles.json), contrôle, API en lecture, tests
  src/modules/escadron/ module Escadron : envoi opt-in des mérites au Squadron Tracker (file, rattrapage),
                       écarts des Statistics d'escadron, règles datées (rules.js), tests
  src/modules/whereto/ module Où agir cette semaine (onglet du Projet extension) : recherche Spansh, règles, tâches, tests
  src/modules/combat/  module Combat : kills, primes, mérites de la session, tests
  src/modules/rescue/  module Sauvetage : récupérations, livraisons, mérites de la session, tests
  src/modules/materials/ mode Matériaux : matériaux récupérés pendant la session, tests
  src/modules/gardiens/      technologie des Gardiens : recettes de déblocage, structures connues, plan du joueur, tests
  src/modules/rares/         mode Commerce de rares : marchandises rares achetées et vendues, mérites, bénéfice ; catalogue
                             des rares (Spansh) et alerte de stock ; tests
  src/modules/powerdelivery/ mode Livraison Powerplay : ressources de ta puissance chargées et livrées, mérites, tests
  src/modules/colonisation/ module Colonisation : lecture des événements (events.js), chantiers (state.js), liste de
                       courses et fin estimée (plan.js), stations proches (sources.js), API, tests sur exemples
                       documentés (fixtures/examples.js)
  src/modules/carrier/ saut du porteur programmé, tests
  src/modules/signals/ signaux du système, tests
  src/modules/navroute/ itinéraire tracé, tests
  src/modules/fsdcool/ refroidissement FSD et « SCO prêt » (sco.js, mesures dans scoStore.js), tests
  src/modules/bindings/ module Garde des commandes : rapport du jeu sur les commandes (lecture seule), règles, tests
  src/modules/links/   module Applications externes : liens, modèles contextuels
  src/modules/glance/  module Coup d'œil : Powerplay, encaissements, missions, objectifs, rachat et mode de jeu,
                       objectifs communautaires
  src/modules/hudcolours/ module Couleurs du HUD : lecture et retouche ciblée du fichier d'options, sauvegardes, tests
  src/modules/compagnon/ module Compagnon : déclencheurs (triggers.js), phrases, avatars, réglages, tests
scripts/installer.mjs  npm run installer : npm ci sans télémétrie de Prisma, refusé dans une worktree liée
scripts/controle/      contrôles avant mise à jour (npm run controle)
  lancer.mjs           orchestrateur : étapes dans l'ordre, arrêt au premier échec, résumé
  outils.mjs           aides des étapes (node sans shell, suites node --test, EchecEtape)
  etapes/              une étape par fichier (NN-nom.mjs)
  banc/                serveur isolé (serveur.mjs), base neuve (base.mjs), horloge figée (figer.mjs), normalisation,
                       interface compilée et servie (client.mjs), Chrome sans fenêtre (chrome.mjs), sonde (sonde.mjs),
                       garde réseau d'un outil lancé par le banc (reseauLocal.cjs)
  electron/            overlay : version d'Electron suivie (version.mjs), essai dans le vrai Electron (essai.mjs,
                       entree.cjs), port de l'interface (port.mjs) (étape 26)
  pages/               pages et fenêtres : attendus, pont de l'overlay simulé, vérifications, déroulé (étape 75)
  attaques/            attaques défensives : routes lues dans le serveur, familles et scénarios, bilan (étape 80)
  base/                copie cohérente de la vraie base, schéma, lectures, comptes des tables (étape 85)
  anonymat/            anonymisation des journaux, secrets lus dans les vrais journaux (en mémoire seulement), fouille
                       du dépôt et de son historique (depot.mjs)
  historique.mjs       npm run controle:historique : données réelles dans l'historique git (à part du contrôle)
  seances/             séances de référence anonymisées, et leur extraction (extraire.mjs)
  rejeu/               points interrogés par module, rejeu, vérifications en dur, scénarios préparés par l'API
                       (scenarios.mjs : rôle d'un vaisseau, overlay coupé)
  attendu/             résultats attendus, un fichier par module
  options/             options du jeu de test (Bindings, Graphics)
  tests/               tests du banc lui-même
```

Ajouter un module : créer `server/src/modules/<nom>/` et `client/src/modules/<nom>/`, puis l'ajouter dans les
deux fichiers `modules/index.js`. Un module n'importe jamais le code d'un autre. Un module qui est un mode de jeu se
déclare aussi dans `server/src/core/modes.js` (nom, icône, fenêtres) et y renvoie par `mode: modeInfo('<nom>')` : il
apparaît alors dans le menu, sur l'accueil, et devient un rôle de vaisseau possible.

Les fichiers du jeu sont uniquement lus, jamais modifiés. Seule exception, voulue par le joueur : son fichier
d'options `GraphicsConfigurationOverride.xml` (module Couleurs du HUD), avec confirmation et sauvegarde.

## Tutoriels interactifs

Chaque page de la fenêtre principale peut avoir un tutoriel : il encadre un élément, explique à quoi il sert dans une
bulle, et peut attendre que le joueur clique dessus. Il se lance à la première visite de la page, se passe à tout
moment (bouton ou Échap), et se revoit dans Paramètres › Tutoriels.

- **Les textes** : `client/src/core/tutoriel/parcours.js`, un parcours par page (`id`, `titre`, `chemin`, `etapes`).
  Une étape a un `titre`, un `texte`, une `cible` (sélecteur CSS, absent pour une bulle au milieu de l'écran) et
  éventuellement `action: 'clic'`. Ajouter un tutoriel, c'est ajouter une entrée : il apparaît seul dans Paramètres.
- **Règles d'écriture** : une idée par étape, 320 caractères au plus, tutoiement, et un clic demandé seulement s'il ne
  change rien aux données du joueur (ouvrir un menu, oui ; « Marquer ici », non). Une cible absente de l'écran est
  sautée au bout de 1,5 s (étape déjà faite et repliée, bouton masqué).
- **La logique** : `moteur.js` (quel parcours pour quelle page, place du cadre, des voiles et de la bulle), testée
  seule ; `moteur.test.js` contrôle aussi tous les parcours écrits.
- **L'affichage** : `Tutoriel.jsx`. Quatre voiles sombres entourent l'élément encadré : lui seul reste cliquable.
- **Ce qui est retenu** : les tutoriels déjà vus et le lancement automatique, dans `tutoriels.json` du dossier des
  données (`server/src/core/tutoriels.js`, `GET` et `PUT /api/tutoriels`). Rien ne part du PC.
- **Banc de contrôle** : `ELITE_SANS_TUTORIEL=1` empêche tout lancement automatique pendant le tour des pages.
- **Plusieurs fichiers** : `parcours.js` garde le cadre de l'app, les repères et l'escadron, et assemble les fichiers de
  `parcours/` (un par rubrique). Une fiche dont l'adresse finit par un identifiant s'écrit avec `sousPages: true`
  (elle ne vaut que dessous) ; un onglet avec `?onglet=…` ; deux parcours de même adresse se suivent, un par visite.
- **Fenêtres en jeu** : la page `/fenetres-en-jeu/<mode>` (`FenetresEnJeu.jsx`) les montre dans la fenêtre principale,
  chacune dans un cadre, en démonstration (`core/demo.js`, « ?demo=1 ») : les lectures viennent de données fictives
  livrées (`tutoriel/demo/donnees.js`), les écritures ne font rien, le flux temps réel est coupé. Une étape vise un
  élément d'une fenêtre avec `fenetre: '<page>'`. C'est la seule page de l'app qui s'affiche dans un cadre, et
  seulement dans une page de l'app elle-même (`client/viteGuard.js`, `overlay/guards.js` : `demoFrame`).
- **Invitation** : la première fois qu'un mode est choisi, `InviteFenetres.jsx` propose d'aller voir ses fenêtres.
- **Pas couvert** : les fenêtres détachées, les fenêtres qui s'ouvrent d'elles-mêmes (itinéraire, signaux, saut du
  porteur…) et la page d'un site (Inara), dont la vue recouvre la page.
