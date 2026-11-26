// Fenêtre en jeu (/hud/hangar-vide) : tu as décollé avec un hangar acheté mais sans véhicule dedans. Le serveur
// l'ouvre au décollage (server/src/modules/hangar) ; « Il est plein » corrige l'app, ✕ ferme jusqu'au prochain décollage.

import { useEffect, useState } from 'react';
import { PanelOverlay } from '../../core/hud.jsx';
import { api } from '../../core/api.js';
import { useEvent } from '../../core/stream.js';

const CSS = `
.hg { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #dfe4ea; }
.hg-titre { margin: 0; font-size: 15px; font-weight: 700; color: #ff7a6b; }
.hg-row { padding: 5px 8px; border-left: 3px solid #ff7a6b; background: rgba(255,122,107,.1); }
.hg-btn { font: inherit; font-size: 12px; cursor: pointer; }
.hg-empty { color: #8a94a0; margin: 0; }
`;

export default function HangarOverlay() {
  const [alerte, setAlerte] = useState(null);
  useEffect(() => {
    api('/modules/hangar/etat').then((d) => setAlerte(d?.alerte ?? null)).catch(() => {});
  }, []);
  useEvent('hangar:alerte', (d) => setAlerte(d?.alerte ?? null));
  const agir = (chemin) => api(`/modules/hangar/${chemin}`, { method: 'POST' }).catch(() => {});
  const footer = (
    <>
      <span>Retourne à quai : un véhicule s’achète à l’équipement</span>
      {alerte && <button type="button" className="hg-btn" onClick={() => agir('plein')} title="L’app se trompe : ce hangar a bien un véhicule">Il est plein</button>}
      <button type="button" className="hg-btn" onClick={() => agir('fenetre/fermer')} title="Fermer jusqu’au prochain décollage">✕</button>
    </>
  );
  const n = alerte?.hangars?.length || 0;
  return (
    <PanelOverlay title="⚠ Hangar sans véhicule" footer={footer} autoHeight>
      <style>{CSS}</style>
      <div className="hg">
        {alerte ? (
          <>
            <p className="hg-titre">{n > 1 ? `${n} hangars vides` : 'Hangar vide'}{alerte.vaisseau ? ` sur ${alerte.vaisseau}` : ''}</p>
            {alerte.hangars.map((h) => <div key={h.slot} className="hg-row">{h.nom} : aucun {h.genre === 'chasseur' ? 'chasseur' : 'véhicule'} acheté depuis son installation</div>)}
          </>
        ) : <p className="hg-empty">Aucun hangar vide.</p>}
      </div>
    </PanelOverlay>
  );
}
