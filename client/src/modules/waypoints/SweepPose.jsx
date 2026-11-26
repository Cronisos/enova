// Tiroir « repère » de la fenêtre de balayage (/hud/waypoints-sweep-pose) : collé à gauche, comme le Top 10 (à sa gauche
// s'il est ouvert). 📍 ou Alt+Maj+R prend la position et ouvre un brouillon (événement waypoints:pose) : rien n'est
// enregistré avant ✓ OK, ✕ l'abandonne. Un repère déjà posé à moins de 150 m est repris au lieu d'en créer un autre.
// Le numéro d'EEP trouvé seul (EEP balayé, repère voisin, cible du vaisseau) s'affiche ✓ ; le pavé ne sert que s'il est
// inconnu (en SRV, le jeu ne le donne jamais) : tapé une fois, tout l'EEP et ses repères le prennent.
// Minerai : les 12 courants d'un clic ; « Autre… » ouvre une recherche dans tous les autres (Tritium, Painite…), et le
// texte tapé peut servir tel quel s'il n'est pas dans la liste.

import { useEffect, useState } from 'react';
import { useEvent } from '../../core/stream.js';
import { useHiddenWindow, useOverlayPage } from '../../core/hud.jsx';
import { meters, wpApi } from './api.js';
import { ORE_COLORS, couleurMinerai } from './oreColors.js';
import { TOP_CSS } from './SweepTop.jsx';
import { ajouterChiffre, chercherMinerais, FOREUSES, numeroSaisi } from './poseVue.js';

const PAGE = 'waypoints-sweep-pose';

export const POSE_CSS = `
.sw-pose-t { margin: 2px 0 0; font-size: 17px; font-weight: 700; color: #f4f6f8; }
.sw-pose-deja { font-size: 12px; color: #ffb547; margin: 2px 0 0; }
.sw-pose-l { font-size: 11px; color: #8a94a0; text-transform: uppercase; letter-spacing: .06em; margin: 8px 0 3px;
  display: flex; justify-content: space-between; align-items: baseline; }
.sw-pose-l b { font-size: 16px; color: var(--accent); letter-spacing: 0; font-variant-numeric: tabular-nums; }
.sw-pose-l b.is-vide { color: #8a94a0; }
.sw-pose-ores { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.sw-pose-ores button { height: 26px; padding: 0 6px; border: 1px solid var(--c); border-radius: 4px; background: #07090c; color: var(--c);
  font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sw-pose-ores button:hover, .sw-pose-ores button.is-on { background: var(--c); color: #07090c; }
.sw-pose-pad { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
.sw-pose-pad button { height: 28px; border: 1px solid #4a525c; border-radius: 4px; background: #07090c; color: #dfe4ea;
  font-size: 14px; font-weight: 700; cursor: pointer; font-variant-numeric: tabular-nums; }
.sw-pose-pad button:hover { border-color: var(--accent); color: var(--accent); }
.sw-pose-pad button.is-on { background: var(--accent); border-color: var(--accent); color: #07090c; }
.sw-pose-ok { margin-top: 10px; min-height: 34px; border: 0; border-radius: 4px; background: var(--accent); color: #07090c;
  font-size: 14px; font-weight: 800; cursor: pointer; }
.sw-pose-ok:hover { filter: brightness(1.12); }
.sw-pose-err { color: #ff6b6b; font-size: 12px; margin: 4px 0 0; }
.sw-pose-auto { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 13px; color: #8a94a0; }
.sw-pose-auto b { color: #5fd38d; font-size: 15px; }
.sw-pose-auto button { background: none; border: 0; color: #8a94a0; font-size: 11px; text-decoration: underline; cursor: pointer; }
.sw-pose-ores .sw-pose-autre { grid-column: 1 / -1; --c: #f4f6f8; }
.sw-pose-cherche { margin-top: 5px; height: 28px; padding: 0 8px; border: 1px solid var(--accent); border-radius: 4px; background: #07090c;
  color: #f4f6f8; font-size: 13px; outline: none; }
.sw-pose-liste { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; max-height: 170px; overflow-y: auto; }
.sw-pose-liste button { text-align: left; padding: 4px 8px; border: 0; border-radius: 3px; background: rgba(255,255,255,.04); color: #dfe4ea;
  font-size: 12px; cursor: pointer; }
.sw-pose-liste button:hover, .sw-pose-liste button.is-on { background: #f4f6f8; color: #07090c; }
.sw-pose-liste button.is-libre { color: var(--accent); }
.sw-pose-liste button.is-libre:hover { background: var(--accent); color: #07090c; }
.sw-pose-liste small { color: #8a94a0; font-size: 11px; padding: 2px 4px; }
.sw-pose-why { font-size: 11px; color: #8a94a0; margin: 0 0 4px; line-height: 1.35; }
`;

