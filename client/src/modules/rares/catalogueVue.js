// Catalogue des rares : tri et filtres du tableau. Sans React : testé seul.

export const TRIS = Object.freeze({
  distance: 'Distance',
  stock: 'Quantité',
  max: 'Plus haut vu',
  prix: 'Prix',
  label: 'Nom',
  maj: 'Relevé',
});

const NOMBRE = (v, vide) => (Number.isFinite(v) ? v : vide);

/**
 * Lignes à montrer.
 * @param lignes lignes du serveur ({ label, stock, prix, distance, arrivee, grandPad, maj })
 * @param f { tri, distanceMax (AL, 0 : toutes), grandPad (true : grand pad seulement), auSeuil (true : stock ≥ seuil), seuil }
 */
export function trier(lignes, { tri = 'distance', distanceMax = 0, grandPad = false, auSeuil = false, seuil = 100 } = {}) {
  const gardees = (lignes || []).filter((l) => {
    if (grandPad && !l.grandPad) return false;
    if (auSeuil && !(l.stock >= seuil)) return false;
    // Distance inconnue (position pas encore lue) : la ligne reste, on ne cache rien faute de savoir
    if (distanceMax > 0 && Number.isFinite(l.distance) && l.distance > distanceMax) return false;
    return true;
  });
  const par = {
    distance: (a, b) => NOMBRE(a.distance, Infinity) - NOMBRE(b.distance, Infinity),
    stock: (a, b) => NOMBRE(b.stock, -1) - NOMBRE(a.stock, -1),
    max: (a, b) => NOMBRE(b.max, -1) - NOMBRE(a.max, -1),
    prix: (a, b) => NOMBRE(a.prix, Infinity) - NOMBRE(b.prix, Infinity),
    label: (a, b) => a.label.localeCompare(b.label, 'fr'),
    maj: (a, b) => String(b.maj || '').localeCompare(String(a.maj || '')),
  }[tri] || (() => 0);
  return gardees.sort((a, b) => par(a, b) || a.label.localeCompare(b.label, 'fr'));
}

/** Âge d'un relevé en clair : « il y a 3 h », « il y a 2 j », « à l'instant ». */
export function age(iso, now = Date.now()) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  const min = Math.max(0, Math.round((now - t) / 60_000));
  if (min < 2) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

/** États de faction écrits par le jeu, en français ; un état inconnu reste tel quel. */
const ETATS = { None: '—', Boom: 'Essor', Bust: 'Récession', War: 'Guerre', CivilWar: 'Guerre civile', 'Civil War': 'Guerre civile', Election: 'Élection', Expansion: 'Expansion', Lockdown: 'Confinement', CivilUnrest: 'Troubles', 'Civil Unrest': 'Troubles', Famine: 'Famine', Outbreak: 'Épidémie', Retreat: 'Retraite', Investment: 'Investissement', CivilLiberty: 'Liberté civile', 'Civil Liberty': 'Liberté civile', Drought: 'Sécheresse', Blight: 'Fléau', PirateAttack: 'Attaque pirate', 'Pirate Attack': 'Attaque pirate', NaturalDisaster: 'Catastrophe', 'Natural Disaster': 'Catastrophe', InfrastructureFailure: 'Panne', 'Infrastructure Failure': 'Panne', Terrorism: 'Terrorisme', 'Terrorist Attack': 'Terrorisme', PublicHoliday: 'Fête', 'Public Holiday': 'Fête' };
export const etatFr = (e) => (e ? ETATS[e] ?? e : '—');

/** Pad de la station : « L » (grand), « M », sinon « S ». */
export const pad = (l) => (l.grandPad ? 'L' : l.moyenPad ? 'M' : 'S');
