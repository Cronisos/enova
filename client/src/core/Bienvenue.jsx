// Premiers pas : la carte en haut de l'accueil qui dit au nouveau joueur les choses à faire, cochées d'après
// l'état réel de l'app (bienvenue.js). Elle disparaît quand tout est fait, ou quand il la ferme (retenu avec les
// tutoriels vus : Paramètres › Tutoriels la fait revenir avec « Tout remettre à pas encore vu »).

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from './api.js';
import { useEvent } from './stream.js';
import { useGameState } from './useGameState.js';
import { ID_BIENVENUE, ID_SOURIS, etapesBienvenue, montrerBienvenue } from './bienvenue.js';
import { EVENEMENT_ETAT, reglerTutoriels } from './tutoriel/Tutoriel.jsx';

export default function Bienvenue() {
  const { journal } = useGameState();
  const [etat, setEtat] = useState(null);
  const [escadron, setEscadron] = useState(undefined); // undefined : pas encore lu ; null : module absent
  const [overlay, setOverlay] = useState(null);
  const [touche, setTouche] = useState(undefined); // raccourci du mode souris ; undefined : pas encore lu

  useEffect(() => {
    reglerTutoriels().then(setEtat).catch(() => {});
    api('/modules/escadron/status').then(setEscadron).catch(() => setEscadron(null));
    api('/overlay').then(setOverlay).catch(() => {});
    api('/raccourcis').then((r) => setTouche(r?.actions?.find((a) => a.id === 'souris')?.touche ?? 'Alt+Shift+K')).catch(() => setTouche('Alt+Shift+K'));
    const maj = (e) => setEtat(e.detail);
    window.addEventListener(EVENEMENT_ETAT, maj);
    return () => window.removeEventListener(EVENEMENT_ETAT, maj);
  }, []);
  useEvent('escadron:update', setEscadron);
  useEvent('overlay', setOverlay);

  if (escadron === undefined || !journal || !overlay) return null;
  const etapes = etapesBienvenue({ journal, escadron, mode: overlay.mode, souris: { touche, vue: (etat?.vus ?? []).includes(ID_SOURIS) } });
  if (!montrerBienvenue(etat, etapes)) return null;
  const faites = etapes.filter((e) => e.fait).length;
  return (
    <section className="panel bienvenue" data-tuto="bienvenue">
      <div className="bienvenue-tete">
        <h2>Premiers pas <span className="muted small">· {faites} sur {etapes.length}</span></h2>
        <button type="button" className="btn btn-ghost small" onClick={() => reglerTutoriels({ vu: { id: ID_BIENVENUE, vu: true } }).catch(() => {})}>
          Fermer
        </button>
      </div>
      <ol className="guide-etapes">
        {etapes.map((e, k) => (
          <li key={e.id} className={`guide-etape${e.fait ? ' is-faite' : ''}`}>
            <span className="guide-num" aria-hidden="true">{e.fait ? '✓' : k + 1}</span>
            <div className="guide-corps">
              <h3>{e.titre}{e.fait && <span className="guide-fait"> · fait</span>}</h3>
              <p className={e.fait ? 'muted small' : 'small'}>{e.texte}</p>
              {!e.fait && (e.lien || e.valider) && (
                <div className="form-actions">
                  {e.valider && <button type="button" className="btn btn-primary small" onClick={() => reglerTutoriels({ vu: { id: e.valider, vu: true } }).catch(() => {})}>{e.boutonValider}</button>}
                  {e.lien && <Link className="btn small" to={e.lien}>{e.bouton}</Link>}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
