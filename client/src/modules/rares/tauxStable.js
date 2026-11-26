// Taux horaire stable du commerce de rares : une moyenne arrêtée à la dernière vente, qui ne bouge plus jusqu'à la
// suivante. Un taux recalculé chaque seconde (mérites ÷ temps écoulé) baisse sans cesse entre deux ventes : illisible
// pour un commerce où tout tombe d'un coup, à la vente. Sans React : testé seul.

/**
 * Temps actif de la session (secondes, pauses déduites) au moment du dernier mouvement qui a rapporté des mérites.
 * Sert au premier affichage, quand la fenêtre s'ouvre en cours de session : ensuite le relevé est pris à la vente même.
 * @param data session ({ recent: [{ at, merits }], pausedSince })
 * @param seconds temps actif maintenant
 * @returns secondes, ou null si aucun mouvement n'a rapporté de mérites
 */
export function secondesALaVente(data, seconds, now = Date.now()) {
  const vente = (data?.recent || []).find((r) => r.merits > 0);
  const quand = vente ? Date.parse(vente.at) : NaN;
  if (!Number.isFinite(quand) || !Number.isFinite(seconds)) return null;
  // Temps écoulé depuis la vente, sans la pause en cours (à quai après la vente, le chrono est arrêté)
  let depuis = Math.max(0, now - quand);
  const pause = data.pausedSince ? Date.parse(data.pausedSince) : NaN;
  if (Number.isFinite(pause)) depuis -= Math.max(0, now - Math.max(pause, quand));
  return Math.max(0, seconds - Math.max(0, depuis) / 1000);
}

/**
 * Le relevé à garder : { cle, seconds }. Il change quand les mérites (ou la session) changent : une vente vient de
 * tomber, on arrête la moyenne à cet instant. Sinon le relevé précédent est rendu tel quel.
 */
export function releve(precedent, data, seconds, now = Date.now()) {
  if (!data || !Number.isFinite(seconds)) return precedent ?? null;
  const cle = `${data.startedAt}|${data.merits}`;
  if (precedent?.cle === cle) return precedent;
  // Premier relevé (fenêtre ouverte en cours de session) : estimé d'après l'heure de la vente ; ensuite : maintenant
  const auPremier = precedent ? null : secondesALaVente(data, seconds, now);
  return { cle, seconds: auPremier ?? seconds };
}

/** Valeur à l'heure sur le temps du relevé ; null avant la première vente ou si la session est trop courte (5 min). */
export function tauxStable(valeur, rel, merits) {
  if (!rel || !(merits > 0) || !(rel.seconds >= 300)) return null;
  return (valeur * 3600) / rel.seconds;
}
