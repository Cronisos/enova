// Fenêtre en jeu (/hud/bilan) : le bilan de la session à la fermeture du jeu (3 min), ou celui du mode qu'on quitte
// au changement de mode (90 s). Ouverte et fermée par le serveur (modules/bilan) ; ✕ la ferme tout de suite.

import { useEffect, useState } from 'react';
import { PanelOverlay } from '../../core/hud.jsx';
import { api } from '../../core/api.js';
import { useEvent } from '../../core/stream.js';
import { duration, int } from '../../core/format.js';
import { chiffres, nomMode } from './bilanVue.js';

const CSS = `
.blo { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 10px; margin: 0; font: 13px 'Segoe UI', system-ui, sans-serif; }
.blo dt { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #8a94a0; }
.blo dd { margin: 0; font-size: 19px; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }
.blo span { display: block; font-size: 11px; color: #8a94a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.blo-btn { -webkit-app-region: no-drag; margin-left: auto; padding: 0 6px; font: inherit; color: #8a94a0; background: none; border: 0; cursor: pointer; }
.blo-btn:hover { color: #f4f6f8; }
`;

/** Chiffres du bilan d'un mode qu'on quitte. */
const chiffresMode = (f) => [
  { label: 'Durée', valeur: duration(f.duree / 1000) },
  { label: 'Mérites', valeur: int(f.merites) },
  { label: 'Matériaux', valeur: int(f.materiauxTotal) },
  { label: 'Primes', valeur: int(f.primes) },
  { label: 'Sauts', valeur: int(f.sauts) },
  { label: 'Morts', valeur: int(f.morts) },
];

export default function BilanOverlay() {
  const [f, setF] = useState(null);
  useEffect(() => {
    api('/modules/bilan/fenetre').then(setF).catch(() => {});
  }, []);
  useEvent('bilan:fenetre', setF);
  const fermer = () => api('/modules/bilan/fenetre/fermer', { method: 'POST' }).catch(() => {});
  const titre = f?.genre === 'mode' ? `Bilan : ${nomMode(f.mode)}` : 'Bilan de la session';
  let liste = [];
  if (f?.genre === 'session') liste = chiffres(f.bilan, f.comparaison);
  else if (f) liste = chiffresMode(f);
  const footer = (
    <>
      <span>{f?.genre === 'session' ? 'Le jeu est fermé : à la prochaine, commandant' : f ? 'Changement de mode' : 'Bilan'}</span>
      {/* Survol signalé au MO : sans lui la fenêtre laisse passer les clics au jeu, et ✕ ne fermait rien (19 nov. 2026) */}
      <button type="button" className="blo-btn" onClick={fermer} title="Fermer le bilan"
        onMouseEnter={() => window.eliteOverlay?.setHover?.(true)} onMouseLeave={() => window.eliteOverlay?.setHover?.(false)}>✕ Fermer</button>
    </>
  );
  return (
    <PanelOverlay title={titre} footer={footer} autoHeight>
      <style>{CSS}</style>
      {!f && <p>Aucun bilan pour l’instant.</p>}
      <dl className="blo">
        {liste.map((c) => <div key={c.label}><dt>{c.label}</dt><dd>{c.valeur}</dd>{c.sous && <span>{c.sous}</span>}</div>)}
      </dl>
    </PanelOverlay>
  );
}
