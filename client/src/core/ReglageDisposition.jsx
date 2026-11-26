// Paramètres → disposer les fenêtres en jeu : toutes les fenêtres de l'overlay s'ouvrent d'un coup en mode déplacement,
// même celles qui ne restent que quelques secondes (SCO prêt…) ou qui n'apparaissent qu'à leur moment (saut du porteur,
// itinéraire…). On les glisse où on veut, puis « Terminé » enregistre les places et remet l'overlay comme avant.

import { useEffect, useState } from 'react';
import { api } from './api.js';
import { modules } from '../modules/index.js';
import { fenetresOverlay } from './disposition.js';

export default function ReglageDisposition() {
  const [etat, setEtat] = useState(null);
  const [error, setError] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [vigie, setVigie] = useState(false); // vigie des règles allumée (outil de développement, coupé par défaut)
  const relire = () => api('/overlay').then(setEtat).catch(() => {});
  useEffect(() => {
    relire();
    api('/vigie/reglage').then((r) => setVigie(Boolean(r?.actif))).catch(() => {});
  }, []);
  if (!etat?.installed) return null;
  const fenetres = fenetresOverlay(modules, vigie ? [] : ['vigie']);
  const regler = (on) => {
    setError(null);
    setEnvoi(true);
    api('/overlay/disposition', { method: 'POST', body: on ? { on, pages: fenetres.map((f) => f.page) } : { on } })
      .then(setEtat)
      .catch((e) => setError(e.message))
      .finally(() => setEnvoi(false));
  };
  return (
    <section className="panel" data-tuto="parametres-disposition">
      <h2>Disposer les fenêtres en jeu</h2>
      <p className="small muted">
        Ouvre d’un coup les {fenetres.length} fenêtres de l’overlay, chacune dans un cadre à son nom, même celles qui ne
        s’affichent que quelques secondes (SCO prêt) ou à leur moment (saut du porteur, itinéraire, vente…). Glisse-les
        où tu veux sur l’écran du jeu (les fenêtres libres gardent leurs boutons de taille), puis « Terminé » : chaque
        place est enregistrée et l’overlay revient comme avant.
      </p>
      <div className="form-actions">
        {etat.disposition ? (
          <button className="btn btn-primary" type="button" disabled={envoi} onClick={() => regler(false)}>✓ Terminé : garder les places</button>
        ) : (
          <button className="btn" type="button" disabled={envoi} onClick={() => regler(true)}>Afficher toutes les fenêtres pour les placer</button>
        )}
        {error && <span className="bad">{error}</span>}
      </div>
    </section>
  );
}
