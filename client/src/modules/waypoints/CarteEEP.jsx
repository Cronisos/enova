// Carte ronde d'un EEP balayé, vue de dessus, nord en haut : tranches balayées (couleur de l'app), cercles à suivre en
// pointillés, repères de minerais (losange à la couleur du minerai, vide s'il est tari ou pas rentable, « 3F » pour
// les foreuses), toi en flèche. Utilisée par la fenêtre de balayage en jeu (SweepOverlay), la liste des EEP balayés et
// l'image à partager. Couleurs passées en style, jamais en attribut SVG : les attributs ne lisent pas les variables CSS
// (teinte de l'app) ; pour l'image, la teinte est donnée en clair (accRgb), l'image n'ayant pas la feuille de style.

import { LAST_SPOT, couleurMinerai } from './oreColors.js';
import { DrillMarks } from './DrillsPanel.jsx';

/** Point à `r` du centre, cap `a` (° depuis le nord, sens horaire), dans le repère du dessin (y vers le bas). */
const pt = (r, a) => {
  const t = (a * Math.PI) / 180;
  return `${(r * Math.sin(t)).toFixed(2)} ${(-r * Math.cos(t)).toFixed(2)}`;
};
/** Tranche d'anneau entre les rayons r0 et r1 et les caps a0 et a1. */
export function wedge(r0, r1, a0, a1) {
  if (r0 <= 0.01) return `M0 0 L${pt(r1, a0)} A${r1} ${r1} 0 0 1 ${pt(r1, a1)} Z`;
  return `M${pt(r1, a0)} A${r1} ${r1} 0 0 1 ${pt(r1, a1)} L${pt(r0, a1)} A${r0} ${r0} 0 0 0 ${pt(r0, a0)} Z`;
}

/** Position d'un point de la carte (x, y en m, d distance au centre) dans le dessin, collée au bord au-delà. */
const place = (p, k) => {
  const d = Math.min(p.d * k, 106);
  return { x: p.d > 0 ? (p.x / p.d) * d : 0, y: p.d > 0 ? (-p.y / p.d) * d : 0 };
};

/**
 * @param v vue du balayage (serveur : sweep.view) ; you absent pour une carte revue depuis la liste
 * @param pick survol d'un minerai (bulle des prix) ; drills foreuses du Rhino (fenêtre en jeu seulement)
 * @param accRgb teinte en clair (« 255, 154, 60 ») pour une image ; sinon la variable CSS de l'app
 */
export default function CarteEEP({ v, pick = () => {}, drills = null, accRgb = null, className = 'sw-map', titre = 'Carte du balayage' }) {
  const R = v.radius;
  const k = 100 / R;
  const acc = accRgb ? `rgb(${accRgb})` : 'var(--accent)';
  const accA = (a) => (accRgb ? `rgba(${accRgb},${a})` : `rgba(var(--acc-rgb),${a})`);
  const you = v.you;
  let mark = null;
  if (you) {
    const p = place(you, k);
    mark = (
      <g transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`}>
        {/* Ce que le scanner voit d'ici */}
        {you.d * k <= 106 && <circle r={v.scan * k} fill="rgba(111,211,255,.10)" stroke="#6fd3ff" strokeWidth="1" strokeOpacity=".7" />}
        <path d="M0 -7 L5 5 L0 2.5 L-5 5 Z" fill="#f4f6f8" stroke="#07090c" strokeWidth="1.2" transform={`rotate(${you.heading ?? 0})`} />
      </g>
    );
  }
  const n = v.steps[0]?.sectors.length || 36;
  const marks = (v.marks || []).map((m) => {
    const p = place(m, k);
    const color = m.auto ? LAST_SPOT : couleurMinerai(m.ore);
    const hollow = m.depleted || m.unprofitable;
    return (
      <g key={`m${m.id}`} transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`}
        {...(m.ore && !m.auto && { onMouseEnter: () => pick(m.ore), onMouseLeave: () => pick(null), style: { cursor: 'help' } })}>
        <circle r="8" fill="transparent" />
        <title>{m.label}{m.drills ? ` · ${m.drills} foreuse${m.drills > 1 ? 's' : ''}` : ''}</title>
        <path d="M0 -5 L5 0 L0 5 L-5 0 Z" fill={hollow ? '#07090c' : color} stroke={hollow ? color : '#07090c'} strokeWidth="1.3" />
        {m.drills > 0 && (
          <text x="6.5" y="3" fontSize="8" fontWeight="700" fill={color} stroke="#07090c" strokeWidth="2.4" paintOrder="stroke">{m.drills}F</text>
        )}
      </g>
    );
  });
  return (
    <svg className={className} viewBox="-112 -112 224 224" aria-label={titre} xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'hidden' }}>
      <circle r="100" fill="rgba(255,255,255,.03)" stroke="#4a525c" strokeWidth="1" />
      {v.steps.map((s, i) => {
        const fill = (done) => (done ? accA(0.5) : i === v.current && you ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.02)');
        // Le petit disque du centre d'un bloc : en tranches, il ne serait que des rayures
        if (s.kind === 'center') return <circle key={`c${i}`} r={s.outer * k} style={{ fill: fill(s.done) }} stroke="#07090c" strokeWidth="0.8" />;
        return s.sectors.map((done, t) => (
          <path key={`${i}-${t}`} d={wedge(s.inner * k, s.outer * k, (t * 360) / n, ((t + 1) * 360) / n)} style={{ fill: fill(done) }} stroke="#07090c" strokeWidth="0.8" />
        ));
      })}
      {/* Route du cercle en cours : une bande de ± la marge de conduite autour du pointillé, verte quand tu roules dedans
          (ce que tu vois compte pour les tranches), à peine visible quand tu en sors */}
      {v.steps.map((s, i) => {
        if (s.kind !== 'ring' || i !== v.current || !you || !v.marge) return null;
        const surRoute = Boolean(v.guide?.onRing);
        return (
          <circle key={`route${i}`} r={s.radius * k} fill="none" strokeWidth={Math.max(3, 2 * v.marge * k)}
            style={{ stroke: surRoute ? 'rgba(95,211,141,.38)' : 'rgba(255,255,255,.07)', transition: 'stroke .4s' }} />
        );
      })}
      {v.steps.map((s, i) => {
        const color = i === v.current && you ? acc : '#8a94a0';
        if (s.kind !== 'ring') return <circle key={`r${i}`} r="3" style={{ fill: color }} />;
        return <circle key={`r${i}`} r={s.radius * k} fill="none" style={{ stroke: color }} strokeWidth={i === v.current && you ? 1.8 : 1} strokeDasharray="5 3" />;
      })}
      <text x="0" y="-103" textAnchor="middle" fontSize="9" fill="#8a94a0">N</text>
      {marks}
      {drills && <DrillMarks d={drills} k={k} />}
      {mark}
    </svg>
  );
}
