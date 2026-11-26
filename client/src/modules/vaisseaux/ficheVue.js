// Mise en forme de la fiche d'un vaisseau et de ses cartes (fonctions pures, testées par ficheVue.test.js). Les chiffres
// viennent du serveur (module Constructeur : configuration réelle du vaisseau, lue dans le jeu).

const nf = (d) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const entier = (v) => (Number.isFinite(v) ? nf(0).format(Math.round(v)) : '—');
export const dec = (v, d = 1) => (Number.isFinite(v) ? nf(d).format(v) : '—');
const unite = (v, u, d = 0) => (Number.isFinite(v) ? `${d ? dec(v, d) : entier(v)} ${u}` : '—');

/** « 1,2 M cr », « 412 k cr », « 980 cr ». */
export function credits(v) {
  if (!Number.isFinite(v)) return '—';
  if (v >= 1e9) return `${dec(v / 1e9, 2)} Md cr`;
  if (v >= 1e6) return `${dec(v / 1e6, 1)} M cr`;
  if (v >= 1e4) return `${entier(v / 1e3)} k cr`;
  return `${entier(v)} cr`;
}

/**
 * Badge « ingénierie » d'une carte : nombre de modules ingéniérés (lu dans le jeu) et grade le plus haut. null quand
 * la configuration du vaisseau est inconnue (pas de badge plutôt qu'un faux « 0 »).
 */
export function badgeIngenierie(r) {
  const n = r?.ingenierie?.modules;
  if (!Number.isInteger(n) || n < 0) return null;
  const g = r.ingenierie.gradeMax;
  const texte = n
    ? `${n} module${n > 1 ? 's' : ''} ingéniéré${n > 1 ? 's' : ''}${g ? ` · jusqu'au grade ${g}` : ''}`
    : 'Aucun module ingéniéré';
  return { nombre: n, gradeMax: g || null, actif: n > 0, texte };
}

/** Taille de pad d'atterrissage : « S » petit, « M » moyen, « L » grand (là où le vaisseau peut se poser). */
export const PADS = { S: 'petit', M: 'moyen', L: 'grand' };
export const padTexte = (p) => (PADS[p] ? `Pad ${p} (${PADS[p]})` : '');

/** Chiffres d'une carte de vaisseau, dans l'ordre : pad, saut, soute, boucliers. Absents : rien (pas de « — » en série). */
export function chiffresCarte(r) {
  if (!r) return [];
  return [
    PADS[r.pad] && { label: 'pad', valeur: r.pad },
    Number.isFinite(r.saut) && { label: 'saut', valeur: unite(r.saut, 'AL', 1) },
    r.soute > 0 && { label: 'soute', valeur: unite(r.soute, 't') },
    r.boucliers > 0 && { label: 'boucliers', valeur: unite(r.boucliers, 'MJ') },
  ].filter(Boolean);
}

/** Résistances en pourcentages entiers, dans l'ordre cinétique, thermique, explosif. */
export const resistances = (r) => (r ? [['Cin.', r.kin], ['Therm.', r.thm], ['Expl.', r.exp]].map(([k, v]) => ({ label: k, valeur: Math.round(v) })) : []);

/**
 * Groupes de la fiche « Stats », d'un coup d'œil : saut, défense, mobilité, énergie et chaleur, armement, soute et
 * valeur. Les chiffres que le jeu écrit (saut maximal, soute, rachat) passent avant le calcul.
 */
