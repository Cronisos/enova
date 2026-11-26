// Session de commerce de rares en temps réel, et son contenu dans le HUD.

import { useRef } from 'react';
import { useLiveSession } from '../../core/hud.jsx';
import { releve, tauxStable } from './tauxStable.js';
import { compact, int, time } from '../../core/format.js';

export function useRares() {
  const session = useLiveSession('/modules/rares', 'rares:update');
  const { data, seconds } = session;
  // Taux à l'heure : une moyenne arrêtée à la dernière vente (tauxStable.js), pas un chiffre qui baisse chaque seconde
  const garde = useRef(null);
  garde.current = releve(garde.current, data, seconds);
  return { ...session, meritsHour: data && tauxStable(data.merits, garde.current, data.merits), profitHour: data && tauxStable(data.profit, garde.current, data.merits) };
}

/** Ce qu'il y a en soute, en clair : « Cigares de Kamitra », ou plusieurs rares séparées par « + ». */
export function texteSoute(hold) {
  const items = hold?.items || [];
  if (!items.length) return 'aucune rare';
  return items.map((i) => (items.length > 1 ? `${int(i.count)} t ${i.label}` : i.label)).join(' + ');
}

/** Mérites par tonne vendue (« 15,1 »), ou « — » tant que rien n'est vendu. */
export const parTonne = (merits, sold) => (sold > 0 ? (merits / sold).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '—');

/** Props du HUD : la soute, les mérites gagnés, les mérites à l'heure, le bénéfice ; la dernière action en bas. */
export function raresHud({ data, seconds, chrono, resetTime, meritsHour, profitHour, pause, togglePause }) {
  if (!data) return null;
  const last = data.recent[0];
  return {
    title: '◆ Commerce de rares',
    seconds: chrono ?? seconds, // chrono affiché : depuis le dernier ↺ (les taux gardent toute la session)
    pause,
    onPause: togglePause,
    onResetTime: resetTime,
    columns: 'auto 1.5fr 1fr 1fr 1.15fr',
    dense: true,
    cells: [
      { label: 'En soute', value: `${int(data.hold.count)} t`, color: '#6fd3ff', centerValue: true, sub: texteSoute(data.hold) },
      { label: 'Mérites', value: int(data.merits), color: '#ffd24a', centerValue: true, sub: data.sold > 0 ? `${parTonne(data.merits, data.sold)} par tonne` : 'rien de vendu' },
      { label: 'Mérites / h', value: meritsHour != null ? int(meritsHour) : '—', color: 'var(--accent)', centerValue: true, sub: '' },
      { label: 'Bénéfice', value: `${compact(data.profit)} cr`, color: '#5fd38d', centerValue: true, sub: profitHour != null ? `${compact(profitHour)} cr / h` : '' },
    ],
    last: last ? (
      <>
        <b>{last.kind} : {int(last.count)} t · {last.label}</b>
        <span>{time(last.at)}</span>
        {last.merits > 0 && <span className="hud-gain">+{int(last.merits)} mérites</span>}
      </>
    ) : <span>achète une marchandise rare : la session se remplit toute seule</span>,
  };
}
