import { useEffect, useRef, useState } from 'react';
import { PanelOverlay } from '../../core/hud.jsx';
import { api } from '../../core/api.js';
import { useEvent } from '../../core/stream.js';
import { ago, compact, cr, dateTime, int, time } from '../../core/format.js';
import { cleanText } from '../../core/text.js';
import { ModeJeu, RebuyCell } from './Rebuy.jsx';
import { CommunityGoalsCell } from './CommunityGoals.jsx';
import { communityGoalCash, communityGoalRewardTotal } from './communityGoalsView.js';

const base = '/modules/glance';

// Styles propres à cette fenêtre, en plus de ceux du HUD (cases hud-cell, couleurs, police).
const CSS = `
.gw { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; color: #dfe4ea; font-family: 'Segoe UI', system-ui, sans-serif; }
.gw .hud-cell { padding: 6px 10px; justify-content: flex-start; }
.gw-wide { grid-column: 1 / -1; }
.gw .hud-cell-cv .hud-value { text-align: center; }
.gw-two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
.gw-small { font-size: 12px; color: #8a94a0; }
.gw-small b { color: #f4f6f8; font-variant-numeric: tabular-nums; }
.gw-big { font-size: 30px; font-weight: 700; line-height: 1.05; font-variant-numeric: tabular-nums; color: #f4f6f8; }
.gw-big.is-left { color: var(--c); text-shadow: 0 0 12px color-mix(in srgb, var(--c) 40%, transparent); }
.gw-big.is-done { color: #5fd38d; font-size: 22px; }
.gw-gauge { height: 8px; background: rgba(255,255,255,.08); margin-top: 8px; }
.gw-gauge i { display: block; height: 100%; background: var(--c); box-shadow: 0 0 8px var(--c); }
.gw-sys b.gw-project { color: var(--c); text-shadow: 0 0 10px color-mix(in srgb, var(--c) 45%, transparent); }
.gw-head { display: flex; align-items: baseline; gap: 8px; }
.gw-total { margin-left: auto; color: var(--c); font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
.gw-cash { display: grid; gap: 8px; }
.gw-cash > div { min-width: 0; display: flex; flex-direction: column; align-items: center; text-align: center; }
.gw-cash > div + div { border-left: 1px solid rgba(255,255,255,.07); }
.gw-cash .hud-sub { max-width: 100%; }
.gw-cash .hud-value { white-space: nowrap; }
.gw-cash.is-dense .hud-value { font-size: 22px; line-height: 1.3; }
.gw-sys { display: flex; align-items: center; gap: 8px; margin-top: 2px; min-width: 0; }
.gw-sys .hud-pin { width: 26px; height: 24px; font-size: 13px; opacity: .8; flex: none; }
.gw-sys b { font-size: 17px; color: #f4f6f8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gw-sys .gw-state { margin-left: auto; color: var(--c); font-size: 12px; white-space: nowrap; }
.gw-copied { color: #5fd38d; font-size: 11px; white-space: nowrap; }
.gw-ctrl { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; margin-top: 6px; font-size: 12px; }
.gw-ctrl .gw-bar { grid-column: 1 / -1; height: 4px; background: rgba(255,255,255,.08); }
.gw-ctrl .gw-bar i { display: block; height: 100%; background: var(--c); box-shadow: 0 0 6px var(--c); }
.gw-ctrl em { font-style: normal; color: #8a94a0; font-variant-numeric: tabular-nums; }
.gw-ctrl strong { color: #f4f6f8; font-variant-numeric: tabular-nums; }
.gw-week { font-size: 11px; color: #8a94a0; margin-top: 3px; }
.gw-week .up { color: #5fd38d; } .gw-week .down { color: #ff6b6b; }
.gw-week { display: flex; gap: 4px; white-space: nowrap; }
.gw-change { margin-left: auto; color: #ffd24a; font-weight: 600; }
.gw-change.down { color: #ff6b6b; }
.hud-panel-foot b { color: #f4f6f8; font-weight: 600; font-variant-numeric: tabular-nums; }

`;