export function groupesStats(f) {
  const s = f.stats;
  const jeu = f.jeu || {};
  const lignes = (l) => l.filter((x) => x && x.valeur !== '—');
  const g = [
    {
      titre: 'Saut',
      lignes: lignes([
        { label: 'Saut maximal', valeur: unite(jeu.saut ?? s.jump.max, 'AL', 2), fort: true },
        { label: 'À vide, plein fait', valeur: unite(s.jump.unladen, 'AL', 2) },
        { label: 'Soute pleine', valeur: s.cargo > 0 ? unite(s.jump.laden, 'AL', 2) : '—' },
        { label: 'Autonomie d’un plein', valeur: unite(s.jump.range, 'AL', 1) },
        { label: 'Carburant', valeur: unite(s.fuel, 't') },
      ]),
    },
    {
      titre: 'Défense',
      lignes: lignes([
        { label: 'Boucliers', valeur: s.shields > 0 ? unite(s.shields, 'MJ') : 'aucun', fort: true, res: resistances(s.shieldRes) },
        s.shield?.cellsTotal > 0 && { label: 'Avec les cellules', valeur: unite(s.shield.withCells, 'MJ') },
        s.shield?.full && { label: 'Recharge 0 → 100 %', valeur: unite(s.shield.full, 's') },
        { label: 'Coque', valeur: unite(s.armour, 'pts'), fort: true, res: resistances(s.armourRes) },
      ]),
    },
    {
      titre: 'Mobilité',
      lignes: lignes([
        { label: 'Vitesse', valeur: unite(s.speed, 'm/s'), fort: true },
        { label: 'Boost', valeur: s.boost > 0 ? unite(s.boost, 'm/s') : 'impossible' },
        s.boosts > 0 && { label: 'Boosts d’affilée', valeur: entier(s.boosts) },
        s.rotation && { label: 'Tangage', valeur: unite(s.rotation.pitch, '°/s', 1) },
      ]),
    },
    {
      titre: 'Énergie et chaleur',
      lignes: lignes([
        { label: 'Énergie, armes sorties', valeur: `${dec(s.power.deployed, 1)} / ${dec(s.power.capacity, 1)} MW`, fort: true, jauge: s.power.capacity ? s.power.deployed / s.power.capacity : null },
        { label: 'Chaleur du générateur', valeur: unite(s.heat.powerPlant, '/s', 1) },
        s.armament?.list?.length > 0 && { label: 'Chaleur des armes', valeur: unite(s.heat.weapons, '/s', 1) },
      ]),
    },
    s.armament?.list?.length > 0 && {
      titre: 'Armement',
      lignes: lignes([
        { label: 'DPS soutenu', valeur: dec(s.dps, 1), fort: true },
        { label: 'DPS en rafale', valeur: dec(s.armament.burst, 1) },
        { label: 'Condensateur WEP', valeur: s.armament.wepTime == null ? 'tient sans fin' : unite(s.armament.wepTime, 's') },
      ]),
    },
    {
      titre: 'Soute et valeur',
      lignes: lignes([
        { label: 'Soute', valeur: unite(jeu.soute ?? s.cargo, 't'), fort: true },
        s.cabins?.length > 0 && { label: 'Cabines', valeur: entier(s.cabins.length) },
        { label: 'Masse à vide', valeur: unite(s.mass.unladen, 't', 1) },
        { label: 'Rachat', valeur: credits(jeu.rachat ?? s.cost.rebuy), fort: true },
        jeu.valeur != null && { label: 'Valeur', valeur: credits(jeu.valeur) },
      ]),
    },
  ];
  return g.filter(Boolean);
}

/**
 * Modules de la fiche, par groupe (dans l'ordre du serveur), sans les groupes vides. Les modules identiques qui se
 * suivent (même module, même ingénierie : « 6E Soute (64 t) » trois fois) tiennent sur une ligne, avec leur nombre.
 */
export function modulesParGroupe(f) {
  const cle = (m) => JSON.stringify([m.emplacement, m.module, m.ingenierie, m.effet]);
  return (f.groupes || [])
    .map((g) => {
      const lignes = [];
      for (const m of f.modules.filter((x) => x.groupe === g.key)) {
        const prec = lignes.at(-1);
        if (prec && cle(prec) === cle(m)) prec.nombre += 1;
        else lignes.push({ ...m, nombre: 1 });
      }
      return { ...g, modules: lignes };
    })
    .filter((g) => g.modules.length);
}

