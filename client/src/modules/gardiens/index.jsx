import { lazy } from 'react';
import { HudOverlay } from '../../core/hud.jsx';
import { gardiensHud, useGardiens } from './useGardiens.jsx';
import { modeInfo } from '../../core/modes.js';

// Page chargée à sa première visite : ni dans les fenêtres en jeu, ni au démarrage (App.jsx, Suspense)
const GardiensPage = lazy(() => import('./GardiensPage.jsx'));
// Fenêtre en jeu du site en vue : carte et ordre des pylônes, ouverte par le serveur à l'approche d'un site
const SiteOverlay = lazy(() => import('./SiteOverlay.jsx'));

/** Page de l'overlay : /hud/gardiens */
function GardiensOverlay() {
  return <HudOverlay props={gardiensHud(useGardiens())} />;
}

export default {
  id: 'gardiens',
  title: 'Gardiens',
  description: 'Ce que tu veux débloquer chez le courtier gardien, les matériaux qu’il te manque, et les sites partagés par l’escadron',
  icon: '🔷',
  path: '/gardiens',
  Component: GardiensPage,
  Hud: GardiensOverlay,
  hudPages: { 'gardiens-site': SiteOverlay },
  mode: modeInfo('gardiens'), // menu « Mode de jeu » : nom, icône et fenêtres dans core/modes.js
};
