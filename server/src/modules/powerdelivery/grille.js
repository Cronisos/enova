// Quand pourra-t-on reprendre des ressources Powerplay ? Mesuré sur les journaux des 19 au 25 nov. 2026 (Aisling
// Duval, rangs 193 à 212, 250 t par tranche), heures UTC :
//   - le jeu donne un quota par TRANCHE de 30 minutes, et ces tranches ne partent pas de ton chargement : le 21 nov.,
//     250 t à 18:01:18 puis 250 t à 18:20:47 (19 min après) ; le 25 nov., 250 t à 16:02:37 puis 250 t à 16:27:26
//     (25 min après), et refus du jeu à 16:32 alors qu'un compte « 30 min après le premier chargement » disait oui ;
//   - deux pleins quotas pris à quelques secondes d'écart encadrent donc un changement de tranche : 16:41:17 et
//     16:41:23 le 21 nov. ; 21:22:47 et 21:23:13 le 24 nov. ;
//   - d'un jour au lendemain la grille tient (changement vers la minute 23 et 53 les 24 et 25 nov. : tous les
//     chargements du 25 tombent un par tranche, et le chargement de 09:10:15 n'a pas pu être doublé) ; sur plusieurs
//     jours elle se décale (minutes 11 et 41 le 21 nov.), sans que l'on sache pourquoi.
// D'où le calcul : la grille est déduite des paires récentes de pleins quotas pris à moins de 30 minutes d'écart
// (un changement de tranche est entre les deux). Sans paire récente, seule certitude : une nouvelle tranche commence
// au plus tard 30 minutes après le dernier chargement.
// Données pures : testé seul.

export const TRANCHE_MS = 30 * 60_000;
export const MEMOIRE_MS = 36 * 3_600_000; // au-delà, la grille a pu se décaler : les paires plus vieilles ne comptent plus
const GROUPE_MS = 2 * 60_000; // sans grille : chargements à moins de 2 min l'un de l'autre, même tranche

const mod = (v) => ((v % TRANCHE_MS) + TRANCHE_MS) % TRANCHE_MS;

/** Croisement de deux arcs { debut, longueur } du cercle de 30 minutes ; null s'ils ne se touchent pas. */
function croiser(a, b) {
  const d = mod(b.debut - a.debut);
  if (d <= a.longueur) return { debut: mod(a.debut + d), longueur: Math.min(a.longueur - d, b.longueur) };
  const e = mod(a.debut - b.debut);
  if (e <= b.longueur) return { debut: a.debut, longueur: Math.min(a.longueur, b.longueur - e) };
  return null;
}

/**
 * Où tombe le changement de tranche, d'après les chargements : un arc { debut, longueur } (ms dans la demi-heure) qui
 * contient l'instant du changement, ou null si rien ne permet de le dire.
 * @param prises [{ t (ms), n (tonnes) }] dans l'ordre du temps
 */
export function grille(prises) {
  if (!prises?.length) return null;
  const fin = prises.at(-1).t;
  const recentes = prises.filter((p) => fin - p.t <= MEMOIRE_MS);
  const plein = Math.max(...recentes.map((p) => p.n));
  let arc = null;
  // Des plus récentes aux plus anciennes : une paire qui contredit les suivantes arrête la remontée (grille décalée)
  for (let i = recentes.length - 1; i > 0; i -= 1) {
    const a = recentes[i - 1];
    const b = recentes[i];
    if (a.n !== plein || b.n !== plein || b.t - a.t >= TRANCHE_MS || b.t <= a.t) continue;
    const paire = { debut: mod(a.t), longueur: b.t - a.t };
    const suite = arc ? croiser(arc, paire) : paire;
    if (!suite) break;
    arc = suite;
  }
  return arc;
}

/**
 * Tranche en cours : { since, nextAt, taken, sure }, ou null si rien n'a été chargé.
 * - nextAt : l'heure à partir de laquelle le changement de tranche est certain ;
 * - sure : la grille est connue (à `longueur` près) ; sinon nextAt est « au plus tard » (30 min après le chargement) ;
 * - taken, since : ce qui a été pris dans la tranche du dernier chargement, et depuis quand.
 */
export function tranche(prises) {
  if (!prises?.length) return null;
  const dernier = prises.at(-1);
  const arc = grille(prises);
  let prochain = dernier.t + TRANCHE_MS;
  if (arc) {
    const dansArc = mod(dernier.t - arc.debut) <= arc.longueur; // le dernier chargement est dans la zone d'incertitude
    if (!dansArc) prochain = dernier.t + (mod(arc.debut + arc.longueur - dernier.t) || TRANCHE_MS);
  }
  const debut = arc ? prochain - TRANCHE_MS - (arc.longueur || 0) : null;
  let taken = 0;
  let since = dernier.t;
  for (let i = prises.length - 1; i >= 0; i -= 1) {
    const p = prises[i];
    const meme = arc ? p.t > debut : since - p.t <= GROUPE_MS;
    if (!meme) break;
    taken += p.n;
    since = p.t;
  }
  return { since: new Date(since).toISOString(), nextAt: new Date(prochain).toISOString(), taken, sure: Boolean(arc) };
}
