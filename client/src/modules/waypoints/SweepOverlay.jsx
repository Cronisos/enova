import { useEffect, useRef, useState } from 'react';
import { PanelOverlay, useHiddenWindow } from '../../core/hud.jsx';
import { useEvent } from '../../core/stream.js';
import { meters, wpApi } from './api.js';
import { LAST_SPOT, MINERAIS_COLORES, couleurMinerai } from './oreColors.js';
import CarteEEP from './CarteEEP.jsx';
import NomSysteme from '../../core/NomSysteme.jsx';
import { PoseForm, POSE_CSS } from './SweepPose.jsx';
import { ardentAsked, TOP_CSS, TopOresPanel, useSystemMarkets } from './SweepTop.jsx';
import { DRILLS_CSS, DrillStrip, useDrillKey, useDrills } from './DrillsPanel.jsx';

// Fenêtre « Balayage » de l'overlay (/hud/waypoints-sweep), ouverte cachée avec le mode Minage Rhino et montrée par
// le bouton 🎯 du HUD de minage. Tu marques le centre de l'EEP, puis le bord du cercle : le serveur trace les cercles
// à suivre pour que le scanner du SRV voie tout le disque, et compte, tranche par tranche, ce qu'il a déjà vu.
const CSS = `
.sw { font-family: 'Segoe UI', system-ui, sans-serif; color: #dfe4ea; display: flex; flex-direction: column; gap: 5px; margin: -4px -6px 0; }
/* Carte à gauche, aussi grande que possible ; minerais en colonne à droite */
/* Taille fixe, quelle que soit la fenêtre : le cercle à gauche, les minerais dans la place qui reste à droite */
.sw-maprow { display: grid; grid-template-columns: 295px minmax(0, 1fr); gap: 10px; align-items: center; height: 295px; }
.sw-map { width: 295px; height: 295px; display: block; }
.sw-mapwrap { position: relative; min-width: 0; }
.sw-bubble { position: absolute; left: 0; right: 0; bottom: 0; z-index: 2; padding: 8px 10px; background: rgba(7,9,12,.94);
  border: 1px solid var(--c); border-radius: 4px; box-shadow: 0 4px 16px rgba(0,0,0,.6); font-size: 12px; pointer-events: none; }
.sw-bubble h4 { margin: 0 0 4px; font-size: 13px; color: var(--c); letter-spacing: .04em; }
.sw-bubble h4 small { color: #8a94a0; font-weight: 400; letter-spacing: 0; }
.sw-bubble h4 em, .sw-row small em { font-style: normal; color: var(--accent); font-weight: 700; }
.sw-row.is-none small em { color: #8a94a0; }
.sw { position: relative; }
.sw-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 10px; padding: 3px 0; border-top: 1px solid rgba(255,255,255,.06); }
.sw-row:first-of-type { border-top: 0; }
.sw-row b { color: #f4f6f8; font-size: 15px; font-variant-numeric: tabular-nums; text-align: right; }
.sw-row span { color: #dfe4ea; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sw-row small { grid-column: 1 / -1; color: #8a94a0; font-size: 11px; }
.sw-row.is-none b, .sw-row.is-none span { color: #8a94a0; }
.sw-legend span.has-price { cursor: help; }
.sw-legend span.has-price:hover { color: #f4f6f8; }
.sw-radius { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; font-size: 12px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase; color: #8a94a0; }
.sw-radius b { font-size: 22px; letter-spacing: 0; color: var(--accent); text-shadow: 0 0 10px rgba(var(--acc-rgb),.35); font-variant-numeric: tabular-nums; }
.sw-legend { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: #8a94a0; padding-right: 10px; min-width: 0; }
.sw-legend span { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.sw-legend i { width: 7px; height: 7px; transform: rotate(45deg); display: inline-block; }
.sw-big { display: flex; align-items: center; gap: 12px; }
.sw-arrow { flex: none; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; border: 2px solid rgba(var(--acc-rgb),.55); }
.sw-arrow svg { width: 28px; height: 28px; transition: transform .5s ease-out; }
.sw-arrow.is-ok { border-color: #5fd38d; }
.sw-lines { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.sw-tour { font-size: 22px; font-weight: 700; color: #f4f6f8; line-height: 1.1; font-variant-numeric: tabular-nums; }
.sw-say { font-size: 15px; font-weight: 600; color: var(--accent); }
.sw-say.is-ok, .sw-ok { color: #5fd38d; }
.sw-msg { font-size: 14px; line-height: 1.4; margin: 0; }
.sw-msg small, .sw-dim { display: block; color: #8a94a0; font-size: 12px; }
.sw-err { color: #ff6b6b; font-size: 12px; margin: 0; }
.sw-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
.sw-btn { flex: 1; min-width: 0; height: 28px; padding: 0 8px; border: 1px solid var(--accent); border-radius: 4px; background: #07090c;
  color: var(--accent); font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.sw-btn:hover { background: var(--accent); color: #07090c; }
.sw-btn.is-quiet { flex: none; border-color: #4a525c; color: #8a94a0; }
.sw-btn.is-quiet:hover { background: #4a525c; color: #f4f6f8; }
.sw-btn.is-warn { border-color: #ff6b6b; color: #ff6b6b; }
/* Poser un repère : l'action principale du balayage, en grand au-dessus des commandes du cercle */
.sw-mark { width: 100%; height: 36px; display: flex; align-items: center; gap: 10px; padding: 0 10px 0 12px; cursor: pointer;
  border: 1px solid rgba(var(--acc-rgb),.75); border-left: 3px solid var(--accent); border-radius: 3px;
  background: linear-gradient(90deg, rgba(var(--acc-rgb),.22), rgba(var(--acc-rgb),.06)); color: #f4f6f8;
  font-family: inherit; font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; transition: background .15s; }
.sw-mark:hover { background: linear-gradient(90deg, rgba(var(--acc-rgb),.38), rgba(var(--acc-rgb),.14)); }
.sw-mark svg { width: 15px; height: 15px; flex: none; fill: var(--accent); }
.sw-mark kbd { margin-left: auto; margin-right: 2px; padding: 1px 6px; border: 1px solid rgba(var(--acc-rgb),.5); border-radius: 3px; font-family: inherit;
  font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: none; color: var(--accent); background: rgba(7,9,12,.6); }
.sw-pose { padding: 6px 8px; border: 1px solid rgba(var(--acc-rgb),.45); border-radius: 4px; background: rgba(var(--acc-rgb),.06); font-size: 13px; }
`;

