// HUD de session commun aux modules (Combat, Sauvetage…) : session en temps réel, cadre façon
// interface du jeu, et pages sans menu pour l'overlay (dossier overlay/).

import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { useEvent, useNow } from './stream.js';
import { clock } from './format.js';
import { tenter } from './actions.js';
import { modeName } from './modes.js';
import { switchMode } from './overlay.jsx';
import { hudBottom, noticeInPanel, REMEMBER_SHORT, rememberTitle, saveRole, SWITCH_TAG, switchText } from './shipRole.js';
import { useSuggestion, useSwitchNotice } from './useShips.js';

/** Gain par heure, seulement après quelques minutes pour éviter les chiffres absurdes. */
export function perHour(value, seconds) {
  return seconds >= 300 ? (value * 3600) / seconds : null;
}

/**
 * Session d'un module, tenue à jour en temps réel.
 * @param base adresse de l'API du module (GET /session, POST /reset)
 * @param event message temps réel envoyé par le serveur à chaque changement
 * @param o.horloge false : la page n'affiche ni chrono ni taux (seconds, chrono), pas besoin de la redessiner
 *   chaque seconde
 * Les boutons (reset, togglePause, resetTime) ne rejettent jamais : leur échec est dans `error` (affiché par PauseButton).
 */
