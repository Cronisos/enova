// Session de commerce de marchandises rares : ce qui est acheté, vendu, ce que ça rapporte en crédits, et surtout les
// mérites Powerplay que donnent ces ventes. Une session commence au lancement du jeu (LoadGame) ou à une remise à zéro.
//
// Mesuré dans le journal (21 et 23 nov. 2026, Aisling Duval) :
//   MarketBuy  { Type: "kamitracigars", Type_Localised: "Cigares de Kamitra", Count: 102, BuyPrice, TotalCost }
//   MarketSell { Type, Type_Localised, Count: 102, SellPrice, TotalSale, AvgPricePaid }
//   PowerplayMerits { MeritsGained, TotalMerits } dans les secondes qui suivent la vente
// Le journal ne dit pas qu'une marchandise est rare : on le sait par le relevé du cœur (core/rares.js, tiré de
// Market.json où le jeu le marque), complété par les marchés lus pendant le jeu (apprendre).

import { MeritCounter } from '../../core/merits.js';
import { RARES, cleMarchandise } from '../../core/rares.js';

export const RARES_EVENTS = ['LoadGame', 'Died', 'Powerplay', 'MarketBuy', 'MarketSell', 'PowerplayMerits'];

// Mérites comptés pour ce commerce : ceux qui arrivent juste après un achat ou une vente de rares. Le jeu les écrit
// dans les secondes qui suivent ; 15 s laissent passer une série de ventes sans prendre ceux d'une autre activité.
export const MERIT_WINDOW_MS = 15_000;
const RECENT = 20;
const entier = (n) => (Number.isFinite(n) && n > 0 ? Math.round(n) : 0);

export class RaresState {
  constructor() {
    this.counter = new MeritCounter(); // total du jeu : ne repart pas de zéro avec la session
    this.appris = new Map(); // rares vues dans un marché et absentes du relevé : clé → nom
    this.reset(null);
  }

  reset(startedAt) {
    this.startedAt = startedAt;
    this.bought = 0; // tonnes achetées
    this.sold = 0; // tonnes vendues
    this.cost = 0; // crédits dépensés
    this.revenue = 0; // crédits encaissés
    this.profit = 0; // bénéfice des ventes : (prix de vente − prix moyen payé) × tonnes
    this.merits = 0;
    this.deaths = 0;
    this.byType = new Map(); // clé → { label, bought, sold, profit, merits }
    this.recent = [];
    this.lastTradeAt = null; // dernier achat ou vente de rares (ms)
  }

  /** Marché lu (Market.json) : retient les marchandises que le jeu marque rares et que le relevé n'a pas. */
  apprendre(marche) {
    let neuf = false;
    for (const i of Array.isArray(marche?.Items) ? marche.Items : []) {
      const cle = cleMarchandise(i?.Name);
      if (i?.Rare !== true || !cle || Object.hasOwn(RARES, cle) || this.appris.has(cle)) continue;
      this.appris.set(cle, String(i.Name_Localised || cle).slice(0, 80));
      neuf = true;
    }
    return neuf;
  }

  estRare(nom) {
    const cle = cleMarchandise(nom);
    return Object.hasOwn(RARES, cle) || this.appris.has(cle);
  }

  nom(cle, localise) {
    return String(localise || RARES[cle] || this.appris.get(cle) || cle).slice(0, 80);
  }

  type(ev) {
    const cle = cleMarchandise(ev.Type);
    if (!this.byType.has(cle)) this.byType.set(cle, { label: this.nom(cle, ev.Type_Localised), bought: 0, sold: 0, profit: 0, merits: 0 });
    return this.byType.get(cle);
  }

  apply(ev) {
    switch (ev.event) {
      case 'LoadGame':
        this.reset(ev.timestamp);
        break;
      case 'Powerplay':
        this.counter.setTotal(ev.Merits);
        return false;
      case 'MarketBuy': {
        const n = entier(ev.Count);
        if (!n || !this.estRare(ev.Type)) return false;
        const t = this.type(ev);
        t.bought += n;
        this.bought += n;
        this.cost += entier(ev.TotalCost);
        this.log(ev, 'Acheté', t.label, n, -entier(ev.TotalCost));
        break;
      }
      case 'MarketSell': {
        const n = entier(ev.Count);
        if (!n || !this.estRare(ev.Type)) return false;
        const t = this.type(ev);
        // Bénéfice : le jeu donne le prix moyen payé pour ce qui est vendu (0 pour une marchandise trouvée ou volée)
        const gain = entier(ev.TotalSale) - (Number.isFinite(ev.AvgPricePaid) ? Math.round(ev.AvgPricePaid * n) : 0);
        t.sold += n;
        t.profit += gain;
        this.sold += n;
        this.revenue += entier(ev.TotalSale);
        this.profit += gain;
        this.log(ev, 'Vendu', t.label, n, gain);
        break;
      }
      case 'PowerplayMerits': {
        const gained = this.counter.gain(ev); // doublons du journal retirés
        if (this.lastTradeAt == null || Date.parse(ev.timestamp) - this.lastTradeAt > MERIT_WINDOW_MS) return false;
        this.merits += gained;
        const dernier = this.recent[0];
        if (dernier) {
          dernier.merits += gained;
          const t = this.byType.get(dernier.type);
          if (t) t.merits += gained;
        }
        break;
      }
      case 'Died':
        this.deaths += 1;
        break;
      default:
        return false;
    }
    return true;
  }

  log(ev, kind, label, count, credits) {
    this.lastTradeAt = Date.parse(ev.timestamp);
    this.recent.unshift({ at: ev.timestamp, kind, type: cleMarchandise(ev.Type), label, count, credits, merits: 0 });
    if (this.recent.length > RECENT) this.recent.length = RECENT;
  }

  /** @param cargo soute actuelle [{ name, label, count }] (Cargo.json) */
  summary(cargo = []) {
    const items = (Array.isArray(cargo) ? cargo : [])
      .filter((c) => c?.count > 0 && this.estRare(c.name))
      .map((c) => ({ label: this.nom(cleMarchandise(c.name), c.label), count: c.count }));
    return {
      startedAt: this.startedAt,
      bought: this.bought,
      sold: this.sold,
      cost: this.cost,
      revenue: this.revenue,
      profit: this.profit,
      merits: this.merits,
      deaths: this.deaths,
      hold: { count: items.reduce((a, c) => a + c.count, 0), items },
      types: [...this.byType.values()].sort((a, b) => b.merits - a.merits || b.sold - a.sold || b.bought - a.bought),
      recent: this.recent.map(({ type, ...r }) => r),
    };
  }
}
