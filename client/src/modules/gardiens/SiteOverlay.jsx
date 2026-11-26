// Fenêtre en jeu (/hud/gardiens-site) : la carte vivante du site gardien en vue. Nord en haut : toi (flèche, d'après
// Status.json) et les points du site placés d'après leurs coordonnées, avec la distance à chacun. Les points se marquent
// sur place (« + Pylône »…) sans dire lesquels : le serveur reconnaît le schéma du site, nomme les points, corrige un
// type mal choisi et calcule ceux qui manquent (server/src/modules/gardiens/calage.js). Des filtres choisissent ce
// qu'on montre. Le serveur ouvre la fenêtre à l'approche d'un site (site.js).

import { useEffect, useState } from 'react';
import { PanelOverlay } from '../../core/hud.jsx';
import { api } from '../../core/api.js';
import { tenter } from '../../core/actions.js';
import { useEvent } from '../../core/stream.js';
import { carte, cote, metres } from './carteSite.js';

const T = 300; // côté de la carte, en unités du dessin
const COULEURS = { pylone: '#4fd8e6', machine: '#ffd24a', relique: '#b48cff', panneau: '#5fd38d', sentinelle: '#ff7a6b', materiau: '#f0d264' };
/** Les points qui comptent pour activer le site : toujours listés en entier. Les autres : les plus proches seulement. */
const PRINCIPAUX = new Set(['pylone', 'machine', 'relique']);
const PROCHES = 4;
const CLE_FILTRES = 'enova-gardiens-filtres';
const CSS = `
.gs { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #dfe4ea; }
.gs-lieu { margin: 0; }
.gs-plan { margin-left: 6px; padding: 0 6px; border: 1px solid #4fd8e6; color: #4fd8e6; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
.gs-corps { display: flex; gap: 10px; align-items: flex-start; }
.gs-carte { flex: none; width: 56%; max-width: 340px; aspect-ratio: 1; background: rgba(3,5,8,.72); border: 1px solid rgba(79,216,230,.35); }
.gs-liste { flex: 1; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 3px; }
.gs-liste li { display: flex; gap: 6px; align-items: baseline; padding: 2px 6px; border-left: 3px solid var(--c); background: rgba(255,255,255,.04); }
.gs-liste b { color: var(--c); }
.gs-liste span { margin-left: auto; white-space: nowrap; }
.gs-liste em { font-style: normal; color: #8a94a0; font-size: 11px; }
.gs-actions { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
.gs-btn { font: inherit; font-size: 12px; cursor: pointer; }
.gs-filtre { font: inherit; font-size: 11px; cursor: pointer; padding: 1px 7px; border: 1px solid var(--c); color: var(--c); background: none; opacity: .45; }
.gs-filtre.is-on { opacity: 1; background: color-mix(in srgb, var(--c) 18%, transparent); }
.gs-muted { color: #8a94a0; margin: 0; }
.gs-err { color: #ff7a6b; margin: 0; }
.gs ol { margin: 0; padding-left: 18px; }
`;
const PLANS = { module: 'plans de module', arme: 'plans d’arme', vaisseau: 'plans de vaisseau' };
const nomPoint = (p, types) => `${types?.[p.type] || p.type}${p.n ? ` ${p.n}` : ''}${p.nom && p.type !== 'machine' ? ` · ${p.nom}` : ''}`;
/** Sur la carte : le numéro du point (une fois le schéma reconnu : son rang dans l'ordre de charge). */
const court = (p) => (p.type === 'machine' ? 'M' : p.n ?? '?');

