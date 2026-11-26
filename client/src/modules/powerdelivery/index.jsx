import { lazy } from 'react';
import { HudOverlay } from '../../core/hud.jsx';
import { powerDeliveryHud, usePowerDelivery } from './usePowerDelivery.jsx';
import { modeInfo } from '../../core/modes.js';

// Page chargée à sa première visite : ni dans les fenêtres en jeu, ni au démarrage (App.jsx, Suspense)
const PowerDeliveryPage = lazy(() => import('./PowerDeliveryPage.jsx'));

/** Page de l'overlay : /hud/powerdelivery */
function PowerDeliveryOverlay() {
  return <HudOverlay props={powerDeliveryHud(usePowerDelivery())} />;
}

export default {
  id: 'powerdelivery',
  title: 'Livraison Powerplay',
  description: 'Ressources allouées par ta puissance : ce que tu as en soute, ce que tu as livré, et les mérites gagnés',
  icon: '📦',
  path: '/livraison-powerplay',
  Component: PowerDeliveryPage,
  Hud: PowerDeliveryOverlay,
  mode: modeInfo('powerdelivery'), // menu « Mode de jeu » : nom, icône et fenêtres dans core/modes.js
};
