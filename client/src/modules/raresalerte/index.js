import { lazy } from 'react';

// Fenêtre en jeu chargée quand elle sert (App.jsx, Suspense)
const RaresAlerteOverlay = lazy(() => import('./RaresAlerteOverlay.jsx'));

export default {
  id: 'raresalerte',
  title: 'Alerte de rares en stock',
  // Pas de page : seulement l'alerte en jeu, ouverte par le serveur après un relevé (server/src/modules/rares). À part
  // du module « rares » : les fenêtres d'un mode de jeu s'ouvrent toutes avec lui, celle-ci seulement sur alerte.
  hudPages: { 'rares-alerte': RaresAlerteOverlay },
};