export function useLiveSession(base, event, { horloge = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const tic = useNow(horloge ? 1000 : null);
  const now = horloge ? tic : Date.now();

  useEffect(() => {
    api(`${base}/session`).then(setData).catch(() => {});
  }, [base]);
  useEvent(event, setData);

  // Résultat de l'action : la session à jour ; en cas d'échec, l'erreur affichée à côté du bouton
  const agir = (action) => tenter(async () => setData(await action()), setError);
  const reset = () => agir(() => api(`${base}/reset`, { method: 'POST' }));
  // Il tourne : pause au bouton. En pause (bouton, inactif) : reprise ; à quai, le chrono reste en pause jusqu'au départ
  const togglePause = () => agir(() => api(`${base}/pause`, { method: 'POST', body: { on: !data?.pauseReason } }));
  // Chrono seul remis à zéro (↺ du HUD) : compteurs et taux gardent toute la session
  const resetTime = () => agir(() => api(`${base}/reset-time`, { method: 'POST' }));

  // Temps actif de la session, sans les pauses (à quai, jeu fermé, inactif, bouton) : sert aux taux
  const paused = (data?.pausedMs || 0) + (data?.pausedSince ? now - Date.parse(data.pausedSince) : 0);
  const seconds = data?.startedAt ? Math.max(0, now - Date.parse(data.startedAt) - paused) / 1000 : null;
  // Chrono affiché : depuis le dernier ↺, s'il y en a eu un
  const chrono = data?.chronoFrom ? Math.max(0, now - Date.parse(data.chronoFrom) - (paused - (data.chronoPausedMs || 0))) / 1000 : null;
  return { data, error, reset, seconds, chrono, pause: data?.pauseReason ?? null, togglePause, resetTime };
}

const PAUSES = { manual: 'en pause', docked: 'pause · à quai', offline: 'pause · jeu fermé', idle: 'pause · inactif', waiting: 'pause · 1re tonne' };
/** Raison de la pause du chrono, en clair, ou null s'il tourne. */
export const pauseLabel = (reason) => (reason ? PAUSES[reason] || 'en pause' : null);

/** Bouton des pages : pause du chrono au bouton, ou reprise. */
export function PauseButton({ session }) {
  if (!session.data) return null;
  const manual = session.pause === 'manual';
  return (
    <>
      <button className="btn" onClick={session.togglePause} title="Le chrono se met aussi en pause de lui-même à quai et quand le jeu est fermé">
        {manual ? '▶ Reprendre' : '⏸ Pause'}
      </button>
      {/* Échec d'un bouton de la session (pause, remise à zéro) */}
      {session.error && <span className="small bad">{session.error}</span>}
    </>
  );
}

// Styles des pages de l'overlay, ajoutés à la page quand elle s'affiche.
const CSS = `
.hud, .hud * { box-sizing: border-box; }
.hud {
  height: var(--hud-h, 100vh); overflow: hidden; display: flex; flex-direction: column; gap: 5px; padding: 7px 10px 6px;
  color: #dfe4ea; font-family: 'Segoe UI', system-ui, sans-serif;
  background:
    linear-gradient(rgba(var(--acc-rgb),.035) 1px, transparent 1px) 0 0 / 100% 3px,
    radial-gradient(ellipse at 0 50%, rgba(var(--acc-rgb),.14), transparent 55%),
    #07090c;
}
.hud.hud-overlay {
  background:
    linear-gradient(rgba(var(--acc-rgb),.04) 1px, transparent 1px) 0 0 / 100% 3px,
    linear-gradient(90deg, rgba(7,9,12,.93), rgba(7,9,12,.84));
  border: 1px solid rgba(var(--acc-rgb),.28);
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px));
}
.hud.hud-overlay .hud-cell, .hud-panel .hud-cell { background: linear-gradient(135deg, color-mix(in srgb, var(--c) 18%, rgba(12,15,19,.9)), rgba(18,22,27,.85) 65%); }
.hud.hud-editing { border: 1px dashed var(--accent); cursor: move; -webkit-app-region: drag; }
.hud-row { flex: 1; display: grid; grid-template-columns: auto repeat(3, 1fr); gap: 7px; min-height: 0; }
.hud-id { display: flex; flex-direction: column; justify-content: center; gap: 2px; padding-right: 4px; }
.hud-title { color: var(--accent); font-weight: 700; font-size: 13px; letter-spacing: .18em; text-transform: uppercase; white-space: nowrap; }
.hud-chrono { color: #f4f6f8; font-size: 21px; font-weight: 600; letter-spacing: .06em; font-variant-numeric: tabular-nums; line-height: 1.1; }
.hud-live { display: flex; align-items: center; gap: 5px; color: #8a94a0; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; }
.hud-dot { width: 6px; height: 6px; border-radius: 50%; background: #5fd38d; box-shadow: 0 0 6px #5fd38d; animation: hud-pulse 1.6s 4; } /* quelques battements, pas sans fin : la fenêtre est au-dessus du jeu */
.hud-cell {
  --c: var(--accent);
  position: relative; padding: 4px 10px; display: flex; flex-direction: column; justify-content: center;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 14%, transparent), rgba(18,22,27,.85) 60%);
  border-left: 3px solid var(--c);
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
}
.hud-cell::after { content: ''; position: absolute; top: 0; right: 0; width: 14px; height: 14px; background: linear-gradient(225deg, var(--c) 50%, transparent 50%); opacity: .55; }
.hud-label { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #8a94a0; }
.hud-line { display: flex; flex-direction: column; min-width: 0; }
/* Disposition en carré : titre en haut, cases en 2 × 2 */
.hud-square .hud-head { display: flex; align-items: center; gap: 10px; padding-bottom: 4px; border-bottom: 1px solid rgba(var(--acc-rgb),.3); }
.hud-square .hud-head .hud-pin { width: 22px; height: 18px; font-size: 11px; margin-left: auto; flex: none; }
.hud-square .hud-head .hud-pin + .hud-pin { margin-left: 4px; }
/* Colonnes strictement égales : un texte long se coupe (…) au lieu d'élargir sa case */
.hud-square .hud-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-auto-rows: 1fr; }
.hud-cell, .hud-line { min-width: 0; }
.hud.hud-overlay.hud-square { gap: 6px; }
/* Cases plus petites, pour en mettre davantage sur la ligne */
.hud-dense .hud-row { gap: 5px; }
.hud-dense .hud-cell { padding: 3px 8px; }
.hud-dense .hud-label { font-size: 10px; letter-spacing: .1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hud-dense .hud-value { font-size: 21px; }
.hud-dense .hud-sub { font-size: 11px; }
.hud-value.hud-value-big { font-size: 40px; line-height: 1; letter-spacing: .03em; }
.hud-value.hud-value-text { font-size: 17px; line-height: 1.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hud-value { font-size: 28px; font-weight: 700; line-height: 1.05; color: var(--c); font-variant-numeric: tabular-nums; text-shadow: 0 0 12px color-mix(in srgb, var(--c) 45%, transparent); }
.hud-sub { font-size: 12px; min-height: 15px; line-height: 15px; color: #8a94a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hud-flash { animation: hud-flash .9s ease-out; }
.hud-pin {
  -webkit-app-region: no-drag; align-self: center; width: 32px; height: 32px; padding: 0;
  display: grid; place-items: center; cursor: pointer; font-size: 16px; line-height: 1;
  color: var(--accent); background: rgba(var(--acc-rgb),.08); border: 1px solid rgba(var(--acc-rgb),.4); border-radius: 4px;
  opacity: .45; transition: opacity .15s, background .15s;
}
.hud-pin:hover, .hud-editing .hud-pin { opacity: 1; background: rgba(var(--acc-rgb),.22); }
.hud-pin.hud-pin-on { opacity: 1; color: #07090c; background: var(--accent); }
.hud-last { display: flex; gap: 8px; align-items: baseline; font-size: 13px; color: #8a94a0; white-space: nowrap; overflow: hidden; }
.hud-last b { color: #f4f6f8; font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
/* Un texte trop long se coupe au lieu de pousser le bouton de déplacement hors du cadre */
.hud-last > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.hud-last > .hud-tag { flex: none; }
.hud-cell.hud-cell-center { align-items: center; text-align: center; }
.hud-cell-center .hud-line { align-items: center; }
.hud-cell-cv .hud-value { text-align: center; }
.hud-last .hud-gain { color: #5fd38d; margin-left: auto; font-variant-numeric: tabular-nums; }
.hud-last .hud-pin { width: 22px; height: 20px; font-size: 12px; margin-left: auto; flex: none; }
.hud-last .hud-gain + .hud-pin, .hud-pin + .hud-pin { margin-left: 4px; }
/* Chrono en pause : point fixe, orange */
.hud-chrono.hud-chrono-paused { color: #8a94a0; }
.hud-paused { color: var(--accent); }
.hud-live-btn { -webkit-app-region: no-drag; background: none; border: 0; padding: 0; font: inherit; cursor: pointer; text-align: left; }
.hud-live-btn:hover { color: #f4f6f8; }
.hud-chrono-row { display: flex; align-items: center; gap: 6px; }
.hud-reset-time { -webkit-app-region: no-drag; background: none; border: 0; padding: 0; font: inherit; font-size: 15px; line-height: 1;
  color: #5c6670; cursor: pointer; white-space: nowrap; }
.hud-reset-time:hover { color: #f4f6f8; }
.hud-reset-time.is-confirm { color: var(--accent); }
.hud-suggest { display: flex; align-items: center; gap: 8px; min-width: 0; }
.hud-suggest b { flex: none; color: #f4f6f8; white-space: nowrap; } /* le mode reste lisible, la raison se coupe */
.hud-suggest-why { color: #8a94a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.hud-suggest-btn { flex: none; -webkit-app-region: no-drag; height: 18px; padding: 0 8px; border: 1px solid var(--accent); border-radius: 3px;
  background: #07090c; color: var(--accent); font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
.hud-suggest-btn:hover { background: var(--accent); color: #07090c; }
.hud-suggest-btn.is-no { border-color: #4a525c; color: #8a94a0; }
.hud-suggest-btn.is-no:hover { background: #4a525c; color: #f4f6f8; }
/* Bascule vers le rôle principal du vaisseau : avis vert, bouton Annuler */
.hud-switched { display: flex; align-items: center; gap: 8px; min-width: 0; }
.hud-switched b { color: #5fd38d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.hud-last > .hud-tag.hud-tag-switched, .hud-panel-foot > .hud-tag.hud-tag-switched { color: #5fd38d; }
.hud-last > .hud-tag.hud-tag-alerte { color: #ff4d4d; }
.hud-last .hud-mod-bas { color: #ff6b6b; }
.hud-last .hud-mod-bas b { color: #ff4d4d; }
/* Proposition hors des rôles du vaisseau : discrète, en gris, sans prendre la ligne ni attirer l'œil */
.hud-quiet { flex: none; display: inline-flex; align-items: center; gap: 4px; margin-left: auto; font-size: 11px; color: #5c6670; opacity: .8; }
.hud-quiet + .hud-pin, .hud-quiet + .hud-gain { margin-left: 4px; }
.hud-quiet-btn { -webkit-app-region: no-drag; background: none; border: 0; padding: 0 2px; font: inherit; color: #5c6670; cursor: pointer; }
.hud-quiet-btn:hover { color: #dfe4ea; }
.hud-paused .hud-dot { background: var(--accent); box-shadow: none; animation: none; }
.hud-tag { color: var(--accent); text-transform: uppercase; letter-spacing: .14em; font-size: 11px; }
/* Hauteur du contenu : le cadre s'arrête après la dernière ligne, le reste de la fenêtre reste transparent */
.hud-panel {
  max-height: 100vh; display: flex; flex-direction: column; overflow: hidden;
  background:
    linear-gradient(rgba(var(--acc-rgb),.04) 1px, transparent 1px) 0 0 / 100% 3px,
    linear-gradient(180deg, rgba(7,9,12,.93), rgba(7,9,12,.84));
  border: 1px solid rgba(var(--acc-rgb),.28);
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
}
.hud-panel.hud-editing { border: 1px dashed var(--accent); cursor: move; -webkit-app-region: drag; }
.hud-panel-head {
  display: flex; align-items: center; gap: 10px; min-height: 22px; padding: 2px 8px 2px 12px;
  border-bottom: 1px solid rgba(var(--acc-rgb),.3); font-family: 'Segoe UI', system-ui, sans-serif;
}
.hud-panel-head .hud-title { font-size: 10px; letter-spacing: .2em; }
.hud-size { -webkit-app-region: no-drag; display: flex; gap: 4px; margin-left: auto; }
/* Mention à droite de la barre de titre (Coup d'œil : le mode de jeu) */
.hud-aside { margin-left: auto; white-space: nowrap; }
.hud-aside + .hud-size { margin-left: 0; }
.hud-size .hud-pin { width: 22px; height: 18px; font-size: 11px; opacity: 1; margin: 0; }
.hud-panel-body { flex: 0 1 auto; min-height: 0; overflow: hidden; padding: 7px 10px 4px; }
/* Ligne du bas : contenu de la page et bouton de déplacement. Marge à gauche : le coin est coupé */
.hud-panel-foot {
  flex: none; display: flex; align-items: center; gap: 12px; padding: 3px 10px 6px 20px;
  font-family: 'Segoe UI', system-ui, sans-serif; font-size: 12px; color: #8a94a0; white-space: nowrap; overflow: hidden;
}
.hud-panel-foot .hud-pin { width: 22px; height: 20px; font-size: 12px; margin-left: auto; flex: none; }
@keyframes hud-pulse { 50% { opacity: .35; } }
@keyframes hud-flash { from { background-color: color-mix(in srgb, var(--c) 45%, transparent); } }
/* Case en alerte (soute du SRV presque pleine…) : clignote en rouge quelques secondes, puis reste rouge (bord et texte)
   tant que l'alerte dure : une alerte peut durer, et une animation sans fin redessine la fenêtre au-dessus du jeu */
.hud-cell.hud-alert { animation: hud-alert 1s steps(2, jump-none) 6; border-color: #ff4d4d; }
.hud-alert .hud-value, .hud-alert .hud-label { color: #ff4d4d; }
@keyframes hud-alert { 0% { background: rgba(255,60,60,.55); } 100% { background: rgba(255,60,60,.08); } }
/* Case en avertissement (place qui se réduit…) : discret, sans clignoter, pour pouvoir durer */
.hud-cell.hud-warn { box-shadow: inset 0 0 0 1px rgba(255,77,77,.75); background: linear-gradient(135deg, rgba(255,60,60,.16), rgba(18,22,27,.85) 65%); }
.hud-warn .hud-sub { color: #ff6b6b; font-weight: 600; }
`;

/** Ajoute les styles du HUD à la page de l'overlay. */
function addStyles(doc) {
  const style = doc.createElement('style');
  style.textContent = CSS;
  doc.head.append(style);
  return style;
}

/** Case du HUD : sa clé change avec la valeur, ce qui rejoue le flash à chaque gain. */
function Cell({ label, value, sub, color, text, big, center, centerValue, alert, warn, survol }) {
  return (
    <div className={`hud-cell ${alert ? 'hud-alert' : 'hud-flash'} ${warn && !alert ? 'hud-warn' : ''} ${center ? 'hud-cell-center' : ''} ${centerValue ? 'hud-cell-cv' : ''}`} style={{ '--c': color }} {...(survol || {})}>
      <div className="hud-label">{label}</div>
      <div className="hud-line">
        <span className={`hud-value ${text ? 'hud-value-text' : ''} ${big ? 'hud-value-big' : ''}`}>{value}</span>
        <span className="hud-sub">{sub}</span>
      </div>
    </div>
  );
}

/**
 * Cadre du HUD, sur une ligne.
 * @param cells trois cases [{ label, value, sub, color, text, big, still }] ; text : valeur longue (nom), en plus
 *              petit ; big : valeur principale, en grand ; still : pas de flash à chaque changement (compte à rebours) ;
 *              center : contenu centré dans la case ; alert : la case clignote en rouge ; warn : contour rouge discret ;
 *              survol : { onMouseEnter, onMouseLeave } (bulle de la case : soute du vaisseau…)
 * @param seconds chrono de la session, ou null pour ne pas l'afficher
 * @param columns largeurs des colonnes de la ligne (CSS grid), pour élargir la case principale
 * @param square  cases en carré (2 × 2) sous le titre, au lieu d'une ligne
 * @param dense   cases plus petites, pour en mettre davantage sur la ligne
 * @param last  contenu de la ligne du bas (dernier événement), précédé de tag (tagClass : sa couleur)
 * @param pin   bouton de l'overlay pour le déplacer puis le fixer, au bout de la ligne du bas (du titre en carré)
 * @param pause raison de la pause du chrono (manual, docked, offline, idle), ou null s'il tourne
 * @param onLive clic sur « en direct / en pause » : pause du chrono au bouton, ou reprise ; liveHover : survol (overlay)
 * @param onResetTime bouton ↺ sous le chrono : remet le temps à zéro, rien d'autre (deux clics)
 * @param extra ligne en plus, tout en bas (matériaux par grade du Sauvetage…)
 */
export function HudFrame({ title, seconds, cells, last, tag = 'Dernier', tagClass = '', columns, square = false, dense = false, className = '', pin, pause, onLive, liveHover, onResetTime, extra = null }) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return undefined;
    const t = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [confirm]);
  const resetTime = () => {
    if (!confirm) return setConfirm(true);
    setConfirm(false);
    return onResetTime();
  };
  const editing = className.includes('hud-editing');
  const id = (
    <>
      <span className="hud-title">{title}</span>
      {seconds !== null && (
        <span className="hud-chrono-row">
          <span className={`hud-chrono ${pause ? 'hud-chrono-paused' : ''}`}>{clock(seconds)}</span>
          {onResetTime && (
            <button
              className={`hud-reset-time ${confirm ? 'is-confirm' : ''}`}
              title={confirm ? 'Clique encore pour remettre le chrono à zéro' : 'Remettre le chrono à zéro (soutes, compteurs et taux ne bougent pas)'}
              {...liveHover}
              onClick={resetTime}
            >
              {confirm ? '↺ ?' : '↺'}
            </button>
          )}
        </span>
      )}
      {onLive ? (
        <button
          className={`hud-live hud-live-btn ${pause ? 'hud-paused' : ''}`}
          title={pause === 'manual' ? 'Reprendre le chrono' : 'Mettre le chrono en pause'}
          {...liveHover}
          onClick={onLive}
        >
          <span className="hud-dot" />{pauseLabel(pause) || 'en direct'}
        </button>
      ) : <span className={`hud-live ${pause ? 'hud-paused' : ''}`}><span className="hud-dot" />{pauseLabel(pause) || 'en direct'}</span>}

    </>
  );
  return (
    <div className={`hud ${square ? 'hud-square' : ''} ${dense ? 'hud-dense' : ''} ${className}`}>
      {square && <div className="hud-head">{id}{pin}</div>}
      <div className="hud-row" style={columns ? { gridTemplateColumns: columns } : undefined}>
        {!square && <div className="hud-id">{id}</div>}
        {cells.map((c) => <Cell key={c.still ? c.label : `${c.label}-${c.value}`} {...c} />)}
      </div>
      <div className="hud-last">
        <span className={`hud-tag ${editing ? '' : tagClass}`}>{editing ? 'Déplacement' : tag}</span>
        {editing ? <span>fais glisser le cadre, puis 📌 pour le fixer</span> : last}
        {!square && pin}
      </div>
      {extra}
    </div>
  );
}

