// Liste des modules de l'application. Chaque module apparaît sous forme de bouton
// sur l'accueil. Pour en ajouter un : créer son dossier et l'ajouter ici.

import routes from './routes/index.js';
import engineering from './engineering/index.js';
import links from './links/index.js';
import glance from './glance/index.js';
import combat from './combat/index.jsx';
import rescue from './rescue/index.jsx';
import groundcombat from './groundcombat/index.jsx';
import carrier from './carrier/index.jsx';
import materials from './materials/index.jsx';
import powerdelivery from './powerdelivery/index.jsx';
import rares from './rares/index.jsx';
import gardiens from './gardiens/index.jsx';
import shipmining from './shipmining/index.jsx';
import signals from './signals/index.jsx';
import navroute from './navroute/index.jsx';
import fsdcool from './fsdcool/index.jsx';
import builder from './builder/index.js';
import waypoints from './waypoints/index.js';
import systems from './systems/index.js';
import expansion from './expansion/index.js';
import colonisation from './colonisation/index.jsx';
import bindings from './bindings/index.js';
import hudcolours from './hudcolours/index.js';
import compagnon from './compagnon/index.js';
import regles from './regles/index.js';
import escadron from './escadron/index.js';
import vaisseaux from './vaisseaux/index.js';
import bilan from './bilan/index.js';
import hangar from './hangar/index.js';
import raresalerte from './raresalerte/index.js';
import systeme from './systeme/index.js';
import { sitesModules } from './sites/index.jsx';

// Modules facultatifs : seulement s'ils sont là (la version escadron est construite sans le copilote IA). Aucun autre
// module n'en dépend ; leur entrée du menu disparaît avec eux (core/navigation.js).
const facultatifs = Object.values(import.meta.glob('./ia/index.js', { eager: true })).map((m) => m.default);

export const modules = [vaisseaux, routes, engineering, builder, waypoints, shipmining, systems, expansion, regles, escadron, ...sitesModules, combat, groundcombat, powerdelivery, rares, gardiens, rescue, materials, colonisation, carrier, signals, navroute, fsdcool, bindings, links, glance, hudcolours, compagnon, bilan, hangar, raresalerte, systeme, ...facultatifs];
