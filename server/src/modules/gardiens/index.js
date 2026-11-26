// Module « Gardiens » : les recettes de la technologie des Gardiens (recettes.js), les structures connues (sites.js)
// le mode de jeu (session.js : ce qu'on ramasse sur les sites) et ce que le joueur veut débloquer
// (son plan, gardé dans les données de l'app). Le stock de matériaux est lu par la page auprès du module Ingénierie, et
// les sites gardiens sont des repères (module Mes repères, type « Site Gardien »), partagés par le module Escadron :
// les modules ne s'importent pas entre eux.

import { isPlainObject, readJsonFile, writeJsonAtomicSync } from '../../core/atomic.js';
import { dataPath } from '../../core/paths.js';
import { liveSession } from '../../core/sessions.js';
import { GARDIENS_EVENTS, GardiensState } from './session.js';
import { SITE_EVENTS, SiteState } from './site.js';
import { PointsSites, TYPES_POINT } from './points.js';
import { ECHELLES, GABARITS, reconnaitre } from './calage.js';
import { GROUPES, INGREDIENTS, RECETTES, choixPropres } from './recettes.js';
import { SITES_CONNUS, SOURCE_SITES } from './sites.js';
import { GUIDES, PYLONES_RELEVES, REGLES_PYLONES } from './guides.js';

const FICHIER = dataPath('gardiens-plan.json');
// Carte de chaque site, faite par le joueur : les points qu'il marque sur place (points.js)
const POINTS = dataPath('gardiens-points.json');
const PAGE_SITE = 'gardiens-site'; // fenêtre /hud/gardiens-site