/**
 * Réglages communs d'une page de l'overlay (/hud/<module>) : fond transparent, styles du HUD, et bouton
 * ✥ / 📌 pour la déplacer. Elle échange avec l'overlay par window.eliteOverlay.
 */
export function useOverlayPage() {
  const [editing, setEditing] = useState(false);
  const overlay = window.eliteOverlay;

  useEffect(() => {
    const style = addStyles(document);
    const html = document.documentElement.style;
    const body = document.body.style;
    const before = [html.background, body.background, body.margin];
    html.background = body.background = 'transparent';
    body.margin = '0';
    const off = overlay?.onEditMode(setEditing);
    return () => {
      if (typeof off === 'function') off();
      style.remove();
      [html.background, body.background, body.margin] = before;
    };
  }, []);

  // Le reste de la fenêtre laisse passer les clics au jeu : seul le survol d'un bouton la rend cliquable
  const hover = overlay && { onMouseEnter: () => overlay.setHover(true), onMouseLeave: () => overlay.setHover(false) };
  // En déplacement, un bouton de plus : ↔ centre la fenêtre de gauche à droite sur son écran (l’auteur, 19 nov. 2026 :
  // « je galère à les centrer »)
  const pin = overlay && (
    <>
      {editing && overlay.centerH && (
        <button className="hud-pin" title="Centrer horizontalement sur l’écran" {...hover} onClick={() => overlay.centerH()}>↔</button>
      )}
      <button className="hud-pin" title={editing ? 'Fixer ici' : 'Déplacer'} {...hover} onClick={() => overlay.toggleEdit()}>
        {editing ? '📌' : '✥'}
      </button>
    </>
  );
  return { editing, pin, overlay, hover };
}

