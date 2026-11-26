import { lazy } from 'react';

// Fenêtre en jeu chargée quand elle sert (App.jsx, Suspense)
const HangarOverlay = lazy(() => import('./HangarOverlay.jsx'));

export default {
  id: 'hangar',
  title: 'Hangar sans véhicule',
  // Pas de page : seulement l'alerte en jeu, ouverte par le serveur au décollage (server/src/modules/hangar)
  hudPages: { 'hangar-vide': HangarOverlay },
};
