// Technologie des Gardiens : ce que chaque module, arme ou chasseur demande pour être débloqué chez un courtier en
// technologie des Gardiens. Une fois débloqué, il s'achète en crédits autant de fois qu'on veut.
//
// Source des recettes : EDEngineer (msarilar/EDEngineer, Resources/Data/blueprints.json, entrées de type « Guardian »),
// relevé le 22 nov. 2026. Quantités recopiées telles quelles ; les noms d'ingrédients sont ramenés ici au nom interne du
// jeu (FDevIDs material.csv) pour retrouver le stock du joueur. Les marchandises (soute) n'ont pas de stock connu.

/**
 * Ingrédients : nom interne → { fr, en, genre, ou }. `fr` : notre traduction (le nom exact du jeu en français n’a pas
 *   été relevé pour les matériaux gardiens) ; la page préfère le nom donné par le jeu quand l’inventaire le connaît.
 *   genre : 'gardien' (matériau des sites gardiens), 'donnees' (données d'obélisque), 'brut', 'fabrique',
 *           'marchandise' (se transporte en soute, s'achète sur un marché).
 *   ou : où le trouver, en une phrase.
 */
const SITES = 'Sites gardiens : panneaux, piliers et caisses destructibles';
const SENTINELLES = 'Sentinelles gardiennes détruites';
const OBELISQUES = 'Ruines gardiennes : scanner les obélisques actifs';
const PLAN = 'Site gardien de ce type : activer les pylônes, puis scanner l’orbe';
const SURFACE = 'Surface des planètes (SRV), ou échangeur de matières premières';
const ECHANGEUR = 'Récompenses de missions, épaves, ou échangeur de matériaux fabriqués';
const MARCHE = 'Marchandise : à acheter sur un marché, et à avoir en soute chez le courtier';

