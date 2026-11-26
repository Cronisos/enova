# Crédits et sources

Compagnon Elite est une application gratuite, non commerciale, créée par **Cronisos Lysiris**, **non affiliée à Frontier Developments**.
Elle tourne en local et n'envoie aucune donnée personnelle sur Internet. Ce qui part, et quand :

- les données de référence ci-dessous, téléchargées sur demande (GitHub) ;
- un nom de système, de station ou de marchandise et des critères de recherche, à ta demande : calculateur de routes,
  stations proches d'un chantier de colonisation, prix des minerais (Ardent Insight) ; Systèmes importants et
  « Où agir cette semaine » (Spansh) ;
- Mes repères : les planètes à EEP d'un système (Spansh, par son adresse dans le jeu) et les prix des minerais du
  système (Ardent Insight), seulement à ton clic sur le bouton de la page (ni un lien ouvert dans le navigateur, ni la
  page d'un autre programme ne peuvent le faire à ta place), sauf si tu actives ses recherches automatiques (coupées
  par défaut) ;
  elles suivent alors le système où tu es, et Spansh et Ardent voient ton adresse IP et la suite de tes systèmes ;
- Escadron : tes gains de mérites au Squadron Tracker de l'escadron, seulement si tu l'as activé.

Tout passe par une seule passerelle, avec une liste blanche des hôtes (`server/src/core/net.js`).

## Données du jeu

- **Elite Dangerous** © Frontier Developments plc. Les journaux du joueur (`Journal.*.log`, `Status.json`,
  `Market.json`, `Cargo.json`) sont lus localement, en lecture seule.

## Données de référence (module « Mon ingénierie »)

Téléchargées dans `server/data/reference/` (non versionné), jamais redistribuées avec l'application : l'installeur
n'emporte ni `server/data/` ni les photographies de test (`__golden__/`).

