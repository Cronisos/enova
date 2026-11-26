// Catalogue des marchandises rares : où chacune s'achète, à quel prix, combien il en reste, et à quelle distance de
// toi. La même liste que les sites de la communauté, tirée de Spansh (POST /api/stations/search, sans clé), lui-même
// alimenté par les relevés de marché que les joueurs envoient (réseau EDDN).
//
// Essais du 25 nov. 2026 :
// - filtre `market: [{ name, supply: { value: [1, 1000000], comparison: '<=>' } }]` : les stations où la rare est en
//   vente. Sans filtre de type, les porte-vaisseaux qui en revendent arrivent en tête (83 pour les cigares de
//   Kamitra) ; avec `type` limité aux stations, il n'en reste qu'une : la source ;
// - la ligne du marché porte `is_home_station: true` à la source, `is_rare`, `supply` (ce qu'il RESTE au dernier
//   relevé, pas ce que tu pourras prendre : 23 t de cigares affichées juste après un achat de 102 t), `buy_price` ;
// - la station donne system_x/y/z (distance calculée ici, sans rien renvoyer), distance_to_arrival, has_large_pad,
//   medium_pads, market_updated_at, system_controlling_power, controlling_minor_faction et son état
//   (controlling_minor_faction_state : « Boom », « War », « Expansion »…) ;
// - deux rares dans le même filtre : un ET (0 station), donc une requête par rare, environ 80 Ko et 0,2 s chacune ;
// - une rare épuisée au moment du relevé (stock 0) ne sort pas : sa dernière ligne connue est gardée, stock à 0 ;
// - le prix de VENTE n'est nulle part : une station ne cote une rare que si on l'a en soute.
// Seuls des noms publics partent (une marchandise, des types de station, « Sol » comme repère). Rien du joueur.

import { netFetch } from '../../core/net.js';
import { RARES } from '../../core/rares.js';

export const API = 'https://spansh.co.uk/api/stations/search';
export const PAUSE_MS = 300; // entre deux requêtes : on ne martèle pas Spansh
export const TIMEOUT_MS = 30_000;
export const SEUIL_DEFAUT = 100; // tonnes en stock à partir desquelles une rare est signalée
export const FRAICHEUR_MIN_MS = 10 * 60_000; // pas deux relevés complets à moins de 10 min d'écart
export const SURVEILLANCE_MS = 6 * 3_600_000; // surveillance activée : un relevé toutes les 6 heures

/** Types de station gardés : tout sauf les porte-vaisseaux, qui revendent les rares des autres. */
export const TYPES = Object.freeze(['Coriolis Starport', 'Ocellus Starport', 'Orbis Starport', 'Outpost', 'Asteroid base', 'Planetary Outpost', 'Planetary Port', 'Mega ship', 'Dodec Starport', 'Settlement']);

