import { tileCount } from './surveyTiles.js';
import { useEffect, useState } from 'react';
import { useEvent } from '../../core/stream.js';
import { coords, wpApi } from './api.js';
import { couleurMinerai } from './oreColors.js';
import IconeMonde from './IconeMonde.jsx';
import { isDepleted } from './tabs.js';
import { shortPlace } from './places.js';
import NomSysteme from '../../core/NomSysteme.jsx';

// Prospection du minage planétaire : d'un coup d'œil, les planètes du système qui valent le déplacement,
// et en quelques clics ce qu'on a vu dans chaque EEP (rien d'intéressant, ou ses minerais et une note de 1 à 10).
// Chaque niveau est un écran de la page Mes repères : Système › Planète › EEP.

const GOOD_RATING = 6; // même seuil que le serveur : un EEP noté 6 ou plus est rentable
const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const VERDICTS = {
  good: { icon: '✓', label: 'Rentable', pill: 'pill-good' },
  depleted: { icon: '⏳', label: 'Tarie', pill: 'pill-warn' },
  low: { icon: '◐', label: 'Petits gisements', pill: 'pill-warn' },
  unknown: { icon: '?', label: 'À prospecter', pill: 'pill-muted' },
  bad: { icon: '✗', label: 'Rien de bon vu', pill: 'pill-bad' },
  out: { icon: '⛔', label: 'Planète out', pill: 'pill-bad' },
};