const QUARTERS = [[1, 'Tour terminé'], [0.75, 'Trois quarts du tour'], [0.5, 'La moitié du tour'], [0.25, 'Un quart du tour']];
const tourLabel = (p) => (QUARTERS.find(([q]) => p >= q)?.[1] ?? 'Début du tour');
const pct = (p) => `${Math.floor(p * 100)} %`;

/** Angle qui tourne toujours par le plus court chemin. */
function useSmoothAngle(angle) {
  const last = useRef(angle ?? 0);
  if (angle != null) last.current += ((angle - last.current) % 360 + 540) % 360 - 180;
  return last.current;
}

const credits = (n) => `${Math.round(n).toLocaleString('fr-FR')} Cr`;
/**
 * Bulle d'un minerai survolé : où le vendre dans le système (nommé : ces prix ne valent que là), la station la plus
 * offrante d'abord (3 au plus), avec son prix et sa demande. Piste, distance et âge du relevé : dans le Top 10.
 */
function MarketBubble({ ore, markets }) {
  const list = markets?.ores?.[ore] || [];
  const vend = list.filter((x) => x.demand > 1);
  const montre = (vend.length ? vend : list).slice(0, 3);
  let vide = null;
  if (!markets) vide = 'Prix en cours de chargement…';
  else if (!list.length) vide = !ardentAsked(markets) ? 'Prix d’Ardent coupés (Mes repères › recherches automatiques).' : markets.error ? 'Prix injoignables pour l’instant.' : 'Aucune station du système ne l’achète.';
  return (
    <div className="sw-bubble" style={{ '--c': couleurMinerai(ore) }}>
      <h4>{ore} {markets?.system && <small>· prix dans <em><NomSysteme nom={markets.system} /></em></small>}</h4>
      {vide && <div className="sw-row is-none"><span>{vide}</span></div>}
      {montre.map((x) => (
        <div key={x.station} className={`sw-row ${x.demand > 1 ? '' : 'is-none'}`}>
          <span>{x.station}</span>
          <b>{credits(x.sell)}</b>
          <small>{x.demand > 1 ? <>demande <em>{x.demand.toLocaleString('fr-FR')}</em></> : 'pas de demande'}</small>
        </div>
      ))}
      {!vend.length && list.length > 0 && <div className="sw-row is-none"><span>Personne n’en demande en ce moment.</span></div>}
    </div>
  );
}