/**
 * Données du Coup d'œil, et celles d'autres modules lues par leur API (sans importer leur code) : inventaire
 * d'ingénierie, et projet extension quand le système où l'on est est l'étape en cours d'une route.
 */
function useGlanceData() {
  const [data, setData] = useState(null);
  const [extra, setExtra] = useState({});
  const timer = useRef(null);
  const load = () => {
    api(`${base}/summary`).then((d) => {
      setData(d);
      const name = d?.system?.name;
      if (!name) return setExtra((x) => ({ ...x, work: null }));
      return api(`/modules/expansion/here?system=${encodeURIComponent(name)}`)
        .then((work) => setExtra((x) => ({ ...x, work })))
        .catch(() => setExtra((x) => ({ ...x, work: null })));
    }).catch(() => {});
    api('/modules/engineering/inventory').then((inv) => setExtra((x) => ({ ...x, inventory: inv }))).catch(() => {});
  };
  useEffect(() => {
    load();
    return () => clearTimeout(timer.current);
  }, []);
  const later = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(load, 500);
  };
  useEvent('glance:update', later);
  useEvent('expansion:merits', later); // mérites gagnés, nouveau relevé du système
  return { data, extra };
}

// Bleu de la case du système du projet : bleu Empire, vif (plus lisible que le sourd)
const PROJECT_BLUE = '#4f9dff';

const STATES = { Exploited: 'Exploité', Fortified: 'Consolidé', Stronghold: 'Forteresse', Unoccupied: 'Inoccupé' };

/** Barre de points de contrôle : acquis sur le total du palier. */
function Control({ label, points, total, left = true }) {
  const p = total ? Math.min(1, Math.max(0, points / total)) : 0;
  return (
    <div className="gw-ctrl">
      <span>{label}</span>
      <em><strong>{int(points)}</strong> / {int(total)}{left && ` · reste ${int(Math.max(0, total - points))}`}</em>
      <div className="gw-bar"><i style={{ width: `${Math.round(p * 100)}%` }} /></div>
    </div>
  );
}

/**
 * Système du projet : points actuels et reste en gros, côte à côte, le reste traduit en mérites (4 par point),
 * puis la jauge du palier.
 */
function ProjectPoints({ points, total, next }) {
  const left = Math.max(0, total - points);
  return (
    <>
      <div className="gw-two">
        <div>
          <div className="gw-small">Points actuels</div>
          <div className="gw-big">{int(points)}</div>
          <div className="gw-small">sur {int(total)} pour {next}</div>
        </div>
        <div>
          <div className="gw-small">Reste</div>
          {left > 0 ? (
            <>
              <div className="gw-big is-left">{int(left)} pts</div>
              <div className="gw-small">≈ <b>{int(left * 4)}</b> mérites</div>
            </>
          ) : <div className="gw-big is-done">{next} atteint ✓</div>}
        </div>
      </div>
      <div className="gw-gauge"><i style={{ width: `${Math.min(100, Math.round((points / total) * 100))}%` }} /></div>
    </>
  );
}

/**
 * Système actuel : nom à copier (pour Inara…), état Powerplay et points de contrôle, relevés à l'arrivée.
 * Le bouton de copie est cliquable par-dessus le jeu : son survol rend la fenêtre cliquable.
 * work : c'est le système où travailler pour le projet extension (étape en cours de la route) ; la case garde la
 * même forme, avec l'étape et l'objectif en plus. Le détail (rythme, classement…) reste dans l'app.
 */
