// Où aller pour chaque type de plan, avec la carte des pylônes. Relevé le 22 nov. 2026 à la demande de Cronisos Lysiris.
// Les cartes ne sont PAS copiées dans l'app (aucune licence de réutilisation sur leurs pages) : seulement des liens.
// Les étapes sont reformulées, pas recopiées.
//
// Sources :
//   - « Elite: Dangerous Guides » (sites.google.com/view/elitedangerousguides) : sites conseillés, cartes, ordre des
//     pylônes ; cartes de u/Mnemoch et CMDR Loch147, noms de plan (« Tortue », « Ours ») de Canonn ;
//   - NEWP, guide des Gardiens (newp.io/guardian_guide), mis à jour le 5 oct. 2026 : durée du compte à rebours ;
//   - Steam, « Guardian Weapons Blueprint Farming - Pylon sites » (Low Rider, 1er juil. 2018) : coordonnées des pylônes
//     de Vela Dark Region DL-Y d91 5 A.
// Rien de tout cela n'a été revérifié en jeu.

const GUIDES_SITE = 'https://sites.google.com/view/elitedangerousguides';

export const GUIDES = Object.freeze([
  {
    plan: 'module',
    titre: 'Plans de module',
    systeme: 'Synuefe NL-N c23-4',
    corps: 'B 3',
    forme: 'la « Tortue »',
    cartes: [
      { nom: 'Carte des pylônes', url: 'https://drive.google.com/file/d/1hJIUU5X1E6iI_fT_DGAbYhCSRcXNMj4t/view?usp=sharing' },
      { nom: 'Carte du parcours et des sentinelles', url: 'https://drive.google.com/file/d/1lXsPKDS70poslFTfR8eJnM8_1dLQUk6y/view?usp=sharing' },
    ],
    guide: `${GUIDES_SITE}/guardian-technology/guardian-module-blueprints`,
    etapes: [
      'Repère : la machine en haut au centre (« nord »). Pose-toi en bas à droite ; une relique est tout près de là.',
      'Passe d’abord par les deux « pattes » du bas (droite puis gauche) : une sentinelle sort à chacune, élimine-les.',
      'Le pylône déclencheur est au pied de la structure centrale. Tant que tu ne t’en es pas approché, aucun autre ne monte. Deux sentinelles sortent : tue-les, puis tire dessus, le compte à rebours démarre.',
      'Deux pylônes sont collés de chaque côté de la structure centrale, face à face : durs à voir avant qu’ils montent, écoute le bruit et cherche à la tourelle.',
      'Puis le pylône du bas au centre, puis celui de la patte en bas à droite.',
      'Garde pour la fin celui d’en bas à gauche : le dernier pylône chargé fait sortir quatre sentinelles autour du pylône du centre.',
      'Remonte à la machine, lâche la relique devant elle, scanne l’orbe. Deux dernières sentinelles sortent.',
    ],
  },
  {
    plan: 'arme',
    titre: 'Plans d’arme',
    systeme: 'Synuefe EU-Q c21-10',
    corps: 'A 3',
    forme: 'l’« Ours »',
    cartes: [{ nom: 'Carte du parcours', url: 'https://drive.google.com/file/d/11jhfG4HP7IPObMwxz4Q8G57WX3U33CUe/view?usp=sharing' }],
    guide: `${GUIDES_SITE}/guardian-technology/guardian-weapon-blueprints`,
    etapes: [
      'Repère : la machine en haut ; trois « pattes » aux coins, la quatrième manque. Pose-toi au centre gauche. Deux reliques : une près de là, une juste derrière le pylône de gauche.',
      'Premier tour pour faire sortir les pylônes et tuer les trois sentinelles des pattes : arrière (en bas à gauche), gauche, puis droite. Fais monter les deux pylônes principaux en passant, sans tirer dessus.',
      'Charge en commençant par le pylône de droite : le compte à rebours démarre.',
      'Reviens vers l’ouest aux deux pylônes principaux et tire sur les deux, puis au pylône de gauche, au fond de l’allée d’obélisques.',
      'Repasse par les principaux, descends au pylône du centre (zone dégagée), puis finis par le pylône arrière, à l’ouest-sud-ouest.',
      'Une sentinelle sort à la fin. Monte à la machine, lâche la relique, scanne l’orbe : deux dernières sentinelles.',
    ],
  },
  {
    plan: 'vaisseau',
    titre: 'Plans de vaisseau (chasseurs)',
    systeme: 'Synuefe EU-Q c21-15',
    corps: 'A 1',
    forme: null,
    cartes: [
      { nom: 'Carte du site, pylônes en rouge', url: 'https://drive.google.com/file/d/1r-ksh_fP8laj1_J6LODxYuMUlwjCZolP/view?usp=sharing' },
      { nom: 'La machine, ses pylônes et l’endroit où poser la clé', url: 'https://drive.google.com/file/d/1xGLKxkEsOTwrpjc3MtBoe3rY_Ijbc0G0/view?usp=sharing' },
    ],
    guide: `${GUIDES_SITE}/ad-academy/guardian-power-up`,
    etapes: [
      'Il faut d’abord une clé antique : va à la balise gardienne de Synuefe KU-F b44-4 (en orbite, près de la planète 4), charge ses trois pylônes au laser, scanne l’orbe et récupère la clé en soute.',
      'Au site (à 47 al de la balise), fais passer la clé dans la soute du SRV (Inventaire › Transférer).',
      'Charge les six pylônes comme sur les autres sites, puis lâche la clé (à la place de la relique) devant la machine et scanne l’orbe.',
    ],
  },
]);

