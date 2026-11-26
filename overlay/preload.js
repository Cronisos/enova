// Seul pont entre l'overlay et la page : mode déplacement, survol des boutons, redimensionnement
// des fenêtres libres, copie d'un texte (nom du système) dans le presse-papiers, fenêtres cachées à montrer,
// photo de la zone d'un cadre de capture et mode souris.
//
// Chaque abonnement (on…) rend la fonction qui le retire : la page la rend à son useEffect, sans quoi un composant
// remonté (StrictMode de npm run dev, changement de page) écouterait deux fois (deux foreuses posées pour Alt+Maj+F).

const { contextBridge, ipcRenderer } = require('electron');

/** Abonnement à un message de l'overlay ; rend la fonction qui le désabonne. */
function ecouter(canal, fn) {
  const f = (_event, ...args) => fn(...args);
  ipcRenderer.on(canal, f);
  return () => ipcRenderer.removeListener(canal, f);
}

contextBridge.exposeInMainWorld('eliteOverlay', {
  onEditMode: (callback) => ecouter('edit-mode', (on) => callback(on)),
  setHover: (on) => ipcRenderer.send('hover', Boolean(on)),
  toggleEdit: () => ipcRenderer.send('toggle-edit'),
  grow: (dw, dh) => ipcRenderer.send('grow', Number(dw) || 0, Number(dh) || 0),
  // Pendant le déplacement : centre la fenêtre de gauche à droite sur son écran (sa hauteur ne bouge pas)
  centerH: () => ipcRenderer.send('center-h'),
  // Fenêtre à la hauteur de son contenu (Coup d'œil) : la page dit combien il lui faut
  fitHeight: (height) => ipcRenderer.send('fit-height', Number(height) || 0),
  copy: (text) => ipcRenderer.send('copy', String(text).slice(0, 200)),
  // Fenêtre ouverte cachée (liste des repères) : la montrer ou la cacher, et suivre son état
  toggleWindow: (page) => ipcRenderer.send('toggle-window', String(page)),
  isShown: (page) => ipcRenderer.invoke('window-shown', String(page)),
  onShown: (callback) => ecouter('window-shown', (page, on) => callback(page, on)),
  // Tiroir collé à une autre fenêtre (Top 10 du balayage) : de quel côté il sort
  dockSide: () => ipcRenderer.invoke('dock-side'),
  onDockSide: (callback) => ecouter('dock-side', (side) => callback(side)),
  // Cadre de capture : photo de sa zone (bouton), photos prises au raccourci, pas de redimensionnement
  capture: () => ipcRenderer.invoke('capture'),
  onCaptured: (callback) => ecouter('captured', (shot) => callback(shot)),
  // Foreuse du Rhino posée (Alt+Maj+F) : la fenêtre du balayage note la position
  onDrillKey: (callback) => ecouter('drill-key', () => callback()),
  onMarkKey: (callback) => ecouter('mark-key', () => callback()),
  onEcouteKey: (callback) => ecouter('ecoute-key', () => callback()),
  // Cadre de la jauge des boucliers : noter « tombes » / « pleins » / « oublier », son état, le pourcentage lu
  bouclierNoter: (quoi) => ipcRenderer.invoke('bouclier-noter', String(quoi)),
  bouclierEtat: () => ipcRenderer.invoke('bouclier-etat'),
  onBouclierPct: (callback) => ecouter('bouclier-pct', (pct) => callback(pct)),
  // « Disposer les fenêtres » (Paramètres) : la page montre un cadre nommé, même vide, pour être placée
  isDisposition: () => ipcRenderer.invoke('disposition'),
  onDisposition: (callback) => ecouter('disposition', (on) => callback(Boolean(on))),
  step: () => ipcRenderer.invoke('step'),
  // Mode souris (Alt+Maj+K) : fenêtres cliquables
  isMouseMode: () => ipcRenderer.invoke('mouse-mode'),
  onMouseMode: (callback) => ecouter('mouse-mode', (on) => callback(on)),
});
