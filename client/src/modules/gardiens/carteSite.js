// Carte interactive d'un site gardien : toi et les points marqués, placés d'après leurs coordonnées. Sans React : testé
// seul. Nord en haut ; les distances sont en mètres, calculées sur la sphère de la planète (rayon donné par le jeu).

const RAD = Math.PI / 180;
const RAYON_DEFAUT = 1_000_000; // rayon inconnu : ordre de grandeur d'une petite lune, la carte reste lisible

/** De `de` vers `vers` : { est, nord, distance (m), cap (0 = nord, 90 = est) }. */
export function ecart(de, vers, rayon) {
  const r = Number.isFinite(rayon) && rayon > 0 ? rayon : RAYON_DEFAUT;
  let dLon = vers.longitude - de.longitude;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  const est = dLon * RAD * r * Math.cos(((de.latitude + vers.latitude) / 2) * RAD);
  const nord = (vers.latitude - de.latitude) * RAD * r;
  const cap = (Math.atan2(est, nord) / RAD + 360) % 360;
  return { est, nord, distance: Math.hypot(est, nord), cap };
}

/** Cap relatif à ton nez : « à 2 h », « derrière »… en degrés signés, de −180 à 180 (positif : à droite). */
export function relatif(cap, heading) {
  if (!Number.isFinite(heading)) return null;
  return ((cap - heading + 540) % 360) - 180;
}

/**
 * La carte à dessiner, dans un carré de côté `taille` : centrée sur le milieu des points (et de toi), à l'échelle qui
 * fait tout tenir, jamais plus serrée que `minimum` mètres de rayon.
 * @returns { rayon (m montrés du centre au bord), points: [{ ...p, x, y, distance, cap, relatif }], moi: { x, y, heading } | null }
 *   distance, cap et relatif : depuis toi (null sans position).
 */
export function carte(position, points, rayonPlanete, { taille = 300, minimum = 120, marge = 26 } = {}) {
  const moi = position && Number.isFinite(position.latitude) && Number.isFinite(position.longitude) ? position : null;
  const tous = [...(points || []), ...(moi ? [moi] : [])];
  if (!tous.length) return { rayon: minimum, points: [], moi: null };
  const centre = {
    latitude: (Math.min(...tous.map((p) => p.latitude)) + Math.max(...tous.map((p) => p.latitude))) / 2,
    longitude: (Math.min(...tous.map((p) => p.longitude)) + Math.max(...tous.map((p) => p.longitude))) / 2,
  };
  const places = tous.map((p) => ecart(centre, p, rayonPlanete));
  const rayon = Math.max(minimum, ...places.map((e) => Math.max(Math.abs(e.est), Math.abs(e.nord))));
  const k = (taille / 2 - marge) / rayon;
  const xy = (e) => ({ x: taille / 2 + e.est * k, y: taille / 2 - e.nord * k });
  return {
    rayon,
    points: (points || []).map((p, i) => {
      const versLui = moi ? ecart(moi, p, rayonPlanete) : null;
      return { ...p, ...xy(places[i]), distance: versLui?.distance ?? null, cap: versLui?.cap ?? null, relatif: versLui ? relatif(versLui.cap, moi.heading) : null };
    }),
    moi: moi ? { ...xy(places.at(-1)), heading: Number.isFinite(moi.heading) ? moi.heading : null } : null,
  };
}

/** « 85 m », « 1,2 km ». */
export function metres(d) {
  if (d == null) return '—';
  return d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
}

/** « devant », « à droite », « derrière à gauche »… d'après le cap relatif. */
export function cote(rel) {
  if (rel == null) return '';
  const a = Math.abs(rel);
  if (a <= 20) return 'devant';
  if (a >= 160) return 'derrière';
  const c = rel > 0 ? 'à droite' : 'à gauche';
  return a < 70 ? `devant ${c}` : a > 110 ? `derrière ${c}` : c;
}