/**
 * Formulaire d'un brouillon de repère : foreuses, n° d'EEP, minerai ; ✓ OK l'enregistre. Utilisé par le tiroir (overlay)
 * et dans la fenêtre de balayage elle-même (navigateur).
 */
export function PoseForm({ brouillon, hover = {}, onDone }) {
  const [label, setLabel] = useState(brouillon.label);
  const [drills, setDrills] = useState(brouillon.drills);
  const [chiffres, setChiffres] = useState(null); // numéro d'EEP en cours de saisie (texte), null : pas touché
  const [corriger, setCorriger] = useState(false);
  const [error, setError] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [autre, setAutre] = useState(false); // recherche « Autre… » ouverte
  const [cherche, setCherche] = useState('');
  const estAutre = !Object.hasOwn(ORE_COLORS, label) && label !== 'Repère';
  const { trouves, libre } = chercherMinerais(brouillon.autres, cherche);
  const choisir = (nom) => {
    setLabel(nom);
    setAutre(false);
    setCherche('');
  };
  const affiche = chiffres ?? (brouillon.siteNumber != null ? String(brouillon.siteNumber) : '');
  const valider = () => {
    const n = numeroSaisi(chiffres);
    setEnvoi(true);
    wpApi.validerBrouillon({ id: brouillon.id, label, drills, ...(n !== undefined ? { siteNumber: n } : {}) })
      .then(() => onDone())
      .catch((e) => { setError(e.message); setEnvoi(false); });
  };
  return (
    <>
      <p className="sw-pose-t">{label}</p>
      {brouillon.proche && <p className="sw-pose-deja">Déjà un repère ici ({meters(brouillon.proche.distance)}) : il sera mis à jour, pas recréé.</p>}
      <div className="sw-pose-l">Foreuses <b className={drills ? '' : 'is-vide'}>{drills ?? '?'}</b></div>
      <div className="sw-pose-pad">
        {FOREUSES.map((n) => (
          <button key={n} type="button" className={drills === n ? 'is-on' : ''} {...hover} onClick={() => setDrills(drills === n ? null : n)}>{n}</button>
        ))}
      </div>
      {brouillon.siteNumber != null && chiffres == null && !corriger ? (
        <div className="sw-pose-auto"><span>EEP <b>{brouillon.siteNumber}</b> ✓</span><button type="button" {...hover} onClick={() => setCorriger(true)}>corriger</button></div>
      ) : (
        <>
          <div className="sw-pose-l">N° d’EEP <b className={affiche ? '' : 'is-vide'}>{affiche || '?'}</b></div>
          {brouillon.siteNumber == null && chiffres == null && (
            <p className="sw-pose-why">Le jeu ne le donne pas en SRV. Tape-le une fois : tout cet EEP et ses repères le prennent.</p>
          )}
          <div className="sw-pose-pad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((c) => (
              <button key={c} type="button" {...hover} onClick={() => setChiffres(ajouterChiffre(chiffres ?? '', c))}>{c}</button>
            ))}
            <button type="button" title="Effacer le dernier chiffre" {...hover} onClick={() => setChiffres((affiche || '').slice(0, -1))}>⌫</button>
          </div>
        </>
      )}
      <div className="sw-pose-l">Minerai</div>
      {brouillon.eep?.length > 0 && (
        <div className="sw-pose-ores">
          {brouillon.eep.map((o) => (
            <button key={o} type="button" className={label === o ? 'is-on' : ''} style={{ '--c': couleurMinerai(o) }} title="Lu sur le panneau de cible de cet EEP" {...hover} onClick={() => setLabel(o)}>📷 {o}</button>
          ))}
        </div>
      )}
      <div className="sw-pose-ores">
        {Object.keys(ORE_COLORS).map((o) => (
          <button key={o} type="button" className={label === o ? 'is-on' : ''} style={{ '--c': ORE_COLORS[o] }} {...hover} onClick={() => setLabel(o)}>{o}</button>
        ))}
        <button type="button" className={`sw-pose-autre${estAutre || autre ? ' is-on' : ''}`} {...hover} onClick={() => setAutre(!autre)}>
          {estAutre && !autre ? `Autre : ${label}` : 'Autre… (Tritium, Painite…)'}
        </button>
      </div>
      {autre && (
        <>
          <input className="sw-pose-cherche" autoFocus value={cherche} placeholder="Chercher un minerai…" {...hover}
            onChange={(e) => setCherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (trouves[0] || libre)) choisir(trouves[0] || libre);
              if (e.key === 'Escape') setAutre(false);
            }} />
          <div className="sw-pose-liste">
            {trouves.map((n) => (
              <button key={n} type="button" className={label === n ? 'is-on' : ''} {...hover} onClick={() => choisir(n)}>{n}</button>
            ))}
            {libre && <button type="button" className="is-libre" title="Retenu : proposé et reconnu les fois suivantes" {...hover} onClick={() => choisir(libre)}>＋ Ajouter « {libre} »</button>}
            {!trouves.length && !libre && <small>Tape le nom du minerai : s’il manque, ＋ Ajouter le retient.</small>}
          </div>
        </>
      )}
      <button type="button" className="sw-pose-ok" disabled={envoi} {...hover} onClick={valider}>
        ✓ OK · {brouillon.proche ? 'mettre à jour' : 'enregistrer'}
      </button>
      {error && <p className="sw-pose-err">{error}</p>}
    </>
  );
}