const accept = (mode) => switchMode(mode).catch(() => {});
const refuse = () => api('/overlay/suggest/dismiss', { method: 'POST' }).catch(() => {});

/**
 * Ligne du bas du HUD quand un mode est proposé : « ⛏ Minage Rhino ? Oui / Non », et « ⚑ Retenir comme rôle »
 * (remember) pour un vaisseau sans rôle dont l'équipement a fait proposer ce mode : comme « Oui », en plus durable.
 */
function SuggestLine({ s, remember: offer, hover }) {
  const remember = () => saveRole(s.shipId, { primary: s.mode, secondary: [] }).then(() => switchMode(s.mode)).catch(() => {});
  // Ligne retirée sous la souris (clic sur « Oui » ou « Non ») : ses boutons ne diront jamais « fin du survol », on le
  // dit pour eux, sinon la fenêtre garderait les clics du jeu
  const leave = useRef(hover?.onMouseLeave);
  leave.current = hover?.onMouseLeave;
  useEffect(() => () => leave.current?.(), []);
  return (
    <span className="hud-suggest">
      <b>{modeName(s.mode)} ?</b>
      <span className="hud-suggest-why">{s.reason}</span>
      <button className="hud-suggest-btn" {...hover} onClick={() => accept(s.mode)}>Oui</button>
      <button className="hud-suggest-btn is-no" {...hover} onClick={refuse}>Non</button>
      {offer && (
        <button className="hud-suggest-btn" {...hover} onClick={remember} title={rememberTitle(s.mode)}>{REMEMBER_SHORT}</button>
      )}
    </span>
  );
}

