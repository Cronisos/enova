// Guide des ressources du Rhino, côté joueur : ce que TES journaux disent. Pour chaque ressource raffinée en Rhino, sur
// quel type de monde tu l'as trouvée (et combien de tonnes), et à quel prix tu l'as vendue. Le client (GuideRessources)
// le fond avec le tableau de la communauté : tes observations comblent ses trous (l’auteur, 19 nov. 2026 : « remplis-le
// avec mes data », par exemple ses diamants basse température sur un monde glacé).
//
// Tout vient d'événements déjà relus par le module (MINING_EVENTS) :
//   - ApproachBody, Touchdown { Body }, Location : la planète où l'on est, jusqu'à LeaveBody ou au saut suivant ;
//   - LaunchSRV / DockSRV / SRVDestroyed : en Rhino ou non (le raffinage en vaisseau, sur astéroïde, ne compte pas) ;
//   - MiningRefined { Type, Type_Localised } : une tonne ;
//   - Scan { BodyName, PlanetClass } : le type du monde, connu parfois après le minage (résolu à la lecture) ;
//   - MarketSell { Type, Type_Localised, SellPrice, Count } : ce que la ressource s'est vendue.

/** PlanetClass du journal → type de monde du guide ; un type où le Rhino ne mine pas : absent. */
const MONDES = new Map([
  ['high metal content body', 'hmc'],
  ['metal rich body', 'mrb'],
  ['rocky body', 'roc'],
  ['rocky ice body', 'rg'],
  ['icy body', 'gl'],
]);

/** « $platinum_name; » et « platinum » désignent la même ressource. */
const cle = (type) => String(type || '').toLowerCase().replace(/^\$/, '').replace(/_name;$/, '').slice(0, 60);
const nomPropre = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60);

/** Type de monde du guide pour un PlanetClass du journal, ou null. */
export function mondeDe(planetClass) {
  return MONDES.get(String(planetClass || '').toLowerCase()) ?? null;
}

export class GuideObservations {
  constructor() {
    this.classes = new Map(); // planète → PlanetClass
    this.corps = null; // planète où le vaisseau s'est posé
    this.enRhino = false;
    this.raffine = new Map(); // ressource → Map(planète → tonnes)
    this.noms = new Map(); // ressource → nom affiché par le jeu
    this.ventes = new Map(); // ressource → { max, dernier, le, tonnes }
  }

  apply(ev) {
    switch (ev.event) {
      case 'Scan':
        if (ev.BodyName && ev.PlanetClass) this.classes.set(ev.BodyName, ev.PlanetClass);
        break;
      // Le Rhino sort le plus souvent sans que le vaisseau se pose (11 Touchdown pour 63 sorties dans les journaux de
      // l’auteur) : c'est l'approche de la planète qui dit où l'on est
      case 'ApproachBody':
      case 'Touchdown':
        if (typeof ev.Body === 'string' && ev.Body) this.corps = ev.Body;
        break;
      case 'Location': // jeu lancé alors qu'on est déjà sur une planète
        if (ev.BodyType === 'Planet' && typeof ev.Body === 'string' && ev.Body) this.corps = ev.Body;
        break;
      case 'LeaveBody':
        this.corps = null;
        break;
      case 'FSDJump':
        this.corps = null;
        this.enRhino = false;
        break;
      case 'LaunchSRV':
        this.enRhino = true;
        break;
      case 'DockSRV':
      case 'SRVDestroyed':
        this.enRhino = false;
        break;
      case 'MiningRefined': {
        const k = cle(ev.Type);
        if (!k || !this.enRhino || !this.corps) break;
        if (ev.Type_Localised) this.noms.set(k, nomPropre(ev.Type_Localised));
        if (!this.raffine.has(k)) this.raffine.set(k, new Map());
        const parCorps = this.raffine.get(k);
        parCorps.set(this.corps, (parCorps.get(this.corps) || 0) + 1);
        break;
      }
      case 'MarketSell': {
        const k = cle(ev.Type);
        const prix = Number(ev.SellPrice);
        if (!k || !Number.isFinite(prix) || prix <= 0) break;
        if (ev.Type_Localised) this.noms.set(k, nomPropre(ev.Type_Localised));
        const v = this.ventes.get(k) || { max: 0, dernier: 0, le: null, tonnes: 0 };
        v.max = Math.max(v.max, prix);
        v.dernier = prix;
        v.le = ev.timestamp || v.le;
        v.tonnes += Number.isInteger(ev.Count) && ev.Count > 0 ? ev.Count : 0;
        this.ventes.set(k, v);
        break;
      }
      default:
    }
  }

  /**
   * Ressources raffinées en Rhino : [{ cle, nom, tonnes, mondes: { hmc: t, … }, planetes, sansType, prix }], les plus
   * raffinées d'abord. `sansType` : tonnes minées sur une planète dont le type n'a jamais été scanné. `prix` : { max,
   * dernier, le, tonnes } d'après tes ventes, ou null si tu ne l'as jamais vendue.
   */
  summary() {
    const out = [];
    for (const [k, parCorps] of this.raffine) {
      const mondes = {};
      let tonnes = 0;
      let sansType = 0;
      for (const [corps, t] of parCorps) {
        tonnes += t;
        const m = mondeDe(this.classes.get(corps));
        if (m) mondes[m] = (mondes[m] || 0) + t;
        else sansType += t;
      }
      out.push({ cle: k, nom: this.noms.get(k) || k, tonnes, mondes, planetes: parCorps.size, sansType, prix: this.ventes.get(k) ?? null });
    }
    return out.sort((a, b) => b.tonnes - a.tonnes || a.nom.localeCompare(b.nom, 'fr'));
  }
}
