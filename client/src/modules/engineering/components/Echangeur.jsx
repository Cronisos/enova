// Échangeur de matériaux (tableau de bord) : pour chaque matériau qui manque aux plans, quoi donner chez l'échangeur
// (seulement ce qui dépasse les besoins des plans), aux taux du jeu mesurés, et les échangeurs connus les plus proches.

import { int } from '../../../core/format.js';
import NomSysteme from '../../../core/NomSysteme.jsx';
import { classeGrade } from '../materiauxVue.js';
import { bilanEchanges } from '../echangesVue.js';

const TYPES = { Raw: 'matières premières', Manufactured: 'manufacturés', Encoded: 'données' };

const Grade = ({ g }) => <span className={`grade-badge ${classeGrade(g)}`}>G{g}</span>;

export default function Echangeur({ echanges }) {
  const props = echanges?.propositions || [];
  if (!props.length) return null;
  const types = Object.entries(echanges.echangeurs || {});
  const b = bilanEchanges(props);
  return (
    <section data-tuto="ingenierie-tdb-echangeur" className="panel ech">
      <h2>Échangeur de matériaux</h2>
      <p className="small muted">
        Ce qui peut être donné chez l’échangeur pour ce qui manque, en ne prenant que ce que les plans n’utilisent pas.
        D’abord les matériaux à leur plafond (perdus à la prochaine collecte), puis la même catégorie (sans pénalité).
      </p>
      <div className={`ech-verdict ${b.suffit ? 'is-oui' : 'is-non'}`}>
        {b.suffit ? (
          <p><b>Échanges suffisants.</b> Une fois tous faits, plus aucun matériau ne manque aux plans.</p>
        ) : (
          <>
            <p>
              <b>Échanges insuffisants.</b> {b.couverts} matériau{b.couverts > 1 ? 'x' : ''} sur {b.total} couvert{b.couverts > 1 ? 's' : ''} par
              l’échange. Reste à collecter, tous échanges faits :
            </p>
            <ul className="ech-restants">
              {b.restants.map((x) => (
                <li key={x.key}><b>{int(x.reste)}</b> × <Grade g={x.grade} /> {x.label} <span className="small muted">({x.raison})</span></li>
              ))}
            </ul>
          </>
        )}
        {b.passages > 0 && (
          <p className="small warn">{b.passages} matériau{b.passages > 1 ? 'x' : ''} demande{b.passages > 1 ? 'nt' : ''} plusieurs passages chez l’échangeur : stock plafonné (détail ci-dessous).</p>
        )}
      </div>
      <ul className="ech-liste">
        {props.map((p) => (
          <li key={p.key} className={p.reste ? '' : 'is-couvert'}>
            <div className="ech-cible">
              <span>Manque <b>{int(p.manque)}</b> × <Grade g={p.grade} /> <b>{p.label}</b></span>
              {!p.echangeable && <span className="small muted"> · ne s’échange pas (gardien, thargoïde…)</span>}
              {p.echangeable && !p.echanges.length && p.place !== 0 && <span className="small bad"> · pas de surplus à échanger</span>}
              {p.echanges.length > 0 && <span className={`small ${p.reste ? 'warn' : 'good'}`}> · {p.reste ? `reste à collecter : ${int(p.reste)}` : 'couvert par l’échange'}</span>}
              {p.plusieursPassages && (
                <div className="small warn">
                  {p.place > 0
                    ? `Le stock n’en garde que ${int(p.place)} de plus (plafond) : à utiliser dans les plans avant d’échanger le reste. Plusieurs passages.`
                    : 'Stock déjà au plafond : à utiliser dans les plans avant d’échanger. Plusieurs passages.'}
                </div>
              )}
            </div>
            {p.echanges.length > 0 && (
              <ul className="ech-dons">
                {p.echanges.map((e) => (
                  <li key={e.key}>
                    donner <b>{int(e.donne)}</b> × <Grade g={e.grade} /> {e.label} → reçu : <b>{int(e.recoit)}</b>
                    {!e.memeCategorie && <span className="small muted"> (autre catégorie : taux ÷ 6)</span>}
                    {e.perdu > 0 && <span className="small warn"> · dont {int(e.perdu)} perdus : stock au plafond</span>}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {types.length > 0 && (
        <div className="ech-ou">
          {types.map(([type, liste]) => (
            <p key={type} className="small">
              <span className="muted">Échangeur de {TYPES[type] || type} :</span>{' '}
              {liste.length ? liste.map((s, i) => (
                <span key={`${s.station}-${i}`} className="ech-station">
                  {i > 0 && ' · '}<b>{s.station}</b> (<NomSysteme nom={s.system} />{s.distanceAl != null ? `, ${s.distanceAl.toLocaleString('fr-FR')} al` : ''})
                  {!s.exact && <span className="muted" title="Type d’après l’économie de la station : aucun échange fait ici"> ?</span>}
                </span>
              )) : <span className="muted">aucun connu (appris à la première visite d’une station qui en a un)</span>}
            </p>
          ))}
          <p className="small muted">Échangeurs appris dans le journal, à vol d’oiseau depuis {echanges.position || 'la position actuelle'}.</p>
        </div>
      )}
    </section>
  );
}
