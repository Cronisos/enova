// Accueil (tableau de bord « Maintenant ») : fonctions pures qui résument les données de l'app pour aider à choisir
// quoi faire. Les rappels du Coup d'œil (données à vendre, objectif communautaire à réclamer, rachat…) sont repris tels
// quels, sans recalcul ; s'y ajoutent les plans d'ingénierie faisables et le palier proche du système où tu es.
// Testé par accueilVue.test.js.

import { compact, int, pct } from './format.js';

const NIVEAU_TON = { error: 'mauvais', danger: 'mauvais', warning: 'attention', info: 'info' };

/**
 * « À faire maintenant » : [{ ton, texte, lien }] du plus urgent au moins urgent.
 * @param glance résumé du Coup d'œil (/modules/glance/summary), ou null
 * @param ingenierie tableau de bord de l'ingénierie (/modules/engineering/dashboard), ou null
 */
export function conseils({ glance, ingenierie } = {}) {
  const out = [];
  for (const r of glance?.reminders || []) {
    if (r?.text) out.push({ ton: NIVEAU_TON[r.level] || 'info', texte: r.text, lien: '/coup-doeil' });
  }
  for (const p of ingenierie?.perPlan || []) {
    if (p.canFinishNow) out.push({ ton: 'bon', texte: `Plan « ${p.name} » faisable maintenant : tous les matériaux sont en soute.`, lien: `/ingenierie/plan/${p.id}` });
  }
  const s = glance?.system;
  if (s?.next && Number.isFinite(s.progress) && s.progress >= 0.9 && s.progress < 1) {
    out.push({ ton: 'info', texte: `${s.name} est à ${pct(s.progress)} du palier ${s.next}.`, lien: '/extension?onglet=ou-agir' });
  }
  const rang = { mauvais: 0, attention: 1, bon: 2, info: 3 };
  return out.sort((a, b) => rang[a.ton] - rang[b.ton]);
}

/** Chiffres clés de la session du mode de jeu en cours : [{ label, valeur }] (vide si le mode n'en a pas). */
export function chiffresSession(mode, d) {
  if (!d) return [];
  // Combat : mérites gagnés en combat (merits.combat) ; les autres mérites de la session ne viennent pas du combat
  const merites = (m) => (typeof m === 'number' ? m : m?.combat ?? null);
  switch (mode) {
    case 'rescue':
      return [
        { label: 'Récupérés', valeur: int(d.collected) },
        { label: 'Livrés', valeur: int(d.delivered) },
        { label: 'Récompenses', valeur: `${compact(d.credits)} cr` },
        { label: 'Mérites', valeur: int(d.merits) },
      ];
    case 'combat':
      return [
        { label: 'Abattus', valeur: int(d.kills) },
        { label: 'Gains', valeur: `${compact(d.credits)} cr` },
        ...(merites(d.merits) != null ? [{ label: 'Mérites', valeur: int(merites(d.merits)) }] : []),
      ];
    case 'materials':
      return [
        { label: 'Matériaux', valeur: int(d.total) },
        ...(Array.isArray(d.byGrade) ? [{ label: 'G4 + G5', valeur: int((d.byGrade[3] || 0) + (d.byGrade[4] || 0)) }] : []),
      ];
    case 'rares':
      return [
        { label: 'Mérites', valeur: int(d.merits) },
        { label: 'Vendues', valeur: `${int(d.sold)} t` },
        { label: 'Bénéfice', valeur: `${compact(d.profit)} cr` },
      ];
    case 'gardiens':
      return [
        { label: 'Plans', valeur: `+${int(d.plans)}` },
        { label: 'Matériaux', valeur: int(d.total) },
        { label: 'Données', valeur: int(d.donnees) },
      ];
    case 'powerdelivery':
      return [
        { label: 'En soute', valeur: `${int(d.hold?.count ?? 0)} t` },
        { label: 'Livrées', valeur: `${int(d.delivered)} t` },
        { label: 'Mérites', valeur: int(d.merits) },
      ];
    case 'shipmining':
      return [
        { label: 'Prospectés', valeur: int(d.prospected) },
        { label: 'Raffinés', valeur: int(d.totalRefined) },
      ];
    default:
      return [];
  }
}