| Source | Usage | Licence (vérifiée le 28/10/2026) |
| --- | --- | --- |
| [EDCD/coriolis-data](https://github.com/EDCD/coriolis-data) | vaisseaux, emplacements, modules, recettes d'ingénierie, effets expérimentaux | Données : propriété intellectuelle de Frontier Developments, soumises à ses conditions ; code : MIT |
| [EDCD/FDevIDs](https://github.com/EDCD/FDevIDs) | correspondance des noms du journal (matériaux, vaisseaux, modules, ingénieurs) | identifiants Frontier ; pas de fichier de licence dans le dépôt : à vérifier avant tout partage |
| [taleden/EDSY](https://github.com/taleden/EDSY) (`eddb.js`) | identifiants et attributs des vaisseaux, modules, modifications et effets (constructeur de builds, liens `#/L=` d'edsy.org) ; `eddb.js` est téléchargé à part et lu comme une donnée sans être exécuté ; seuls les tests du dépôt (`__golden__/`) gardent des valeurs calculées à partir de ses tables | CC BY-NC 4.0, © taleden — usage non commercial avec attribution |
| [richardbuckle/EDRefCard](https://github.com/richardbuckle/EDRefCard) (`www/scripts/bindingsData.py`, branche `dev`) | liste des commandes du jeu, leur groupe et leur nom anglais : base du catalogue français de « Mes commandes » (`server/src/modules/bindings/catalogue.js`, noms traduits et classés par l'app) | MIT, © 2017 Richard Buckle (vérifiée le 10/11/2026) |
| [ROMVoid95/EliteUIAssets](https://github.com/ROMVoid95/EliteUIAssets) | dessins des vaisseaux de CMDR Qohen Leth (fan art) | dépôt sous licence MIT ; les dessins sont des créations de fan : usage personnel |

**Dessins des vaisseaux livrés avec l'app** : « Vector Ships » de **CMDR Qohen Leth** (édition 2025), sous licence
[Creative Commons Attribution - Pas d'utilisation commerciale - Partage dans les mêmes conditions 4.0 International
(CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr). 45 SVG, copiés sans modification dans
`server/src/core/reference/vaisseaux/` (le nom de fichier devient la clé du vaisseau), et redistribués sous la même
licence. Ils passent avant les dessins téléchargés ci-dessus (même auteur, édition plus ancienne). Vérifiés par
`vaisseaux.test.js` : aucun script, attribut d'événement ni lien extérieur ; servis avec `Content-Security-Policy: sandbox`.

**Vaisseaux sans dessin dans ce pack** (trop récents) : l'Anaconda Mk II, le Caspian Explorer, le Kestrel Mk II et le
Lynx Highliner ont chacun une image dessinée par l'auteur de l'app, **Cronisos Lysiris** (`anacondamkii.webp`,
`explorer_nx.webp`, `kestrel.webp`, `mediumtransport01.webp`, détourées et réduites). Ce sont des créations de fan ;
les vaisseaux sont ceux d'Elite Dangerous, © Frontier Developments plc, sans lien avec ce projet.

Versions figées, relevées le 7 novembre 2026 (dernier commit de `master` ce jour-là) ; le bouton
« Mettre à jour les données » télécharge exactement ces versions (`server/src/core/reference/download.js`) :

| Source | Commit | Date du commit | Vérification |
| --- | --- | --- | --- |
| EDCD/coriolis-data | `0db9234b5b9ce8c939ea84133d7ce336eea88e27` | 24/04/2026 | empreinte SHA-256 de l'ensemble des 141 fichiers |
| EDCD/FDevIDs | `c7c29f7a13df543d4bc8b947eab29f88e06100fa` | 30/10/2026 | SHA-256 de `material.csv`, `shipyard.csv`, `outfitting.csv`, `engineers.csv` |
| taleden/EDSY | `ea787cf805f2c38f72c8d5f168fa1063341ebd9a` | 21/10/2026 | SHA-256 de `eddb.js` |
| ROMVoid95/EliteUIAssets | `5a9b2f82796fc65abace9439aea000155f1e6eb3` | 30/11/2020 | commit seul (dessins SVG servis avec `Content-Security-Policy: sandbox`) |

Règle d'ingénierie (applications fixes depuis la mise à jour 18.08 du 7 août 2024) : annonce officielle de Frontier
Developments sur Steam, « Elite Dangerous | Type-8 Update (18.08) | Wednesday 7th August 2024 »
(https://store.steampowered.com/news/app/359320/view/5963413728353422199, lue le 9 nov. 2026 par l'API des actualités
Steam : https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=359320&count=6&maxlength=0&enddate=1723075200&feeds=steam_community_announcements), notes de mise à jour
Frontier et [guide d'ingénierie newp.io](https://newp.io/engineeringguide).

**Constructeur de builds et EDSY** : le code a été réécrit pour l'app, sans copie de lignes d'EDSY, mais les règles
de calcul suivent celles d'EDSY, étudiées dans son code puis vérifiées contre edsy.org : format des liens `#/L=`
(lecture et écriture), moteur des modifications, courbe de masse des boucliers et propulseurs, résistances avec
rendements décroissants, cadences et DPS, règles d'emplacements. Ces règles restent créditées à taleden
(CC BY-NC 4.0, usage non commercial avec attribution). Seule la portée de saut vient d'une formule publiée par
Frontier. Vérifications : 58 662 valeurs
de l'ancien code photographiées sur 20 builds réels et sur toutes les données (`server/src/modules/builder/__golden__/`),
toutes identiques ; puis contre edsy.org lui-même le 7 nov. 2026 (20 builds ouverts dans EDSY : chiffres affichés et
attributs modifiés identiques, après correction de huit écarts hérités de l'ancien code ; `edsy.test.js`) ; et contre
les valeurs calculées par le jeu dans le journal. Les tables d'`eddb.js` (© taleden,
CC BY-NC 4.0) restent la source des identifiants et des attributs des modules, avec attribution.

## Recherche de planètes (module « Systèmes importants »)

| Source | Usage | Licence |
| --- | --- | --- |
| [Spansh](https://spansh.co.uk) | recherche de planètes par type, gravité et distance, à la demande (pas de copie de code) | données relevées par les joueurs ; pas de licence publiée trouvée : usage personnel |

## Prix du marché (module « Calculateur de routes »)

| Source | Usage | Licence |
| --- | --- | --- |
| [Ardent Insight API](https://github.com/iaincollins/ardent-api) (© Iain Collins) | prix, stocks et demandes autour d'un système, interrogés à la demande (pas de copie de code) | logiciel AGPL-3.0 ; données issues d'[EDDN](https://github.com/EDCD/EDDN) (relevés des joueurs) |

## Formules et adresses reprises d'autres projets

| Projet | Usage | Licence |
| --- | --- | --- |
| [EDEngineer](https://github.com/msarilar/EDEngineer) (msarilar) | recettes de déblocage de la technologie des Gardiens (Resources/Data/blueprints.json, entrées « Guardian »), recopiées le 22 nov. 2026 (module « Gardiens ») | MIT |
| [Elite: Dangerous Guides](https://sites.google.com/view/elitedangerousguides) (cartes de u/Mnemoch et CMDR Loch147), [NEWP](https://newp.io/guardian_guide), fil Steam de Low Rider (2018) | sites conseillés par type de plan, ordre des pylônes (reformulé), place des pylônes sur les cartes (relevée à l'œil, cartes de NovaForce et CMDR Cal Dallicort), durée du compte à rebours, coordonnées des pylônes d'un site ; les cartes sont en lien, pas copiées (module « Gardiens ») | pages publiques, sources citées dans l'app |
| [galnet.fr, « Structures Guardians »](https://galnet.fr/portfolio/bases-guardians/) (CMDR Aymerix, d'après le tableau de [Canonn Research](https://canonn.science/)) | liste de 49 structures gardiennes (système, corps, coordonnées, active ou non) de 2018, et méthode d'activation, reformulée (module « Gardiens ») | page publique, source citée dans l'app |
| [EDDiscovery / EliteDangerousCore](https://github.com/EDDiscovery/EliteDangerousCore) | formule de valeur des données d'exploration (EstimatedValues.cs) ; adresses Inara et Spansh (Inara.cs, SpanshClass.cs) | Apache 2.0 |
| [EDCD/EDMarketConnector](https://github.com/EDCD/EDMarketConnector) | adresses Inara des systèmes et stations (plugins/inara.py) | GPL v2 (seules des adresses publiques sont reprises, pas de code) |

## Bibliothèques

| Projet | Licence |
| --- | --- |
| React, React DOM | MIT |
| React Router | MIT |
| Vite, @vitejs/plugin-react | MIT |
| Express | MIT |
| Prisma | Apache 2.0 |
| concurrently | MIT |
| [tesseract.js](https://github.com/naptha/tesseract.js) 7 et tesseract.js-core (lecture du texte des captures du minage : Tesseract compilé en WebAssembly) | Apache 2.0 (le cœur WebAssembly embarque aussi Leptonica, licence de type BSD) |

## Données de langue du lecteur de texte (captures du minage)

Livrées avec l'application dans `server/assets/tessdata/` (avec le texte de leur licence, `LICENSE`), jamais
téléchargées à l'exécution ; le serveur vérifie leur empreinte avant usage (`server/src/core/ocr.js`).

| Fichier | Source | Commit | SHA-256 | Licence |
| --- | --- | --- | --- | --- |
| `fra.traineddata` (français, modèle « fast », 1 130 365 octets) | [tesseract-ocr/tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast) | `87416418657359cb625c412a48b6e1d6d41c29bd` (01/08/2024) | `ced037562e8c80c13122dece28dd477d399af80911a28791a66a63ac1e3445ca` | Apache 2.0 |

## Sources prévues pour les modules futurs

| Source | Usage prévu | Licence |
| --- | --- | --- |
| EDCD/coriolis | import/export de builds Coriolis (pas encore fait) | à vérifier |
| Inara | liens externes uniquement | — |
