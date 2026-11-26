// Mode Gardiens : ce qu'il reste à trouver sur les sites pour le plan. Sans React : testé seul.

const PLANS = ['guardian_weaponblueprint', 'guardian_moduleblueprint', 'guardian_vesselblueprint'];
const SUR_SITE = new Set(['gardien', 'donnees']);

/**
 * Ce qu'il reste à trouver sur les sites pour le plan : { plans: { besoin, stock, manque }, lignes } — les segments de
 * plan à part, puis les matériaux gardiens et données d'obélisque qui manquent, le plus gros manque d'abord.
 */
export function resteSurSite(plan) {
  const lignes = (plan?.lignes || []).filter((l) => SUR_SITE.has(l.genre));
  const seg = lignes.filter((l) => PLANS.includes(l.cle));
  const plans = { besoin: seg.reduce((n, l) => n + l.besoin, 0), stock: seg.reduce((n, l) => n + Math.min(l.stock, l.besoin), 0), manque: seg.reduce((n, l) => n + l.manque, 0) };
  return { plans, lignes: lignes.filter((l) => !PLANS.includes(l.cle) && l.manque > 0).sort((a, b) => b.manque - a.manque) };
}