function SystemCell({ system, myPower, work, blue = PROJECT_BLUE }) {
  const [copied, setCopied] = useState(false);
  const overlay = window.eliteOverlay;
  const copy = () => {
    if (overlay) overlay.copy(system.name);
    else navigator.clipboard?.writeText(system.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const hover = overlay && { onMouseEnter: () => overlay.setHover(true), onMouseLeave: () => overlay.setHover(false) };
  const conflict = system.conflict.length ? (system.conflict.find((c) => c.power === myPower) || system.conflict[0]) : null;
  const goal = work && (work.info.goal || work.info.next);
  const state = system.label ? `${system.label}${system.power ? ` · ${system.power}` : ''}` : 'pas de Powerplay';
  const label = work
    ? `Projet · étape ${work.index + 1}/${work.count}${goal ? ` · objectif ${STATES[goal]}${work.info.missingGoal === 0 ? ' ✓' : ''}` : ''}`
    : `Système · relevé à ${time(system.at)}`;
  return (
    <div className="hud-cell gw-wide" data-tuto="fej-systeme" style={{ '--c': work ? blue : 'var(--accent)' }}>
      <div className="hud-label">{label}</div>
      <div className="gw-sys">
        <button className="hud-pin" title="Copier le nom du système" {...hover} onClick={copy}>⧉</button>
        <b className={work ? 'gw-project' : ''}>{system.name}</b>
        {copied && <span className="gw-copied">copié ✓</span>}
        <span className="gw-state">{state}</span>
      </div>
      {system.tier != null && (work
        ? <ProjectPoints points={system.points} total={system.tier} next={system.next} />
        : <Control label={`Vers ${system.next}`} points={system.points} total={system.tier} />)}
      {conflict && <Control label={`Prise · ${conflict.power}`} points={conflict.points} total={conflict.tier} />}
      {(system.reinforcement != null || system.undermining != null || system.change || system.erosion > 0) && (
        <div className="gw-week" data-tuto="fej-semaine">
          {system.reinforcement != null && (
            <span>Semaine : <span className="up">+{int(system.reinforcement)} renf.</span> · <span className="down">−{int(system.undermining)} sape</span></span>
          )}
          {system.erosion > 0 && (
            <span className="down" title={`Érosion prévue au passage de jeudi si la jauge reste à ${int(system.points)} : (points − 25 % du palier) ÷ 12${system.erosionVerifiee ? '' : ' (règle vérifiée en Exploité seulement)'}`}>
              Jeudi : −{int(system.erosion)}{system.erosionVerifiee ? '' : ' ?'}
            </span>
          )}
          {system.change && (
            <span className={`gw-change ${system.change.points < 0 ? 'down' : ''}`} title={`Écart avec le relevé précédent de ce système (${dateTime(system.change.since)})`}>
              {system.change.points >= 0 ? '+' : ''}{int(system.change.points)} pts · {ago(system.change.since)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Page de l'overlay (/hud/glance) : le Coup d'œil façon HUD, dans une fenêtre libre par-dessus le jeu. */
export default function GlanceWindow() {
  const { data, extra } = useGlanceData();
  const inv = extra.inventory;
  const byType = (type) => (inv?.items || []).filter((m) => m.type === type).reduce((a, m) => a + m.count, 0);

  if (!data) return <PanelOverlay title="👁 Coup d'œil" />;
  const t = data.toCash;
  const toCash = t.bounties + t.bonds + t.exploration.value + t.exobiology.value + communityGoalRewardTotal(data.communityGoals);
  const cash = [
    t.bounties > 0 && { label: 'primes', value: compact(t.bounties) },
    t.bonds > 0 && { label: 'obligations de combat', short: 'obligations', value: compact(t.bonds) },
    t.exploration.value > 0 && { label: `exploration · ${t.exploration.systems} systèmes`, short: `explo · ${t.exploration.systems} syst.`, value: `≥ ${compact(t.exploration.value)}` },
    t.exobiology.count > 0 && { label: `exobiologie · ${t.exobiology.count} échantillons`, short: `exobio · ${t.exobiology.count} éch.`, value: t.exobiology.value ? compact(t.exobiology.value) : '?' },
    ...communityGoalCash(data.communityGoals), // récompenses d'objectifs communautaires, avec la station
  ].filter(Boolean);
  const { cargo } = data;

  const footer = inv && (
    <>
      <span className="hud-tag">Matériaux</span>
      <span>matières <b>{int(byType('Raw'))}</b></span>
      <span>manuf. <b>{int(byType('Manufactured'))}</b></span>
      <span>données <b>{int(byType('Encoded'))}</b></span>
    </>
  );

  return (
    // switchNotice : l'avis d'une bascule vers un mode sans fenêtre (Commerce) n'a que cette fenêtre-ci en jeu
    <PanelOverlay title="👁 Coup d'œil" aside={<ModeJeu rebuy={data.rebuy} />} footer={footer} autoHeight switchNotice>
      <style>{CSS}</style>
      <div className="gw">
        <div className="hud-cell hud-cell-cv" data-tuto="fej-credits" style={{ '--c': 'var(--accent)' }}>
          <div className="hud-label">Crédits</div>
          <span className="hud-value">{compact(data.credits.balance)}</span>
          <span className="hud-sub">{cr(data.credits.balance)}</span>
        </div>
        <div className="hud-cell hud-cell-cv" data-tuto="fej-merites" style={{ '--c': '#ffd24a' }}>
          <div className="hud-label">Mérites</div>
          <span className="hud-value">{data.powerplay.power ? int(data.powerplay.merits) : '—'}</span>
          <span className="hud-sub">{data.powerplay.power ? `${data.powerplay.power} · rang ${int(data.powerplay.rank)}` : "pas d'allégeance"}</span>
        </div>
        <div className="hud-cell hud-cell-cv" data-tuto="fej-soute" style={{ '--c': '#5fd38d' }}>
          <div className="hud-label">Soute</div>
          <span className="hud-value">{int(cargo.count)} t</span>
          <span className="hud-sub">
            {cargo.powerplay.length
              ? `à livrer : ${cargo.powerplay.map((c) => `${int(c.count)} t ${c.label}`).join(', ')}`
              : cargo.items.slice(0, 2).map((c) => `${int(c.count)} ${c.label}`).join(' · ') || 'vide'}
          </span>
        </div>

        {/* Rachat : seulement s'il n'est pas couvert, au décollage sans rachat ou après une résurrection (Rebuy.jsx) */}
        <RebuyCell rebuy={data.rebuy} />

        {/* À encaisser : seulement ce qu'il y a à aller chercher ; rien du tout, pas de case */}
        {cash.length > 0 && (
          <div className="hud-cell gw-wide" data-tuto="fej-encaisser" style={{ '--c': 'var(--accent)' }}>
            <div className="gw-head">
              <div className="hud-label">À encaisser</div>
              {cash.length > 1 && <span className="gw-total">{compact(toCash)} cr</span>}
            </div>
            <div className={`gw-cash ${cash.length > 3 ? 'is-dense' : ''}`} style={{ gridTemplateColumns: `repeat(${cash.length}, minmax(0, 1fr))` }}>
              {cash.map((c) => (
                <div key={c.label}>
                  <span className="hud-value">{c.value}</span>
                  <span className="hud-sub">{cash.length > 1 ? c.short || c.label : c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missions : seulement quand il y en a */}
        {data.missions.length > 0 && (
          <div className="hud-cell gw-wide" style={{ '--c': '#d3a6ff' }}>
            <div className="gw-head">
              <div className="hud-label">Missions</div>
              <span className="gw-total">{int(data.missions.length)}</span>
            </div>
            <span className="hud-sub">{data.missions.slice(0, 2).map((m) => cleanText(m.name)).join(' · ')}</span>
          </div>
        )}

        {/* Objectifs communautaires en cours : seulement quand il y en a */}
        <CommunityGoalsCell goals={data.communityGoals} />

        {/* Système où travailler pour le projet extension : même case, avec l'étape de la route et l'objectif */}
        {data.system && <SystemCell system={data.system} myPower={data.powerplay.power} work={extra.work} />}

      </div>
    </PanelOverlay>
  );
}
