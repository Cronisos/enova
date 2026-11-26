// Page d'un plan d'ingénierie : ce que dit chaque ligne du tableau « à bord aujourd'hui → visé → reste à faire ».
// Données pures : testé seul.

/** Nom d'une modification ou d'un effet, d'après les listes du groupe de l'emplacement ; la clé à défaut. */
const nomDe = (liste, cle) => (cle ? liste?.find((x) => x.key === cle)?.name || cle : null);

/**
 * Une ligne du tableau.
 * @param slot   emplacement du plan (GET /plans/:id → slots) : { key, label, size, current, target }
 * @param status calcul du module (calc.modules), absent quand rien n'est à modifier sur cet emplacement
 * @param grp    { blueprints, specials } du groupe de l'emplacement (noms des modifications et des effets)
 * @returns {{ key, taille, emplacement, actuel, vise, etat, appl, estimation, bloque }}
 *   etat : 'vide' (rien à bord, rien de visé), 'monter' (le module visé n'est pas celui à bord), 'retirer' (le plan
 *   vise un emplacement vide), 'modifier' (bon module, modification à faire ou à finir), 'fait'.
 */
export function ligne(slot, status, grp) {
  const cur = slot.current?.module ? slot.current : null;
  const t = slot.target?.module ? slot.target : null;
  const actuel = cur && {
    nom: cur.label,
    modif: cur.blueprint ? cur.blueprintLabel || cur.blueprint : null,
    grade: cur.blueprint ? cur.grade : 0,
    // Grade en cours : la part faite, en pourcentage (rien quand il est fini ou pas commencé)
    part: cur.blueprint && cur.quality > 0 && cur.quality < 1 ? Math.round(cur.quality * 100) : null,
    effet: cur.experimentalLabel || null,
  };
  const vise = t && {
    nom: t.label,
    modif: nomDe(grp?.blueprints, t.blueprint),
    grade: t.blueprint ? t.grade : 0,
    effet: t.blueprint ? nomDe(grp?.specials, t.experimental) : null,
  };
  const reste = Boolean(status && !status.done);
  let etat = 'fait';
  if (!cur && !t) etat = 'vide';
  else if (!t) etat = 'retirer';
  else if (!cur || cur.module !== t.module) etat = 'monter';
  else if (reste) etat = 'modifier';
  return {
    key: slot.key,
    taille: slot.size ?? null,
    emplacement: slot.label,
    actuel,
    vise,
    etat,
    appl: reste ? status.rolls : 0,
    estimation: reste && Boolean(status.estimate),
    bloque: reste && Boolean(status.blocked),
  };
}

/** Ce qui reste à faire sur une ligne : ni un emplacement vide, ni un module déjà au niveau visé. */
export const aFaire = (l) => l.etat !== 'fait' && l.etat !== 'vide';

/** Texte d'une configuration : « G5 Surchargé · Répartition thermique », ou « sans modification ». */
export function texteModif(c) {
  if (!c?.modif) return 'sans modification';
  const part = c.part != null ? ` (${c.part} %)` : '';
  return `G${c.grade} ${c.modif}${part}${c.effet ? ` · ${c.effet}` : ''}`;
}

/** Décompte de l'en-tête du tableau : modules à monter, à modifier, déjà bons. */
export function bilan(lignes) {
  const n = (e) => lignes.filter((l) => l.etat === e).length;
  return { monter: n('monter'), retirer: n('retirer'), modifier: n('modifier'), fait: n('fait'), vide: n('vide') };
}