export default function SweepPoseOverlay() {
  const { overlay, hover } = useOverlayPage();
  const { shown, toggle } = useHiddenWindow(PAGE);
  const [side, setSide] = useState('left');
  const [brouillon, setBrouillon] = useState(null);
  useEffect(() => {
    overlay?.dockSide?.().then((s) => s && setSide(s));
    const off = overlay?.onDockSide?.(setSide);
    return typeof off === 'function' ? off : undefined;
  }, []);
  useEffect(() => {
    if (!shown) overlay?.setHover(false);
  }, [shown]);
  // 📍 ou Alt+Maj+R : le tiroir sort (s'il était rangé) avec le brouillon
  useEvent('waypoints:pose', (b) => {
    setBrouillon(b);
    if (!shown) toggle();
  });
  const fermer = () => {
    setBrouillon(null);
    if (shown) toggle();
  };
  const h = shown ? hover : {};
  return (
    <div className={`sw-drawer is-${side} ${shown ? 'is-open' : ''}`}>
      <style>{TOP_CSS + POSE_CSS}</style>
      <div className="sw-top">
        <h4>📍 {brouillon?.proche ? 'Repère existant' : 'Nouveau repère'} <button type="button" title="Abandonner (rien n’est enregistré)" {...h} onClick={fermer}>✕</button></h4>
        {brouillon ? <PoseForm key={brouillon.id} brouillon={brouillon} hover={h} onDone={fermer} /> : <small>Pose un repère avec 📍 ou Alt+Maj+R.</small>}
      </div>
    </div>
  );
}
