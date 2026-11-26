import EepsPanel from './EepsPanel.jsx';
import { useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useEvent } from '../../core/stream.js';
import ExternalLinks from '../../core/ExternalLinks.jsx';
import { date, dateTime } from '../../core/format.js';
import { matchesSearch } from '../../core/text.js';
import { tenter } from '../../core/actions.js';
import PageIntrouvable from '../../core/PageIntrouvable.jsx';
import { coords, discordText, meters, vehicleLabel, wpApi } from './api.js';
import { MiningHistory, MiningPanel } from './MiningSession.jsx';
import { isDepleted, tabOf } from './tabs.js';
import { echapRemonte, uneFois } from './gardes.js';
import { groupByPlace, shortPlace } from './places.js';
import { EepView, findPlanet, OnlineChoice, OnlineLine, PlanetView, SystemsView, SystemView, useOnlineSetting, useSurvey, WaypointRow } from './Survey.jsx';
import { CapturesPanel } from './Captures.jsx';
import GuideRessources from './GuideRessources.jsx';
import ChercherMinerai from './ChercherMinerai.jsx';
import NomSysteme from '../../core/NomSysteme.jsx';
import { BoutonPartager, RecusEscadron } from '../../core/PartageEscadron.jsx';
import { GENRES_REPERES, TYPES_REPERES, donneesRepere, genreRepere, lieuRepere } from './partageRepere.js';

// Mes repères, comme un menu de jeu : un écran à la fois, le fil d'Ariane et ↩ pour remonter (Échap aussi).
//   /reperes                        le système : ses planètes à EEP, et les autres écrans
//   /reperes/planete/<p>            une planète : verdict, grille de ses EEP
//   /reperes/planete/<p>/eep/<n>    un EEP : gisements, repères, dernière capture
//   /reperes/repere/<id>            un repère : guidage, session, actions
//   /reperes/liste, /guide, /captures, /session, /historique, /systemes

const BASE = '/reperes';
const planetPath = (body) => `${BASE}/planete/${encodeURIComponent(body)}`;
const sitePath = (body, n) => `${planetPath(body)}/eep/${n}`;
const waypointPath = (id) => `${BASE}/repere/${id}`;

