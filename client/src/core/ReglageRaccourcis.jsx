// Paramètres › Raccourcis clavier : la touche de chaque action des fenêtres en jeu (souris, cacher et afficher,
// déplacer…) et les raccourcis du joueur vers des pages de l'app. Valables même en jeu : c'est l'overlay qui les
// prend auprès de Windows, et il relit ce réglage à chaque enregistrement (server/src/core/raccourcis.js).

import { useEffect, useState } from 'react';
import { api } from './api.js';
import { aPlat } from './navigation.js';
import { combinaison, doubles, ecrire, pagesProposees } from './raccourcisVue.js';

const PAGES = pagesProposees(aPlat());

/** Bouton qui attend une combinaison de touches, puis la donne à `onChoix`. Échap annule. */
function Saisie({ touche, onChoix }) {
  const [ecoute, setEcoute] = useState(false);
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    if (!ecoute) return undefined;
    const clavier = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape' && !e.ctrlKey && !e.altKey) return setEcoute(false);
      const c = combinaison(e);
      if (c.attente) return undefined;
      if (c.erreur) return setErreur(c.erreur);
      setErreur('');
      setEcoute(false);
      return onChoix(c.touche);
    };
    // Avant la page (phase de capture) : le raccourci essayé ne déclenche rien d'autre dans l'app
    window.addEventListener('keydown', clavier, true);
    return () => window.removeEventListener('keydown', clavier, true);
  }, [ecoute, onChoix]);
  return (
    <span className="rac-saisie">
      <button type="button" className={`btn small${ecoute ? ' btn-primary' : ''}`} onClick={() => { setErreur(''); setEcoute(!ecoute); }}>
        {ecoute ? 'Presse ta combinaison… (Échap pour annuler)' : ecrire(touche)}
      </button>
      {erreur && <span className="bad small"> {erreur}</span>}
    </span>
  );
}

export default function ReglageRaccourcis() {
  const [etat, setEtat] = useState(null); // réglage enregistré
  const [actions, setActions] = useState([]); // en cours de saisie
  const [pages, setPages] = useState([]);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const poser = (e) => {
    setEtat(e);
    setActions(e.actions.map((a) => ({ ...a })));
    setPages(e.pages.map((p) => ({ ...p })));
  };
  useEffect(() => {
    api('/raccourcis').then(poser).catch(() => setEtat(null)); // serveur d'avant : pas de section
  }, []);
  if (!etat) return null;

  const enDouble = doubles(actions, pages);
  const change = JSON.stringify([actions.map((a) => a.touche), pages]) !== JSON.stringify([etat.actions.map((a) => a.touche), etat.pages]);
  async function envoyer(demande, ok) {
    setErreur('');
    setMessage('');
    try {
      poser(await api('/raccourcis', { method: 'PUT', body: demande }));
      setMessage(ok);
    } catch (e) {
      setErreur(e.message);
    }
  }
  const enregistrer = () => envoyer({ actions: Object.fromEntries(actions.map((a) => [a.id, a.touche])), pages }, 'Raccourcis enregistrés : ils valent tout de suite, même en jeu.');
  const libre = PAGES.find((p) => !pages.some((x) => x.chemin === p.chemin)) ?? PAGES[0];

  return (
    <section className="panel" data-tuto="parametres-raccourcis">
      <h2>Raccourcis clavier</h2>
      <p className="muted small">
        Ces raccourcis marchent partout, même pendant que tu joues. Clique sur un raccourci, puis presse la combinaison
        que tu veux : il faut Ctrl ou Alt, avec une lettre, un chiffre ou une touche F1 à F24. Évite ce que le jeu
        utilise déjà : une combinaison prise ici ne lui arrive plus.
      </p>
      <h3>Fenêtres en jeu</h3>
      <table className="table compact">
        <tbody>
          {actions.map((a, k) => (
            <tr key={a.id} data-tuto={`raccourci-${a.id}`}>
              <td><b>{a.titre}</b><div className="muted small">{a.description}</div></td>
              <td className={enDouble.includes(a.touche) ? 'warn' : undefined} style={{ whiteSpace: 'nowrap' }}>
                <Saisie touche={a.touche} onChoix={(t) => setActions(actions.map((x, j) => (j === k ? { ...x, touche: t } : x)))} />
              </td>
              <td className="right" style={{ whiteSpace: 'nowrap' }}>
                {a.touche !== a.defaut && <button type="button" className="btn btn-ghost small" onClick={() => setActions(actions.map((x, j) => (j === k ? { ...x, touche: x.defaut } : x)))} title={`Remettre ${ecrire(a.defaut)}`}>Par défaut</button>}
                {a.touche && <button type="button" className="btn btn-ghost small" onClick={() => setActions(actions.map((x, j) => (j === k ? { ...x, touche: null } : x)))} title="Cette action n'aura plus de raccourci">Aucun</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Ouvrir une page de l'app</h3>
      <p className="muted small">Tes propres raccourcis : la page s'ouvre dans la fenêtre principale, qui passe devant le jeu. {etat.maxPages} au plus.</p>
      {pages.length > 0 && (
        <table className="table compact">
          <tbody>
            {pages.map((p, k) => (
              <tr key={k}>
                <td>
                  <select value={p.chemin} onChange={(e) => setPages(pages.map((x, j) => (j === k ? { ...x, chemin: e.target.value } : x)))} aria-label="Page à ouvrir">
                    {!PAGES.some((x) => x.chemin === p.chemin) && <option value={p.chemin}>{p.chemin}</option>}
                    {PAGES.map((x) => <option key={x.chemin} value={x.chemin}>{x.titre}</option>)}
                  </select>
                </td>
                <td className={enDouble.includes(p.touche) ? 'warn' : undefined} style={{ whiteSpace: 'nowrap' }}>
                  <Saisie touche={p.touche} onChoix={(t) => setPages(pages.map((x, j) => (j === k ? { ...x, touche: t } : x)))} />
                </td>
                <td className="right"><button type="button" className="btn btn-ghost small" onClick={() => setPages(pages.filter((_, j) => j !== k))}>Retirer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="form-actions">
        <button type="button" className="btn small" disabled={pages.length >= etat.maxPages} onClick={() => setPages([...pages, { touche: null, chemin: libre.chemin }])}>+ Raccourci vers une page</button>
      </div>
      {enDouble.length > 0 && <p className="warn small">Utilisé deux fois : {enDouble.map(ecrire).join(', ')}. Chaque raccourci ne peut faire qu'une chose.</p>}
      {pages.some((p) => !p.touche) && <p className="warn small">Un raccourci de page n'a pas encore de touche : clique sur « aucun » pour la choisir, ou retire-le.</p>}
      <div className="form-actions" style={{ marginTop: '0.6rem' }}>
        <button type="button" className="btn btn-primary" disabled={!change || enDouble.length > 0 || pages.some((p) => !p.touche)} onClick={enregistrer}>Enregistrer les raccourcis</button>
        <button type="button" className="btn btn-ghost" disabled={!change} onClick={() => poser(etat)}>Annuler mes changements</button>
        <button type="button" className="btn btn-ghost" onClick={() => envoyer({ defaut: true }, 'Raccourcis remis comme à l’origine.')}>Tout remettre par défaut</button>
        {message && <span className="good small">{message}</span>}
        {erreur && <span className="bad small">{erreur}</span>}
      </div>
      <p className="muted small">
        Si un raccourci ne répond pas en jeu, un autre programme l'a sans doute déjà pris : choisis-en un autre.
      </p>
    </section>
  );
}