const STATES = { good: 'rentable', low: 'faible', seen: 'à noter', bad: 'rien d’intéressant', depleted: 'tari', unknown: 'pas vu' };
const STATE_PILLS = { good: 'pill-good', low: 'pill-warn', seen: 'pill-info', bad: 'pill-bad', depleted: 'pill-warn', unknown: 'pill-muted' };
const oreList = (site) => site.deposits.map((d) => d.ore).join(', ');
/** Couleur du type de planète : métaux, roche, glace. */
const typeKey = (type) => (/métaux/.test(type) ? 'metal' : /glace|Glacée/.test(type) ? 'ice' : /Rocheuse/.test(type) ? 'rock' : 'other');
const ls = (d) => (d == null ? null : `${Math.round(d).toLocaleString('fr-FR')} ls`);
const gravity = (g) => (g == null ? null : `${g.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} g`);
/** Planète tarie : « de retour le 14 janv. » (quand le premier de ses gisements taris revient). */
const retour = (planet) => (planet.verdict === 'depleted' && planet.depletedUntil
  ? `de retour le ${new Date(planet.depletedUntil).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
  : null);
const blankSite = (number) => ({ number, bad: false, deposits: [], notes: '', waypoints: [], state: 'unknown' });

/**
 * Prospection du système où l'on est (ou d'un autre, choisi), rechargée quand on change de système ou de planète.
 * Spansh n'est interrogé que si les recherches automatiques sont activées ; sinon, seulement par `loadSpansh` (clic).
 */
export function useSurvey(here, other = null) {
  const [survey, setSurvey] = useState(null);
  const system = other?.system || here?.system || null;
  const load = (online = false) => {
    if (!system) {
      setSurvey(null);
      return Promise.resolve(null);
    }
    return wpApi.survey(other?.system, other?.systemAddress, online).then(setSurvey);
  };
  const reload = () => {
    load().catch(() => {});
  };
  useEffect(reload, [system, other ? null : here?.body]);
  useEvent('waypoints:survey', (e) => (!e?.system || e.system === system) && reload());
  useEvent('waypoints:update', reload);
  /** Clic sur « Charger depuis Spansh » : la seule façon d'interroger Spansh quand les recherches automatiques sont coupées. */
  const loadSpansh = () => load(true);
  return [survey, setSurvey, loadSpansh];
}

/** Réglage des recherches en ligne automatiques de Mes repères ({ auto, asked }), et le choix du joueur. */
export function useOnlineSetting() {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    wpApi.online().then(setState).catch(() => {});
  }, []);
  useEvent('waypoints:online', setState);
  const choose = (auto) => {
    setError(null);
    return wpApi.setOnline(auto).then(setState).catch((e) => setError(e.message));
  };
  return { state, choose, error };
}

/**
 * Proposé une fois, en haut de Mes repères : les recherches en ligne automatiques (Spansh, Ardent) avec le système où
 * tu es. Coupées tant que tu ne les actives pas ; rien n'est demandé tant que tu n'as pas choisi.
 */
export function OnlineChoice({ online }) {
  const { state, choose, error } = online;
  if (!state || state.asked) return null;
  return (
    <section className="panel wp-online">
      <h2>🌐 Recherches en ligne automatiques ?</h2>
      <p>Mes repères peut demander de lui-même, sans que tu cliques :</p>
      <ul>
        <li>à <b>Spansh</b>, les planètes à EEP du système où tu es, à chaque nouveau système ;</li>
        <li>à <b>Ardent Insight</b>, les prix des minerais de ce système (bulle « où vendre » du balayage, Top 10 « Ce système »).</li>
      </ul>
      <p className="small muted">
        Seuls le nom du système et son adresse dans le jeu partent, mais Spansh et Ardent voient alors ton adresse IP et la
        suite des systèmes où tu passes, avec l’heure. Tant que tu n’actives pas, rien ne part : les boutons « Charger depuis
        Spansh » et « Charger les prix d’Ardent » font la recherche quand tu le décides. Tu pourras changer d’avis en bas de
        cette page.
      </p>
      <div className="wp-online-actions">
        <button className="btn btn-primary" onClick={() => choose(true)}>Activer les recherches automatiques</button>
        <button className="btn" onClick={() => choose(false)}>Non merci, seulement quand je clique</button>
      </div>
      {error && <p className="bad">{error}</p>}
    </section>
  );
}

/** Le réglage, une fois choisi : une ligne en bas de Mes repères pour changer d'avis. */
export function OnlineLine({ online }) {
  const { state, choose, error } = online;
  if (!state?.asked) return null;
  return (
    <p className="small muted wp-online-line">
      🌐 Recherches en ligne automatiques (Spansh, Ardent, système où tu es) : <b>{state.auto ? 'activées' : 'coupées'}</b>
      {' '}<button className="btn small" onClick={() => choose(!state.auto)}>{state.auto ? 'Les couper' : 'Les activer'}</button>
      {error && <span className="bad"> {error}</span>}
    </p>
  );
}

const hourOf = (iso) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null);

/** Planètes de Spansh : reçues (à quelle heure), à charger d'un clic (recherches automatiques coupées), ou injoignables. */
function SpanshLine({ spansh, onLoad }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (!spansh) return null;
  const click = () => {
    setBusy(true);
    setError(null);
    onLoad().catch((e) => setError(e.message)).finally(() => setBusy(false));
  };
  let text;
  if (!spansh.available) text = 'Spansh : adresse du système pas encore connue (elle vient du journal), rien à demander.';
  else if (spansh.loaded) text = `Planètes relevées sur Spansh, reçues à ${hourOf(spansh.at)}.`;
  else if (spansh.error) text = `Spansh injoignable pour l’instant (${spansh.error}).`;
  else text = 'Planètes de Spansh non demandées : recherches automatiques coupées.';
  const button = spansh.available && (!spansh.auto || spansh.error);
  return (
    <p className="small muted survey-spansh">
      🌐 {text}
      {button && <> <button className="btn small" disabled={busy} onClick={click}>{busy ? 'Chargement…' : spansh.loaded ? 'Recharger depuis Spansh' : 'Charger depuis Spansh'}</button></>}
      {error && <span className="bad"> {error}</span>}
    </p>
  );
}

/** « ● Iridium · EEP 4, 7 » : ce qu'on peut venir chercher sur une planète, chaque minerai à sa couleur. */
export function OreSummary({ ores, weak = false }) {
  const good = ores.filter((o) => o.good.length);
  const rest = weak ? ores.filter((o) => !o.good.length) : [];
  if (!good.length && !rest.length) return null;
  return (
    <span className="survey-ores">
      {good.map((o) => (
        <span key={o.ore} className="pl-minerai" style={{ '--c': couleurMinerai(o.ore) }} title={o.good.map((x) => `EEP ${x.number}${x.rating ? ` : ${x.rating}/10` : ''}`).join('\n')}>
          <i aria-hidden="true" />{o.ore}<small>EEP {o.good.map((x) => x.number).join(', ')}</small>
        </span>
      ))}
      {rest.map((o) => (
        <span key={o.ore} className="pl-minerai is-faible" style={{ '--c': couleurMinerai(o.ore) }} title="dans des EEP pas encore notés ou faibles"><i aria-hidden="true" />{o.ore}</span>
      ))}
    </span>
  );
}

/**
 * Ligne d'un repère : un clic l'ouvre (guidage, actions). L'essentiel seulement (refonte du 19 nov. 2026) : le minerai
 * à sa couleur, l'EEP, les foreuses, et son état s'il n'est plus bon. Les coordonnées sont sur sa fiche ; le type n'est
 * dit que s'il n'est pas un repère de minage.
 */
export function WaypointRow({ w, onOpen, place = false }) {
  const auto = /Fin du dernier minage/.test(w.label);
  return (
    <button className={`wp-row rp-ligne${auto ? ' is-auto' : ''}`} style={{ '--c': couleurMinerai(w.label) }} onClick={() => onOpen(w)}>
      <i className="rp-pastille" aria-hidden="true" />
      <b className="rp-nom">{w.label}</b>
      {w.siteNumber != null && <span className="rp-eep">EEP {w.siteNumber}</span>}
      {w.drills != null && <span className="rp-foreuses">{w.drills} foreuse{w.drills > 1 ? 's' : ''}</span>}
      {w.unprofitable && <span className="pill pill-bad">pas rentable</span>}
      {isDepleted(w) && <span className="pill pill-warn">tari</span>}
      {w.category !== 'mining' && <span className="rp-type">{w.categoryLabel}</span>}
      {place && (w.body || w.station) && <span className="rp-lieu">{shortPlace(w.body || w.station, w.system)}</span>}
      {w.latitude == null && w.category === 'mining' && <span className="rp-type">sans coordonnées</span>}
      <span className="wp-row-go">›</span>
    </button>
  );
}

/**
 * Ligne d'une planète dans l'écran du système : son nom, son type, ce qu'on y trouve (minerais à leur couleur), et à
 * droite sa meilleure note et où en est sa prospection. Le verdict est dit par la section où elle est rangée.
 */
function PlanetCard({ planet, current, onOpen }) {
  return (
    <button className={`pl-ligne is-${planet.verdict}${planet.here ? ' is-here' : ''}`} onClick={onOpen}>
      <span className="pl-nom">
        <b>{planet.name}</b>
        {planet.type && <small><IconeMonde type={planet.type} taille={14} />{planet.type}</small>}
      </span>
      <span className="pl-quoi">
        {planet.here && <span className="pl-ici">tu es ici{current?.site != null && ` · EEP ${current.site}`}</span>}
        <OreSummary ores={planet.ores} />
        {retour(planet) && <span className="small muted">{retour(planet)}</span>}
      </span>
      <span className="pl-bilan" title={planet.count != null ? `${planet.seen} EEP vus sur ${planet.count}` : `${planet.seen} EEP vus`}>
        {planet.best && <b className="pl-note">{planet.best}<small>/10</small></b>}
        <small>{planet.count != null ? `${planet.seen}/${planet.count} EEP` : `${planet.seen} EEP`}</small>
      </span>
      <span className="wp-row-go">›</span>
    </button>
  );
}

// Sections de l'écran du système, dans l'ordre : ce qui se mine d'abord, le reste replié
const SECTIONS = [
  { verdicts: ['good'], titre: 'Rentables', classe: 'is-good' },
  { verdicts: ['depleted'], titre: 'Taries', classe: 'is-depleted' },
  { verdicts: ['low'], titre: 'Petits gisements', classe: 'is-low' },
  { verdicts: ['unknown'], titre: 'À prospecter', classe: 'is-unknown' }, // toujours dépliée (Cronisos, 19 nov. 2026)
  { verdicts: ['bad', 'out'], titre: 'Écartées', classe: 'is-out', replie: true },
];

/** Écran du système : l'EEP ciblé en jeu, puis les planètes à EEP rangées par verdict, les rentables d'abord. */
export function SystemView({ survey, here, other, onBackHome, openPlanet, openSite, onLoadSpansh }) {
  if (!survey) return <p className="muted">{here?.system ? 'Chargement…' : 'Position inconnue : lance le jeu.'}</p>;
  const target = survey.current?.site != null && survey.planets.find((p) => p.here);
  const sections = SECTIONS.map((sec) => ({ ...sec, planetes: survey.planets.filter((p) => sec.verdicts.includes(p.verdict)) })).filter((sec) => sec.planetes.length);
  return (
    <section className="panel pl">
      <div className="survey-top">
        <h2><NomSysteme nom={survey.system} /></h2>
        {other && <button className="btn small" onClick={onBackHome}>↩ Revenir au système où je suis</button>}
      </div>
      {target && (
        <button className="wp-target" onClick={() => openSite(target.body, survey.current.site)}>
          🎯 EEP {survey.current.site} ciblé en jeu · planète {target.name} <span className="wp-row-go">›</span>
        </button>
      )}
      {!sections.length && <p className="muted">Aucune planète à EEP connue dans ce système (ni scannée, ni relevée sur Spansh).</p>}
      {sections.map((sec) => {
        const lignes = <div className="pl-liste">{sec.planetes.map((p) => <PlanetCard key={p.body} planet={p} current={survey.current} onOpen={() => openPlanet(p.body)} />)}</div>;
        const titre = <>{sec.titre} <b>{sec.planetes.length}</b></>;
        // Une planète où tu es ne se cache pas dans une section repliée
        // … ni quand elle est la seule de l'écran (système tout juste arrivé : rien d'autre à montrer)
        return sec.replie && sections.length > 1 && !sec.planetes.some((p) => p.here)
          ? <details key={sec.titre} className={`pl-section ${sec.classe}`}><summary>{titre}</summary>{lignes}</details>
          : <div key={sec.titre} className={`pl-section ${sec.classe}`}><h3>{titre}</h3>{lignes}</div>;
      })}
      <p className="tiny muted" title={`Un EEP est rentable à partir de ${GOOD_RATING}/10`}>Un EEP est rentable à partir de {GOOD_RATING}/10.</p>
      {onLoadSpansh && <SpanshLine spansh={survey.spansh} onLoad={onLoadSpansh} />}
    </section>
  );
}

/** Planète de l'écran : celle de la prospection, ou une planète sans EEP connu (repères d'un autre type). */
export function findPlanet(survey, body) {
  return survey?.planets.find((p) => p.body === body) || null;
}

/** Écran d'une planète : verdict, « planète out », notes, grille de ses EEP et repères sans numéro d'EEP. */
export function PlanetView({ survey, body, waypoints, onSaveBody, openSite, openWaypoint }) {
  const planet = findPlanet(survey, body);
  const [notes, setNotes] = useState(planet?.notes || '');
  const [extra, setExtra] = useState('');
  useEffect(() => setNotes(planet?.notes || ''), [planet?.notes]);
  const loose = waypoints.filter((w) => w.body === body && (w.siteNumber == null || !planet));

  if (!planet) {
    return (
      <section className="panel">
        <h2>🪐 {shortPlace(body, survey?.system)}</h2>
        <p className="small muted">Aucun EEP connu sur cette planète.</p>
        <div className="wp-rows">{loose.map((w) => <WaypointRow key={w.id} w={w} onOpen={openWaypoint} />)}</div>
      </section>
    );
  }
  const v = VERDICTS[planet.verdict];
  const current = survey.current;
  const count = tileCount(planet); // borné (surveyTiles.js) : un nombre d’EEP démesuré venu de Spansh
  const tiles = Array.from({ length: count }, (_, i) => planet.sites.find((s) => s.number === i + 1) || blankSite(i + 1));
  // Classement : les mieux notés d'abord, puis ceux à noter, les mauvais à la fin
  const order = (s) => (s.bad ? -2 : s.rating ?? (s.deposits.length ? 0 : -1));
  const noted = planet.sites.filter((s) => s.deposits.length || s.bad || s.notes || s.rating != null || s.waypoints.length)
    .sort((a, b) => order(b) - order(a) || a.number - b.number);

  return (
    <section className={`panel survey-planet-view is-${planet.verdict}`}>
      <div className="survey-top">
        <h2>🪐 {planet.name}</h2>
        <span className={`pill ${v.pill}`}>{v.icon} {v.label}</span>
        {planet.type && <span className={`pill survey-type is-${typeKey(planet.type)}`}>{planet.type}</span>}
        {planet.here && <span className="pill pill-eep">📍 tu es ici{current?.site != null && ` · EEP ${current.site}`}</span>}
      </div>
      <p className="small muted">
        {[ls(planet.distance), gravity(planet.gravity), planet.count != null ? `${planet.seen} EEP vus sur ${planet.count}` : `${planet.seen} EEP vus`, retour(planet)]
          .filter(Boolean).join(' · ')}
        {planet.good > 0 && <> · <b className="good">{planet.good} rentable{planet.good > 1 ? 's' : ''}</b></>}
      </p>
      <OreSummary ores={planet.ores} weak />
      <div className="survey-planet-actions">
        <button className={`btn small ${planet.out ? 'btn-danger-on' : 'btn-ghost'}`} onClick={() => onSaveBody(planet, { out: !planet.out, notes })}
          title="Rien de correct sur cette planète : elle passe en fin de liste">
          ⛔ {planet.out ? 'Planète out (annuler)' : 'Planète out'}
        </button>
        <input className="survey-notes" placeholder="Notes sur la planète" value={notes} onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== planet.notes && onSaveBody(planet, { out: planet.out, notes })} />
      </div>
      <h3 className="wp-sub">Emplacements</h3>
      <div className="survey-grid">
        {tiles.map((s) => (
          <button key={s.number} className={`survey-tile is-${s.state} ${planet.here && current?.site === s.number ? 'is-current' : ''}`}
            title={`EEP ${s.number} : ${STATES[s.state]}${s.rating ? ` · ${s.rating}/10` : ''}${s.deposits.map((d) => `\n${d.ore}`).join('')}`}
            onClick={() => openSite(planet.body, s.number)}>
            <b>{s.number}</b>
            {s.rating != null ? <small>{s.rating}/10</small> : s.deposits.length > 0 && <small>{s.deposits.length} min.</small>}
            {s.waypoints.length > 0 && <i>📍</i>}
          </button>
        ))}
        {!count && <span className="small muted">Nombre d’EEP inconnu : scanne la planète, ou tape un numéro.</span>}
        <input className="survey-extra" type="number" min="1" max="999" placeholder="n° EEP" value={extra} onChange={(e) => setExtra(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && Number(e.target.value) >= 1) openSite(planet.body, Number(e.target.value)); }} />
      </div>
      {noted.length > 0 && (
        <>
          <h3 className="wp-sub">Classement des EEP</h3>
          <div className="wp-rows">
            {noted.map((s) => (
              <button key={s.number} className={`wp-row survey-eep-row is-${s.state}`} onClick={() => openSite(planet.body, s.number)}>
                <b className={`survey-rating is-${s.state}`}>{s.rating != null ? `${s.rating}/10` : s.bad ? '✗' : '–'}</b>
                <b className="survey-eep-num">EEP {s.number}</b>
                <span className={`pill ${STATE_PILLS[s.state]}`}>{STATES[s.state]}</span>
                <span className="survey-eep-ores">
                  {s.deposits.length > 0 ? oreList(s) : <span className="small muted">minerais pas notés</span>}
                </span>
                {s.notes && <span className="small muted">{s.notes}</span>}
                {s.waypoints.length > 0 && <span className="pill pill-info">📍 {s.waypoints.length}</span>}
                <span className="wp-row-go">›</span>
              </button>
            ))}
          </div>
        </>
      )}
      {loose.length > 0 && (
        <>
          <h3 className="wp-sub">Repères sans numéro d’EEP</h3>
          <div className="wp-rows">{loose.map((w) => <WaypointRow key={w.id} w={w} onOpen={openWaypoint} />)}</div>
        </>
      )}
    </section>
  );
}

/**
 * Écran d'un EEP : note de 1 à 10 (ou rien d'intéressant), ses minerais, notes, ses repères, la dernière capture, et
 * les EEP voisins pour passer de l'un à l'autre.
 */
export function EepView({ survey, here, body, number, waypoints, captures, onSaveSite, openSite, openWaypoint, onMark, marking = false }) {
  const planet = findPlanet(survey, body);
  const site = planet?.sites.find((s) => s.number === number) || blankSite(number);
  const [notes, setNotes] = useState(site.notes);
  const [custom, setCustom] = useState('');
  useEffect(() => setNotes(site.notes), [number, site.notes]);
  if (!planet) return <section className="panel"><p className="muted">Planète inconnue dans ce système.</p></section>;

  const save = (change) => onSaveSite(planet, { number, bad: site.bad, rating: site.rating, deposits: site.deposits, notes, ...change });
  const addOre = (ore) => ore && save({ deposits: [...site.deposits, { ore }] });
  const free = survey.ores.filter((o) => !site.deposits.some((d) => d.ore.toLowerCase() === o.toLowerCase()));
  const linked = waypoints.filter((w) => w.body === body && w.siteNumber === number);
  const capture = captures.find((c) => c.body === body && c.site === number);
  const count = tileCount(planet, number);
  const onPlanet = here?.body === body;
  const targeted = planet.here && survey.current?.site === number;

  return (
    <section className={`panel survey-eep is-${site.state}`}>
      <div className="survey-top">
        <button className="btn small" disabled={number <= 1} onClick={() => openSite(body, number - 1)} title="EEP précédent">◂</button>
        <h2>EEP {number}</h2>
        <button className="btn small" disabled={number >= count} onClick={() => openSite(body, number + 1)} title="EEP suivant">▸</button>
        <span className={`pill ${STATE_PILLS[site.state]}`}>{STATES[site.state]}</span>
        {targeted && <span className="pill pill-eep">🎯 ciblé en jeu</span>}
        <span className="small muted">planète {planet.name}</span>
        <span className="survey-grow" />
        <button className={`btn small ${site.bad ? 'btn-danger-on' : 'btn-ghost'}`} onClick={() => save({ bad: !site.bad })}>✗ Rien d’intéressant</button>
        <button className="btn btn-ghost small" onClick={() => { setNotes(''); save({ bad: false, rating: null, deposits: [], notes: '' }); }} title="Oublier ce qu'on a noté">Effacer</button>
      </div>

      <h3 className="wp-sub">Note de l’EEP</h3>
      <div className="survey-ratings">
        {RATINGS.map((n) => (
          <button key={n} className={`survey-rate ${site.rating === n ? 'is-on' : ''} ${n >= GOOD_RATING ? 'is-good' : ''}`}
            onClick={() => save({ bad: false, rating: site.rating === n ? null : n })}>{n}</button>
        ))}
        <span className="tiny muted">rentable à partir de {GOOD_RATING}</span>
      </div>

      <h3 className="wp-sub">Minerais</h3>
      <div className="survey-add">
        {site.deposits.map((d) => (
          <span key={d.ore} className="survey-ore-chip">
            {d.ore}
            <button onClick={() => save({ deposits: site.deposits.filter((x) => x.ore !== d.ore) })} aria-label={`Retirer ${d.ore}`}>✕</button>
          </span>
        ))}
        {!site.deposits.length && <span className="small muted">Aucun : photographie le panneau de cible (📷, Alt+Maj+P) ou ajoute-les.</span>}
      </div>
      <div className="survey-add">
        <span className="tiny muted">Ajouter :</span>
        {free.map((o) => <button key={o} className="picker-chip" onClick={() => addOre(o)}>+ {o}</button>)}
        <input className="survey-custom" placeholder="autre…" value={custom} onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { addOre(custom.trim()); setCustom(''); } }} />
      </div>
      <input className="survey-notes" placeholder="Notes (accès, relief…)" value={notes} onChange={(e) => setNotes(e.target.value)}
        onBlur={() => notes !== site.notes && save({ notes })} />

      <h3 className="wp-sub">Repères</h3>
      <div className="wp-rows">
        {linked.map((w) => <WaypointRow key={w.id} w={w} onOpen={openWaypoint} />)}
        {!linked.length && <span className="small muted">Aucun repère sur cet EEP.</span>}
      </div>
      <button className="btn btn-primary" disabled={!onPlanet || marking} onClick={() => onMark({ category: 'mining', siteNumber: number })}
        title={onPlanet ? 'Enregistre ta position sur cet EEP' : 'Pose-toi sur la planète pour marquer ta position'}>
        📍 Marquer ici sur l’EEP {number}
      </button>

      {capture && (
        <>
          <h3 className="wp-sub">Dernière capture</h3>
          <div className="capture">
            <img src={wpApi.captureImage(capture.id)} alt="Capture" />
            <pre className="capture-lines">{capture.lines.map((l) => l.text).join('\n') || 'Aucun texte lu.'}</pre>
          </div>
        </>
      )}
    </section>
  );
}

/** Écran des systèmes déjà prospectés : un clic ouvre leur prospection. */
export function SystemsView({ current, onPick }) {
  const [systems, setSystems] = useState(null);
  useEffect(() => {
    wpApi.surveySystems().then(setSystems).catch(() => setSystems([]));
  }, []);
  if (!systems) return <p className="muted">Chargement…</p>;
  return (
    <section className="panel">
      <h2>Systèmes prospectés</h2>
      <div className="survey-systems">
        {systems.length ? systems.map((s) => (
          <button key={s.system} className={`survey-system ${s.system === current ? 'is-active' : ''}`} onClick={() => onPick(s)}>
            <b><NomSysteme nom={s.system} /></b>
            <span className="small muted">
              {s.good} rentable{s.good > 1 ? 's' : ''}{s.depleted > 0 && ` · ${s.depleted} tarie${s.depleted > 1 ? 's' : ''}`} · {s.out} écartée{s.out > 1 ? 's' : ''}
            </span>
            {s.ores.length > 0 && <span className="small good">{s.ores.join(', ')}</span>}
          </button>
        )) : <span className="small muted">Aucun système prospecté pour l’instant.</span>}
      </div>
    </section>
  );
}
