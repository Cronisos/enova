// Bandeau de refroidissement sans fenêtre (fenêtre en jeu /hud/fsdcool), d'après la maquette de Cronisos Lysiris (19 nov.
// 2026) : le moteur à gauche dans un cadre aux coins coupés, liseré orange côté moteur et bleu côté compte à rebours,
// le titre, et la courbe de la chaleur qui retombe : haute et orange à gauche, basse et bleue à droite. Elle ne défile pas : elle fluctue sur place. Elle se
// vide de gauche à droite avec le temps écoulé : l'orange part d'abord, il ne reste que du bleu à la fin. Le moteur est une image (assets/moteur-fsd.png, du
// même auteur) ; tout le reste est dessiné ici. Géométrie de la courbe : vague.js.

import { useId } from 'react';
import moteur from '../../assets/moteur-fsd.png';
import { HAUTEUR, LARGEUR, VAGUE_H, VAGUE_L, partVidee, traceVague } from './vague.js';

const DESSUS = traceVague();
const AIRE = `${DESSUS} V${VAGUE_H} H0 Z`;
const REFLET = traceVague(2.4); // même courbe, ondulation décalée : elle fluctue à contretemps
const CONTOUR = 'M34 8 H150 L158 16 H436 L444 8 H530 L552 30 V62 L530 84 H150 L142 76 H34 L8 46 Z';

function Flocon() {
  return (
    <svg viewBox="-12 -12 24 24" className="jh-flocon" aria-hidden="true">
      {[0, 60, 120].map((a) => (
        <path key={a} transform={`rotate(${a})`} d="M0 -10 V10 M-3.2 -7.2 L0 -4.6 L3.2 -7.2 M-3.2 7.2 L0 4.6 L3.2 7.2" />
      ))}
    </svg>
  );
}

/**
 * @param label « FSD » ou « SCO »
 * @param titre « Refroidissement »
 * @param note précision en petit (« 1re mesure », « exemple »), ou rien
 * @param fraction 0 à 1 : avancement du refroidissement (1 : fini) ; non fini : durée inconnue, la courbe reste pleine
 * @param texte compte à rebours (« 46 s ») ou « PRÊT »
 * @param pret refroidissement fini (SCO prêt) : courbe vide, compte à rebours en vert
 */
export default function Jauge({ label, titre = 'Refroidissement', note = '', fraction, texte, pret = false }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const debut = (pret ? 1 : partVidee(fraction)) * VAGUE_L;
  return (
    <div className={`jh${pret ? ' is-pret' : ''}`} role="status" aria-label={`${titre} ${label} : ${texte}`}>
      <svg className="jh-cadre" viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-bord`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={LARGEUR} y2="0">
            <stop offset="0" stopColor="#ff9a1f" /><stop offset=".3" stopColor="#ffb24a" /><stop offset=".52" stopColor="#f2f4f8" />
            <stop offset=".72" stopColor="#6cc8ff" /><stop offset="1" stopColor="#2f9bff" />
          </linearGradient>
          {/* Lueur du liseré : un flou fixe, calculé une fois (le cadre ne bouge pas) */}
          <filter id={`${id}-lueur`} x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="3.2" /></filter>
        </defs>
        <path className="jh-fond" d={CONTOUR} />
        <path d={CONTOUR} fill="none" stroke={`url(#${id}-bord)`} strokeWidth="4" opacity=".55" filter={`url(#${id}-lueur)`} />
        <path d={CONTOUR} fill="none" stroke={`url(#${id}-bord)`} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M163 20 L147 72" stroke="#ffb24a" strokeWidth="1.6" />
        <path className="jh-case" d="M452 22 H528 L543 37 V58 L529 72 H437 Z" />
      </svg>
      <img className="jh-moteur" src={moteur} alt="" />
      <div className="jh-titre">
        <Flocon />
        <span className="jh-nom">{titre}</span>
        <span className="jh-label">{label}</span>
        {note && <span className="jh-note">{note}</span>}
        <span className="jh-hachures" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      </div>
      <svg className="jh-vague" viewBox={`0 0 ${VAGUE_L} ${VAGUE_H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-chaleur`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={VAGUE_L} y2="0">
            <stop offset="0" stopColor="#ff8a1f" /><stop offset=".38" stopColor="#ffb24a" /><stop offset=".56" stopColor="#f4f1f4" />
            <stop offset=".72" stopColor="#5cc4ff" /><stop offset="1" stopColor="#2f9bff" />
          </linearGradient>
          <mask id={`${id}-aire`}><path d={AIRE} fill="#fff" /></mask>
          <mask id={`${id}-crete`}><path d={DESSUS} fill="none" stroke="#fff" strokeWidth="2.2" /></mask>
          <mask id={`${id}-reflet`}><path d={REFLET} fill="none" stroke="#fff" strokeWidth="1.4" /></mask>
          <clipPath id={`${id}-reste`}><rect className="jh-reste" y="0" height={VAGUE_H} style={{ x: `${debut}px`, width: `${VAGUE_L - debut}px` }} /></clipPath>
        </defs>
        <path d={`M0 3 H${VAGUE_L}`} stroke="rgba(160,200,230,.35)" strokeWidth="1.2" strokeDasharray="1.5 7" />
        <path d={`M0 ${VAGUE_H - 1} H${VAGUE_L}`} stroke="rgba(255,255,255,.14)" strokeWidth="1" />
        <g clipPath={`url(#${id}-reste)`}>
          {/* Fluctuation sur place : la courbe respire de haut en bas, son reflet à contretemps ; rien n'avance */}
          <g className="jh-souffle">
            <rect width={VAGUE_L} height={VAGUE_H} fill={`url(#${id}-chaleur)`} opacity=".5" mask={`url(#${id}-aire)`} />
            <rect width={VAGUE_L} height={VAGUE_H} fill={`url(#${id}-chaleur)`} mask={`url(#${id}-crete)`} />
          </g>
          <g className="jh-reflet">
            <rect width={VAGUE_L} height={VAGUE_H} fill={`url(#${id}-chaleur)`} opacity=".5" mask={`url(#${id}-reflet)`} />
          </g>
        </g>
      </svg>
      <span className="jh-temps">{texte}</span>
    </div>
  );
}