function lireFiltres() {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_FILTRES) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Marque d'un point sur la carte : cercle (pylône), carré (machine), losange (relique), pastille (le reste). */
function Marque({ p }) {
  const c = COULEURS[p.type] || '#c8ced6';
  const tirets = p.releve || p.calcule ? '3 2' : undefined;
  if (!PRINCIPAUX.has(p.type)) return <circle cx={p.x} cy={p.y} r="4.5" fill={p.calcule ? 'none' : c} stroke={c} strokeWidth="1.5" strokeDasharray={p.calcule ? '2 1.5' : undefined} />;
  return (
    <g>
      {p.type === 'pylone'
        ? <circle cx={p.x} cy={p.y} r="9" fill="rgba(79,216,230,.18)" stroke={c} strokeWidth="2" strokeDasharray={tirets} />
        : <rect x={p.x - 8} y={p.y - 8} width="16" height="16" fill="rgba(0,0,0,.4)" stroke={c} strokeWidth="2" strokeDasharray={tirets} transform={p.type === 'relique' ? `rotate(45 ${p.x} ${p.y})` : undefined} />}
      <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={c}>{court(p)}</text>
    </g>
  );
}

/** La carte : cercles de distance, les points, toi en flèche tournée selon ton cap. */
function Carte({ c }) {
  const pas = c.rayon > 400 ? 200 : c.rayon > 150 ? 100 : 50; // un cercle tous les « pas » mètres
  const k = (T / 2 - 26) / c.rayon;
  const cercles = [];
  for (let r = pas; r * k < T / 2; r += pas) cercles.push(r);
  return (
    <svg className="gs-carte" viewBox={`0 0 ${T} ${T}`} role="img" aria-label="Carte du site">
      {cercles.map((r) => <circle key={r} cx={T / 2} cy={T / 2} r={r * k} fill="none" stroke="rgba(255,255,255,.1)" />)}
      <text x={T / 2} y={12} textAnchor="middle" fontSize="11" fill="#8a94a0">N</text>
      <text x={T - 6} y={T - 6} textAnchor="end" fontSize="10" fill="#8a94a0">cercles : {pas} m</text>
      {/* Les pastilles d'abord : les pylônes et la machine restent lisibles par-dessus */}
      {c.points.filter((p) => !PRINCIPAUX.has(p.type)).map((p) => <Marque key={p.id} p={p} />)}
      {c.points.filter((p) => PRINCIPAUX.has(p.type)).map((p) => <Marque key={p.id} p={p} />)}
      {c.moi && (
        <g transform={`translate(${c.moi.x} ${c.moi.y}) rotate(${c.moi.heading ?? 0})`}>
          <path d="M0 -11 L7 8 L0 4 L-7 8 Z" fill="#fff" stroke="#07090c" strokeWidth="1" />
        </g>
      )}
    </svg>
  );
}

