// Sites gardiens : la liste connue (2018), filtrée, et ce qui est déjà dans tes repères. Sans React : testé seul.

const norme = (s) => String(s ?? '').trim().toLowerCase();

/** Nom complet du corps, comme le jeu l'écrit : « Synuefe NL-N c23-4 B 3 ». */
export const corpsComplet = (site) => `${site.systeme} ${site.corps}`.trim();

/** Tes repères de type « Site Gardien », parmi tous tes repères. */
export const mesSites = (reperes) => (Array.isArray(reperes) ? reperes : []).filter((w) => w?.category === 'guardian');

/** Cette structure connue est-elle déjà dans tes repères ? Même système, et même corps quand le repère en a un. */
export function dejaChezMoi(site, reperes) {
  return mesSites(reperes).some((w) => norme(w.system) === norme(site.systeme) && (!w.body || norme(w.body) === norme(corpsComplet(site))));
}

/**
 * Structures connues à afficher : `actives` seules ou toutes, et un texte cherché dans le système ou le corps.
 * L'ordre reçu est gardé (les actives d'abord).
 */
export function sitesFiltres(sites, { actives = true, texte = '' } = {}) {
  const t = norme(texte);
  return (Array.isArray(sites) ? sites : []).filter((s) => (!actives || s.active) && (!t || norme(corpsComplet(s)).includes(t)));
}

/** Ce qu'on enregistre dans Mes repères pour une structure connue (reçu par l'import de repère). */
export function repereDepuis(site, source) {
  return {
    label: `Structure gardienne · ${corpsComplet(site)}`,
    category: 'guardian',
    system: site.systeme,
    body: corpsComplet(site),
    latitude: site.latitude,
    longitude: site.longitude,
    notes: [site.active ? 'Structure active (se laisse activer).' : 'Structure inactive d’après la liste.', source ? `Source : ${source.nom}, ${source.date.slice(0, 4)}. À vérifier sur place.` : null].filter(Boolean).join('\n'),
  };
}

/** Segments de plan demandés, par type : combien d'activations de structure il faut (un segment par activation). */
export function activations(lignes) {
  const TYPES = { guardian_weaponblueprint: 'arme', guardian_moduleblueprint: 'module', guardian_vesselblueprint: 'vaisseau' };
  return (lignes || []).filter((l) => TYPES[l.cle] && l.manque > 0).map((l) => ({ type: TYPES[l.cle], nombre: l.manque }));
}