export const INGREDIENTS = Object.freeze({
  guardian_powercell: { fr: 'Cellule d’énergie gardienne', en: 'Guardian Power Cell', genre: 'gardien', ou: SITES },
  guardian_powerconduit: { fr: 'Conduit d’énergie gardien', en: 'Guardian Power Conduit', genre: 'gardien', ou: SITES },
  guardian_techcomponent: { fr: 'Composant technologique gardien', en: 'Guardian Technology Component', genre: 'gardien', ou: SITES },
  guardian_sentinel_weaponparts: { fr: 'Pièces d’arme de sentinelle', en: 'Guardian Sentinel Weapon Parts', genre: 'gardien', ou: SENTINELLES },
  guardian_sentinel_wreckagecomponents: { fr: 'Débris de sentinelle', en: 'Guardian Wreckage Components', genre: 'gardien', ou: SENTINELLES },
  guardian_weaponblueprint: { fr: 'Segment de plan d’arme', en: 'Guardian Weapon Blueprint Segment', genre: 'gardien', ou: PLAN },
  guardian_moduleblueprint: { fr: 'Segment de plan de module', en: 'Guardian Module Blueprint Segment', genre: 'gardien', ou: PLAN },
  guardian_vesselblueprint: { fr: 'Segment de plan de vaisseau', en: 'Guardian Vessel Blueprint Segment', genre: 'gardien', ou: PLAN },
  ancientbiologicaldata: { fr: 'Données d’obélisque Alpha', en: 'Pattern Alpha Obelisk Data', genre: 'donnees', ou: OBELISQUES },
  ancientculturaldata: { fr: 'Données d’obélisque Bêta', en: 'Pattern Beta Obelisk Data', genre: 'donnees', ou: OBELISQUES },
  ancienthistoricaldata: { fr: 'Données d’obélisque Gamma', en: 'Pattern Gamma Obelisk Data', genre: 'donnees', ou: OBELISQUES },
  ancientlanguagedata: { fr: 'Données d’obélisque Delta', en: 'Pattern Delta Obelisk Data', genre: 'donnees', ou: OBELISQUES },
  ancienttechnologicaldata: { fr: 'Données d’obélisque Epsilon', en: 'Pattern Epsilon Obelisk Data', genre: 'donnees', ou: OBELISQUES },
  manganese: { fr: 'Manganèse', en: 'Manganese', genre: 'brut', ou: SURFACE },
  chromium: { fr: 'Chrome', en: 'Chromium', genre: 'brut', ou: SURFACE },
  carbon: { fr: 'Carbone', en: 'Carbon', genre: 'brut', ou: SURFACE },
  niobium: { fr: 'Niobium', en: 'Niobium', genre: 'brut', ou: SURFACE },
  germanium: { fr: 'Germanium', en: 'Germanium', genre: 'brut', ou: SURFACE },
  arsenic: { fr: 'Arsenic', en: 'Arsenic', genre: 'brut', ou: SURFACE },
  focuscrystals: { fr: 'Cristaux de focalisation', en: 'Focus Crystals', genre: 'fabrique', ou: ECHANGEUR },
  phasealloys: { fr: 'Alliages de phase', en: 'Phase Alloys', genre: 'fabrique', ou: ECHANGEUR },
  heatresistantceramics: { fr: 'Céramiques résistantes à la chaleur', en: 'Heat Resistant Ceramics', genre: 'fabrique', ou: ECHANGEUR },
  'm:magneticemittercoil': { fr: 'Bobine d’émetteur magnétique', en: 'Magnetic Emitter Coil', genre: 'marchandise', ou: MARCHE },
  'm:coolinghoses': { fr: 'Tuyaux de refroidissement micro-tissés', en: 'Micro-Weave Cooling Hoses', genre: 'marchandise', ou: MARCHE },
  'm:articulationmotors': { fr: 'Moteurs d’articulation', en: 'Articulation Motors', genre: 'marchandise', ou: MARCHE },
  'm:energygridassembly': { fr: 'Assemblage de réseau énergétique', en: 'Energy Grid Assembly', genre: 'marchandise', ou: MARCHE },
  'm:hnshockmount': { fr: 'Support antichoc HN', en: 'HN Shock Mount', genre: 'marchandise', ou: MARCHE },
  'm:heatsinkinterlink': { fr: 'Interconnexion de dissipateur', en: 'Heatsink Interlink', genre: 'marchandise', ou: MARCHE },
  'm:microcontrollers': { fr: 'Microcontrôleurs', en: 'Micro Controllers', genre: 'marchandise', ou: MARCHE },
  'm:powertransferbus': { fr: 'Bus de transfert d’énergie', en: 'Power Transfer Bus', genre: 'marchandise', ou: MARCHE },
  'm:reinforcedmountingplate': { fr: 'Plaque de montage renforcée', en: 'Reinforced Mounting Plate', genre: 'marchandise', ou: MARCHE },
  'm:hardwarediagnosticsensor': { fr: 'Capteur de diagnostic matériel', en: 'Hardware Diagnostic Sensor', genre: 'marchandise', ou: MARCHE },
  'm:thermalcoolingunits': { fr: 'Unités de refroidissement thermique', en: 'Thermal Cooling Units', genre: 'marchandise', ou: MARCHE },
  'm:powerconverter': { fr: 'Convertisseur d’énergie', en: 'Power Converter', genre: 'marchandise', ou: MARCHE },
});

const PAR_NOM = new Map(Object.entries(INGREDIENTS).map(([cle, i]) => [i.en.toLowerCase(), cle]));
/** « 21 Guardian Power Cell » → { cle: 'guardian_powercell', quantite: 21 } ; un nom inconnu arrête tout (faute de frappe). */
function ing(quantite, nom) {
  const cle = PAR_NOM.get(nom.toLowerCase());
  if (!cle) throw new Error(`Ingrédient inconnu : ${nom}`);
  return { cle, quantite };
}
const r = (id, groupe, nom, en, ...ingredients) => Object.freeze({ id, groupe, nom, en, ingredients: Object.freeze(ingredients.map(([q, n]) => Object.freeze(ing(q, n)))) });

const SEG_ARME = 'Guardian Weapon Blueprint Segment';
const SEG_MODULE = 'Guardian Module Blueprint Segment';
const SEG_VAISSEAU = 'Guardian Vessel Blueprint Segment';
const CELL = 'Guardian Power Cell';
const COND = 'Guardian Power Conduit';
const TECH = 'Guardian Technology Component';
const ARMES = 'Guardian Sentinel Weapon Parts';
const DEBRIS = 'Guardian Wreckage Components';
const [ALPHA, BETA, GAMMA, DELTA, EPSILON] = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map((l) => `Pattern ${l} Obelisk Data`);

