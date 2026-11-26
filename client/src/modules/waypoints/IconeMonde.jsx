// Icône d'un type de monde : une petite planète, dessinée ici (pas d'image), dont l'allure dit le type. Métal chaud
// pour les mondes à métaux (plus clair et brillant pour « riche en métaux »), roche brune, glace pâle, et moitié roche
// moitié glace pour « roche et glace ». Sert partout où un type de monde est nommé : relevé du système, recherche d'un
// minerai, guide des ressources.

/** Type de monde, en clair (« Haute teneur en métaux », « Glacée », « Rocheux »…) ou par son identifiant du guide → clé. */
export function cleMonde(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'mrb' || /riche en m[ée]taux/.test(t)) return 'mrb';
  if (t === 'hmc' || /teneur en m[ée]taux/.test(t)) return 'hmc';
  if (t === 'rg' || /roche et glace/.test(t)) return 'rg';
  if (t === 'gl' || /glac/.test(t)) return 'gl';
  if (t === 'roc' || /roch/.test(t)) return 'roc';
  return 'autre';
}

export default function IconeMonde({ type, taille = 18 }) {
  const cle = cleMonde(type);
  return <span className={`monde-icone is-${cle}`} style={{ width: taille, height: taille }} title={typeof type === 'string' && type.length > 3 ? type : undefined} aria-hidden="true" />;
}
