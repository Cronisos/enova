// Module « Commerce de rares » (mode de jeu) : marchandises rares achetées et vendues, ce qu'il y en a en soute, le
// bénéfice, et les mérites Powerplay de ces ventes, en temps réel. Et le catalogue des rares (catalogue.js) : où
// chacune s'achète, à quelle distance de toi, avec une alerte quand un stock atteint ton seuil.

import { liveSession } from '../../core/sessions.js';
import { dataPath } from '../../core/paths.js';
import { readJsonOrSetAside, writeJsonAtomic } from '../../core/jsonFile.js';
import { RaresState, RARES_EVENTS } from './state.js';
import { cleMarchandise } from '../../core/rares.js';
import { FRAICHEUR_MIN_MS, NOMS, SURVEILLANCE_MS, aSignaler, distance, fusionner, nomDeCle, reglages, relever } from './catalogue.js';
import { ajouter, historiser, resume } from './historique.js';

const FICHIER = dataPath('rares-catalogue.json');
const FICHIER_HISTORIQUE = dataPath('rares-historique.json');
const PAGE_ALERTE = 'rares-alerte';
const ALERTE_MS = 3 * 60_000; // la fenêtre d'alerte se ferme seule
const POSITION_EVENTS = ['FSDJump', 'Location', 'CarrierJump'];

