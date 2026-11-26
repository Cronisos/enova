// Catalogue des rares (page Commerce de rares) : où chaque marchandise rare s'achète, à quelle distance de toi, ce
// qu'il en reste et à quel prix. Relevé sur Spansh à ta demande (server/src/modules/rares/catalogue.js) ; une alerte
// s'ouvre en jeu quand un stock atteint ton seuil, si tu actives la surveillance.

import { useEffect, useState } from 'react';
import { api } from '../../core/api.js';
import { useEvent } from '../../core/stream.js';
import { dec1, int } from '../../core/format.js';
import { TRIS, age, etatFr, pad, trier } from './catalogueVue.js';

const CLE = 'enova-rares-catalogue';
function reglagesLocaux() {
  try {
    return { tri: 'distance', distanceMax: 0, grandPad: false, auSeuil: false, ...JSON.parse(localStorage.getItem(CLE) || '{}') };
  } catch {
    return { tri: 'distance', distanceMax: 0, grandPad: false, auSeuil: false };
  }
}

export default function RaresCatalogue() {
  const [cat, setCat] = useState(null);
  const [message, setMessage] = useState(null);
  const [f, setF] = useState(reglagesLocaux);
  const [seuil, setSeuil] = useState('');

  useEffect(() => {
    api('/modules/rares/catalogue').then(setCat).catch((err) => setMessage(err.message));
  }, []);
  useEvent('rares:catalogue', setCat);
  useEffect(() => {
    if (cat) setSeuil(String(cat.reglages.seuil));
  }, [cat?.reglages.seuil]);
  const changer = (plus) => {
    const suite = { ...f, ...plus };
    setF(suite);
    try {
      localStorage.setItem(CLE, JSON.stringify(suite));
    } catch {
      // stockage refusé : le réglage vaut pour cette visite
    }
  };
  const envoyer = (chemin, options) => {
    setMessage(null);
    return api(`/modules/rares/catalogue${chemin}`, options).then(setCat).catch((err) => setMessage(err.message));
  };
  const reglerSeuil = () => {
    const n = Math.round(Number(seuil));
    if (Number.isFinite(n) && n >= 1 && n !== cat.reglages.seuil) envoyer('/reglages', { method: 'PUT', body: { seuil: n } });
    else setSeuil(String(cat.reglages.seuil));
  };

  if (!cat) return <p className="muted">{message || 'Chargement…'}</p>;
  const lignes = trier(cat.lignes, { ...f, seuil: cat.reglages.seuil });
  const auSeuil = cat.lignes.filter((l) => l.stock >= cat.reglages.seuil).length;

  return (
    <section>
      <header className="route-header">
        <div>
          <h2>Catalogue des rares</h2>
          <p className="muted">
            {cat.at ? `${cat.lignes.length} rares sur ${cat.total}, relevé ${age(cat.at)}` : 'Pas encore de relevé'}
            {cat.depuis ? ` · distances depuis ${cat.depuis}` : ' · position inconnue : distances à ton prochain saut'}
            {cat.at ? ` · ${auSeuil} à ${int(cat.reglages.seuil)} t ou plus` : ''}
          </p>
        </div>
        <div className="form-actions">
          <button className="btn" disabled={Boolean(cat.enCours)} onClick={() => envoyer('/actualiser', { method: 'POST' })}>
            {cat.enCours ? `Relevé en cours… ${cat.enCours.fait} / ${cat.enCours.total}` : cat.at ? 'Refaire le relevé' : 'Faire le relevé (Spansh)'}
          </button>
        </div>
      </header>

      {(message || cat.erreur) && <p className="error">{message || cat.erreur}</p>}
      {cat.erreurs > 0 && !cat.enCours && <p className="small muted">{cat.erreurs} rares n’ont pas répondu au dernier relevé : leur ligne d’avant est gardée.</p>}

      <div className="form-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem 1.4rem', alignItems: 'center', margin: '0.6rem 0' }}>
        <label>Trier par{' '}
          <select value={f.tri} onChange={(e) => changer({ tri: e.target.value })}>
            {Object.entries(TRIS).map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
          </select>
        </label>
        <label>Distance max{' '}
          <select value={f.distanceMax} onChange={(e) => changer({ distanceMax: Number(e.target.value) })}>
            <option value={0}>toutes</option>
            {[100, 150, 200, 300, 500].map((d) => <option key={d} value={d}>{d} AL</option>)}
          </select>
        </label>
        <label><input type="checkbox" checked={f.grandPad} onChange={(e) => changer({ grandPad: e.target.checked })} /> Grand pad seulement</label>
        <label><input type="checkbox" checked={f.auSeuil} onChange={(e) => changer({ auSeuil: e.target.checked })} /> Au seuil seulement</label>
        <label>Seuil d’alerte{' '}
          <input type="number" min="1" style={{ width: '5.5rem' }} value={seuil} onChange={(e) => setSeuil(e.target.value)} onBlur={reglerSeuil} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} /> t
        </label>
        <label title="Un relevé toutes les 6 heures tant que l’app tourne ; une fenêtre s’ouvre en jeu quand une rare atteint le seuil">
          <input type="checkbox" checked={cat.reglages.surveiller} onChange={(e) => envoyer('/reglages', { method: 'PUT', body: { surveiller: e.target.checked } })} /> Surveiller et m’alerter en jeu
        </label>
      </div>

      {cat.lignes.length ? (
        <div className="table-wrap">
          <table className="table compact">
            <thead>
              <tr>
                <th>Marchandise</th><th>Station</th><th>Système</th><th>Pad</th>
                <th className="right">Station à</th><th className="right">Distance</th><th className="right">Quantité</th><th className="right" title="Plus haut stock noté par l’app pour cette rare, et le nombre de passages notés">Plus haut vu</th><th>État</th><th className="right">Prix</th><th className="right">Relevé</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.nom} style={l.stock >= cat.reglages.seuil ? { background: 'rgba(95, 211, 141, 0.1)' } : undefined}>
                  <td>{l.label}</td>
                  <td>{l.station}{l.planetaire ? ' (au sol)' : ''}</td>
                  <td>{l.systeme}{l.puissance ? <span className="muted"> · {l.puissance}</span> : null}</td>
                  <td>{pad(l)}</td>
                  <td className="right num">{l.arrivee != null ? `${int(l.arrivee)} sl` : '—'}</td>
                  <td className="right num">{l.distance != null ? `${dec1(l.distance)} AL` : '—'}</td>
                  <td className="right num">{l.stock >= cat.reglages.seuil ? <b>{int(l.stock)} t</b> : `${int(l.stock)} t`}</td>
                  <td className="right num" title={l.maxAt ? `le ${new Date(l.maxAt).toLocaleDateString('fr-FR')}${l.maxEtat ? `, faction en ${etatFr(l.maxEtat)}` : ''}` : undefined}>{l.max != null ? `${int(l.max)} t` : '—'} <span className="muted">({int(l.releves)})</span></td>
                  <td title={l.faction || undefined}>{etatFr(l.etat)}</td>
                  <td className="right num">{l.prix != null ? `${int(l.prix)} cr` : '—'}</td>
                  <td className="right">{age(l.maj)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Lance un relevé : l’app interroge Spansh pour chaque rare (environ une minute). Seul le nom des marchandises est envoyé, rien de toi.</p>
      )}
      {cat.lignes.length > 0 && !lignes.length && <p className="muted">Aucune rare ne passe ces filtres.</p>}
      <p className="tiny muted">
        Données de Spansh, d’après les marchés relevés par les joueurs : la quantité est ce qu’il restait au dernier
        passage d’un joueur, pas ce que la station te vendra. Le prix de vente n’existe nulle part (une station ne cote
        une rare que si tu l’as en soute) ; il monte avec la distance à la source, jusqu’à 150-200 AL. « Plus haut vu »
        et le nombre entre parenthèses viennent de l’historique que l’app tient à chaque relevé et à chaque marché que
        tu ouvres en jeu : plus il y a de passages notés, plus on voit comment le stock bouge. « État » est celui de la
        faction qui tient la station.
      </p>
    </section>
  );
}
