import { lazy } from 'react';
import { modeInfo } from '../../core/modes.js';

// Fenêtres en jeu, bandeaux et pages : chacun chargé quand il sert (App.jsx, Suspense), pas dans chaque fenêtre
const MiningHud = lazy(() => import('./MiningHud.jsx'));
const WaypointsListOverlay = lazy(() => import('./ListOverlay.jsx'));
const GuideOverlay = lazy(() => import('./GuideOverlay.jsx'));
const SweepOverlay = lazy(() => import('./SweepOverlay.jsx'));
const SweepTopOverlay = lazy(() => import('./SweepTop.jsx'));
const SweepPoseOverlay = lazy(() => import('./SweepPose.jsx'));

// Page chargée à sa première visite : ni dans les fenêtres en jeu, ni au démarrage (App.jsx, Suspense)
const WaypointsPage = lazy(() => import('./WaypointsPage.jsx'));

export default {
  id: 'waypoints',
  title: 'Mes repères',
  description: 'Un clic sur place enregistre système, planète et coordonnées ; on note ce que c\'est et on y retourne',
  icon: '📍',
  path: '/reperes',
  Component: WaypointsPage,
  Hud: MiningHud, // overlay : /hud/waypoints
  // Fenêtres en plus, ouvertes avec le mode : liste des repères (cachée, montrée par le bouton 📍 du HUD), guidage
  // vers un repère (caché, montré par le bouton 🧭 d'un repère de la liste) et balayage d'un EEP en SRV (caché, montré par le bouton 🎯 du HUD), avec son tiroir Top 10 collé à gauche (bouton 💎)
  // et celui du repère posé (📍 ou Alt+Maj+R : nom et minerai à corriger)
  // Le cadre de capture (CaptureFrame.jsx) n'est plus ouvert avec le mode depuis le 19 nov. 2026
  hudPages: { 'waypoints-list': WaypointsListOverlay, 'waypoints-guide': GuideOverlay, 'waypoints-sweep': SweepOverlay, 'waypoints-sweep-top': SweepTopOverlay, 'waypoints-sweep-pose': SweepPoseOverlay },
  mode: modeInfo('waypoints'), // menu « Mode de jeu » (le minage en vaisseau a son propre mode) : core/modes.js
};