/** Proposition discrète (hors des rôles du vaisseau) : en gris au bout de la ligne, sans la remplacer. */
function QuietSuggest({ s, hover }) {
  return (
    <span className="hud-quiet" title={`Hors des rôles de ce vaisseau : ${s.reason}`}>
      {modeName(s.mode)} ?
      <button className="hud-quiet-btn" {...hover} onClick={() => accept(s.mode)}>oui</button>
      <button className="hud-quiet-btn" {...hover} onClick={refuse} aria-label="Non">✕</button>
    </span>
  );
}

/** Ligne du bas après une bascule vers le rôle principal : « ⛏ Minage Rhino activé — vaisseau « Pioche » · Annuler ». */
function SwitchLine({ n, hover }) {
  const cancel = () => api('/overlay/switch/cancel', { method: 'POST' }).catch(() => {});
  return (
    <span className="hud-switched">
      <b>{switchText(n)}</b>
      <button className="hud-suggest-btn" {...hover} onClick={cancel}>Annuler</button>
    </span>
  );
}

/**
 * Avis de bascule dans une fenêtre libre (PanelOverlay switchNotice) : seulement pour un mode sans fenêtre à lui
 * (Commerce), qu'aucun HUD ne montre (shipRole.js noticeInPanel). Sinon, rien.
 */
