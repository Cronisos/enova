import { useEffect, useState } from 'react';
import { useEvent } from '../../core/stream.js';
import { useHiddenWindow, useOverlayPage } from '../../core/hud.jsx';
import { wpApi } from './api.js';
import { couleurMinerai } from './oreColors.js';
import NomSysteme from '../../core/NomSysteme.jsx';

// « À chercher en priorité » : les minerais du Rhino classés par meilleure vente, en deux onglets (toute la galaxie,
// ou ce système pour les mérites). Dans l'overlay, c'est un tiroir (/hud/waypoints-sweep-top) : une fenêtre collée au
// bord gauche de la fenêtre de balayage, qui en sort en glissant au bouton 💎 Top 10 (à droite si la place manque à
// gauche). Hors de l'overlay, le même panneau s'ouvre par-dessus la carte.

export const TOP_CSS = `
.sw-top { font-family: 'Segoe UI', system-ui, sans-serif; color: #dfe4ea; display: flex; flex-direction: column; gap: 2px;
  overflow-y: auto; padding: 10px 10px 10px 12px; background: rgba(7,9,12,.97); }
.sw-top.is-inside { position: absolute; left: -12px; top: -8px; bottom: -8px; width: 72%; z-index: 3;
  border-right: 2px solid var(--accent); box-shadow: 6px 0 18px rgba(0,0,0,.6); }
.sw-top h4 { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--accent);
  display: flex; justify-content: space-between; align-items: center; }
.sw-top h4 button { background: none; border: 0; color: #8a94a0; font-size: 15px; cursor: pointer; padding: 0 2px; }
.sw-top h4 button:hover { color: #f4f6f8; }
.sw-top > small { color: #8a94a0; font-size: 11px; margin-bottom: 4px; }
.sw-top > small em, .sw-top-row > small em { font-style: normal; color: var(--accent); font-weight: 700; }
.sw-tabs { display: flex; gap: 4px; margin: 4px 0 2px; }
.sw-tabs button { flex: 1; height: 24px; border: 1px solid #4a525c; border-radius: 4px; background: #07090c; color: #8a94a0;
  font-size: 12px; font-weight: 600; cursor: pointer; }
.sw-tabs button.is-on { border-color: var(--accent); color: var(--accent); }
.sw-load { align-self: flex-start; margin: 2px 0 4px; height: 24px; padding: 0 10px; border: 1px solid var(--accent); border-radius: 4px;
  background: #07090c; color: var(--accent); font-size: 12px; font-weight: 600; cursor: pointer; }
.sw-load:disabled { opacity: .6; cursor: default; }
.sw-top-row { display: grid; grid-template-columns: 16px 10px minmax(0, 1fr); gap: 0 6px; align-items: baseline; padding: 4px 0;
  border-top: 1px solid rgba(255,255,255,.06); }
.sw-top-row > b { color: #8a94a0; font-size: 12px; text-align: right; font-variant-numeric: tabular-nums; }
.sw-top-row > i { width: 8px; height: 8px; transform: rotate(45deg); display: inline-block; }
.sw-top-row > span { font-size: 14px; font-weight: 600; color: #f4f6f8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sw-top-row > span em { font-style: normal; color: var(--accent); font-variant-numeric: tabular-nums; }
.sw-top-row > small { grid-column: 3; color: #8a94a0; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* Tiroir : la fenêtre entière, le panneau glisse depuis le bord collé à la fenêtre de balayage */
.sw-drawer { position: fixed; inset: 0; overflow: hidden; pointer-events: none; }
.sw-drawer .sw-top { position: absolute; inset: 0; pointer-events: auto; border: 1px solid rgba(var(--acc-rgb),.55);
  box-shadow: 0 0 18px rgba(0,0,0,.6); transition: transform .28s cubic-bezier(.2,.8,.2,1), opacity .28s; }
.sw-drawer.is-left .sw-top { border-right: 0; border-radius: 6px 0 0 6px; }
.sw-drawer.is-right .sw-top { border-left: 0; border-radius: 0 6px 6px 0; }
.sw-drawer.is-left:not(.is-open) .sw-top { transform: translateX(100%); opacity: .4; pointer-events: none; }
.sw-drawer.is-right:not(.is-open) .sw-top { transform: translateX(-100%); opacity: .4; pointer-events: none; }
`;

const price = (n) => Math.round(n).toLocaleString('fr-FR');

/** Prix d'Ardent pas encore demandés pour ce système (recherches automatiques coupées) : seulement au clic. */
export const ardentAsked = (markets) => Boolean(markets?.ardent?.loaded || markets?.ardent?.auto);

/** Bouton « Charger les prix d'Ardent » : la seule façon d'interroger Ardent quand les recherches automatiques sont coupées. */
function ArdentButton({ onLoad, hover }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const click = () => {
    setBusy(true);
    setError(null);
    onLoad().catch((e) => setError(e.message)).finally(() => setBusy(false));
  };
  return (
    <>
      <button type="button" className="sw-load" disabled={busy} {...hover} onClick={click}>{busy ? 'Chargement…' : 'Charger les prix d’Ardent'}</button>
      {error && <small>{error}</small>}
    </>
  );
}