export default {
  id: 'gardiens',
  name: 'Gardiens',

  async register({ router, journal, broadcast, overlay }) {
    // Mode de jeu : ce que tu ramasses sur les sites (session.js). Routes /session, /reset, /pause
    liveSession({ id: 'gardiens', router, journal, overlay, broadcast, events: GARDIENS_EVENTS, create: () => new GardiensState() });

    // Site gardien en vue (site.js) : la fenêtre s'ouvre à l'approche, se ferme en quittant la planète ou au bouton
    let site = new SiteState();
    const points = new PointsSites(readJsonFile(POINTS, { fallback: {}, accept: isPlainObject, label: 'Cartes des sites gardiens' }));
    let corrige = null; // dernière correction de type faite par le schéma, dite dans la fenêtre
    let position = null; // { latitude, longitude, heading, planetRadius, body } : où tu es, d'après Status.json
    /** Le schéma du site posé sur les points marqués (calage.js), ou null : pas de carte connue, ou pas reconnu. */
    const schemaDe = (st, marques) => {
      const gabarit = (st?.plan && GABARITS[st.plan]) || null;
      if (!gabarit) return null;
      return reconnaitre(gabarit, marques, points.rayon(st.corps, st.forme) ?? position?.planetRadius, ECHELLES[st.plan] ? { echelle: ECHELLES[st.plan] } : {});
    };
    /** Après un marquage : les points posés avec le mauvais type sont corrigés d'après le schéma. Rend ce qui a changé. */
    const filtrer = (st) => {
      const r = schemaDe(st, points.de(st.corps, st.forme));
      const faits = (r?.corrections ?? []).filter((c) => points.corriger(st.corps, st.forme, c.id, c.type));
      return faits.length ? faits.map((c) => `${TYPES_POINT[c.de].toLowerCase()} → ${TYPES_POINT[c.type].toLowerCase()}`).join(', ') : null;
    };
    const vueSite = () => {
      const v = site.vue();
      const marques = v.site ? points.de(v.site.corps, v.site.forme) : [];
      // Carte connue pour ce type de site (calage.js) : les points marqués sont rapprochés du schéma, sans que le joueur
      // dise lequel est lequel ; une fois reconnu, chacun prend son nom et son numéro, et les autres sont calculés
      const gabarit = (v.site?.plan && GABARITS[v.site.plan]) || null;
      const schema = gabarit ? schemaDe(v.site, marques) : null;
      const parCle = new Map((gabarit || []).map((g) => [g.cle, g]));
      const reconnu = schema?.correspondances ? schema : null;
      const nommes = marques.map((p) => {
        const g = reconnu ? parCle.get(reconnu.correspondances[p.id]) : null;
        return g ? { ...p, n: g.n ?? (p.type === 'relique' ? p.n : null), nom: g.nom } : p;
      });
      const calcules = (reconnu?.points ?? []).map((g, i) => ({ id: -100 - i, type: g.type, n: g.n ?? null, nom: g.nom, latitude: g.latitude, longitude: g.longitude, calcule: true }));
      return {
        ...v, points: [...nommes, ...calcules], position, types: TYPES_POINT, corrige,
        // schema : null (pas de carte connue pour ce site), 'attente' (pas assez de points, ou plusieurs poses possibles),
        // ou { erreur (m), hors (points marqués qui ne collent pas au schéma) }
        schema: !gabarit ? null : reconnu ? { erreur: Math.round(reconnu.erreur), hors: marques.filter((p) => p.type !== 'relique' && reconnu.hors.includes(p.id)).length } : 'attente',
      };
    };
    const diffuser = () => broadcast('gardiens:site', vueSite());
    const enregistrer = () => writeJsonAtomicSync(POINTS, points.donnees());
    // Position en direct, seulement tant qu'un site est en vue (Status.json est relu deux fois par seconde)
    journal.on('status', (st) => {
      if (!site.site) return;
      const ok = typeof st?.Latitude === 'number' && typeof st?.Longitude === 'number';
      const suivante = ok ? { latitude: st.Latitude, longitude: st.Longitude, heading: typeof st.Heading === 'number' ? st.Heading : null, planetRadius: typeof st.PlanetRadius === 'number' ? st.PlanetRadius : null, body: st.BodyName || null } : null;
      if (JSON.stringify(suivante) === JSON.stringify(position)) return;
      position = suivante;
      broadcast('gardiens:position', { position });
    });
    journal.addInterest(SITE_EVENTS);
    journal.on('ready', ({ history }) => {
      site = new SiteState();
      // Seulement la fin de l'historique compte : où l'on est au démarrage de l'app
      const voulus = new Set(SITE_EVENTS);
      for (const ev of history) if (voulus.has(ev.event)) site.apply(ev);
      overlay?.setExtra?.(PAGE_SITE, Boolean(site.site));
    });
    journal.on('event', (ev) => {
      if (!SITE_EVENTS.includes(ev.event) || !site.apply(ev)) return;
      if (!site.site) position = null;
      corrige = null;
      diffuser();
      overlay?.setExtra?.(PAGE_SITE, Boolean(site.site));
    });
    router.get('/site', (req, res) => res.json(vueSite()));
    /** Rouvrir la fenêtre du site en vue (fermée au bouton) : depuis la page Gardiens. */
    router.post('/site/ouvrir', (req, res) => {
      if (site.site) overlay?.setExtra?.(PAGE_SITE, true);
      res.json(vueSite());
    });
    router.post('/site/fermer', (req, res) => {
      overlay?.setExtra?.(PAGE_SITE, false);
      res.json(vueSite());
    });
    /** Marquer ici un pylône, la machine ou une relique : la position est celle du jeu au moment du clic. */
    router.post('/site/points', (req, res) => {
      const st = site.site;
      if (!st) return res.status(409).json({ error: 'Aucun site gardien en vue.' });
      if (!position) return res.status(409).json({ error: 'Position inconnue : il faut être près du sol (SRV, à pied ou vaisseau bas).' });
      if (!points.ajouter(st.corps, st.forme, req.body?.type, position)) return res.status(400).json({ error: 'Point refusé : type inconnu, ou carte pleine.' });
      corrige = filtrer(st);
      try {
        enregistrer();
      } catch (err) {
        return res.status(500).json({ error: `Carte non enregistrée (${err.message}).` });
      }
      diffuser();
      return res.status(201).json(vueSite());
    });
    /** Retirer le dernier point marqué (une erreur de clic). */
    router.post('/site/points/annuler', (req, res) => {
      const st = site.site;
      if (st && points.annuler(st.corps, st.forme)) {
        try {
          enregistrer();
        } catch (err) {
          return res.status(500).json({ error: `Carte non enregistrée (${err.message}).` });
        }
        diffuser();
      }
      return res.json(vueSite());
    });

    const lu = readJsonFile(FICHIER, { fallback: {}, accept: isPlainObject, label: 'Plan des Gardiens' });
    let choix = choixPropres(lu.choix);

    router.get('/recettes', (req, res) => res.json({ groupes: GROUPES, ingredients: INGREDIENTS, recettes: RECETTES }));
    /** Structures gardiennes connues (liste de 2018, voir sites.js) : un point de départ, à copier dans ses repères. */
    router.get('/sites', (req, res) => res.json({ source: SOURCE_SITES, sites: SITES_CONNUS }));
    /** Où aller pour chaque type de plan, avec les liens vers les cartes des pylônes (guides.js). */
    router.get('/guides', (req, res) => res.json({ guides: GUIDES, regles: REGLES_PYLONES, pylones: PYLONES_RELEVES }));
    router.get('/plan', (req, res) => res.json({ choix }));
    /** Ce que le joueur veut débloquer : la liste entière, remplacée d'un coup. */
    router.put('/plan', (req, res) => {
      choix = choixPropres(req.body?.choix);
      try {
        writeJsonAtomicSync(FICHIER, { choix });
      } catch (err) {
        return res.status(500).json({ error: `Plan non enregistré (${err.message}).` });
      }
      broadcast('gardiens:plan', { choix });
      return res.json({ choix });
    });
  },
};
