// Guide du Rhino (Mes repères › Guide des ressources) : sur quel type de monde chercher chaque ressource rentable.
// Une information générale, pas un bilan personnel : ni tonnes ni « trouvé par toi ». Chaque minerai porte sa couleur,
// la même que sur la carte de l'EEP et dans le Top 10 (oreColors.js) ; un minerai sans couleur attitrée est blanc.
// Données : le tableau de la communauté et tes journaux, fondus (guideRessources.js).

import { useEffect, useState } from 'react';
import { useEvent } from '../../core/stream.js';
import { compact } from '../../core/format.js';
import { wpApi } from './api.js';
import { couleurMinerai } from './oreColors.js';
import IconeMonde from './IconeMonde.jsx';
import { MONDES, NON_CLASSEES, SEUIL_RENTABLE, caseDe, groupes, ouAller, ressourcesDuGuide, ressourcesDuMonde } from './guideRessources.js';

const SIGNE = { oui: '✓', non: '✕', inconnu: '?' };
const DIT = { oui: 'trouvée sur ce type de monde', non: 'pas trouvée sur ce type de monde', inconnu: 'pas encore répertorié' };
const couleur = couleurMinerai;

/** Un type de monde et les ressources rentables qu'on y trouve, chacune à la couleur de son minerai. */
function CarteMonde({ monde, ressources, meilleur }) {
  const liste = ressourcesDuMonde(monde.id, ressources);
  return (
    <article className={`gr-monde${meilleur ? ' is-meilleur' : ''}${liste.length ? '' : ' is-vide'}`}>
      <header>
        <IconeMonde type={monde.id} taille={30} />
        <div>
          <h3>{monde.nom}</h3>
          <span className="gr-court">{monde.court}</span>
        </div>
        <b className="gr-nombre" title={`${liste.length} ressource${liste.length > 1 ? 's' : ''} rentable${liste.length > 1 ? 's' : ''} sur ce type de monde`}>{liste.length}</b>
      </header>
      {liste.length ? (
        <ul>
          {liste.map((r) => <li key={r.nom} style={{ '--c': couleur(r.nom) }}><i aria-hidden="true" />{r.nom}</li>)}
        </ul>
      ) : <p className="muted small">Aucune ressource rentable répertoriée ici.</p>}
    </article>
  );
}

function Tableau({ ressources }) {
  return (
    <div className="table-wrap">
      <table className="table gr-table">
        <thead>
          <tr>
            <th>Ressource</th>
            {MONDES.map((m) => <th key={m.id} className="gr-col" title={m.nom}><IconeMonde type={m.id} taille={16} />{m.court}</th>)}
            <th>Où aller</th>
          </tr>
        </thead>
        <tbody>
          {ressources.map((r) => (
            <tr key={r.nom} style={{ '--c': couleur(r.nom) }}>
              <td>
                <b className="gr-nom"><i aria-hidden="true" />{r.nom}</b>
                <span className="gr-prix">
                  {r.prix != null ? `${compact(r.prix)} cr/t` : 'prix inconnu'}
                  {r.prixMax != null && r.prixMax > r.prix && <span title="Meilleur prix relevé"> · jusqu’à {compact(r.prixMax)}</span>}
                </span>
              </td>
              {MONDES.map((m) => {
                const etat = caseDe(r, m.id);
                return (
                  <td key={m.id} className={`gr-case is-${etat}`} title={`${r.nom} · ${m.nom} : ${DIT[etat]}`}>
                    <span>{SIGNE[etat]}</span>
                  </td>
                );
              })}
              <td className="small">{ouAller(r) || <span className="muted">Pas encore répertorié</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GuideRessources() {
  const [observations, setObservations] = useState(null);
  const [tri, setTri] = useState('prix'); // tableau « Par ressource » : par prix (les plus chères d'abord) ou par nom
  const charger = () => wpApi.guide().then((d) => setObservations(d?.ressources ?? [])).catch(() => setObservations([]));
  useEffect(() => {
    charger();
  }, []);
  useEvent('waypoints:session', charger); // une tonne raffinée : le guide suit

  if (!observations) return <p className="muted">Chargement…</p>;
  const { rentables, sousSeuil, sansPrix } = groupes(ressourcesDuGuide(observations));
  const parMonde = MONDES.map((m) => ({ ...m, nombre: ressourcesDuMonde(m.id, rentables).length }));
  const max = Math.max(...parMonde.map((m) => m.nombre));
  const noms = (l) => l.map((r) => r.nom).join(', ');
  return (
    <div className="gr">
      <p className="muted">Où chercher, avec le Rhino, les ressources qui se vendent plus de {compact(SEUIL_RENTABLE)} cr la tonne.</p>

      <h2>Par type de monde</h2>
      <div className="gr-mondes">
        {parMonde.map((m) => <CarteMonde key={m.id} monde={m} ressources={rentables} meilleur={m.nombre === max && max > 0} />)}
      </div>

      <div className="gr-tete">
        <h2>Par ressource</h2>
        <div className="gr-tri" role="group" aria-label="Classer les ressources">
          <button type="button" className={tri === 'prix' ? 'is-on' : ''} onClick={() => setTri('prix')}>Par prix</button>
          <button type="button" className={tri === 'nom' ? 'is-on' : ''} onClick={() => setTri('nom')}>A → Z</button>
        </div>
      </div>
      <Tableau ressources={tri === 'nom' ? [...rentables].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')) : rentables} />
      <p className="gr-legende small">
        <span className="gr-case is-oui" style={{ '--c': '#5fd38d' }}><span>✓</span></span> trouvée
        <span className="gr-case is-non"><span>✕</span></span> pas trouvée
        <span className="gr-case is-inconnu"><span>?</span></span> pas encore répertorié
      </p>

      {sansPrix.length > 0 && <p className="small"><strong>Prix de vente inconnu</strong> (donc hors du tableau) : {noms(sansPrix)}.</p>}
      {sousSeuil.length > 0 && <p className="small muted"><strong>Sous {compact(SEUIL_RENTABLE)} cr la tonne</strong> : {noms(sousSeuil)}.</p>}

      <p className="tiny muted">
        Sources : le tableau de la communauté et les cours des minerais (19 nov. 2026), et ce qui a réellement été
        raffiné en Rhino d’après les journaux du jeu. Le prix est le cours moyen à la vente. Une ressource trouvée sur un type de monde n’est pas garantie à chaque emplacement de minage.
        {' '}{NON_CLASSEES.join(', ')} : pas encore clairement répertoriée. Les couleurs sont celles des minerais sur la
        carte de l’EEP.
      </p>
    </div>
  );
}