/** Les minerais des repères de la carte, du plus cher au moins cher, avec leur couleur. */
function Legend({ marks, pick }) {
  const ores = MINERAIS_COLORES.filter((o) => marks?.some((m) => !m.auto && m.ore === o));
  const last = marks?.some((m) => m.auto);
  if (!ores.length && !last) return null;
  return (
    <div className="sw-legend">
      {ores.map((o) => (
        <span key={o} className="has-price" onMouseEnter={() => pick(o)} onMouseLeave={() => pick(null)}>
          <i style={{ background: couleurMinerai(o) }} />{o}
        </span>
      ))}
      {last && <span><i style={{ background: LAST_SPOT }} />Dernier minage</span>}
    </div>
  );
}

export default function SweepOverlay() {
  const [v, setV] = useState(null);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    wpApi.sweep().then(setV).catch(() => {});
  }, []);
  useEvent('waypoints:sweep', setV);
  useEffect(() => {
    if (!confirm) return undefined;
    const t = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [confirm]);

  const g = v?.guide;
  const ok = g?.kind === 'ring' ? g.onRing : false;
  const angle = useSmoothAngle(g ? (g.turn ?? g.bearing) : null);

  const overlay = window.eliteOverlay;
  const hover = overlay ? { onMouseEnter: () => overlay.setHover(true), onMouseLeave: () => overlay.setHover(false) } : {};

  // Prix des minerais dans le système, pour la bulle : relus au changement de système, puis toutes les 10 min
  const [ore, setOre] = useState(null);
  const [markets, loadArdent] = useSystemMarkets(v?.state === 'ready' ? v.system : null);
  // Top 10 : dans l'overlay, le tiroir qui sort de derrière la fenêtre ; dans le navigateur, par-dessus la carte
  const drawer = useHiddenWindow('waypoints-sweep-top');
  const [inside, setInside] = useState(false);
  const docked = Boolean(overlay?.toggleWindow);
  const showTop = docked ? drawer.shown : inside;
  const toggleTop = docked ? drawer.toggle : () => setInside((x) => !x);
  const pick = (o) => {
    setOre(o);
    overlay?.setHover(Boolean(o));
  };
  const act = (call) => () => {
    setError(null);
    call().then(setV).catch((e) => setError(e.message));
  };
  const reset = () => {
    if (!confirm) return setConfirm(true);
    setConfirm(false);
    return act(wpApi.sweepReset)();
  };
  const button = (label, title, onClick, cls = '') => (
    <button key={label} className={`sw-btn ${cls}`} title={title} {...hover} onClick={onClick}>{label}</button>
  );
  // Foreuses du Rhino : pose marquée au bouton ⛏ ou à Alt+Maj+F ; les vidanges, le serveur les voit seul
  const [drills] = useDrills();
  const placeDrill = () => {
    setError(null);
    wpApi.drillPlace().catch((e) => setError(e.message));
  };
  useDrillKey(placeDrill);
  // Repère (📍 ou Alt+Maj+R) : le serveur prend la position et ouvre un brouillon ; rien n'est enregistré avant ✓ OK.
  // Dans l'overlay, le formulaire est dans le tiroir (SweepPose.jsx) ; dans le navigateur, ici même.
  const [pose, setPose] = useState(null);
  const marquer = () => {
    setError(null);
    wpApi.brouillon().then((b) => !docked && setPose(b)).catch((e) => setError(e.message));
  };
  const marqueRef = useRef(marquer);
  marqueRef.current = marquer;
  useEffect(() => {
    const off = window.eliteOverlay?.onMarkKey?.(() => marqueRef.current());
    return typeof off === 'function' ? off : undefined;
  }, []);
  const markBtn = (
    <button type="button" className="sw-mark" title="Poser un repère ici : foreuses, n° d’EEP et minerai, enregistrés à ✓ OK" {...hover} onClick={marquer}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>
      Poser un repère <kbd>Alt+Maj+R</kbd>
    </button>
  );
  const poseLigne = pose && !docked && (
    <div className="sw-pose">
      <style>{POSE_CSS}</style>
      <PoseForm key={pose.id} brouillon={pose} hover={hover} onDone={() => setPose(null)} />
      <button type="button" className="sw-btn is-quiet" {...hover} onClick={() => setPose(null)}>Abandonner</button>
    </div>
  );
  const drillBtn = button('⛏', 'Foreuse posée ici : marque ta position (Alt+Maj+F)', placeDrill, 'is-quiet');
  const centerBtn = (again) => button(again ? '◎ Nouveau centre' : '◎ Je suis au centre', 'Marque ta position comme centre de l’EEP', act(wpApi.sweepCenter), again ? 'is-quiet' : '');
  const resetBtn = button(confirm ? 'Sûr ?' : '↺', 'Effacer cet EEP de tes EEP balayés (ses repères restent)', reset, `is-quiet ${confirm ? 'is-warn' : ''}`);

  // Titre : le numéro de l'EEP où tu es (« ? » tant qu'il est inconnu : tape-le une fois dans le tiroir du repère)
  const titre = v?.eep ? `🎯 Balayage · EEP ${v.eep.numero ?? '?'}${v.eep.nom ? ` · ${v.eep.nom}` : ''}` : '🎯 Balayage de l’EEP';
  let body;
  let buttons;
  let footer = null;
  if (!v || v.state === 'empty') {
    body = (
      <p className="sw-msg">
        {v?.eeps ? 'Aucun EEP balayé ici. ' : ''}Va au centre de l’EEP et appuie sur ◎.
        <small>Puis roule jusqu’au bord du cercle : l’app tracera les cercles à suivre pour que le scanner voie tout. Chaque EEP balayé est gardé : sa carte revient quand tu y retournes.</small>
      </p>
    );
    buttons = [centerBtn(false), drillBtn];
  } else if (v.state === 'center') {
    body = (
      <p className="sw-msg">
        Centre marqué. Roule jusqu’au bord du cercle, puis appuie sur ◯.
        <small>{v.onBody ? `Tu es à ${meters(v.you?.d)} du centre.` : `Le centre est sur ${v.body}.`}</small>
      </p>
    );
    buttons = [button('◯ Je suis au bord', 'Marque ta position comme bord du cercle', act(wpApi.sweepEdge)), centerBtn(true), drillBtn, resetBtn];
  } else {
    const step = v.current != null ? v.steps[v.current] : null;
    let head;
    let say = null;
    if (v.done) {
      head = <span className="sw-tour sw-ok">EEP balayé en entier ✓</span>;
    } else if (step.kind === 'ring') {
      head = <span className="sw-tour">{tourLabel(step.progress)} · {pct(step.progress)}</span>;
      if (g) {
        say = ok
          ? <span className="sw-say is-ok">{g.inBand && !g.near ? `Tout est vu ✓ · cercle à ${meters(Math.abs(g.offset))}` : 'Sur le cercle ✓'}</span>
          : <span className="sw-say">{g.offset < 0 ? 'Écarte-toi du centre' : 'Rapproche-toi du centre'} : {meters(Math.abs(g.offset))}</span>;
      }
    } else {
      head = <span className="sw-tour">Passe par le centre</span>;
      if (g) say = <span className="sw-say">{meters(g.distance)} · cap {g.bearing}°</span>;
    }
    body = (
      <>
        <div className="sw-maprow">
          <div className="sw-mapwrap">
            <CarteEEP v={v} pick={pick} drills={drills} />
            {ore && <MarketBubble ore={ore} markets={markets} />}
          </div>
          <Legend marks={v.marks} pick={pick} />
        </div>
        <div className="sw-big">
          {g && !v.done && (
            <div className={`sw-arrow ${ok ? 'is-ok' : ''}`}>
              <svg viewBox="0 0 60 60" style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true">
                <path d="M30 4 L50 50 L30 40 L10 50 Z" fill={ok ? '#5fd38d' : '#ff9a3c'} />
              </svg>
            </div>
          )}
          <div className="sw-lines">
            {head}
            {say}
            {!v.onBody && <span className="sw-dim">Tu n’es pas sur la planète du balayage.</span>}
          </div>
        </div>
      </>
    );
    buttons = [button('💎 Top 10', 'Minerais du Rhino à chercher en priorité', toggleTop, showTop ? '' : 'is-quiet'), centerBtn(true), drillBtn, resetBtn];
    footer = <><span className="hud-tag">Balayé {pct(v.covered)}</span><span>route ≈ {meters(v.route)}</span></>;
  }

  return (
    <PanelOverlay title={titre} footer={footer}>
      <style>{CSS}</style>
      {!docked && <style>{TOP_CSS}</style>}
      <style>{DRILLS_CSS}</style>
      <div className={`sw ${drills?.active ? 'has-drills' : ''}`}>
        {!docked && inside && <TopOresPanel className="is-inside" onClose={toggleTop} hover={hover} markets={markets} onLoadArdent={loadArdent} />}
        {body}
        {drills?.active && <DrillStrip d={drills} map={v?.state !== 'ready'} hover={hover} />}
        {poseLigne}
        {error && <p className="sw-err">{error}</p>}
        {markBtn}
        <div className="sw-buttons">{buttons}</div>
      </div>
    </PanelOverlay>
  );
}