export default function SiteOverlay() {
  const [vue, setVue] = useState(null);
  const [etapes, setEtapes] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [caches, setCaches] = useState(lireFiltres); // types cachés par les filtres
  useEffect(() => {
    api('/modules/gardiens/site').then(setVue).catch(() => {});
  }, []);
  useEvent('gardiens:site', setVue);
  useEvent('gardiens:position', (d) => setVue((v) => (v ? { ...v, position: d?.position ?? null } : v)));
  const site = vue?.site;
  const guide = vue?.guide;
  const types = vue?.types || {};
  const agir = (chemin, body) => tenter(async () => setVue(await api(`/modules/gardiens/site/${chemin}`, { method: 'POST', body })), setErreur);
  const basculer = (type) => setCaches((l) => {
    const suite = l.includes(type) ? l.filter((x) => x !== type) : [...l, type];
    try {
      localStorage.setItem(CLE_FILTRES, JSON.stringify(suite));
    } catch { /* préférence non gardée : sans gravité */ }
    return suite;
  });
  const tous = vue?.points || [];
  const montres = tous.filter((p) => !caches.includes(p.type));
  const c = site ? carte(vue.position, montres, vue.position?.planetRadius) : null;
  // Liste : pylônes, machine et reliques en entier ; pour le reste, seulement les plus proches de toi
  const autres = c ? c.points.filter((p) => !PRINCIPAUX.has(p.type)).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)) : [];
  const liste = c ? [...c.points.filter((p) => PRINCIPAUX.has(p.type)), ...autres.slice(0, PROCHES)] : [];
  const releves = tous.some((p) => p.releve);
  const footer = (
    <>
      <span>{vue?.position ? `Toi : ${vue.position.latitude.toFixed(4)} / ${vue.position.longitude.toFixed(4)}` : 'Position inconnue (trop haut)'}</span>
      {guide && <button type="button" className="gs-btn" onClick={() => setEtapes((e) => !e)}>{etapes ? 'Cacher les étapes' : 'Étapes'}</button>}
      <button type="button" className="gs-btn" onClick={() => api('/modules/gardiens/site/fermer', { method: 'POST' }).catch(() => {})} title="Fermer jusqu’au prochain site">✕</button>
    </>
  );
  return (
    <PanelOverlay title="◬ Site gardien" footer={footer} autoHeight>
      <style>{CSS}</style>
      <div className="gs">
        {!site && <p className="gs-muted">Aucun site gardien en vue.</p>}
        {site && (
          <>
            <p className="gs-lieu"><b>{site.nom}</b> · {site.corps}{site.plan && <span className="gs-plan">{PLANS[site.plan]}</span>}</p>
            <div className="gs-actions" aria-label="Filtres">
              {Object.entries(types).map(([type, nom]) => {
                const n = tous.filter((p) => p.type === type).length;
                return n ? <button key={type} type="button" className={`gs-filtre${caches.includes(type) ? '' : ' is-on'}`} style={{ '--c': COULEURS[type] }} onClick={() => basculer(type)} title={caches.includes(type) ? 'Montrer' : 'Cacher'}>{nom} {n}</button> : null;
              })}
            </div>
            <div className="gs-corps">
              <Carte c={c} />
              <ul className="gs-liste">
                {liste.map((p) => (
                  <li key={p.id} style={{ '--c': COULEURS[p.type] }}>
                    <b>{nomPoint(p, types)}</b>{p.calcule && <em>calculé</em>}
                    <span>{metres(p.distance)} <em>{cote(p.relatif)}</em></span>
                  </li>
                ))}
                {autres.length > PROCHES && <li style={{ '--c': '#8a94a0' }}><em>et {autres.length - PROCHES} autres, plus loin</em></li>}
                {!tous.length && <li style={{ '--c': '#8a94a0' }}>Aucun point marqué : va au pied d’un pylône et clique « + Pylône ».</li>}
              </ul>
            </div>
            {vue.corrige && <p className="gs-muted">Corrigé : {vue.corrige}</p>}
            {vue.schema === 'attente' && <p className="gs-muted">Schéma du site pas encore reconnu : marque 3 points bien écartés (pylônes ou machine), sans te soucier de leur numéro. L’app trouvera lesquels c’est.</p>}
            {vue.schema && vue.schema !== 'attente' && (
              <p className="gs-muted">
                Schéma reconnu (écart {vue.schema.erreur} m) : les numéros sont l’ordre de charge du guide, les points en pointillés sont calculés.
                {vue.schema.hors > 0 && ` ${vue.schema.hors} point${vue.schema.hors > 1 ? 's' : ''} marqué${vue.schema.hors > 1 ? 's' : ''} ne colle${vue.schema.hors > 1 ? 'nt' : ''} pas au schéma.`}
              </p>
            )}
            {releves && <p className="gs-muted">Pylônes d’un relevé de 2018, à vérifier : dès que tu en marques un, ta carte les remplace.</p>}
            <div className="gs-actions">
              {Object.entries(types).map(([type, nom]) => <button key={type} type="button" className="gs-btn" disabled={!vue.position} onClick={() => agir('points', { type })}>+ {nom}</button>)}
              {tous.some((p) => !p.releve && !p.calcule) && <button type="button" className="gs-btn" onClick={() => agir('points/annuler')}>Annuler le dernier</button>}
            </div>
            {erreur && <p className="gs-err">{erreur}</p>}
            {guide && etapes && <ol>{guide.etapes.map((e) => <li key={e}>{e}</li>)}</ol>}
          </>
        )}
      </div>
    </PanelOverlay>
  );
}