function PanelSwitchNotice({ hover, children }) {
  const notice = useSwitchNotice();
  if (!noticeInPanel(notice)) return children ?? null;
  return (
    <>
      <span className="hud-tag hud-tag-switched">{SWITCH_TAG}</span>
      <SwitchLine n={notice} hover={hover} />
    </>
  );
}

/**
 * Page HUD de l'overlay. props : celles de HudFrame, ou null pendant le chargement ; onPause : bouton de pause
 * du chrono, à côté du bouton de déplacement. Une bascule vers le rôle du vaisseau, sinon un mode proposé d'après ce
 * que tu fais, prend la ligne du bas ; une proposition discrète s'y ajoute, en gris, sans la prendre (shipRole.js
 * hudBottom).
 */
export function HudOverlay({ props, buttons = [] }) {
  const { editing, pin, hover } = useOverlayPage();
  const suggestion = useSuggestion();
  const notice = useSwitchNotice();
  if (!props) return null;
  const { onPause, ...frame } = props;
  const bottom = hudBottom({ notice, suggestion, editing });
  if (bottom.line === 'switch') {
    frame.tag = bottom.tag;
    frame.tagClass = 'hud-tag-switched';
    frame.last = <SwitchLine n={notice} hover={hover} />;
  } else if (bottom.line === 'suggest') {
    frame.tag = bottom.tag;
    frame.last = <SuggestLine s={suggestion} remember={bottom.remember} hover={hover} />;
  }
  if (bottom.quiet) frame.last = <>{frame.last}<QuietSuggest s={suggestion} hover={hover} /></>;
  const manual = frame.pause === 'manual';
  const pause = onPause && hover && (
    <button className="hud-pin" title={manual ? 'Reprendre le chrono' : 'Mettre le chrono en pause'} {...hover} onClick={onPause}>
      {manual ? '▶' : '⏸'}
    </button>
  );
  // Boutons propres à la page (afficher une autre fenêtre…) : { icon, title, onClick, active }
  const extra = hover && buttons.map((b) => (
    <button key={b.title} className={`hud-pin ${b.active ? 'hud-pin-on' : ''}`} title={b.title} {...hover} onClick={b.onClick}>{b.icon}</button>
  ));
  return <HudFrame {...frame} onLive={onPause} liveHover={hover} pin={<>{extra}{pause}{pin}</>} className={`hud-overlay ${editing ? 'hud-editing' : ''}`} />;
}