export default {
  id: 'rares',
  name: 'Commerce de rares',

  async register({ router, journal, game, broadcast, overlay }) {
    let courant = null; // l'état de la session en cours (recréé au démarrage), pour lui apprendre les rares des marchés lus
    const session = liveSession({
      id: 'rares', router, journal, overlay, broadcast, events: RARES_EVENTS,
      create: () => {
        courant = new RaresState();
        return courant;
      },
      summary: (state) => state.summary(game.snapshot().cargo),
    });
    game.on('change', session.notify); // soute
    // Marché ouvert en jeu (Market.json) : le jeu y marque les rares, on retient celles que le relevé n'a pas
    journal.on('market', (marche) => {
      if (courant?.apprendre(marche)) session.notify();
      noterMarche(marche);
    });

    // --- Catalogue des rares (Spansh), gardé sur le disque : rien n'est demandé tant que tu ne le demandes pas ---
    const lu = readJsonOrSetAside(FICHIER, { label: 'Catalogue des rares', accept: (d) => Boolean(d) && typeof d === 'object' && Array.isArray(d.lignes) });
    // Fichier resté en place sans avoir pu être lu ni mis de côté : on n'écrit pas par-dessus
    const ecrivable = lu.status === 'ok' || lu.status === 'absent' || (lu.status === 'illisible' && Boolean(lu.aside));
    let cat = { at: lu.data?.at ?? null, lignes: lu.data?.lignes ?? [], erreurs: lu.data?.erreurs ?? 0 };
    let regl = reglages(lu.data?.reglages);
    let position = null; // { systeme, pos: [x, y, z] } : où tu es, d'après le journal
    let enCours = null; // { fait, total } pendant un relevé
    let erreur = null;
    let alerte = null; // { at, seuil, rares: [...] } pendant que la fenêtre d'alerte est ouverte
    let minuterieAlerte = null;
    let minuterieSurveillance = null;

    const enregistrer = () => {
      if (!ecrivable) return;
      try {
        writeJsonAtomic(FICHIER, { at: cat.at, erreurs: cat.erreurs, reglages: regl, lignes: cat.lignes });
      } catch (err) {
        console.warn(`Catalogue des rares non enregistré (${err.message}).`);
      }
    };
    // Historique des stocks (historique.js) : chaque valeur vue, par relevé ou dans un marché que tu ouvres
    const luH = readJsonOrSetAside(FICHIER_HISTORIQUE, { label: 'Historique des rares', accept: (d) => Boolean(d) && typeof d === 'object' && !Array.isArray(d) });
    const hEcrivable = luH.status === 'ok' || luH.status === 'absent' || (luH.status === 'illisible' && Boolean(luH.aside));
    const hist = luH.data ?? {};
    const enregistrerHistorique = () => {
      if (!hEcrivable) return;
      try {
        writeJsonAtomic(FICHIER_HISTORIQUE, hist);
      } catch (err) {
        console.warn(`Historique des rares non enregistré (${err.message}).`);
      }
    };
    // Catalogue déjà relevé avant que l'historique existe : ses lignes en sont le premier point
    if (cat.at && historiser(hist, cat.lignes, cat.at)) enregistrerHistorique();
    const avecDistance = (l) => ({ ...l, distance: distance(l, position?.pos), ...resume(hist[l.nom]) });
    const vue = () => ({
      at: cat.at,
      erreurs: cat.erreurs,
      total: NOMS.length,
      lignes: cat.lignes.map(avecDistance),
      reglages: regl,
      depuis: position?.systeme ?? null,
      enCours,
      erreur,
      alerte,
    });
    const diffuser = () => broadcast('rares:catalogue', vue());

    const fermerAlerte = () => {
      clearTimeout(minuterieAlerte);
      minuterieAlerte = null;
      alerte = null;
      overlay?.setExtra?.(PAGE_ALERTE, false);
      diffuser();
    };
    const alerter = (rares) => {
      alerte = { at: new Date().toISOString(), seuil: regl.seuil, rares: rares.map(avecDistance).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)) };
      overlay?.setExtra?.(PAGE_ALERTE, true);
      clearTimeout(minuterieAlerte);
      minuterieAlerte = setTimeout(fermerAlerte, ALERTE_MS);
      minuterieAlerte.unref?.();
    };

    /** Relevé complet sur Spansh. `auto` : lancé par la surveillance (sinon par toi). */
    async function actualiser({ auto = false } = {}) {
      if (enCours) return;
      enCours = { fait: 0, total: NOMS.length };
      erreur = null;
      diffuser();
      try {
        const r = await relever({
          progres: (fait, total) => {
            enCours = { fait, total };
            if (fait % 5 === 0 || fait === total) diffuser();
          },
        });
        const avant = cat.lignes;
        const premier = !cat.at;
        cat = { at: new Date().toISOString(), lignes: fusionner(avant, r.lignes), erreurs: r.erreurs };
        enregistrer();
        if (historiser(hist, cat.lignes, cat.at)) enregistrerHistorique();
        // Premier relevé fait à la main : la liste suffit, pas d'alerte pour tout ce qui est déjà au seuil
        const nouvelles = premier && !auto ? [] : aSignaler(avant, cat.lignes, regl.seuil);
        if (nouvelles.length) alerter(nouvelles);
      } catch (err) {
        erreur = err.publicMessage || `Relevé impossible : ${err.message}`;
      } finally {
        enCours = null;
        diffuser();
      }
    }

    /**
     * Marché ouvert en jeu : le stock des rares que cette station produit (Producer, ou du stock à vendre) est noté
     * dans l'historique, à l'heure du marché. C'est la mesure la plus sûre : ce que le jeu t'affiche à toi.
     */
    function noterMarche(marche) {
      const at = typeof marche?.timestamp === 'string' ? marche.timestamp : null;
      if (!at) return;
      let change = false;
      for (const i of Array.isArray(marche.Items) ? marche.Items : []) {
        if (i?.Rare !== true || !(i.Producer === true || i.Stock > 0)) continue;
        const nom = nomDeCle(cleMarchandise(i.Name));
        if (nom && ajouter(hist, nom, { at, stock: i.Stock, prix: i.BuyPrice, etat: null, source: 'toi' })) change = true;
      }
      if (!change) return;
      enregistrerHistorique();
      diffuser();
    }

    const programmer = () => {
      clearTimeout(minuterieSurveillance);
      minuterieSurveillance = null;
      if (!regl.surveiller) return;
      const age = cat.at ? Date.now() - Date.parse(cat.at) : NaN;
      const dans = Number.isFinite(age) ? Math.max(60_000, SURVEILLANCE_MS - age) : 60_000;
      minuterieSurveillance = setTimeout(async () => {
        await actualiser({ auto: true });
        programmer();
      }, dans);
      minuterieSurveillance.unref?.();
    };
    programmer();

    // Où tu es : le dernier saut suffit (la distance de chaque source est calculée ici, rien n'est envoyé)
    const situer = (ev) => {
      if (!Array.isArray(ev?.StarPos) || ev.StarPos.length !== 3 || !ev.StarPos.every(Number.isFinite)) return false;
      position = { systeme: String(ev.StarSystem || ''), pos: ev.StarPos };
      return true;
    };
    journal.addInterest(POSITION_EVENTS, { history: { last: true } });
    journal.on('ready', ({ history }) => {
      for (let i = history.length - 1; i >= 0; i -= 1) if (POSITION_EVENTS.includes(history[i].event) && situer(history[i])) break;
    });
    journal.on('event', (ev) => {
      if (POSITION_EVENTS.includes(ev.event) && situer(ev)) diffuser();
    });

    router.get('/catalogue', (req, res) => res.json(vue()));
    /** Tous les points notés d'une rare (nom du catalogue), du plus ancien au plus récent. */
    router.get('/catalogue/historique', (req, res) => {
      const nom = String(req.query.nom || '');
      res.json({ nom, points: Array.isArray(hist[nom]) ? hist[nom] : [] });
    });
    /** Relevé demandé par toi : lancé en fond, la progression arrive par le flux (rares:catalogue). */
    router.post('/catalogue/actualiser', (req, res) => {
      if (enCours) return res.json(vue());
      if (cat.at && Date.now() - Date.parse(cat.at) < FRAICHEUR_MIN_MS) return res.status(429).json({ error: 'Relevé fait il y a moins de 10 minutes : Spansh n’a rien de plus récent à donner.' });
      actualiser().catch(() => {});
      return res.json(vue());
    });
    router.put('/catalogue/reglages', (req, res) => {
      regl = reglages({ ...regl, ...(req.body && typeof req.body === 'object' ? req.body : {}) });
      enregistrer();
      programmer();
      diffuser();
      res.json(vue());
    });
    router.post('/catalogue/alerte/fermer', (req, res) => {
      fermerAlerte();
      res.json(vue());
    });
  },
};