/** Règles communes aux trois sites, d'après les mêmes guides. */
export const REGLES_PYLONES = Object.freeze([
  'Six pylônes par site. Ils sont enterrés et ne montent que quand le SRV s’en approche.',
  'Le plus sûr : faire d’abord le tour pour les faire tous monter et tuer les sentinelles, puis seulement tirer dessus.',
  'Tire sur la sphère bleue, à hauteur de tourelle, jusqu’au message « pylône chargé ».',
  'Compte à rebours : 6 minutes au premier pylône chargé, 2 minutes de plus à chaque suivant (guide NEWP, oct. 2026).',
  'Un segment par commandant et par passage. Pour recommencer, retour au menu puis relance, de préférence depuis le vaisseau.',
]);

/**
 * Coordonnées des six pylônes d'un site d'armes (Steam, 2018). La source ne dit pas laquelle est la latitude : la
 * première valeur est tenue pour la latitude, la structure étant à −6,58 / −39,86 dans la liste connue. La 6e est écrite
 * « -6.57.04 » dans la source : lue −6,5704.
 */
export const PYLONES_RELEVES = Object.freeze({
  systeme: 'Vela Dark Region DL-Y d91',
  corps: '5 A',
  plan: 'arme',
  source: 'Steam, Low Rider, 1er juil. 2018',
  pylones: [
    { n: 1, latitude: -6.5738, longitude: -39.8686, note: 'devant l’autel : à charger en premier' },
    { n: 2, latitude: -6.5727, longitude: -39.871, note: 'à gauche de l’autel' },
    { n: 3, latitude: -6.5729, longitude: -39.8661, note: '' },
    { n: 4, latitude: -6.5719, longitude: -39.8661, note: '' },
    { n: 5, latitude: -6.5818, longitude: -39.874, note: 'en bas à gauche' },
    { n: 6, latitude: -6.5704, longitude: -39.8767, note: 'en haut à gauche, sur le petit îlot (valeur incertaine)' },
  ],
});

/** Type de plan connu de quelques structures de la liste : « système|corps » → plan. */
export const PLAN_DES_SITES = Object.freeze({
  'Synuefe NL-N c23-4|B 3': 'module',
  'Synuefe EU-Q c21-10|A 3': 'arme',
  'Vela Dark Region DL-Y d91|5 A': 'arme',
});
