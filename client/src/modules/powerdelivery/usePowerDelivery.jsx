// Session de livraison Powerplay en temps réel, et son contenu dans le HUD.

import { perHour, useLiveSession } from '../../core/hud.jsx';
import { useNow } from '../../core/stream.js';
import { clock, int, time } from '../../core/format.js';

export function usePowerDelivery() {
  const session = useLiveSession('/modules/powerdelivery', 'powerdelivery:update');
  const { data, seconds } = session;
  const now = useNow(1000); // compte à rebours de la prochaine allocation
  return { ...session, now, meritsHour: data && perHour(data.merits, seconds) };
}

/**
 * Où en est l'allocation : { possible, texte, sous, court }. `possible` : on peut sans doute recharger (jamais chargé, ou
 * tranche de 30 minutes finie : server/src/modules/powerdelivery/grille.js) ; sinon `texte` est le temps restant (« 12:34 »).
 */
export function etatQuota(quota, now) {
  if (!quota) return { possible: true, texte: 'Possible', sous: 'rien chargé pour l’instant', court: 'rien chargé' };
  const reste = Math.ceil((Date.parse(quota.nextAt) - now) / 1000);
  // Grille des tranches inconnue (quota.sure faux) : l'heure donnée est « au plus tard », le jeu peut rouvrir avant
  const sous = `${int(quota.taken)} t prises à ${time(quota.since)}${quota.sure === false ? ', au plus tard' : ''}`;
  const court = `${int(quota.taken)} t à ${time(quota.since)}`; // pour la case du bandeau, étroite
  // `bientot` : moins d'une minute, la case du bandeau se met alors à clignoter à chaque seconde
  return reste > 0 ? { possible: false, texte: clock(reste), sous, court, bientot: reste <= 60 } : { possible: true, texte: 'Possible', sous, court };
}

/**
 * Ce qu'il y a en soute, en clair : « Dossiers de presse d'Aisling », ou plusieurs ressources séparées par « + ».
 * `court` : pour la case du bandeau.
 */
export function texteSoute(hold, { court = false } = {}) {
  const items = hold?.items || [];
  if (!items.length) return court ? 'aucune ressource' : 'aucune ressource Powerplay';
  // Bandeau : sans le nom de la puissance (« Dossiers de presse d'Aisling » → « Dossiers de presse »), la case est étroite
  const nom = (l) => (court ? String(l).replace(/ d['’][^ ]+$/, '') : l);
  return items.map((i) => (items.length > 1 ? `${int(i.count)} t ${nom(i.label)}` : nom(i.label))).join(' + ');
}

/**
 * Props du HUD : la soute et son type de ressource, les mérites gagnés, les mérites à l'heure, le délai avant de
 * pouvoir recharger ; la dernière action en bas.
 */
export function powerDeliveryHud({ data, seconds, chrono, resetTime, meritsHour, pause, togglePause, now = Date.now() }) {
  if (!data) return null;
  const last = data.recent[0];
  const q = etatQuota(data.quota, now);
  return {
    title: '📦 Livraison Powerplay',
    seconds: chrono ?? seconds, // chrono affiché : depuis le dernier ↺ (les taux gardent toute la session)
    pause,
    onPause: togglePause,
    onResetTime: resetTime,
    // Quatre cases sur la même ligne (trois par défaut : la quatrième passait dessous) ; la soute, qui porte le nom de
    // la ressource, est plus large
    columns: 'auto 1.7fr 1fr 1fr 1.25fr',
    dense: true,
    cells: [
      { label: 'En soute', value: `${int(data.hold.count)} t`, color: '#6fd3ff', centerValue: true, sub: texteSoute(data.hold, { court: true }) },
      { label: 'Mérites', value: int(data.merits), color: '#ffd24a', centerValue: true, sub: `${int(data.delivered)} t livrées` },
      { label: 'Mérites / h', value: meritsHour != null ? int(meritsHour) : '—', color: 'var(--accent)', centerValue: true, sub: '' },
      // Allocation : le temps restant sur les 30 minutes qui suivent le chargement (règle à vérifier : state.js) ; verte ensuite
      // still : pas de flash à chaque seconde du compte à rebours, sauf dans la dernière minute (l’auteur, 19 nov. 2026)
      { label: 'Recharge', value: q.texte, color: q.possible ? '#5fd38d' : '#d3a6ff', centerValue: true, still: !q.bientot, sub: q.court },
    ],
    last: last ? (
      <>
        <b>{last.kind} : {int(last.count)} t · {last.label}</b>
        <span>{time(last.at)}</span>
        {last.merits > 0 && <span className="hud-gain">+{int(last.merits)} mérites</span>}
      </>
    ) : <span>charge des ressources chez ta puissance : la session démarre toute seule</span>,
  };
}
