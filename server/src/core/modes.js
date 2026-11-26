// Modes de jeu et rôles des vaisseaux : la SEULE déclaration, en données pures (aucun import, rien de Node), partagée
// par le serveur et par l'interface. client/src/core/modes.js la reprend telle quelle : Vite l'intègre à la compilation,
// le serveur la lit ici.
//
// Un mode est déclaré une fois, ici : son identifiant (celui du module client qui a sa page et son HUD), son nom et son
// icône (menu « Mode de jeu », accueil, HUD, avis de bascule), et les fenêtres de l'overlay qu'il ouvre (son HUD
// /hud/<id>, puis les fenêtres en plus que le module déclare dans hudPages). Le module client y renvoie par
// modeInfo('<id>') au lieu de répéter son nom.
//
// Chaque mode est aussi un rôle possible pour un vaisseau, plus « Polyvalent » : un mode ajouté ici devient un rôle sans
// rien d'autre à écrire. Le serveur s'en sert pour valider les rôles (checkRole) et pour ouvrir seul les fenêtres d'un
// mode quand le joueur monte dans un vaisseau qui a ce rôle (core/roleSwitch.js) ; l'interface pour ses menus.
//
// Concordance avec les modules clients (identifiant, page, HUD, hudPages = fenêtres du mode, dans le même ordre) :
// client/src/core/modes.test.js (lecture des fichiers des modules) et le banc de contrôle (étape 75-pages, sur les
// modules tels que Vite les charge : scripts/controle/pages/verifier.mjs, concordanceModes).

const AGREEMENTS = ['activé', 'activée', 'activés', 'activées'];
const mode = (id, label, icon, windows, activated) => {
  // Accord obligatoire : un mode ajouté sans lui arrête le chargement, au lieu d'un avis mal accordé en jeu
  if (!AGREEMENTS.includes(activated)) throw new Error(`Mode ${id} : accord de « activé » attendu (${AGREEMENTS.join(', ')}).`);
  return Object.freeze({ id, label, icon, windows: Object.freeze(windows), activated });
};

/**
 * Modes de jeu, dans l'ordre du menu. windows : fenêtres de l'overlay ouvertes avec le mode (vide : pas de HUD) ;
 * activated : « activé » accordé au nom du mode, pour l'avis de bascule (« 🏗 Colonisation activée — vaisseau … »).
 */
export const MODES = Object.freeze([
  mode('routes', 'Commerce', '⇄', [], 'activé'),
  mode('rares', 'Commerce de rares', '◆', ['rares'], 'activé'),
  mode('waypoints', 'Minage Rhino', '⛏', ['waypoints', 'waypoints-list', 'waypoints-guide', 'waypoints-sweep', 'waypoints-sweep-top', 'waypoints-sweep-pose'], 'activé'),
  mode('shipmining', 'Minage vaisseau', '☄', ['shipmining'], 'activé'),
  mode('combat', 'Combat', '⚔', ['combat'], 'activé'),
  mode('groundcombat', 'Combat au sol', '🪖', ['groundcombat'], 'activé'),
  mode('rescue', 'Sauvetage', '✚', ['rescue'], 'activé'),
  mode('materials', 'Matériaux', '◈', ['materials'], 'activés'),
  mode('powerdelivery', 'Livraison Powerplay', '📦', ['powerdelivery'], 'activée'),
  mode('gardiens', 'Gardiens', '◬', ['gardiens', 'gardiens-site'], 'activés'),
  mode('colonisation', 'Colonisation', '🏗', ['colonisation', 'colonisation-list'], 'activée'),
]);

/** Rôle « Polyvalent » : le vaisseau sert à tout. Aucune bascule à l'embarquement, tout est proposé normalement. */
export const POLYVALENT = Object.freeze({ id: 'polyvalent', label: 'Polyvalent', icon: '✦' });

/** Rôles possibles d'un vaisseau : chaque mode, puis Polyvalent. */
export const ROLES = Object.freeze([...MODES.map(({ id, label, icon }) => Object.freeze({ id, label, icon })), POLYVALENT]);

/**
 * Rôles secondaires au plus, par vaisseau. Au-delà, le vaisseau sert à presque tout : « Polyvalent » le dit mieux.
 * Choix de l'app, pas une règle du jeu.
 */
export const MAX_SECONDARY_ROLES = 3;

const MODE_BY_ID = new Map(MODES.map((m) => [m.id, m]));
const ROLE_BY_ID = new Map(ROLES.map((r) => [r.id, r]));