/** Groupes, dans l'ordre de la page. */
export const GROUPES = Object.freeze({ modules: 'Modules', armes: 'Armes', modifiees: 'Armes modifiées', chasseurs: 'Chasseurs' });

export const RECETTES = Object.freeze([
  r('fsd-booster', 'modules', 'Booster de FSD gardien', 'Guardian FSD Booster', [1, SEG_MODULE], [21, CELL], [21, TECH], [24, 'Focus Crystals'], [8, 'HN Shock Mount']),
  r('centrale', 'modules', 'Centrale hybride gardienne', 'Guardian Hybrid Power Plant', [1, SEG_MODULE], [18, COND], [21, EPSILON], [15, 'Heat Resistant Ceramics'], [10, 'Energy Grid Assembly']),
  r('distributeur', 'modules', 'Distributeur d’énergie gardien', 'Guardian Power Distributor', [1, SEG_MODULE], [20, ALPHA], [24, CELL], [18, 'Phase Alloys'], [6, 'Heatsink Interlink']),
  r('renfort-coque', 'modules', 'Renfort de coque gardien', 'Guardian Hull Reinforcement', [1, SEG_MODULE], [21, DEBRIS], [16, BETA], [16, GAMMA], [12, 'Reinforced Mounting Plate']),
  r('renfort-modules', 'modules', 'Renfort de modules gardien', 'Guardian Module Reinforcement', [1, SEG_MODULE], [18, DEBRIS], [15, EPSILON], [20, COND], [9, 'Reinforced Mounting Plate']),
  r('renfort-boucliers', 'modules', 'Renfort de boucliers gardien', 'Guardian Shield Reinforcement', [1, SEG_MODULE], [17, CELL], [20, TECH], [24, DELTA], [8, 'Hardware Diagnostic Sensor']),

  r('gauss-fixe-moyen', 'armes', 'Canon Gauss (fixe, moyen)', 'Guardian Gauss Cannon (Fixed, Medium)', [1, SEG_ARME], [18, CELL], [20, TECH], [15, 'Manganese'], [6, 'Magnetic Emitter Coil']),
  r('gauss-fixe-petit', 'armes', 'Canon Gauss (fixe, petit)', 'Guardian Gauss Cannon (Fixed, Small)', [1, SEG_ARME], [12, COND], [12, DEBRIS], [15, ARMES]),
  r('plasma-fixe-grand', 'armes', 'Chargeur plasma (fixe, grand)', 'Guardian Plasma Charger (Fixed, Large)', [1, SEG_ARME], [28, COND], [20, ARMES], [28, 'Chromium'], [10, 'Micro-Weave Cooling Hoses']),
  r('plasma-fixe-moyen', 'armes', 'Chargeur plasma (fixe, moyen)', 'Guardian Plasma Charger (Fixed, Medium)', [1, SEG_ARME], [19, COND], [16, ARMES], [14, 'Chromium'], [8, 'Micro-Weave Cooling Hoses']),
  r('plasma-fixe-petit', 'armes', 'Chargeur plasma (fixe, petit)', 'Guardian Plasma Charger (Fixed, Small)', [1, SEG_ARME], [12, CELL], [12, ARMES], [15, TECH]),
  r('plasma-tourelle-grand', 'armes', 'Chargeur plasma (tourelle, grand)', 'Guardian Plasma Charger (Turreted, Large)', [2, SEG_ARME], [26, COND], [24, ARMES], [26, 'Chromium'], [10, 'Articulation Motors']),
  r('plasma-tourelle-moyen', 'armes', 'Chargeur plasma (tourelle, moyen)', 'Guardian Plasma Charger (Turreted, Medium)', [2, SEG_ARME], [21, COND], [20, ARMES], [16, 'Chromium'], [8, 'Articulation Motors']),
  r('plasma-tourelle-petit', 'armes', 'Chargeur plasma (tourelle, petit)', 'Guardian Plasma Charger (Turreted, Small)', [1, SEG_ARME], [12, CELL], [12, TECH], [15, ARMES]),
  r('eclats-fixe-grand', 'armes', 'Canon à éclats (fixe, grand)', 'Guardian Shard Cannon (Fixed, Large)', [28, TECH], [1, SEG_ARME], [20, DEBRIS], [20, 'Carbon'], [18, 'Micro Controllers']),
  r('eclats-fixe-moyen', 'armes', 'Canon à éclats (fixe, moyen)', 'Guardian Shard Cannon (Fixed, Medium)', [18, TECH], [1, SEG_ARME], [20, DEBRIS], [14, 'Carbon'], [12, 'Power Transfer Bus']),
  r('eclats-fixe-petit', 'armes', 'Canon à éclats (fixe, petit)', 'Guardian Shard Cannon (Fixed, Small)', [1, SEG_ARME], [12, COND], [12, TECH], [15, ARMES]),
  r('eclats-tourelle-grand', 'armes', 'Canon à éclats (tourelle, grand)', 'Guardian Shard Cannon (Turreted, Large)', [2, SEG_ARME], [20, DEBRIS], [26, TECH], [28, 'Carbon'], [12, 'Micro Controllers']),
  r('eclats-tourelle-moyen', 'armes', 'Canon à éclats (tourelle, moyen)', 'Guardian Shard Cannon (Turreted, Medium)', [2, SEG_ARME], [16, DEBRIS], [20, TECH], [15, 'Carbon'], [12, 'Micro Controllers']),
  r('eclats-tourelle-petit', 'armes', 'Canon à éclats (tourelle, petit)', 'Guardian Shard Cannon (Turreted, Small)', [1, SEG_ARME], [12, COND], [12, ARMES], [15, TECH]),

  r('gauss-modifie-moyen', 'modifiees', 'Canon Gauss modifié (fixe, moyen)', 'Modified Gauss Cannon (Fixed, Medium)', [1, SEG_ARME], [5, CELL], [5, TECH], [4, 'Niobium'], [2, 'Thermal Cooling Units']),
  r('gauss-modifie-petit', 'modifiees', 'Canon Gauss modifié (fixe, petit)', 'Modified Gauss Cannon (Fixed, Small)', [1, SEG_ARME], [3, COND], [3, DEBRIS], [4, ARMES], [2, 'Niobium']),
  r('eclats-modifie-moyen', 'modifiees', 'Canon à éclats modifié (fixe, moyen)', 'Modified Shard Cannon (Fixed, Medium)', [5, TECH], [1, SEG_ARME], [5, DEBRIS], [4, 'Germanium'], [2, 'Power Converter']),
  r('eclats-modifie-petit', 'modifiees', 'Canon à éclats modifié (fixe, petit)', 'Modified Shard Cannon (Fixed, Small)', [1, SEG_ARME], [3, COND], [3, DEBRIS], [4, ARMES], [2, 'Germanium']),
  r('plasma-modifie-moyen', 'modifiees', 'Chargeur plasma modifié (fixe, moyen)', 'Modified Plasma Charger (Fixed, Medium)', [5, COND], [1, SEG_ARME], [5, ARMES], [4, 'Arsenic'], [2, 'Power Transfer Bus']),
  r('plasma-modifie-petit', 'modifiees', 'Chargeur plasma modifié (fixe, petit)', 'Modified Plasma Charger (Fixed, Small)', [1, SEG_ARME], [3, CELL], [4, TECH], [3, ARMES], [2, 'Arsenic']),

  r('javelin', 'chasseurs', 'Chasseur Javelin', 'Javelin (Fighter)', [25, CELL], [18, DEBRIS], [1, SEG_VAISSEAU], [26, EPSILON], [25, TECH]),
  r('lance', 'chasseurs', 'Chasseur Lance', 'Lance (Fighter)', [25, CELL], [18, ARMES], [1, SEG_VAISSEAU], [26, EPSILON], [25, TECH]),
  r('trident', 'chasseurs', 'Chasseur Trident', 'Trident (Fighter)', [25, CELL], [1, SEG_VAISSEAU], [26, EPSILON], [18, BETA], [25, TECH]),
]);

const IDS = new Set(RECETTES.map((x) => x.id));
/** Liste de choix reçue (« ce que je veux débloquer ») : seulement des recettes connues, sans doublon. */
export function choixPropres(liste) {
  return [...new Set((Array.isArray(liste) ? liste : []).filter((id) => typeof id === 'string' && IDS.has(id)))];
}
