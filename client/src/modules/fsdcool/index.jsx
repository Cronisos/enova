import { useLiveSession, useOverlayPage } from '../../core/hud.jsx';
import { useNow } from '../../core/stream.js';
import { scoPhase } from './sco.js';
import Jauge from './Jauge.jsx';
import { HAUTEUR, LARGEUR } from './vague.js';

const CSS = `
html, body { overflow: hidden !important; } /* jamais de barre de défilement dans la fenêtre en jeu */
.jh-hud { display: flex; flex-direction: column; gap: 4px; padding: 4px; width: ${LARGEUR}px; position: relative; }
.jh-hud.is-edit { outline: 1px dashed var(--accent); outline-offset: -1px; background: rgba(7,9,12,.35); cursor: move; -webkit-app-region: drag; } /* toute la fenêtre se fait glisser */
.jh { position: relative; width: ${LARGEUR}px; height: ${HAUTEUR}px; font-family: 'Chakra Petch', 'Barlow Condensed', 'Segoe UI', sans-serif; }
.jh-cadre { position: absolute; inset: 0; width: 100%; height: 100%; }
.jh-fond { fill: rgba(4,6,10,.88); }
.jh-case { fill: rgba(8,16,26,.82); stroke: rgba(108,200,255,.75); stroke-width: 1.2; }
.jh-moteur { position: absolute; left: 14px; top: 19px; width: 134px; height: auto; }
.jh-titre { position: absolute; left: 172px; top: 21px; width: 262px; height: 22px; display: flex; align-items: center; gap: 8px; white-space: nowrap; overflow: hidden; }
.jh-flocon { flex: none; width: 19px; height: 19px; fill: none; stroke: #35d6f5; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.jh-nom { color: #f4f6f8; font-weight: 700; font-size: 16px; letter-spacing: .06em; text-transform: uppercase; }
.jh-label { color: #ff9a1f; font-weight: 700; font-size: 16px; letter-spacing: .06em; }
.jh-note { color: #8a94a0; font-family: 'Barlow Condensed', 'Segoe UI', sans-serif; font-weight: 600; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; }
.jh-hachures { flex: none; margin-left: auto; display: flex; gap: 3px; padding-right: 6px; }
.jh-hachures i { width: 4px; height: 13px; transform: skewX(-28deg); background: #6b7480; }
.jh-hachures i:first-child { background: #c98a3a; }
.jh-hachures i:nth-child(2) { background: #96918c; }
.jh-vague { position: absolute; left: 166px; top: 45px; width: 268px; height: 34px; }
.jh-reste { transition: x .3s linear, width .3s linear; }
/* Fluctuation sur place, de haut en bas, ancrée en bas : 2 minutes au plus, puis fixe (jamais sans fin au-dessus du jeu) */
.jh-souffle, .jh-reflet { transform-box: view-box; transform-origin: 50% 100%; }
.jh-souffle { animation: jh-souffle 2.6s ease-in-out 46 alternate; }
.jh-reflet { animation: jh-souffle 3.4s ease-in-out 36 alternate-reverse; }
.jh-temps { position: absolute; left: 438px; top: 22px; width: 106px; height: 50px; display: grid; place-items: center; color: #fff; font-weight: 700; font-size: 29px; letter-spacing: .02em; font-variant-numeric: tabular-nums; text-shadow: 0 0 10px rgba(120,200,255,.7), 0 1px 2px #000; white-space: nowrap; }
.jh.is-pret .jh-temps { color: #5fd38d; font-size: 23px; text-shadow: 0 0 10px rgba(95,211,141,.7), 0 1px 2px #000; }
.jh.is-pret .jh-flocon { stroke: #5fd38d; }
/* Bouton de déplacement : caché, il apparaît quand la souris passe sur le bandeau (et pendant le déplacement) */
.jh-pin { position: absolute; top: 2px; right: 2px; opacity: 0; transition: opacity .15s; }
.jh-hud:hover .jh-pin, .jh-pin:hover, .jh-hud.is-edit .jh-pin { opacity: 1; }
.jh-pin .hud-pin { opacity: 1; }
@keyframes jh-souffle { from { transform: scaleY(1.06); } to { transform: scaleY(.86); } }
`;

/**
 * Page de l'overlay (/hud/fsdcool), sans fenêtre : le bandeau du refroidissement du SCO (overdrive) après sa coupure
 * (moteur, courbe de chaleur qui se vide, compte à rebours ; Jauge.jsx), puis « PRÊT » en vert une seconde.
 * Le refroidissement du FSD normal n'est pas montré : le jeu l'affiche déjà, celui du SCO non (l’auteur, 19 nov. 2026). Le
 * serveur continue de le mesurer (state.js), sans rien en faire ici.
 * Souris sur le bandeau : le bouton de déplacement apparaît.
 */
function FsdCoolOverlay() {
  const { data } = useLiveSession('/modules/fsdcool', 'fsdcool:update', { horloge: false }); // sa propre horloge (now)
  const { editing, pin } = useOverlayPage();
  const now = useNow(250);
  const sco = scoPhase(data?.sco, now);
  const jauges = [];
  if (sco) {
    const pret = sco.phase === 'ready';
    jauges.push({ cle: 'sco', label: 'SCO', fraction: pret ? 1 : sco.durationS ? 1 - sco.leftS / sco.durationS : NaN, texte: pret ? 'PRÊT' : `${Math.ceil(sco.leftS)} s`, pret });
  }
  // Rien à montrer : la fenêtre reste vide (transparente), sauf en mode déplacement pour pouvoir la placer
  if (!jauges.length && !editing) return null;
  return (
    <div className={`jh-hud${editing ? ' is-edit' : ''}`}>
      <style>{CSS}</style>
      {jauges.length ? jauges.map(({ cle, ...j }) => <Jauge key={cle} {...j} />) : <Jauge label="SCO" note="exemple" fraction={0.12} texte="46 s" />}
      {pin && <span className="jh-pin">{pin}</span>}
    </div>
  );
}

export default {
  id: 'fsdcool',
  title: 'Refroidissement SCO',
  Hud: FsdCoolOverlay, // pas de page : seulement la fenêtre, ouverte d'elle-même
};
