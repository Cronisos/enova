// Mes vaisseaux : une carte par vaisseau, le vaisseau actuel d'abord et mis en avant. Sur chaque carte, ce qui le
// reconnaît d'un coup d'œil (où il est, saut, soute, boucliers, rôle) ; un clic ouvre sa fiche (stats, modules). Un clic
// sur un modèle (« Anaconda ×3 ») ne montre que ceux-là : « lequel de mes Anaconda est fité comment, et où ? ». Un clic
// sur un rôle (« ⛏ Minage Rhino ») ne montre que les vaisseaux qui le portent ; les deux filtres se combinent.

import { useEffect, useState } from 'react';
import { vaisseauxApi, useRechargeFlotte } from './api.js';
import ShipImage from '../../core/ShipImage.jsx';
import { shipTitle } from '../../core/ShipNickname.jsx';
import RoleTags from '../../core/RoleTags.jsx';
import { tagsRole } from '../../core/shipRole.js';
import { useShipRoles } from '../../core/useShips.js';
import { useGameState } from '../../core/useGameState.js';
import NomSysteme from '../../core/NomSysteme.jsx';
import FicheVaisseau from './FicheVaisseau.jsx';
import { badgeIngenierie, chiffresCarte, modeles, ordreFlotte, padTexte, passeRole, rolesFlotte } from './ficheVue.js';

/** Icône d'ingénierie : une clé plate et une étincelle (dessin original). */
function IconeIngenierie() {
  return (
    <svg viewBox="0 0 24 24" className="vx-ing-icone" aria-hidden="true">
      <path d="M14.5 3.5a4.5 4.5 0 0 0-4.3 5.8L3.6 15.9a1.8 1.8 0 0 0 2.5 2.5l6.6-6.6a4.5 4.5 0 0 0 5.8-4.3l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6c-.3-.7-.6-1-1-1z" fill="currentColor" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function Carte({ s, resume, role, ouvrir, ici }) {
  const chiffres = chiffresCarte(resume);
  const ing = badgeIngenierie(resume);
  // Le vaisseau où tu es : ta position en direct (station comprise) ; les autres : où le jeu les a vus garés
  const ou = s.current && ici?.system ? ici : s.system ? { system: s.system } : null;
  return (
    <article
      data-tuto="vaisseaux-carte"
      className={`vx-carte${s.current ? ' is-actuel' : ''}`}
      onClick={ouvrir}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), ouvrir())}
      role="button"
      tabIndex={0}
      aria-label={`Fiche de ${shipTitle(s)}`}
    >
      {s.current && <div className="vx-bandeau">▶ Vaisseau actuel</div>}
      {ing && (
        <div className={`vx-ing${ing.actif ? ' is-actif' : ''}${ing.gradeMax ? ` g${ing.gradeMax}` : ''}`} title={ing.texte} aria-label={ing.texte}>
          <IconeIngenierie />
          <b>{ing.nombre}</b>
        </div>
      )}
      <ShipImage shipKey={s.key || s.type} hasImage={s.hasImage} size={s.current ? 'lg' : 'md'} />
      <div className="vx-corps">
        <h3>{shipTitle(s)}</h3>
        <p className="vx-modele">{[shipTitle(s) !== s.model ? s.model : null, s.ident].filter(Boolean).join(' · ') || ' '}</p>
        {ou && <p className="vx-ou">{s.current ? (ou.docked && ou.station ? `À quai · ${ou.station} ·` : 'Ici :') : 'Garé à'} <NomSysteme nom={ou.system} /></p>}
        {chiffres.length > 0 && (
          <dl className="vx-chiffres">
            {chiffres.map((c) => <div key={c.label} title={c.label === 'pad' ? padTexte(c.valeur) : undefined}><dt>{c.label}</dt><dd>{c.valeur}</dd></div>)}
          </dl>
        )}
        <div className="vx-role"><RoleTags role={role} /></div>
      </div>
    </article>
  );
}

