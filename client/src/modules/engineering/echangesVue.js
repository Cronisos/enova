// Échangeur de matériaux (tableau de bord) : le verdict en tête. Si je fais tous les échanges proposés, est-ce qu'il me
// manquera encore quelque chose ? Données pures : testé seul.

/**
 * @param propositions planEchanges (serveur) : [{ label, grade, manque, reste, echanges, echangeable, plusieursPassages }]
 * @returns {{ total, couverts, suffit, restants: [{ key, label, grade, reste, raison }], passages }}
 *   suffit : les échanges couvrent tout ce qui manque ;
 *   restants : ce qu'il faudra encore aller chercher, avec la raison (« ne s'échange pas », « rien à donner »,
 *   « pas assez à donner ») ;
 *   passages : des matériaux couverts seulement en plusieurs passages (plafond du stock).
 */
export function bilanEchanges(propositions) {
  const props = propositions || [];
  const restants = props.filter((p) => p.reste > 0).map((p) => ({
    key: p.key,
    label: p.label,
    grade: p.grade,
    reste: p.reste,
    raison: !p.echangeable ? 'ne s’échange pas' : p.echanges.length ? 'pas assez à donner' : 'rien à donner',
  }));
  return {
    total: props.length,
    couverts: props.length - restants.length,
    suffit: props.length > 0 && !restants.length,
    restants,
    passages: props.filter((p) => p.plusieursPassages).length,
  };
}