/**
 * Fenêtre de l'overlay ouverte cachée (liste des repères…) : est-elle montrée, et le bouton pour la montrer ou la cacher.
 * Hors de l'overlay (navigateur), toujours cachée et sans effet.
 */
export function useHiddenWindow(page) {
  const overlay = window.eliteOverlay;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    overlay?.isShown?.(page).then(setShown);
    const off = overlay?.onShown?.((p, on) => p === page && setShown(on));
    return typeof off === 'function' ? off : undefined;
  }, [page]);
  return { shown, toggle: () => overlay?.toggleWindow?.(page) };
}

const STEP = 40;

/**
 * Fenêtre libre de l'overlay (Coup d'œil…) : contenu sur fond sombre translucide.
 * footer : contenu de la ligne du bas, où se trouve aussi le bouton de déplacement.
 * aside : mention à droite de la barre de titre (Coup d'œil : le mode de jeu).
 * autoHeight : la fenêtre prend d'elle-même la hauteur de son contenu (la largeur reste réglable avec ◂ ▸).
 * switchNotice : la ligne du bas montre l'avis de bascule vers un mode sans fenêtre (Commerce), avec Annuler, à la
 * place de footer : sans elle, rien ne le montrerait en jeu.
 */
export function PanelOverlay({ title, aside = null, children, footer, autoHeight = false, switchNotice = false }) {
  const { editing, pin, overlay, hover } = useOverlayPage();
  const grow = (dw, dh) => overlay?.grow(dw, dh);
  const panel = useRef(null);
  useEffect(() => {
    if (!autoHeight || !overlay?.fitHeight || !panel.current) return undefined;
    const el = panel.current;
    const fit = () => {
      const head = el.querySelector('.hud-panel-head');
      const body = el.querySelector('.hud-panel-body');
      const foot = el.querySelector('.hud-panel-foot');
      const border = el.offsetHeight - el.clientHeight;
      overlay.fitHeight(Math.ceil((head?.offsetHeight || 0) + (body?.scrollHeight || 0) + (foot?.offsetHeight || 0) + border));
    };
    // Chaque changement de contenu (case Projet, ligne en plus…) ou de largeur recalcule la hauteur
    const watch = new ResizeObserver(fit);
    watch.observe(el.querySelector('.hud-panel-body') || el);
    for (const child of el.querySelector('.hud-panel-body')?.children || []) watch.observe(child);
    const mutations = new MutationObserver(fit);
    mutations.observe(el, { childList: true, subtree: true, characterData: true });
    fit();
    return () => {
      watch.disconnect();
      mutations.disconnect();
    };
  }, [autoHeight, overlay]);
  return (
    <div ref={panel} className={`hud-panel ${editing ? 'hud-editing' : ''}`}>
      <div className="hud-panel-head">
        <span className="hud-title">{title}</span>
        {aside && <span className="hud-aside">{aside}</span>}
        {editing && (
          <span className="hud-size">
            <button className="hud-pin" title="Moins large" onClick={() => grow(-STEP, 0)}>◂</button>
            <button className="hud-pin" title="Plus large" onClick={() => grow(STEP, 0)}>▸</button>
            {!autoHeight && <button className="hud-pin" title="Moins haute" onClick={() => grow(0, -STEP)}>▴</button>}
            {!autoHeight && <button className="hud-pin" title="Plus haute" onClick={() => grow(0, STEP)}>▾</button>}
          </span>
        )}
      </div>
      <div className="hud-panel-body">{children}</div>
      <div className="hud-panel-foot">
        {switchNotice && !editing ? <PanelSwitchNotice hover={hover}>{footer}</PanelSwitchNotice> : footer}
        {pin}
      </div>
    </div>
  );
}
