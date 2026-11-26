// Fenêtre en jeu (/hud/rares-alerte) : une marchandise rare vient d'atteindre ton seuil de quantité. Le serveur
// l'ouvre après un relevé de la surveillance (server/src/modules/rares) ; elle se ferme seule, ou au ✕.

import { useEffect, useState } from 'react';
import { PanelOverlay } from '../../core/hud.jsx';
import { api } from '../../core/api.js';
import { useEvent } from '../../core/stream.js';
import { dec1, int } from '../../core/format.js';

const CSS = `
.ra { display: flex; flex-direction: column; gap: 5px; font-size: 13px; color: #dfe4ea; }
.ra-titre { margin: 0; font-size: 15px; font-weight: 700; color: #5fd38d; }
.ra-row { padding: 5px 8px; border-left: 3px solid #5fd38d; background: rgba(95,211,141,.1); display: flex; justify-content: space-between; gap: 10px; }
.ra-row b { color: #fff; }
.ra-lieu { color: #8a94a0; }
.ra-btn { font: inherit; font-size: 12px; cursor: pointer; }
.ra-empty { color: #8a94a0; margin: 0; }
`;
const MAX = 6; // lignes montrées : au-delà, le reste est dans la page

export default function RaresAlerteOverlay() {
  const [alerte, setAlerte] = useState(null);
  useEffect(() => {
    api('/modules/rares/catalogue').then((d) => setAlerte(d?.alerte ?? null)).catch(() => {});
  }, []);
  useEvent('rares:catalogue', (d) => setAlerte(d?.alerte ?? null));
  const fermer = () => api('/modules/rares/catalogue/alerte/fermer', { method: 'POST' }).catch(() => {});
  const rares = alerte?.rares || [];
  const footer = (
    <>
      <span>Détail : Commerce de rares › Catalogue</span>
      <button type="button" className="ra-btn" onClick={fermer} title="Fermer jusqu’à la prochaine alerte">✕</button>
    </>
  );
  return (
    <PanelOverlay title="◆ Rares en stock" footer={footer} autoHeight>
      <style>{CSS}</style>
      <div className="ra">
        {rares.length ? (
          <>
            <p className="ra-titre">{rares.length > 1 ? `${rares.length} rares à ${int(alerte.seuil)} t ou plus` : `Une rare à ${int(alerte.seuil)} t ou plus`}</p>
            {rares.slice(0, MAX).map((l) => (
              <div key={l.nom} className="ra-row">
                <span><b>{l.label}</b> <span className="ra-lieu">· {l.station}, {l.systeme}</span></span>
                <span>{int(l.stock)} t · {int(l.prix)} cr{l.distance != null ? ` · ${dec1(l.distance)} AL` : ''}</span>
              </div>
            ))}
            {rares.length > MAX && <p className="ra-empty">et {rares.length - MAX} de plus dans le catalogue</p>}
          </>
        ) : <p className="ra-empty">Aucune alerte de rares.</p>}
      </div>
    </PanelOverlay>
  );
}