/** Les 142 rares connues de Spansh (noms anglais, relevés le 25 nov. 2026 sur un marché qui les cotait toutes). */
export const NOMS = Object.freeze([
  "Aepyornis Egg", "Aganippe Rush", "Alacarakmo Skin Art", "Albino Quechua Mammoth Meat", "Altairian Skin",
  "Alya Body Soap", "Anduliga Fire Works", "Any Na Coffee", "Apa Vietii", "Arouca Conventual Sweets",
  "Az Cancri Formula 42", "Azure Milk", "Baked Greebles", "Baltah'sine Vacuum Krill", "Banki Amphibious Leather",
  "Bast Snake Gin", "Belalans Ray Leather", "Borasetani Pathogenetics", "Buckyball Beer Mats",
  "Burnham Bile Distillate", "CD-75 Kitten Brand Coffee", "Centauri Mega Gin", "Ceremonial Heike Tea", "Ceti Rabbits",
  "Chameleon Cloth", "Chateau De Aegaeon", "Cherbones Blood Crystals", "Chi Eridani Marine Paste",
  "Classified Experimental Equipment", "Coquim Spongiform Victuals", "Crom Silver Fesh", "Crystalline Spheres",
  "Damna Carapaces", "Delta Phoenicis Palms", "Deuringas Truffles", "Diso Ma Corn", "Duradrives",
  "Eden Apples of Aerial", "Eleu Thermals", "Eranin Pearl Whisky", "Eshu Umbrellas", "Esuseku Caviar",
  "Ethgreze Tea Buds", "Fujin Tea", "Galactic Travel Guide", "Geawen Dance Dust", "Gerasian Gueuze Beer",
  "Giant Irukama Snails", "Giant Verrix", "Gilya Signature Weapons", "Goman Yaupon Coffee", "Haiden Black Brew",
  "Harma Silver Sea Rum", "Havasupai Dream Catcher", "Helvetitj Pearls", "HIP 10175 Bush Meat", "HIP 118311 Swarm",
  "HIP Organophosphates", "HIP Proto-Squid", "Holva Duelling Blades", "Honesty Pills", "HR 7221 Wheat",
  "Indi Bourbon", "Jaques Quinentian Still", "Jaradharre Puzzle Box", "Jaroua Rice", "Jotun Mookah",
  "Kachirigin Filter Leeches", "Kamitra Cigars", "Kamorin Historic Weapons", "Karetii Couture", "Karsuki Locusts",
  "Kinago Violins", "Kongga Ale", "Koro Kung Pellets", "Lavian Brandy", "Leathery Eggs", "Leestian Evil Juice",
  "Live Hecate Sea Worms", "LTT Hyper Sweet", "Lucan Onionhead", "Lyrae Weed", "Master Chefs", "Mechucos High Tea",
  "Medb Starlube", "Mokojing Beast Feast", "Momus Bog Spaniel", "Motrona Experience Jelly", "Mukusubii Chitin-os",
  "Mulachi Giant Fungus", "Nanomedicines", "Neritus Berries", "Ngadandari Fire Opals", "Nguna Modern Antiques",
  "Njangari Saddles", "Non Euclidian Exotanks", "Ochoeng Chillies", "Onionhead", "Onionhead Alpha Strain",
  "Onionhead Beta Strain", "Ophiuch Exino Artefacts", "Orrerian Vicious Brew", "Pantaa Prayer Sticks",
  "Pavonis Ear Grubs", "Personal Gifts", "Platinum Alloy", "Rajukru Multi-Stoves", "Rapa Bao Snake Skins",
  "Rusani Old Smokey", "Sanuma Decorative Meat", "Saxon Wine", "Shan's Charis Orchid", "Soontill Relics",
  "Sothis Crystalline Gold", "Tanmark Tranquil Tea", "Tarach Spice", "Tauri Chimes", "Terra Mater Blood Bores",
  "The Hutton Mug", "The Waters of Shintara", "Thrutis Cream", "Tiegfries Synth Silk", "Tiolce Waste2Paste Units",
  "Toxandji Virocide", "Ultra-Compact Processor Prototypes", "Uszaian Tree Grub", "Utgaroar Millennial Eggs",
  "Uzumoku Low-G Wings", "V Herculis Body Rub", "Vanayequi Ceratomorpha Fur", "Vega Slimweed", "Vidavantian Lace",
  "Void Extract Coffee", "Volkhab Bee Drones", "Wheemete Wheat Cakes", "Witchhaul Kobe Beef", "Wolf Fesh",
  "Wulpa Hyperbore Systems", "Wuthielo Ku Froth", "Xihe Biomorphic Companions", "Yaso Kondi Leaf",
  "Zeessze Ant Grub Glue",
]);

/** Nom anglais → nom interne du jeu, quand il ne se déduit pas (sinon : le nom en minuscules, sans espace ni signe). */
const CLES = Object.freeze({
  'Aepyornis Egg': 'cetiaepyornisegg', 'Albino Quechua Mammoth Meat': 'albinoquechuamammoth', 'Alya Body Soap': 'alyabodilysoap',
  'Azure Milk': 'bluemilk', 'CD-75 Kitten Brand Coffee': 'cd75catcoffee', 'Crom Silver Fesh': 'animaleffigies',
  'Eden Apples of Aerial': 'aerialedenapple', 'HIP Proto-Squid': 'hip41181squid', 'Haiden Black Brew': 'haidneblackbrew',
  'Kachirigin Filter Leeches': 'kachiriginleaches', 'Kinago Violins': 'kinagoinstruments', 'Koro Kung Pellets': 'korrokungpellets',
  'Leathery Eggs': 'alieneggs', 'Lucan Onionhead': 'transgeniconionhead', 'Onionhead Alpha Strain': 'onionheada',
  'Onionhead Beta Strain': 'onionheadb', 'Ophiuch Exino Artefacts': 'ophiuchiexinoartefacts', 'Platinum Alloy': 'platinumaloy',
  'Rajukru Multi-Stoves': 'rajukrustoves', 'Sanuma Decorative Meat': 'sanumameat', 'Tarach Spice': 'tarachtorspice',
  'The Waters of Shintara': 'watersofshintara', 'Ultra-Compact Processor Prototypes': 'advert1',
  'Utgaroar Millennial Eggs': 'utgaroarmillenialeggs', 'Vanayequi Ceratomorpha Fur': 'vanayequirhinofur',
  'Void Extract Coffee': 'lftvoidextractcoffee', 'Wolf Fesh': 'wolf1301fesh', 'Xihe Biomorphic Companions': 'xihecompanions',
  'Zeessze Ant Grub Glue': 'zeesszeantglue',
});

/** Nom français d'une rare d'après son nom anglais (relevé core/rares.js), sinon le nom anglais. */
export const cleDe = (nom) => CLES[nom] || String(nom).toLowerCase().replace(/[^a-z0-9]/g, '');
export function nomFrancais(nom) {
  return RARES[cleDe(nom)] || nom;
}

const PAR_CLE = new Map(NOMS.map((n) => [cleDe(n), n]));
/** Nom du catalogue (anglais) d'une marchandise d'après son nom interne du jeu (« kamitracigars »), ou null. */
export const nomDeCle = (cle) => PAR_CLE.get(String(cle || '').toLowerCase()) ?? null;