/** Le mode de jeu `id`, ou null (jamais une propriété d'Object : « constructor », « __proto__ »…). */
export const modeById = (id) => (typeof id === 'string' ? MODE_BY_ID.get(id) ?? null : null);
/** Le rôle `id` (un mode, ou Polyvalent), ou null. */
export const roleById = (id) => (typeof id === 'string' ? ROLE_BY_ID.get(id) ?? null : null);
export const isMode = (id) => modeById(id) !== null;
export const isRole = (id) => roleById(id) !== null;

/**
 * Déclaration d'un mode, pour le champ `mode` d'un module client : modeInfo('combat'). Un identifiant inconnu est une
 * erreur de programmation : elle arrête tout de suite le chargement, au lieu d'un mode qui ne s'ouvrirait jamais.
 */
export function modeInfo(id) {
  const m = modeById(id);
  if (!m) throw new Error(`Mode de jeu inconnu : « ${id} ». Déclare-le dans server/src/core/modes.js.`);
  return m;
}

/** Fenêtres de l'overlay d'un mode (copie), [] pour un mode sans HUD ou inconnu. */
export const windowsOf = (id) => [...(modeById(id)?.windows ?? [])];

/** « ⛏ Minage Rhino » ; l'identifiant tel quel s'il est inconnu. */
export function modeName(id) {
  const r = roleById(id);
  return r ? `${r.icon} ${r.label}` : String(id ?? '');
}

/** « activé » accordé au nom du mode (« activée », « activés »…) ; « activé » s'il est inconnu. */
export const activatedOf = (id) => modeById(id)?.activated ?? 'activé';

const fail = (error) => ({ ok: false, error });
const roleList = () => ROLES.map((r) => r.id).join(', ');
const quoted = (v) => `« ${String(v).slice(0, 40)} »`;

/**
 * Rôle d'un vaisseau, vérifié : { ok: true, role: { primary, secondary } } ou { ok: false, error } (en français).
 * primary : un rôle (mode ou polyvalent) ou null ; secondary : des modes (jamais Polyvalent), sans doublon, sans le
 * rôle principal, MAX_SECONDARY_ROLES au plus, aucun avec Polyvalent (il couvre déjà tout).
 */
export function checkRole(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return fail('Rôle illisible : envoie { primary, secondary }.');
  const primary = input.primary ?? null;
  const secondary = input.secondary ?? [];
  if (primary !== null && typeof primary !== 'string') return fail('Rôle principal illisible : un identifiant de rôle (texte) ou null.');
  if (primary !== null && !isRole(primary)) return fail(`Rôle principal inconnu : ${quoted(primary)}. Rôles possibles : ${roleList()}.`);
  if (!Array.isArray(secondary)) return fail('Rôles secondaires illisibles : une liste d’identifiants de modes.');
  if (secondary.length > MAX_SECONDARY_ROLES) {
    return fail(`${MAX_SECONDARY_ROLES} rôles secondaires au plus : au-delà, choisis « ${POLYVALENT.label} » comme rôle principal.`);
  }
  const seen = new Set();
  for (const s of secondary) {
    if (typeof s !== 'string') return fail('Rôle secondaire illisible : un identifiant de mode (texte).');
    if (s === POLYVALENT.id) return fail(`« ${POLYVALENT.label} » ne peut être qu’un rôle principal.`);
    if (!isMode(s)) return fail(`Rôle secondaire inconnu : ${quoted(s)}. Modes possibles : ${MODES.map((m) => m.id).join(', ')}.`);
    if (seen.has(s)) return fail(`Rôle secondaire en double : « ${modeById(s).label} ».`);
    if (s === primary) return fail(`« ${modeById(s).label} » est déjà le rôle principal : retire-le des rôles secondaires.`);
    seen.add(s);
  }
  if (primary === POLYVALENT.id && secondary.length) {
    return fail(`« ${POLYVALENT.label} » couvre déjà tous les modes : pas de rôle secondaire avec lui.`);
  }
  return { ok: true, role: { primary, secondary: [...secondary] } };
}

/** Le vaisseau a-t-il un rôle déclaré (principal ou secondaire) ? */
export const hasRole = (role) => Boolean(role && (role.primary || role.secondary?.length));

/** Le mode `id` fait-il partie des rôles du vaisseau (principal ou secondaire) ? Polyvalent : tous. */
export function inRole(role, id) {
  if (!hasRole(role)) return false;
  if (role.primary === POLYVALENT.id) return isMode(id);
  return role.primary === id || (role.secondary || []).includes(id);
}