/** Formulaire de description d'un repère (nom, type, notes). */
function Describe({ w, categories, onSaved, onCancel }) {
  const [f, setF] = useState({ label: w.label, category: w.category, notes: w.notes, siteNumber: w.siteNumber ?? '', drills: w.drills ?? '' });
  const isMining = f.category === 'mining';
  const [erreur, setErreur] = useState(null); // échec de l'enregistrement : affiché sous le formulaire, la saisie reste
  async function save(e) {
    e.preventDefault();
    await tenter(async () => onSaved(await wpApi.update(w.id, { ...f, siteNumber: isMining ? f.siteNumber : null, drills: isMining ? f.drills : null })), setErreur);
  }
  return (
    <form className="form waypoint-form" onSubmit={save}>
      <label data-tuto="reperes-decrire-nom">
        C'est quoi ?
        <input autoFocus value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="ex. Stratum Tectonicas, 3 colonies" />
      </label>
      <div className="form-actions" data-tuto="reperes-decrire-type">
        {Object.entries(categories).map(([k, v]) => (
          <button type="button" key={k} className={`btn small ${f.category === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setF({ ...f, category: k })}>{v}</button>
        ))}
      </div>
      {isMining && (
        <>
          <label data-tuto="reperes-decrire-eep">
            Numéro de l'EEP
            <input type="number" min="1" max="999" value={f.siteNumber} onChange={(e) => setF({ ...f, siteNumber: e.target.value })} placeholder="ex. 3" />
          </label>
          <label>
            Nombre de foreuses
            <input type="number" min="1" max="999" value={f.drills} onChange={(e) => setF({ ...f, drills: e.target.value })} placeholder="ex. 4" />
          </label>
        </>
      )}
      <label data-tuto="reperes-decrire-notes">
        Notes
        <textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="ce qu'il y a, comment y accéder…" />
      </label>
      <div className="form-actions" data-tuto="reperes-decrire-enregistrer">
        <button className="btn btn-primary">Enregistrer</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Fermer</button>}
        {erreur && <span className="small bad">{erreur}</span>}
      </div>
    </form>
  );
}

/** Flèche et distance vers un repère, mises à jour en direct. */
function Guide({ w, here }) {
  const [g, setG] = useState(null);
  const key = `${here?.latitude}|${here?.longitude}|${here?.heading}|${here?.body}`;
  useEffect(() => {
    wpApi.guide(w.id).then(setG).catch(() => setG(null));
  }, [w.id, key]);

  if (!g) return <p className="muted">Calcul…</p>;
  if (g.state === 'guiding') {
    return (
      <div className="waypoint-guide-live">
        <div className="waypoint-arrow" style={{ transform: `rotate(${g.turn ?? 0}deg)` }} aria-hidden>▲</div>
        <div>
          <div className={`glance-big num ${g.arrived ? 'good' : ''}`}>{g.arrived ? 'Tu y es' : meters(g.distance)}</div>
          <div className="small">
            cap <strong>{g.bearing}°</strong>
            {g.turn != null && !g.arrived && (
              <> · {Math.abs(g.turn) < 5 ? 'tout droit' : `${Math.abs(g.turn)}° à ${g.turn < 0 ? 'gauche' : 'droite'}`} (cap actuel {g.heading}°)</>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (g.state === 'other-system') return <p>Va d'abord dans le système <strong><NomSysteme nom={g.system} /></strong>.</p>;
  if (g.state === 'other-body') return <p>Approche-toi de <strong>{shortPlace(g.body, w.system)}</strong> : le guidage démarre près de la surface.</p>;
  return <p className="muted">Ce repère n'a pas de coordonnées de surface (pris dans l'espace ou à quai).</p>;
}

/**
 * Haut de chaque écran : ↩ vers l'écran parent et fil d'Ariane cliquable. Échap remonte aussi (sauf en saisie).
 * @param crumbs [{ label, to }] du plus général au plus précis ; le dernier est l'écran affiché
 */
function ViewHead({ crumbs }) {
  const nav = useNavigate();
  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2].to : null;
  useEffect(() => {
    const onKey = (e) => {
      // Échap déjà pris par une fenêtre ouverte (Modale : carte d'un EEP…) : elle se ferme, l'écran reste (gardes.js)
      if (!parent || !echapRemonte(e)) return;
      nav(parent);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [parent]);
  return (
    <div className="wp-head">
      {parent && <button className="btn wp-back" onClick={() => nav(parent)} title="Retour (Échap)">↩</button>}
      <nav className="wp-crumbs">
        {crumbs.map((c, i) => (
          <span key={i} className="wp-crumb">
            {i > 0 && <span className="wp-crumb-sep">›</span>}
            {i < crumbs.length - 1 ? <button onClick={() => nav(c.to)}>{c.label}</button> : <b>{c.label}</b>}
          </span>
        ))}
      </nav>
    </div>
  );
}

/** Écran d'un repère : guidage en direct, ce que c'est, et toutes ses actions. */
function WaypointView({ ctx, crumbsFor }) {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const [copied, setCopied] = useState(false);
  const w = ctx.list.find((x) => x.id === Number(id));
  if (!w) return <><ViewHead crumbs={[ctx.root]} /><p className="muted">{ctx.loaded ? 'Repère introuvable (supprimé ?).' : 'Chargement…'}</p></>;
  const editing = params.has('modifier');
  const tab = tabOf(w);

  async function flag(change) {
    const x = await ctx.wpApi.update(w.id, change);
    ctx.setList((l) => l.map((y) => (y.id === x.id ? x : y)));
  }
  async function remove() {
    if (!window.confirm(`Supprimer le repère « ${w.label} » ?`)) return;
    await wpApi.remove(w.id);
    ctx.reload();
    nav(crumbsFor(w).at(-2).to);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(discordText(w));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // presse-papiers indisponible
    }
  }

  return (
    <>
      <ViewHead crumbs={crumbsFor(w)} />
      <section className="panel waypoint-view">
        {editing ? (
          <Describe w={w} categories={ctx.categories}
            onSaved={(x) => { ctx.setList((l) => l.map((y) => (y.id === x.id ? x : y))); setParams({}); }}
            onCancel={() => setParams({})} />
        ) : (
          <>
            <div className="survey-top">
              <h2>📍 {w.label}</h2>
              <span className="pill pill-info">{w.categoryLabel}</span>
              {w.siteNumber != null && <span className="pill pill-eep">EEP {w.siteNumber}</span>}
              {w.drills != null && <span className="pill pill-info">{w.drills} foreuse{w.drills > 1 ? 's' : ''}</span>}
              {w.unprofitable && <span className="pill pill-bad">pas rentable</span>}
              {isDepleted(w) && <span className="pill pill-warn">tari</span>}
            </div>
            <p className="small muted">
              {[w.body ? shortPlace(w.body, w.system) : w.station, w.system].filter(Boolean).join(' · ')}
              {w.latitude != null && <> · lat / lon {coords(w.latitude, w.longitude)}</>}
              {' '}· {dateTime(w.createdAt)}{w.vehicle && ` · ${vehicleLabel(w.vehicle)}`}
            </p>
            {w.notes && <p>{w.notes}</p>}
            {isDepleted(w) && <p className="small warn">Tari le {date(w.depletedAt)} · de retour le {date(w.depletedUntil)}</p>}
          </>
        )}
      </section>

      {!editing && (
        <>
          <section className="panel waypoint-guide">
            <h3 className="wp-sub">Guidage</h3>
            <Guide w={w} here={ctx.here} />
          </section>
          <section className="panel">
            <div className="form-actions" data-tuto="reperes-fiche-actions">
              {w.category === 'mining' && tab === 'main' && (ctx.session
                ? <button className="btn btn-primary" data-tuto="reperes-fiche-session" onClick={() => nav(`${BASE}/session`)}>⛏ Session en cours</button>
                : <button className="btn btn-primary" data-tuto="reperes-fiche-session" onClick={() => ctx.startSession(w)}>⛏ Lancer la session</button>)}
              {w.siteNumber != null && w.body && <button className="btn" onClick={() => nav(sitePath(w.body, w.siteNumber))}>Fiche de l’EEP {w.siteNumber}</button>}
              <button className="btn" data-tuto="reperes-fiche-modifier" onClick={() => setParams({ modifier: '1' })}>Modifier</button>
              {w.category === 'mining' && tab === 'main' && <button className="btn btn-ghost" data-tuto="reperes-fiche-vide" onClick={() => flag({ depleted: true })}>Vidé aujourd'hui</button>}
              {isDepleted(w) && !w.unprofitable && <button className="btn btn-ghost" onClick={() => flag({ depleted: false })}>Annuler « tari »</button>}
              {w.category === 'mining' && <button className="btn btn-ghost" data-tuto="reperes-fiche-rentable" onClick={() => flag({ unprofitable: !w.unprofitable })}>{w.unprofitable ? 'Annuler « pas rentable »' : 'Pas rentable'}</button>}
              <button className="btn btn-ghost" data-tuto="reperes-fiche-discord" onClick={copy}>{copied ? 'Copié ✓' : 'Copier pour Discord'}</button>
              <BoutonPartager kind={genreRepere(w)} refId={w.id} titre={w.label} donnees={() => donneesRepere(w)} apercu={`${GENRES_REPERES[genreRepere(w)]} · ${lieuRepere(w)}`} />
              <ExternalLinks kind="system" vars={{ system: w.system, systemAddress: w.systemAddress }} />
              <span className="survey-grow" />
              <button className="btn btn-ghost" data-tuto="reperes-fiche-supprimer" onClick={remove}>Supprimer</button>
            </div>
          </section>
        </>
      )}
    </>
  );
}

/** Écran d'une planète (/planete/<p>). */
/** Écran « Escadron » : les repères reçus, à part des tiens, par type (Rhino, minage en vaisseau, autres). */
function EscadronScreen({ ctx }) {
  const [type, setType] = useState('tous');
  const kinds = type === 'tous' ? TYPES_REPERES : [type];
  return (
    <>
      <ViewHead crumbs={[ctx.root, { label: 'Escadron' }]} />
      <nav className="tabs tabs-sous tabs-routes" data-tuto="reperes-escadron-types">
        {[['tous', 'Tous'], ...Object.entries(GENRES_REPERES)].map(([k, label]) => (
          <button key={k} type="button" className={type === k ? 'active' : ''} onClick={() => setType(k)}>{label}</button>
        ))}
      </nav>
      <RecusEscadron
        kinds={kinds}
        copier="Copier dans mes repères"
        vide="Aucun repère partagé pour l’instant. Pour partager l’un des tiens : ouvre-le, puis « Partager à l’escadron »."
        onCopier={async (s) => {
          await wpApi.importer({ ...s.data, notes: [s.data.notes, `Reçu de CMDR ${s.cmdr}`].filter(Boolean).join('\n') });
          ctx.reload?.();
        }}
        detail={(s) => (
          <>
            <span className="pill pill-info">{GENRES_REPERES[s.kind] || 'Repère'}</span> {lieuRepere(s.data)}
            {s.data.latitude != null && <span className="muted"> · {coords(s.data.latitude, s.data.longitude)}</span>}
            {s.data.notes && <div className="muted">{String(s.data.notes).slice(0, 300)}</div>}
          </>
        )}
      />
    </>
  );
}

function PlanetScreen({ s }) {
  const { body } = useParams();
  return (
    <>
      <ViewHead crumbs={[s.root, { label: s.planetCrumb(body).label }]} />
      <PlanetView survey={s.survey} body={body} waypoints={s.list} onSaveBody={s.saveBody} openSite={s.openSite} openWaypoint={s.openWaypoint} />
    </>
  );
}

/** Écran d'un EEP (/planete/<p>/eep/<n>). */
function SiteScreen({ s }) {
  const { body, n } = useParams();
  return (
    <>
      <ViewHead crumbs={[s.root, s.planetCrumb(body), { label: `EEP ${n}` }]} />
      <EepView survey={s.survey} here={s.here} body={body} number={Number(n)} waypoints={s.list} captures={s.captures}
        onSaveSite={s.saveSite} openSite={s.openSite} openWaypoint={s.openWaypoint} onMark={s.mark} marking={s.marking} />
    </>
  );
}

const TABS = { main: 'Repères', depleted: 'Taris', unprofitable: 'Pas rentables' };
const EMPTY_TAB = { depleted: 'Aucune veine tarie.', unprofitable: 'Aucune zone marquée pas rentable.' };

/** Écran de tous les repères : onglets, recherche, type, système où l'on est ou tous ; un clic ouvre le repère. */
function ListView({ ctx }) {
  const nav = useNavigate();
  const [filter, setFilter] = useState({ q: '', category: '' });
  const [tab, setTab] = useState('main');
  const [tousDemandes, setAllSystems] = useState(false);
  const { list, here, categories } = ctx;
  const q = filter.q.trim().toLowerCase();
  const system = here?.system?.toLowerCase();
  // Aucun repère dans le système où tu es : montrer ceux de tous les systèmes, plutôt qu'une liste vide
  const aucunIci = Boolean(system) && !list.some((w) => String(w.system || '').toLowerCase() === system);
  const allSystems = tousDemandes || aucunIci;
  const inSystem = (w) => allSystems || !system || String(w.system || '').toLowerCase() === system;
  const tabCount = (k) => list.filter((w) => tabOf(w) === k && inSystem(w)).length;
  const shown = list.filter((w) =>
    tabOf(w) === tab &&
    inSystem(w) &&
    (!filter.category || w.category === filter.category) &&
    matchesSearch(q, [w.label, w.notes, w.system, w.body, w.station, w.siteNumber != null && `EEP ${w.siteNumber}`])); // sans accents ni apostrophes typographiques
  const places = groupByPlace(shown);

  return (
    <>
      <ViewHead crumbs={[ctx.root, { label: 'Tous mes repères' }]} />
      <section className="panel">
        <div className="form-actions" data-tuto="reperes-liste-onglets">
          {Object.entries(TABS).map(([k, v]) => (
            <button key={k} className={`btn small ${tab === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(k)}>{v}{k !== 'main' && ` (${tabCount(k)})`}</button>
          ))}
        </div>
        <div className="form-actions" data-tuto="reperes-liste-filtres">
          <input placeholder="Chercher (nom, système, planète, notes)" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
          <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
            <option value="">tous les types</option>
            {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {system && !aucunIci && (
            <button className={`btn small ${allSystems ? 'btn-primary' : ''}`} onClick={() => setAllSystems(!allSystems)} title="Par défaut, seuls les repères du système où tu es">
              {allSystems ? `Seulement ${here.system}` : `Tous les systèmes (${list.filter((w) => tabOf(w) === tab).length})`}
            </button>
          )}
          <span className="small muted">{shown.length} repère{shown.length > 1 ? 's' : ''}{system && !allSystems ? ` dans ${here.system}` : ''}</span>
        </div>
        {shown.length ? places.map((p) => (
          <div key={p.key} className="waypoint-place">
            <h3 className="waypoint-place-head">
              <span aria-hidden="true">{p.place ? '🪐' : '✦'}</span>
              <span className="waypoint-place-name">{p.place ? shortPlace(p.place, p.system) : 'Dans l’espace'}</span>
              <span className="waypoint-place-system"><NomSysteme nom={p.system} /></span>
              <span className="pill pill-info">{p.list.length} repère{p.list.length > 1 ? 's' : ''}</span>
            </h3>
            <div className="wp-rows">{p.list.map((w) => <WaypointRow key={w.id} w={w} onOpen={(x) => nav(waypointPath(x.id))} />)}</div>
          </div>
        )) : (
          <p className="muted">{system && !allSystems && list.some((w) => tabOf(w) === tab) ? `Aucun repère dans ${here.system} : « Tous les systèmes » affiche les autres.` : EMPTY_TAB[tab] || (list.length ? 'Aucun repère ne correspond.' : 'Aucun repère. Sur place, clique sur « Marquer ici ».')}</p>
        )}
      </section>
    </>
  );
}

/** Mes repères : un écran à la fois, comme un menu de jeu. */
export default function WaypointsPage() {
  const nav = useNavigate();
  const location = useLocation();
  const [here, setHere] = useState(null);
  const [list, setList] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [categories, setCategories] = useState({});
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [captures, setCaptures] = useState([]);
  const [other, setOther] = useState(null); // autre système choisi dans « Systèmes prospectés »
  const [survey, setSurvey, loadSpansh] = useSurvey(here, other);
  const online = useOnlineSetting(); // recherches en ligne automatiques : proposées une fois, coupées par défaut

  const load = () => {
    wpApi.list().then((l) => { setList(l); setLoaded(true); }).catch((e) => setError(e.message));
  };
  const loadSessions = () => {
    wpApi.sessions().then(setSessions).catch(() => {});
  };
  const loadCaptures = () => {
    wpApi.captures().then(setCaptures).catch(() => {});
  };
  useEffect(() => {
    load();
    loadSessions();
    loadCaptures();
    wpApi.here().then(setHere).catch(() => {});
    wpApi.categories().then(setCategories).catch(() => {});
    wpApi.session().then(setSession).catch(() => {});
  }, []);
  useEvent('waypoints:here', setHere);
  useEvent('waypoints:update', load);
  useEvent('waypoints:session', setSession);
  useEvent('waypoints:capture', loadCaptures);
  // Nouvel écran : on repart du haut de la page
  useEffect(() => {
    window.scrollTo(0, 0); // entre accolades : Chrome récent renvoie une promesse, que React prendrait pour un nettoyage
  }, [location.pathname]);

  async function run(fn) {
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      return null;
    }
  }
  /**
   * Marquer ici (avec un type et un numéro d'EEP, depuis la fiche d'un EEP) : on ouvre le repère pour le décrire. Un
   * seul à la fois : un double clic ne crée pas deux repères (le bouton reste grisé jusqu'à la réponse).
   */
  const marquage = useRef(false);
  const [marking, setMarking] = useState(false);
  const mark = (extra = {}) => uneFois(marquage, () => run(async () => {
    const w = await wpApi.mark(extra);
    setList((l) => [w, ...l.filter((x) => x.id !== w.id)]);
    nav(`${waypointPath(w.id)}?modifier=1`);
  }), setMarking);
  const startSession = (w) => run(async () => {
    setSession(await wpApi.startSession(w.id));
    nav(`${BASE}/session`);
  });
  const saveSite = (planet, change) => run(async () => setSurvey(await wpApi.saveSite({ system: survey.system, systemAddress: survey.systemAddress, body: planet.body, ...change })));
  const saveBody = (planet, change) => run(async () => setSurvey(await wpApi.saveBody({ system: survey.system, systemAddress: survey.systemAddress, body: planet.body, ...change })));

  const root = { label: survey?.system || here?.system || 'Mes repères', to: `${BASE}/ici` };
  const planetCrumb = (body) => ({ label: `🪐 ${findPlanet(survey, body)?.name || shortPlace(body, survey?.system || here?.system)}`, to: planetPath(body) });
  /** Fil d'Ariane d'un repère : système › planète › EEP › repère. */
  const crumbsFor = (w) => [
    root,
    ...(w.body ? [planetCrumb(w.body)] : []),
    ...(w.body && w.siteNumber != null ? [{ label: `EEP ${w.siteNumber}`, to: sitePath(w.body, w.siteNumber) }] : []),
    { label: w.label },
  ];
  const ctx = { here, list, setList, loaded, categories, session, root, wpApi, reload: load, startSession };
  const openPlanet = (body) => nav(planetPath(body));
  const openSite = (body, n) => nav(sitePath(body, n));
  const openWaypoint = (w) => nav(waypointPath(w.id));

  const screen = { root, planetCrumb, survey, here, list, captures, saveBody, saveSite, openSite, openWaypoint, mark, marking };
  // Onglets de la page (refonte du 19 nov. 2026) : « Chercher » un minerai en accueil, puis le système où l'on est, puis
  // le reste. Ils remplacent les tuiles, et restent visibles sur chaque écran.
  const onglets = [
    { to: '', label: 'Chercher', titre: 'Où trouver un minerai, tous systèmes confondus' },
    { to: 'ici', label: 'Ici', titre: 'Les planètes du système où tu es' },
    { to: 'liste', label: `Mes repères (${list.length})`, titre: 'Tous tes repères' },
    { to: 'eeps', label: 'Cartes d’EEP', titre: 'Les EEP balayés, à revoir ou partager' },
    { to: 'historique', label: `Sessions (${sessions.length})`, titre: 'Tes sessions de minage passées' },
    { to: 'escadron', label: 'Escadron', titre: 'Repères partagés par les membres' },
    { to: 'systemes', label: 'Systèmes', titre: 'Les systèmes prospectés et leurs planètes rentables' },
    { to: 'guide', label: 'Guide', titre: 'Sur quel type de monde chercher chaque ressource' },
  ];
  const sousChemin = location.pathname.replace(/\/+$/, '').slice(BASE.length).replace(/^\//, '');
  const ongletActif = (o) => (o.to === '' ? sousChemin === '' : sousChemin === o.to || sousChemin.startsWith(`${o.to}/`))
    // Une planète, un EEP ou un repère ouverts : on est dans « Ici » (le relevé d'un système)
    || (o.to === 'ici' && /^(planete|repere)\//.test(sousChemin));
  /** Ouvre un endroit trouvé par « Chercher » : son système devient celui du relevé, puis son EEP s'ouvre. */
  const ouvrirLieu = (l) => {
    setOther(l.system === here?.system ? null : { system: l.system, systemAddress: l.systemAddress });
    nav(sitePath(l.body, l.eep));
  };

  return (
    <div className="page">
      <h1>Mes repères</h1>

      <section className="panel wp-bar">
        <div>
          <div className="small muted">Tu es ici</div>
          {here?.system ? (
            <>
              <b className="wp-bar-place">{here.body ? shortPlace(here.body, here.system) : here.station || here.system}</b>
              <span className="small muted">
                {' '}{here.body && <><NomSysteme nom={here.system} /> · </>}
                {coords(here.latitude, here.longitude) ? <>lat / lon {coords(here.latitude, here.longitude)}{here.altitude != null && ` · alt. ${meters(here.altitude)}`}</> : 'pas de coordonnées de surface'}
                {here.vehicle && <> · {vehicleLabel(here.vehicle)}</>}
              </span>
            </>
          ) : (
            <span className="muted">Position inconnue : lance le jeu.</span>
          )}
        </div>
        <span className="survey-grow" />
        {session && <button className="btn" onClick={() => nav(`${BASE}/session`)}>⛏ Session en cours</button>}
        {/* À quai, rien à marquer : une station n'a pas de coordonnées de surface (l’auteur, 19 nov. 2026) */}
        {!here?.station && <button className="btn btn-primary" onClick={() => mark()} disabled={!here?.system || marking}>📍 Marquer ici</button>}
      </section>
      {error && <p className="bad">{error}</p>}

      <nav className="wp-onglets" aria-label="Mes repères">
        {onglets.map((o) => (
          <button key={o.to || 'chercher'} type="button" className={ongletActif(o) ? 'is-on' : ''} title={o.titre} onClick={() => nav(o.to ? `${BASE}/${o.to}` : BASE)}>{o.label}</button>
        ))}
      </nav>

      <Routes>
        <Route index element={(
          <ChercherMinerai ici={here?.system} ouvrir={ouvrirLieu}
            ouvrirSysteme={(g) => { setOther(g.system === here?.system ? null : { system: g.system, systemAddress: g.systemAddress }); nav(`${BASE}/ici`); }} />
        )} />
        <Route path="ici" element={(
          <>
            <OnlineChoice online={online} />
            <SystemView survey={survey} here={here} other={other} onBackHome={() => setOther(null)} openPlanet={openPlanet} openSite={openSite} onLoadSpansh={loadSpansh} />
            <OnlineLine online={online} />
          </>
        )} />
        <Route path="planete/:body" element={<PlanetScreen s={screen} />} />
        <Route path="planete/:body/eep/:n" element={<SiteScreen s={screen} />} />
        <Route path="repere/:id" element={<WaypointView ctx={ctx} crumbsFor={crumbsFor} />} />
        <Route path="liste" element={<ListView ctx={ctx} />} />
        <Route path="escadron" element={<EscadronScreen ctx={ctx} />} />
        <Route path="eeps" element={<><ViewHead crumbs={[root, { label: 'EEP balayés' }]} /><EepsPanel /></>} />
        <Route path="guide" element={<><ViewHead crumbs={[root, { label: 'Guide des ressources' }]} /><GuideRessources /></>} />
        <Route path="captures" element={<><ViewHead crumbs={[root, { label: 'Captures' }]} /><CapturesPanel /></>} />
        <Route path="session" element={(
          <>
            <ViewHead crumbs={[root, { label: 'Session de minage' }]} />
            {session
              ? <MiningPanel s={session} onEnd={() => run(async () => { await wpApi.endSession(); setSession(null); loadSessions(); nav(`${BASE}/historique`); })}
                onReset={() => window.confirm('Remettre la session à zéro (compteurs et chrono) ?') && run(async () => setSession(await wpApi.resetSession()))} />
              : <section className="panel" data-tuto="reperes-session-vide"><p className="muted">Aucune session en cours : lance-la depuis un repère de minage.</p></section>}
          </>
        )} />
        <Route path="historique" element={(
          <>
            <ViewHead crumbs={[root, { label: 'Sessions passées' }]} />
            {sessions.length
              ? <MiningHistory sessions={sessions} canResume={!session}
                onResume={(x) => run(async () => { setSession(await wpApi.resumeSession(x.id)); loadSessions(); nav(`${BASE}/session`); })} />
              : <section className="panel" data-tuto="reperes-historique"><p className="muted">Aucune session terminée.</p></section>}
          </>
        )} />
        <Route path="systemes" element={(
          <>
            <ViewHead crumbs={[root, { label: 'Systèmes prospectés' }]} />
            <SystemsView current={survey?.system} onPick={(s) => { setOther(s.system === here?.system ? null : s); nav(`${BASE}/ici`); }} />
          </>
        )} />
        <Route path="*" element={<PageIntrouvable retour={BASE} nom="Mes repères" />} />
      </Routes>
    </div>
  );
}