/** Mérites de la semaine : total, et les activités qui les ont rapportés (part de chacune, pour une barre). */
export function meritesSemaine(m) {
  if (!m || !Number.isFinite(m.merits)) return null;
  const total = m.merits;
  const NOMS = { mining: 'Minage', rescue: 'Sauvetage', combat: 'Combat', missions: 'Missions', trade: 'Commerce', exploration: 'Exploration' };
  const activites = (m.ranking || []).filter((r) => r.merits > 0).slice(0, 4).map((r) => ({
    nom: NOMS[r.activity] || r.activity,
    merites: r.merits,
    part: total > 0 ? r.merits / total : 0,
  }));
  return { total, activites };
}

/** Objectifs communautaires : en cours et à réclamer, pour la carte (au plus 3). */
export function objectifs(cg) {
  const actifs = (cg?.active || []).map((g) => ({
    id: g.id,
    titre: g.title,
    lieu: [g.station, g.system].filter(Boolean).join(' · '),
    detail: g.noContribution ? 'pas encore contribué' : `palier ${g.tier ?? '?'}${g.topTier ? `/${g.topTier}` : ''} · top ${g.band ?? '?'} %`,
    reste: Number.isFinite(g.hoursLeft) ? `${int(g.hoursLeft)} h` : null,
    aReclamer: false,
  }));
  const reclamer = (cg?.toClaim || []).map((g) => ({
    id: g.id,
    titre: g.title,
    lieu: [g.claimAt?.station || g.station, g.claimAt?.system || g.system].filter(Boolean).join(' · '),
    detail: g.reward ? `${compact(g.reward)} cr à réclamer` : 'à réclamer',
    reste: null,
    aReclamer: true,
  }));
  return [...reclamer, ...actifs].slice(0, 3);
}

/** À encaisser : exploration, exobiologie, primes, obligations (seulement ce qui vaut quelque chose). */
export function aEncaisser(t) {
  if (!t) return [];
  return [
    t.exploration?.value > 0 && { label: 'Exploration', valeur: `${compact(t.exploration.value)} cr`, detail: `${int(t.exploration.systems)} systèmes` },
    t.exobiology?.value > 0 && { label: 'Exobiologie', valeur: `${compact(t.exobiology.value)} cr`, detail: `${int(t.exobiology.count)} échantillons` },
    t.bounties > 0 && { label: 'Primes', valeur: `${compact(t.bounties)} cr` },
    t.bonds > 0 && { label: 'Obligations de combat', valeur: `${compact(t.bonds)} cr` },
  ].filter(Boolean);
}

/** Chantiers de colonisation en cours (ni finis ni échoués), l'actif d'abord : au plus 3, pour la carte. */
export function chantiers(colo) {
  const actif = colo?.active ?? null;
  return (colo?.sites || [])
    .filter((s) => !s.complete && !s.failed)
    .sort((a, b) => (b.marketId === actif) - (a.marketId === actif) || (b.progress ?? 0) - (a.progress ?? 0))
    .slice(0, 3)
    .map((s) => ({
      id: s.marketId,
      titre: s.label,
      lieu: s.system || '',
      progres: Number.isFinite(s.progress) ? s.progress : null,
      detail: [s.remaining != null && `${int(s.remaining)} t restantes`, s.trips && `${int(s.trips)} voyage${s.trips > 1 ? 's' : ''}`].filter(Boolean).join(' · '),
      actif: s.marketId === actif,
    }));
}

/** Escadron : nom, rang, et ce que tu lui as apporté cette semaine (les plus gros apports, au plus 4). */
export function escadron(c) {
  if (!c?.squadron?.name) return null;
  const valeur = (r) => (r.unit === 'cr' ? `${compact(r.delta)} cr` : r.unit ? `${int(r.delta)} ${r.unit}` : int(r.delta));
  const lignes = (c.rows || []).filter((r) => r.delta > 0).slice(0, 4).map((r) => ({ label: r.label, valeur: valeur(r) }));
  const rang = c.squadron.rank ? c.squadron.rank[0] + c.squadron.rank.slice(1).toLowerCase() : null;
  return { nom: c.squadron.name, rang, lignes };
}
