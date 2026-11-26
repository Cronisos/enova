import { lazy } from 'react';
import { HudOverlay } from '../../core/hud.jsx';
import { raresHud, useRares } from './useRares.jsx';
import { modeInfo } from '../../core/modes.js';

// Page chargée à sa première visite : ni dans les fenêtres en jeu, ni au démarrage (App.jsx, Suspense)
const RaresPage = lazy(() => import('./RaresPage.jsx'));

/** Page de l'overlay : /hud/rares */
function RaresOverlay() {
  return <HudOverlay props={raresHud(useRares())} />;
}

export default {
  id: 'rares',
  title: 'Commerce de rares',
  description: 'Marchandises rares achetées et vendues : les mérites que ça rapporte, à l’heure et à la tonne, et le bénéfice',
  icon: '💎',
  path: '/commerce-rares',
  Component: RaresPage,
  Hud: RaresOverlay,
  mode: modeInfo('rares'), // menu « Mode de jeu » : nom, icône et fenêtres dans core/modes.js
};