const num = (v) => (Number.isFinite(v) ? v : null);

/** Corps de la requête Spansh pour une rare. */
export const requete = (nom) => ({
  filters: { type: { value: TYPES }, market: [{ name: nom, supply: { value: [1, 1_000_000], comparison: '<=>' } }] },
  sort: [{ distance: { direction: 'asc' } }],
  size: 5,
  reference_system: 'Sol',
});

/**
 * La ligne du catalogue tirée d'une réponse Spansh : la station source (is_home_station) si elle y est, sinon la
 * première station qui en vend. null si aucune.
 */
export function ligneDe(nom, reponse) {
  const stations = Array.isArray(reponse?.results) ? reponse.results : [];
  const cote = (s) => (Array.isArray(s?.market) ? s.market.find((m) => m?.commodity === nom) : null);
  const s = stations.find((x) => cote(x)?.is_home_station === true) || stations.find((x) => cote(x));
  if (!s) return null;
  const m = cote(s);
  return {
    nom,
    label: nomFrancais(nom),
    station: String(s.name || ''),
    systeme: String(s.system_name || ''),
    type: typeof s.type === 'string' ? s.type : null,
    x: num(s.system_x),
    y: num(s.system_y),
    z: num(s.system_z),
    arrivee: num(s.distance_to_arrival),
    grandPad: s.has_large_pad === true || (s.large_pads || 0) > 0,
    moyenPad: (s.medium_pads || 0) > 0,
    planetaire: s.is_planetary === true,
    puissance: typeof s.system_controlling_power === 'string' ? s.system_controlling_power : null,
    faction: typeof s.controlling_minor_faction === 'string' ? s.controlling_minor_faction : null,
    etat: typeof s.controlling_minor_faction_state === 'string' ? s.controlling_minor_faction_state : null,
    stock: num(m.supply) ?? 0,
    prix: num(m.buy_price),
    maj: typeof s.market_updated_at === 'string' ? s.market_updated_at : null,
  };
}

/** Distance en années-lumière entre une ligne et une position [x, y, z], arrondie au dixième ; null si inconnue. */
export function distance(ligne, pos) {
  if (!Array.isArray(pos) || pos.length !== 3 || !pos.every(Number.isFinite) || ![ligne?.x, ligne?.y, ligne?.z].every(Number.isFinite)) return null;
  return Math.round(Math.hypot(ligne.x - pos[0], ligne.y - pos[1], ligne.z - pos[2]) * 10) / 10;
}

/**
 * Nouveau catalogue après un relevé : les lignes trouvées, plus les lignes d'avant que ce relevé n'a pas retrouvées
 * (rare épuisée : stock mis à 0, le reste gardé).
 */
export function fusionner(avant, trouvees) {
  const vus = new Set(trouvees.map((l) => l.nom));
  const gardees = (avant || []).filter((l) => !vus.has(l.nom)).map((l) => ({ ...l, stock: 0, epuisee: true }));
  return [...trouvees, ...gardees].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/**
 * Rares à signaler : celles dont le stock atteint le seuil et qui ne l'atteignaient pas au relevé d'avant (ou qui
 * n'y étaient pas). Premier relevé (avant vide) : toutes celles au seuil.
 */
export function aSignaler(avant, apres, seuil = SEUIL_DEFAUT) {
  const hier = new Map((avant || []).map((l) => [l.nom, l.stock]));
  return apres.filter((l) => l.stock >= seuil && !(hier.get(l.nom) >= seuil));
}

/** Réglages lus d'un fichier ou d'une requête, remis dans leurs bornes. */
export function reglages(r) {
  const seuil = Math.round(Number(r?.seuil));
  return { surveiller: r?.surveiller === true, seuil: Number.isFinite(seuil) && seuil >= 1 && seuil <= 100_000 ? seuil : SEUIL_DEFAUT };
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Relevé complet : une requête par rare, l'une après l'autre. `progres(fait, total)` après chacune.
 * Une rare en erreur est sautée (sa ligne d'avant sera gardée) ; si tout échoue, l'erreur de la première est levée.
 * @returns {Promise<{ lignes: object[], erreurs: number }>}
 */
export async function relever({ noms = NOMS, fetchImpl = netFetch, pause = PAUSE_MS, progres = () => {}, stop = () => false } = {}) {
  const lignes = [];
  let erreurs = 0;
  let premiere = null;
  for (let i = 0; i < noms.length; i += 1) {
    if (stop()) break;
    try {
      const r = await fetchImpl(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requete(noms[i])) }, { timeoutMs: TIMEOUT_MS });
      if (!r.ok) throw new Error(`Spansh a répondu ${r.status}`);
      const l = ligneDe(noms[i], await r.json());
      if (l) lignes.push(l);
    } catch (err) {
      erreurs += 1;
      premiere ??= err;
    }
    progres(i + 1, noms.length);
    if (pause > 0 && i < noms.length - 1) await attendre(pause);
  }
  if (erreurs === noms.length && premiere) throw premiere;
  return { lignes, erreurs };
}
