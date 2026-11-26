// Liste des modules chargés par le serveur.
// Pour ajouter un module : créer son dossier dans modules/ et l'ajouter ici.
//
// Modules facultatifs (OPTIONNELS) : chargés seulement si leur dossier est là. La version escadron est mise en paquet
// sans eux (le copilote IA demande une grosse carte graphique) : aucun autre module n'en dépend, rien d'autre ne change.

import fs from 'node:fs';

import routes from './routes/index.js';
import engineering from './engineering/index.js';
import links from './links/index.js';
import glance from './glance/index.js';
import combat from './combat/index.js';
import rescue from './rescue/index.js';
import groundcombat from './groundcombat/index.js';
import carrier from './carrier/index.js';
import materials from './materials/index.js';
import powerdelivery from './powerdelivery/index.js';
import rares from './rares/index.js';
import gardiens from './gardiens/index.js';
import shipmining from './shipmining/index.js';
import signals from './signals/index.js';
import navroute from './navroute/index.js';
import fsdcool from './fsdcool/index.js';
import planner from './planner/index.js';
import builder from './builder/index.js';
import waypoints from './waypoints/index.js';
import systems from './systems/index.js';
import expansion from './expansion/index.js';
import colonisation from './colonisation/index.js';
import bindings from './bindings/index.js';
import hudcolours from './hudcolours/index.js';
import compagnon from './compagnon/index.js';
import regles from './regles/index.js';
import escadron from './escadron/index.js';
import whereto from './whereto/index.js';
import bilan from './bilan/index.js';
import hangar from './hangar/index.js';
import systeme from './systeme/index.js';

export const OPTIONNELS = ['ia'];
const facultatifs = [];
for (const id of OPTIONNELS) {
  const fichier = new URL(`./${id}/index.js`, import.meta.url);
  if (fs.existsSync(fichier)) facultatifs.push((await import(fichier.href)).default);
}

export const modules = [routes, engineering, builder, planner, waypoints, systems, expansion, whereto, regles, escadron, shipmining, combat, groundcombat, rescue, powerdelivery, rares, gardiens, materials, colonisation, carrier, signals, navroute, fsdcool, bindings, links, glance, hudcolours, compagnon, bilan, hangar, systeme, ...facultatifs];