export default function FlottePage() {
  const [flotte, setFlotte] = useState(null);
  const [resumes, setResumes] = useState({});
  const [erreur, setErreur] = useState('');
  const [modele, setModele] = useState('');
  const [role, setRole] = useState(''); // rôle filtré (id), SANS_ROLE, ou '' : tous
  const [ouvert, setOuvert] = useState(null); // shipId de la fiche ouverte
  const { roleOf } = useShipRoles();
  const { game } = useGameState();
  const charger = () => Promise.all([
    vaisseauxApi.flotte().then(setFlotte),
    vaisseauxApi.resumes().then(setResumes).catch(() => setResumes({})), // données de référence absentes : cartes sans chiffres
  ]).catch((e) => setErreur(e.message));
  useEffect(() => {
    charger();
  }, []);
  useRechargeFlotte(charger);

  if (!flotte) return <p className="muted">{erreur || 'Chargement…'}</p>;
  const tous = ordreFlotte(flotte, shipTitle);
  const tagsDe = (s) => tagsRole(roleOf(s.shipId));
  const roles = rolesFlotte(flotte, tagsDe);
  // Un rôle filtré que plus aucun vaisseau ne porte (rôle retiré depuis la fiche) : le filtre tombe
  const roleActif = roles.some((r) => r.id === role) ? role : '';
  const montres = tous.filter((s) => (!modele || s.model === modele) && passeRole(tagsDe(s), roleActif));
  const fiche = ouvert != null && flotte.find((s) => s.shipId === ouvert);
  return (
    <div className="page">
      {erreur && <p className="bad">{erreur}</p>}
      {!flotte.length && <p className="muted" data-tuto="vaisseaux-vide">Aucun vaisseau pour l’instant : lance le jeu, ta flotte apparaîtra ici.</p>}
      {flotte.length > 1 && (
        <div className="vx-filtres" data-tuto="vaisseaux-filtres" role="group" aria-label="Modèles">
          <button type="button" className={`vx-filtre${!modele ? ' is-on' : ''}`} onClick={() => setModele('')}>Tous <b>{flotte.length}</b></button>
          {modeles(flotte).map((m) => (
            <button key={m.model} type="button" className={`vx-filtre${modele === m.model ? ' is-on' : ''}`} onClick={() => setModele(modele === m.model ? '' : m.model)}>
              {m.model}{m.nombre > 1 && <b>×{m.nombre}</b>}
            </button>
          ))}
        </div>
      )}
      {flotte.length > 1 && roles.length > 0 && (
        <div className="vx-filtres vx-filtres-roles" role="group" aria-label="Rôles">
          <button type="button" className={`vx-filtre${!roleActif ? ' is-on' : ''}`} onClick={() => setRole('')}>Tous les rôles</button>
          {roles.map((r) => (
            <button key={r.id} type="button" className={`vx-filtre vx-filtre-role${roleActif === r.id ? ' is-on' : ''}`} style={{ '--c': r.couleur }}
              title={`Ne montrer que les vaisseaux ${r.label === 'Sans rôle' ? 'sans rôle' : `qui ont le rôle ${r.label} (principal ou secondaire)`}`}
              onClick={() => setRole(roleActif === r.id ? '' : r.id)}>
              {r.icone && <span aria-hidden="true">{r.icone} </span>}{r.label}<b>{r.nombre}</b>
            </button>
          ))}
        </div>
      )}
      {flotte.length > 0 && !montres.length && <p className="muted">Aucun vaisseau ne correspond à ces deux filtres.</p>}
      <div className="vx-grille">
        {montres.map((s) => (
          <Carte key={s.shipId} s={s} resume={resumes[s.shipId]} role={roleOf(s.shipId)} ouvrir={() => setOuvert(s.shipId)} ici={game} />
        ))}
      </div>
      {fiche && <FicheVaisseau vaisseau={fiche} role={roleOf(fiche.shipId)} onFermer={() => setOuvert(null)} onRenomme={charger} />}
    </div>
  );
}
