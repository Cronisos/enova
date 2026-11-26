import { HudOverlay, useHiddenWindow, useLiveSession } from '../../core/hud.jsx';
import { api } from '../../core/api.js';
import { useEvent, useNow } from '../../core/stream.js';
import { int } from '../../core/format.js';
import { gradeCounts } from './sim.js';
import { useSouteSurvol } from './SouteBulle.jsx';

const GRADE_COLORS = ['#f4f6f8', '#5fd38d', '#6fd3ff', '#d3a6ff', 'var(--accent)'];
const tons = (n) => (n == null ? '—' : `${int(n)} t`);
const SRV_ALERT = 60; // au-delà, la case du SRV clignote en rouge : il est temps de vider dans le vaisseau
const SHIP_WARN = 70; // moins de place que ça dans le vaisseau : sa case passe en rouge, discrètement

/** Page de l'overlay (/hud/waypoints) : la session de minage en cours, façon HUD. */
export default function MiningHud() {
  const { data: s } = useLiveSession('/modules/waypoints', 'waypoints:session', { horloge: false }); // sa propre horloge (now)
  const now = useNow(1000);
  // Bouton 📍 : montre ou cache la fenêtre des repères du système (ouverte cachée avec le mode)
  const list = useHiddenWindow('waypoints-list');
  // Bouton 🎯 : montre ou cache le balayage de l'EEP (centre, bord, cercles à suivre pour que le scanner voie tout)
  const sweep = useHiddenWindow('waypoints-sweep');
  // Retour sur une planète déjà minée : le serveur ouvre la boussole vers ta dernière tonne, puis la range à la suivante
  const guide = useHiddenWindow('waypoints-guide');
  useEvent('waypoints:auto-guide', (a) => {
    if (Boolean(a?.show) !== guide.shown) guide.toggle();
  });
  // Survol de la case « Vaisseau » : la ligne du bas montre ce que contient la soute
  const soute = useSouteSurvol(s?.cargo?.shipItems, s?.cargo?.ship);
  const buttons = [
    { icon: '🎯', title: sweep.shown ? 'Cacher le balayage de l’EEP' : 'Afficher le balayage de l’EEP', onClick: sweep.toggle, active: sweep.shown },
    { icon: '📍', title: list.shown ? 'Cacher les repères du système' : 'Afficher les repères du système', onClick: list.toggle, active: list.shown },
  ];

  if (!s) {
    return (
      <HudOverlay buttons={buttons} props={{
        title: '⛏ Minage',
        seconds: null,
        pause: 'waiting', // le chrono démarre à la première tonne raffinée
        cells: [
          { label: 'SRV', value: '—', color: '#6fd3ff', sub: '' },
          { label: 'Vaisseau', value: '—', color: '#5fd38d', sub: '' },
          { label: 'Taux', value: '—', color: '#ffd24a', sub: '' },
        ],
        last: <span>le chrono démarre à ta première tonne raffinée</span>,
      }} />
    );
  }

  const { cargo } = s;
  // En pause (rien fait depuis 10 min, jeu fermé), le chrono s'arrête à ta dernière action
  const seconds = s.priorSec + (s.runningSince ? Math.max(0, (now - s.runningSince) / 1000) : 0);
  const left = cargo.shipCapacity != null && cargo.ship != null ? cargo.shipCapacity - cargo.ship - (cargo.srv ?? 0) : null; // le SRV finira dans le vaisseau
  const grades = gradeCounts(s.materials);
  return (
    <HudOverlay buttons={buttons} props={{
      title: '⛏ Minage',
      seconds,
      pause: s.pause,
      // Clic sur « en direct / en pause », ou ⏸ : pause du chrono ; une tonne raffinée le relance d'elle-même
      onPause: () => api('/modules/waypoints/session/pause', { method: 'POST', body: { on: !s.pause } }).catch(() => {}),
      // ↺ sous le chrono : remet le temps à zéro, pas les soutes ni les compteurs
      onResetTime: () => api('/modules/waypoints/session/reset-time', { method: 'POST' }).catch(() => {}),
      cells: [
        { label: cargo.srvName || 'SRV', value: tons(cargo.srv), color: '#6fd3ff', centerValue: true, sub: cargo.srvMax ? `/ ${int(cargo.srvMax)} t` : '', alert: cargo.srv > SRV_ALERT },
        { label: 'Vaisseau', survol: soute.survol, value: tons(cargo.ship), color: '#5fd38d', centerValue: true, sub: cargo.shipCapacity ? `/ ${int(cargo.shipCapacity)} t${left != null ? ` · reste ${int(left)}` : ''}` : '', warn: left != null && left < SHIP_WARN },
        { label: 'Taux', value: s.recentPerHour == null ? '—' : `${int(s.recentPerHour)} t/h`, color: '#ffd24a', centerValue: true, sub: s.perHour == null ? '' : `moy. ${int(s.perHour)} t/h` },
      ],
      ...(soute.ouvert ? { tag: 'Soute' } : {}),
      last: soute.ouvert ? soute.ligne : (
        <>
          <b>Matériaux</b>
          {grades.map((count, i) => (i < 4 || count > 0) && (
            <span key={i} style={{ color: GRADE_COLORS[i] }}>G{i + 1} : {count}</span>
          ))}
          {s.merits > 0 && <span className="hud-gain" style={{ color: '#ffd24a' }}>{int(s.merits)} mérites</span>}
        </>
      ),
    }} />
  );
}