/** Onglet « Ce système » : vendre sur place (mérites), meilleur prix et demande cumulée de toutes les stations. */
function SystemTop({ markets, onLoadArdent, hover }) {
  if (!markets) return <small>Chargement…</small>;
  const list = markets.ranking || [];
  const asked = ardentAsked(markets);
  return (
    <>
      <small>vente dans <em><NomSysteme nom={markets.system} /></em> · meilleur prix · demande cumulée</small>
      {!asked && markets.system && (
        <>
          <small>Prix d’Ardent non demandés (recherches automatiques coupées){list.length ? ' : tes relevés seuls.' : '.'}</small>
          {onLoadArdent && <ArdentButton onLoad={onLoadArdent} hover={hover} />}
        </>
      )}
      {!list.length && asked && <small>{markets.error ? 'Prix injoignables pour l’instant.' : 'Aucune station du système n’achète ces minerais.'}</small>}
      {list.map((o, i) => (
        <div key={o.ore} className="sw-top-row" title={`Meilleur prix : ${o.station}`}>
          <b>{i + 1}</b>
          <i style={{ background: couleurMinerai(o.ore) }} />
          <span>{o.ore} <em>({price(o.sell)})</em></span>
          <small>demande <em>{o.demand.toLocaleString('fr-FR')}</em> · {o.stations > 1 ? `${o.stations} stations` : o.station}</small>
        </div>
      ))}
    </>
  );
}

/** Le panneau : onglets Galaxie / Ce système. `markets` : prix du système (même source que la bulle de la carte). */
export function TopOresPanel({ onClose, hover = {}, markets, onLoadArdent, className = '', active = true }) {
  const [tab, setTab] = useState('galaxy');
  const [top, setTop] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!active) return undefined; // tiroir fermé : rien à demander
    let live = true;
    const load = () => wpApi.sweepTopOres().then((t) => live && (setTop(t), setError(null))).catch((e) => live && setError(e.message));
    load();
    const t = setInterval(load, 15 * 60 * 1000);
    return () => { live = false; clearInterval(t); };
  }, [active]);
  return (
    <div className={`sw-top ${className}`} {...hover}>
      <h4>À chercher en priorité <button type="button" title="Fermer" {...hover} onClick={onClose}>✕</button></h4>
      <div className="sw-tabs">
        <button type="button" className={tab === 'galaxy' ? 'is-on' : ''} {...hover} onClick={() => setTab('galaxy')}>Galaxie</button>
        <button type="button" className={tab === 'system' ? 'is-on' : ''} {...hover} onClick={() => setTab('system')}>Ce système</button>
      </div>
      {tab === 'system' ? <SystemTop markets={markets} onLoadArdent={onLoadArdent} hover={hover} /> : (
        <>
          <small>meilleure vente du moment · demande ≥ {(top?.minDemand ?? 1000).toLocaleString('fr-FR')} t · Ardent, 48 h</small>
          {!top && !error && <small>Chargement…</small>}
          {error && !top && <small>Prix injoignables pour l’instant.</small>}
          {top?.ores.map((o, i) => (
            <div key={o.ore} className="sw-top-row" title={`${o.station} · ${o.system}${o.pad ? ` · piste ${o.pad}` : ''}`}>
              <b>{i + 1}</b>
              <i style={{ background: couleurMinerai(o.ore) }} />
              <span>{o.ore} <em>({price(o.sell)})</em></span>
              <small>{o.station} · <NomSysteme nom={o.system} /></small>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/**
 * Prix des minerais dans le système du balayage (ou celui où tu es) : relus à l'ouverture, puis toutes les 10 min, et
 * quand une autre fenêtre vient de charger ceux d'Ardent. Ardent n'est interrogé que si les recherches automatiques
 * sont activées ; sinon, seulement par `loadArdent` (clic). Rend [markets, loadArdent].
 */
export function useSystemMarkets(active) {
  const [markets, setMarkets] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    let live = true;
    const load = () => wpApi.sweepMarkets().then((m) => live && setMarkets(m)).catch(() => {});
    load();
    const t = setInterval(load, 10 * 60 * 1000);
    return () => { live = false; clearInterval(t); };
  }, [active, tick]);
  useEvent('waypoints:markets', () => active && setTick((n) => n + 1));
  useEvent('waypoints:online', () => active && setTick((n) => n + 1));
  const loadArdent = () => wpApi.sweepMarkets(true).then(setMarkets);
  return [markets, loadArdent];
}

const PAGE = 'waypoints-sweep-top';

/** Le tiroir de l'overlay : ouvert et fermé par le bouton 💎 Top 10 de la fenêtre de balayage. */
export default function SweepTopOverlay() {
  const { overlay, hover } = useOverlayPage();
  const { shown, toggle } = useHiddenWindow(PAGE);
  const [side, setSide] = useState('left');
  useEffect(() => {
    overlay?.dockSide?.().then((s) => s && setSide(s));
    const off = overlay?.onDockSide?.(setSide);
    return typeof off === 'function' ? off : undefined;
  }, []);
  // Fermé : la fenêtre laisse passer les clics au jeu, même si la souris était dessus
  useEffect(() => {
    if (!shown) overlay?.setHover(false);
  }, [shown]);
  const [markets, loadArdent] = useSystemMarkets(shown);
  return (
    <div className={`sw-drawer is-${side} ${shown ? 'is-open' : ''}`}>
      <style>{TOP_CSS}</style>
      <TopOresPanel onClose={toggle} hover={shown ? hover : {}} markets={markets} onLoadArdent={loadArdent} active={shown} />
    </div>
  );
}