/** Barres de grade d'une ingénierie : autant de barres que le grade maximal, pleines jusqu'au grade atteint. */
export const barresGrade = (i) => (i ? Array.from({ length: i.max }, (_, k) => k < i.grade) : []);

/** « Propulseurs sales G5 » ; grade partiel : « G4/5 ». */
export const texteIngenierie = (i) => (i ? `${i.plan} G${i.grade}${i.grade < i.max ? `/${i.max}` : ''}` : '');

/** Modèles de la flotte et leur nombre, pour filtrer d'un clic (« Anaconda ×3 ») ; les plus nombreux d'abord. */
export function modeles(flotte) {
  const n = new Map();
  for (const s of flotte) if (s.model) n.set(s.model, (n.get(s.model) || 0) + 1);
  return [...n].map(([model, nombre]) => ({ model, nombre })).sort((a, b) => b.nombre - a.nombre || a.model.localeCompare(b.model, 'fr'));
}

/** Filtre « Sans rôle » : les vaisseaux à qui tu n'as donné aucun rôle. */
export const SANS_ROLE = 'sans-role';

/**
 * Rôles portés par la flotte et leur nombre de vaisseaux, pour filtrer d'un clic (« ⛏ Minage Rhino ×2 ») : principal
 * ou secondaire, les plus portés d'abord ; « Sans rôle » à la fin s'il y en a. `tagsDe(vaisseau)` : ses tags
 * (core/shipRole.js, tagsRole).
 */
export function rolesFlotte(flotte, tagsDe) {
  const vus = new Map();
  let sans = 0;
  for (const s of flotte) {
    const tags = tagsDe(s) || [];
    if (!tags.length) sans += 1;
    for (const t of tags) {
      const r = vus.get(t.id) || { id: t.id, label: t.label, icone: t.icone, couleur: t.couleur, nombre: 0 };
      r.nombre += 1;
      vus.set(t.id, r);
    }
  }
  const liste = [...vus.values()].sort((a, b) => b.nombre - a.nombre || a.label.localeCompare(b.label, 'fr'));
  return sans ? [...liste, { id: SANS_ROLE, label: 'Sans rôle', icone: '', couleur: '#8a94a0', nombre: sans }] : liste;
}

/** Le vaisseau passe-t-il le filtre de rôle ? (aucun filtre : oui ; « Sans rôle » : aucun tag ; sinon l'un de ses tags) */
export function passeRole(tags, role) {
  if (!role) return true;
  if (role === SANS_ROLE) return !tags?.length;
  return Boolean(tags?.some((t) => t.id === role));
}

/** Ordre des cartes : le vaisseau actuel d'abord, puis par modèle, puis par nom. */
export function ordreFlotte(flotte, titre = (s) => s.name || s.model) {
  return [...flotte].sort((a, b) => Number(Boolean(b.current)) - Number(Boolean(a.current))
    || String(a.model).localeCompare(String(b.model), 'fr') || String(titre(a)).localeCompare(String(titre(b)), 'fr'));
}

/**
 * Résumé de « ce qu'il te faut » pour un build (écart du constructeur) : « 2 modules à acheter · 5 modifications ·
 * 1 à retirer », ou « Rien à faire : ta configuration a déjà tout ».
 */
export function resumeEcart(e) {
  if (!e) return 'Écart indisponible';
  if (e.identique) return 'Rien à faire : ta configuration a déjà tout';
  const pl = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;
  return [
    e.achats > 0 && pl(e.achats, 'module à acheter', 'modules à acheter'),
    e.ingenierie > 0 && pl(e.ingenierie, 'modification', 'modifications'),
    e.retraits > 0 && pl(e.retraits, 'à retirer', 'à retirer'),
  ].filter(Boolean).join(' · ');
}
