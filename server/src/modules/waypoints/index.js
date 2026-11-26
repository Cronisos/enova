// Module « Mes repères » : un clic enregistre l'endroit où l'on se trouve (système, planète,
// latitude, longitude, altitude), on note ce que c'est, et l'app guide pour y revenir.
// Position lue dans Status.json (écrit par le jeu), système et station dans l'état du jeu.

import { onGround, surfaceRoute, turn, vehicleOf } from './geo.js';
import { ACTIVITY_EVENTS, IDLE_MS, MINING_EVENTS, MiningSession, MiningState, eventTime, runStart, sessionEvent, trimEvents } from './mining.js';
import { buildSurvey, cleanDeposits, cleanRating, depositsOf, KnownBodies, shortBody, systemAddressOf } from './survey.js';
import { ONLINE_FILE, OnlineSetting } from './online.js';
import { currentReference } from '../../core/reference/refdata.js';
import { readBest } from '../../core/ocr.js';
import { activity } from '../../core/activity.js';
import { mergeOres, oresFromLines } from './captureOres.js';
import { project } from './sweep.js';
import { EepLibrary } from './eeps.js';
import { CIBLE_FRAICHE_MS, numeroEepIci, repereIci } from './numeroEep.js';
import { randomUUID } from 'node:crypto';
import { AUTO_LABEL, shouldGuide } from './lastSpot.js';
import { oreOf, nomMinerai, AUTRES_MINERAIS } from './ores.js';
import { liveSnapshot, ORE_SYMBOLS, SystemMarkets } from './markets.js';
import { MIN_DEMAND, OrePrices } from './topOres.js';
import { GuideObservations } from './guide.js';
import { lieuxParMinerai } from './chercher.js';
import { mountDrills } from './drillsApi.js';
import fs from 'node:fs';
import path from 'node:path';
import { dataDir, dataPath } from '../../core/paths.js';
import { localFetch } from '../../core/net.js';
import { requireRowId } from '../../core/ids.js';
import { decodeBase64Image } from '../../core/imageCheck.js';
import { MAX_PIXELS } from '../../core/ocrImage.js';
import { isPlainObject, readJsonFile, writeFileAtomicSync, writeJsonAtomicSync } from '../../core/atomic.js';
import { isCaptureId, reconcile } from './capturesStore.js';
import { deferredSave, ecritureSiChange } from './deferredSave.js';

// Captures du cadre de l'overlay (contenu d'un EEP ciblé) : image et texte lu, les plus récentes d'abord
const CAPTURES_DIR = dataPath('captures') + path.sep;
const CAPTURES_INDEX = `${CAPTURES_DIR}index.json`;
const MAX_CAPTURES = 30;
// Balayage de l'EEP en cours (centre, bord, ce que le scanner a vu) : gardé d'un redémarrage à l'autre
const DATA_DIR = dataDir() + path.sep;
const SWEEP_FILE = `${DATA_DIR}sweep.json`; // ancien balayage unique : repris dans la bibliothèque au premier lancement
const EEPS_FILE = `${DATA_DIR}eeps.json`; // EEP balayés (eeps.js)
// Dernier EEP ciblé dans le HUD du vaisseau ({ body, number, at }) : gardé à la relance de l'app (Status.json n'est pas
// dans les journaux, une cible vue avant la relance serait sinon perdue)
const SITE_FILE = `${DATA_DIR}eep-cible.json`;
// Dernière tonne raffinée en SRV, par planète : la boussole y ramène quand tu reviens
const SPOTS_FILE = `${DATA_DIR}last-mining.json`;
// Chrono remis à zéro seul, par session (les taux comptent toute la session)
const CHRONO_FILE = `${DATA_DIR}mining-chrono.json`;
// Minerais appris : noms tapés dans « Autre… » du tiroir repère (« Dunite de périclase », absent de la liste du jeu
// connue de l'app, 12 nov. 2026), proposés et reconnus ensuite comme les autres
const APPRIS_FILE = `${DATA_DIR}minerais-appris.json`;
const MAX_APPRIS = 200;
// Foreuses du Rhino de la séance : position, poses, vidanges (drills.js)
const DRILLS_FILE = `${DATA_DIR}drills.json`;
// Recherches en ligne automatiques (Spansh, Ardent, avec le système où tu es) : coupées tant que tu ne les actives pas
const ONLINE_PATH = `${DATA_DIR}${ONLINE_FILE}`;

// Sessions terminées proposées à la reprise (GET /sessions) ; leurs événements sont gardés, comme ceux des 48 dernières
// heures. Tri des événements gardés toutes les TRI_CHAQUE lignes reçues.
const SESSIONS_LISTEES = 20;
const EVENTS_WINDOW_MS = 48 * 60 * 60 * 1000;
const TRI_CHAQUE = 2000;

// Minerais proposés d'office à la prospection, en plus de ceux déjà raffinés ou notés
const COMMON_ORES = ['Iridium', 'Platine', 'Or', 'Rhodplumsite', 'Palladium', 'Osmium', 'Argent', 'Uranium', 'Titane', 'Hématite', 'Magnésite', 'Hélium'];

/**
 * Minerais proposés par « Autre… » du tiroir repère : ceux du jeu hors courants, ceux que tu as raffinés, et ceux que
 * l'app a appris (lus sur les panneaux de cible, tapés à la main).
 */
function listeAutres(raffines, appris = []) {
  const courants = new Set(COMMON_ORES.map((o) => o.toLowerCase()));
  const noms = new Map();
  for (const n of [...AUTRES_MINERAIS, ...raffines, ...appris]) {
    if (typeof n === 'string' && n && !n.startsWith('$') && !courants.has(n.toLowerCase())) noms.set(n.toLowerCase(), n);
  }
  return [...noms.values()].sort((a, b) => a.localeCompare(b, 'fr'));
}

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

function bad(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  err.publicMessage = message;
  return err;
}

export const CATEGORIES = {
  bio: 'Exobiologie',
  geo: 'Géologie',
  guardian: 'Site Gardien',
  thargoid: 'Site Thargoïde',
  settlement: 'Base / colonie',
  mining: 'Minage',
  wreck: 'Épave / signal',
  view: 'Point de vue',
  autre: 'Autre',
};
// Catégorie venue d'une requête ou de la base : clé propre seulement (« __proto__ », « toString »… : « autre »)
export const isCategory = (c) => typeof c === 'string' && Object.hasOwn(CATEGORIES, c);

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export { isCaptureId }; // capturesStore.js

/** Id reçu dans l'adresse : refusé (400) s'il n'a pas ce format, avant tout accès au disque. */
export function captureId(id) {
  if (!isCaptureId(id)) throw bad('Capture invalide.');
  return id;
}

const VEHICULES = new Set(['ship', 'srv', 'onfoot', 'fighter']);

/**
 * Repère venu d'ailleurs (partagé par un membre de l'escadron) : seuls les champs connus sont gardés, chacun vérifié.
 * Refus (null) sans système, ou avec des coordonnées hors de la planète.
 */
export function repereImporte(b) {
  if (!b || typeof b !== 'object') return null;
  const txt = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const entre = (v, min, max) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null);
  const system = txt(b.system, 120);
  if (!system) return null;
  const latitude = entre(b.latitude, -90, 90);
  const longitude = entre(b.longitude, -180, 180);
  if ((b.latitude != null && latitude == null) || (b.longitude != null && longitude == null) || (latitude == null) !== (longitude == null)) return null;
  return {
    label: txt(b.label, 120) || 'Repère reçu',
    category: isCategory(b.category) ? b.category : 'autre',
    notes: typeof b.notes === 'string' ? b.notes.slice(0, 2000) : '',
    siteNumber: wholeNumber(b.siteNumber),
    drills: wholeNumber(b.drills),
    system,
    systemAddress: typeof b.systemAddress === 'string' && /^\d{1,20}$/.test(b.systemAddress) ? b.systemAddress : null,
    body: txt(b.body, 120),
    station: txt(b.station, 120),
    latitude,
    longitude,
    altitude: entre(b.altitude, -1e7, 1e9),
    heading: Number.isInteger(b.heading) && b.heading >= 0 && b.heading < 360 ? b.heading : null,
    planetRadius: entre(b.planetRadius, 1, 1e9),
    vehicle: VEHICULES.has(b.vehicle) ? b.vehicle : null,
  };
}

/** Numéro d'EEP ou nombre de foreuses saisi : entier de 1 à 999, sinon aucun. */
export function wholeNumber(v) {
  const n = Number(v);
  return v != null && v !== '' && Number.isInteger(n) && n >= 1 && n <= 999 ? n : null;
}

const DEPLETED_MONTHS = 2;

/** Date à laquelle une veine vidée redevient exploitable. */
export function depletedUntil(depletedAt) {
  if (!depletedAt) return null;
  const d = new Date(depletedAt);
  d.setUTCMonth(d.getUTCMonth() + DEPLETED_MONTHS);
  return d;
}

export default {
  id: 'waypoints',
  name: 'Mes repères',

  async register({ router, prisma, journal, game, broadcast, selfUrl = 'http://127.0.0.1:3001' }) {
    let status = journal.stateData.status || null;
    let last = 0;
    let pending = null;
    let mining = new MiningState();
    let guide = new GuideObservations(); // ce que tes journaux disent des ressources du Rhino (guide.js)
    let siteEcrit = 0; // heure de la cible écrite dans SITE_FILE
    const interesting = new Set([...MINING_EVENTS, ...ACTIVITY_EVENTS]);
    // Tes déplacements et changements d'écran (Status.json) comptent comme des actions : pas de pause en roulant
    const moves = activity(journal);
    moves.onAction((t) => session?.live.mark(t));

    // Recherches en ligne automatiques (online.js) : coupées par défaut ; proposées une fois dans la page Mes repères
    const online = new OnlineSetting(ONLINE_PATH);
    router.get('/online', (req, res) => res.json(online.view()));
    router.put('/online', (req, res) => {
      const auto = req.body?.auto;
      if (typeof auto !== 'boolean') throw bad('Choix attendu : « auto » à true (activer) ou false (couper).');
      const state = online.choose(auto);
      broadcast('waypoints:online', state);
      if (auto) broadcast('waypoints:survey', {}); // les vues ouvertes se rechargent, et vont chercher d'elles-mêmes
      res.json(state);
    });

    let session = null; // { row, live: MiningSession }
    /**
     * Bilan de session, avec le grade de chaque matériau (données de référence partagées, core/reference/refdata.js :
     * à jour après « Mettre à jour les données » ; sans grade tant qu'elles ne sont pas téléchargées).
     */
    function report(summary) {
      const reference = currentReference();
      return {
        ...summary,
        materials: summary.materials.map((m) => ({ ...m, grade: reference?.materials.get(m.key)?.grade || null })),
      };
    }
    let sessionTimer = null;
    // Événements de minage en forme réduite (sessionEvent), pour recalculer une session reprise : seulement ceux des
    // dernières 48 h et des sessions que tu peux encore reprendre (pruneEvents), pas tout l'historique
    let events = [];
    const raffines = new Set(); // minerais déjà raffinés (nom du jeu), proposés à la saisie et dans « Autre… »
    let depuisTri = 0; // événements reçus depuis le dernier tri
    const retenir = (ev) => {
      events.push(sessionEvent(ev));
      if (ev.event === 'MiningRefined') {
        const nom = ev.Type_Localised || ev.Type;
        if (typeof nom === 'string' && nom) raffines.add(nom);
      }
    };
    /**
     * Oublie les événements qui ne servent plus : plus anciens que 48 h, que la session ouverte et que les sessions
     * proposées à la reprise (les 20 dernières, GET /sessions).
     */
    async function pruneEvents(now = Date.now()) {
      const rows = await prisma.miningSession.findMany({ orderBy: { startedAt: 'desc' }, take: SESSIONS_LISTEES + 1, select: { startedAt: true } });
      let cutoff = now - EVENTS_WINDOW_MS;
      for (const r of rows) cutoff = Math.min(cutoff, new Date(r.startedAt).getTime());
      if (session) cutoff = Math.min(cutoff, new Date(session.row.startedAt).getTime());
      events = trimEvents(events, cutoff);
    }

    /** Session recalculée depuis les journaux et tes déplacements : pause d'elle-même quand tu ne fais plus rien. */
    function liveSession(segments) {
      const live = new MiningSession(segments, { idleMs: IDLE_MS });
      for (const ev of events) live.apply(ev);
      for (const t of moves.times) live.mark(t);
      return live;
    }

    /** Remet une ligne de session en mémoire. */
    function openSession(row) {
      session = { row, live: liveSession(JSON.parse(row.segments)) };
    }

    // Aucun, ou fichier illisible (mis de côté, core/atomic.js)
    let chronos = readJsonFile(CHRONO_FILE, { fallback: {}, accept: isPlainObject, label: 'Chrono du minage' });
    // Minerais appris : tapés à la main (fichier), et lus sur les panneaux de cible (fiches des EEP, relues au démarrage)
    const tapes = readJsonFile(APPRIS_FILE, { fallback: [], accept: Array.isArray, label: 'Minerais appris' })
      .filter((n) => typeof n === 'string' && nomMinerai(n) === n);
    const lus = new Set();
    prisma.miningSite.findMany({ select: { deposits: true } })
      .then((rows) => { for (const r of rows) for (const d of depositsOf(r)) lus.add(d.ore); })
      .catch(() => {});
    const appris = () => [...tapes, ...lus];
    /** Nom tapé dans « Autre… » qui n'est encore nulle part : retenu pour la prochaine fois. */
    function apprendreMinerai(label) {
      const n = nomMinerai(label);
      if (!n || n === 'Repère') return;
      const connu = (x) => x.toLowerCase() === n.toLowerCase();
      if (COMMON_ORES.some(connu) || AUTRES_MINERAIS.some(connu) || appris().some(connu)) return;
      tapes.push(n);
      tapes.splice(0, Math.max(0, tapes.length - MAX_APPRIS));
      try {
        writeJsonAtomicSync(APPRIS_FILE, tapes);
      } catch (err) {
        console.error(`Repères : minerai appris non enregistré (${err.message})`);
      }
    }

    /**
     * Chrono : temps des périodes actives finies, début de celle en cours (null en pause) et raison de la pause.
     * Après un ↺, seules les périodes d'après comptent pour le chrono affiché.
     */
    function clockView(live, now = Date.now(), from = null) {
      const all = live.active(now);
      const pause = all.pause;
      const segments = from == null ? all.segments : all.segments
        .filter((s) => s.end == null || s.end > from)
        .map((s) => ({ start: Math.max(s.start, from), end: s.end }));
      const open = segments.at(-1)?.end === null ? segments.at(-1) : null;
      const done = segments.filter((s) => s !== open);
      return {
        runningSince: open ? open.start : null,
        priorSec: Math.round(done.reduce((sum, s) => sum + s.end - s.start, 0) / 1000),
        pause: live.segments.at(-1)?.end != null ? 'manual' : pause, // période close au bouton : pause manuelle
      };
    }

    // Soute du vaisseau, la plus grosse ligne d'abord : nom (traduit par le jeu) et tonnes
    const soute = () => (game.snapshot().cargo || []).map(({ label, count }) => ({ label, count })).sort((x, y) => y.count - x.count);
    const sessionView = () => session && {
      id: session.row.id,
      ...clockView(session.live, Date.now(), chronos[session.row.id] ? Date.parse(chronos[session.row.id]) : null),
      waypointId: session.row.waypointId,
      label: session.row.label,
      siteNumber: session.row.siteNumber,
      body: session.row.body,
      system: session.row.system,
      startedAt: session.row.startedAt,
      ...report(session.live.summary()),
      // shipItems : ce que contient la soute du vaisseau (core/gameState.js), pour la bulle de sa case
      cargo: { ...mining.cargo(), shipCapacity: game.snapshot().loadout?.cargoCapacity ?? null, shipItems: soute() },
      prices: Object.fromEntries(mining.prices),
    };
    const pushSession = () => broadcast('waypoints:session', sessionView());
    const notifySession = () => {
      if (!session || sessionTimer) return;
      sessionTimer = setTimeout(() => {
        sessionTimer = null;
        pushSession();
      }, 500);
    };
    // Les taux évoluent même sans événement : on les rafraîchit tant que la session tourne
    setInterval(() => {
      if (session) pushSession();
    }, 5000);

    /** Après un redémarrage, la session en cours est recalculée depuis les journaux. */
    async function recoverSession() {
      const row = await prisma.miningSession.findFirst({ where: { endedAt: null }, orderBy: { startedAt: 'desc' } });
      if (!row) return;
      openSession(row);
      pushSession();
    }

    journal.addInterest([...MINING_EVENTS, ...ACTIVITY_EVENTS]);
    journal.on('ready', ({ history }) => {
      mining = new MiningState();
      guide = new GuideObservations();
      events = [];
      raffines.clear();
      depuisTri = 0;
      for (const ev of history) {
        if (!interesting.has(ev.event)) continue;
        mining.apply(ev);
        guide.apply(ev);
        retenir(ev);
      }
      mining.target(status?.Destination, status?.BodyName);
      if (!mining.site) {
        const garde = readJsonFile(SITE_FILE, { fallback: null, accept: isPlainObject, label: 'EEP ciblé' });
        if (garde && typeof garde.body === 'string' && Number.isInteger(garde.number) && Number.isFinite(garde.at)) mining.site = garde;
      }
      // Dans la file des changements de session : une tonne lue juste après le démarrage passe après la reprise
      inOrder('Reprise de la session de minage', async () => {
        await recoverSession();
        // Appli relancée en pleine séance de minage (raffinage il y a moins de 15 min) : la session automatique repart
        const last = events.findLast((ev) => ev.event === 'MiningRefined');
        if (!session && last && Date.now() - eventTime(last) < 15 * 60 * 1000) await autoStart(last);
        await pruneEvents();
      });
    });
    // Dernier coin de minage par planète, et retour vers lui
    // Rien encore, ou fichier illisible (mis de côté, core/atomic.js)
    const spots = readJsonFile(SPOTS_FILE, { fallback: {}, accept: isPlainObject, label: 'Dernier coin de minage' });
    // Sauvegarde groupée, 10 s après la tonne : une écriture ratée est dite, jamais un arrêt du serveur (deferredSave.js)
    const spotsSave = deferredSave({ write: () => writeJsonAtomicSync(SPOTS_FILE, spots), delayMs: 10000, label: 'Dernier coin de minage' });
    let autoGuided = null; // repère ouvert d'office dans la boussole, refermée à la tonne suivante

    /** Tonne raffinée en SRV : note l'endroit (sauvegarde groupée). */
    function noteSpot() {
      const h = here();
      if (h.vehicle !== 'srv' || h.latitude == null || !h.body) return;
      const site = mining.site?.body === h.body ? mining.site.number : null;
      spots[h.body] = { body: h.body, latitude: h.latitude, longitude: h.longitude, site, at: new Date().toISOString() };
      spotsSave.soon();
    }

    /** De retour sur une planète minée (atterrissage, SRV sorti) : repère « Fin du dernier minage » et boussole. */
    async function guideBack(pos) {
      const spot = spots[pos.body];
      if (!shouldGuide(spot, pos)) return;
      const h = here();
      const data = {
        label: AUTO_LABEL,
        category: 'mining',
        notes: `Repère automatique : ta dernière tonne raffinée sur cette planète, le ${new Date(spot.at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`,
        siteNumber: spot.site ?? null,
        system: h.system,
        systemAddress: h.systemAddress,
        body: spot.body,
        latitude: spot.latitude,
        longitude: spot.longitude,
        planetRadius: pos.planetRadius,
        vehicle: 'srv',
      };
      // Un seul par planète, déplacé à chaque retour
      const old = await prisma.waypoint.findFirst({ where: { body: spot.body, label: AUTO_LABEL } });
      const w = old ? await prisma.waypoint.update({ where: { id: old.id }, data }) : await prisma.waypoint.create({ data });
      guideTarget = w.id;
      drills.guideOff(); // la boussole ouverte d'office montre ce repère, pas une foreuse
      autoGuided = w.id;
      broadcast('waypoints:update', { id: w.id });
      marksChanged();
      broadcast('waypoints:guide-target', { id: w.id });
      broadcast('waypoints:auto-guide', { id: w.id, show: true });
    }

    // Changements de session venus du journal : l'un après l'autre, dans l'ordre des événements, chacun vérifiant l'état
    // quand vient son tour. Dans une rafale de lignes lues d'un coup, le saut qui ferme une session ne doit pas passer
    // avant la tonne qui l'ouvre (encore en cours d'écriture dans la base) : la session restait sinon ouverte après le
    // saut, et le bilan dépendait de la vitesse de la base (vu par le rejeu du banc de contrôle, mode direct).
    let sessionQueue = Promise.resolve();
    const inOrder = (label, task) => {
      sessionQueue = sessionQueue.then(task).catch((e) => console.error(`${label} :`, e.message));
    };

    journal.on('event', (ev) => {
      if (!interesting.has(ev.event)) return;
      // Retour au minage : la boussole s'ouvre vers la dernière tonne, et se range dès la suivante
      if (ev.event === 'MiningRefined') {
        noteSpot();
        // La session rouverte rejoue le journal, cette tonne comprise (déjà dans events quand l'écriture finit)
        const resumeAt = new Date(Date.parse(ev.timestamp) - 1000);
        inOrder('Reprise de la session de minage', () => (session && session.live.segments.at(-1).end != null ? pauseSession(false, resumeAt) : null));
        if (autoGuided != null) {
          broadcast('waypoints:auto-guide', { id: autoGuided, show: false });
          autoGuided = null;
        }
      }
      if (ev.event === 'Touchdown' || ev.event === 'LaunchSRV') {
        const h = here();
        const pos = ev.event === 'Touchdown' && Number.isFinite(ev.Latitude)
          ? { ...h, body: ev.Body || h.body, latitude: ev.Latitude, longitude: ev.Longitude }
          : h;
        guideBack(pos).catch((e) => console.error('Retour au minage :', e.message));
      }
      retenir(ev);
      if (++depuisTri >= TRI_CHAQUE) {
        depuisTri = 0;
        inOrder('Tri des événements du minage', () => pruneEvents());
      }
      const before = mining.site;
      mining.apply(ev);
      guide.apply(ev);
      if (mining.site !== before) broadcast('waypoints:survey', { system: game.snapshot().system }); // EEP le plus proche connu
      if (session) {
        session.live.apply(ev);
        notifySession();
      }
      // Session automatique : elle démarre à la première tonne raffinée et s'arrête au saut suivant
      if (ev.event === 'MiningRefined') {
        const at = startContext(ev); // où l'on est au moment de cette tonne, pas quand vient le tour de la tâche
        inOrder('Session de minage automatique', () => (session ? null : autoStart(ev, at)));
      }
      if (ev.event === 'FSDJump') {
        const now = new Date(ev.timestamp);
        inOrder('Fin de la session de minage', () => (session ? endSession(now) : null));
      }
    });

    /** Lieu et début d'une session automatique, lus au moment de la tonne qui la lance. */
    function startContext(ev) {
      const h = here();
      return {
        h,
        start: new Date(runStart(events, eventTime(ev)) - 1000),
        site: h.body && mining.site?.body === h.body ? mining.site.number : null,
      };
    }

    let starting = false;
    /**
     * Démarre une session sur l'EEP où l'on est (son repère s'il en a un), en comptant la séance déjà commencée.
     * L'EEP vient de la cible du jeu, sinon du repère de minage le plus proche.
     */
    async function autoStart(ev, at = startContext(ev)) {
      if (session || starting) return;
      starting = true;
      try {
        const { h, start } = at;
        let { site } = at;
        const spots = h.body ? await prisma.waypoint.findMany({
          where: { body: h.body, category: 'mining', unprofitable: false },
          orderBy: { createdAt: 'desc' },
        }) : [];
        let w = site == null ? null : spots.find((x) => x.siteNumber === site);
        // Pas d'EEP ciblé (en SRV, la cible se perd) : celui du repère de minage le plus proche, à moins de 3 km
        if (site == null && h.latitude != null && h.planetRadius) {
          const near = spots
            .filter((x) => x.latitude != null && x.siteNumber != null)
            .map((x) => ({ x, d: surfaceRoute(h, x, h.planetRadius).distance }))
            .sort((a, b) => a.d - b.d)[0];
          if (near && near.d < 3000) {
            w = near.x;
            site = w.siteNumber;
          }
        }
        const place = h.body ? `Planète ${shortBody(h.body, h.system)}` : h.system || 'Minage';
        const row = await prisma.miningSession.create({
          data: {
            waypointId: w?.id ?? null,
            label: w?.label || (site != null ? `${place} · EEP ${site}` : place),
            siteNumber: site,
            body: h.body,
            system: h.system,
            startedAt: start,
            segments: JSON.stringify([{ start }]),
          },
        });
        if (session) return; // une session lancée à la main entre-temps
        openSession(row);
        pushSession();
      } finally {
        starting = false;
      }
    }

    /** Termine la session en cours et enregistre son bilan. */
    async function endSession(now) {
      if (!session) return null;
      const segments = JSON.parse(session.row.segments);
      if (!segments.at(-1).end) segments.at(-1).end = now; // en pause au bouton : la fin reste au début de la pause
      const live = liveSession(segments);
      const row = await prisma.miningSession.update({
        where: { id: session.row.id },
        data: { endedAt: now, segments: JSON.stringify(segments), summary: JSON.stringify(report(live.summary(now.getTime()))) },
      });
      session = null;
      broadcast('waypoints:session', null);
      return row;
    }

    /** Où suis-je, d'après le jeu, en ce moment ? */
    function here() {
      const g = game.snapshot();
      const st = status || {};
      const onSurface = num(st.Latitude) != null && num(st.Longitude) != null;
      return {
        system: g.system || null,
        systemAddress: g.systemAddress != null ? String(g.systemAddress) : null,
        station: g.docked ? g.station || null : null,
        body: st.BodyName || null,
        latitude: onSurface ? st.Latitude : null,
        longitude: onSurface ? st.Longitude : null,
        altitude: onSurface ? num(st.Altitude) : null,
        heading: onSurface ? num(st.Heading) : null,
        planetRadius: num(st.PlanetRadius),
        vehicle: vehicleOf(st),
        grounded: onSurface && onGround(st), // en SRV, à pied ou posé (pas en survol) : l'EEP actif suit (eeps.js)
        at: st.timestamp || null,
      };
    }

    // EEP balayés (eeps.js) : chaque balayage gardé ; l'EEP actif est celui dont le disque te contient. Chaque position
    // du SRV compte, la sauvegarde attend un peu. L'ancien balayage unique (sweep.json) est repris au premier lancement.
    let lib = new EepLibrary();
    const savedEeps = readJsonFile(EEPS_FILE, { fallback: null, accept: isPlainObject, label: 'EEP balayés' });
    const savedSweep = savedEeps ? null : readJsonFile(SWEEP_FILE, { fallback: null, accept: isPlainObject, label: 'Balayage' });
    try {
      lib = EepLibrary.fromJSON(savedEeps, savedSweep);
    } catch {
      // bibliothèque illisible : on repart d'une bibliothèque vide (le fichier reste, jamais effacé)
    }
    // Écrite 10 s après une position du SRV (une écriture ratée dans la minuterie est dite, jamais un arrêt du serveur :
    // deferredSave.js), ou tout de suite depuis une route (l'erreur remonte : réponse 500). Jamais un fichier coupé.
    // Le fichier (plusieurs centaines de Ko, écriture synchrone avec fsync) n'est réécrit que si son contenu a changé
    // depuis la dernière écriture réussie : une position du SRV qui n'apprend rien ne coûte plus une écriture.
    const ecrireEeps = ecritureSiChange((texte) => writeFileAtomicSync(EEPS_FILE, texte));
    const sweepSave = deferredSave({ write: () => ecrireEeps(lib), delayMs: 10000, label: 'EEP balayés' });
    const saveSweep = (now = false) => (now ? sweepSave.now() : sweepSave.soon());
    // EEP ciblé ou donné par le jeu, s'il est récent : une cible ancienne peut être celle d'un autre EEP (numeroEep.js)
    const siteFrais = () => (mining.site && Date.now() - (mining.site.at ?? 0) <= CIBLE_FRAICHE_MS ? mining.site : null);
    /** Un numéro d'EEP saisi sur un repère complète l'EEP balayé qui le contient, s'il n'en avait pas. */
    const apprendreNumero = (w) => {
      if (!Number.isInteger(w?.siteNumber)) return;
      const e = lib.locate({ latitude: w.latitude, longitude: w.longitude, body: w.body });
      if (e && e.numero == null) {
        e.numero = w.siteNumber;
        e.updatedAt = new Date().toISOString();
        saveSweep(true);
        broadcast('waypoints:eeps', { at: Date.now() });
        remplirReperes(e);
      }
    };
    /**
     * Un EEP balayé qui a son numéro le donne aux repères de son disque qui n'en ont pas (posés avant qu'on le
     * connaisse) : une fois par EEP et par démarrage. Un numéro déjà saisi n'est jamais changé.
     */
    const remplis = new Set();
    const remplirReperes = (e) => {
      if (!Number.isInteger(e?.numero) || !e.sweep.center || remplis.has(`${e.id}:${e.numero}`)) return;
      remplis.add(`${e.id}:${e.numero}`);
      const c = e.sweep.center;
      const limite = (e.sweep.radius ?? 1500) + 500;
      prisma.waypoint.findMany({ where: { body: c.body, siteNumber: null } })
        .then(async (rows) => {
          const ids = rows.filter((w) => Number.isFinite(w.latitude) && Number.isFinite(w.longitude) && project(c, w, c.planetRadius).d <= limite).map((w) => w.id);
          if (!ids.length) return;
          await prisma.waypoint.updateMany({ where: { id: { in: ids } }, data: { siteNumber: e.numero } });
          broadcast('waypoints:update', { eep: e.id });
          marksChanged();
        })
        .catch((err) => console.error('Numéros d’EEP des repères :', err.message));
    };
    for (const e of lib.eeps) remplirReperes(e);
    // Repères de la planète du balayage, montrés sur sa carte ; relus à chaque repère créé, modifié ou effacé
    let sweepMarks = [];
    const refreshMarks = async () => {
      const body = lib.sweep.center?.body;
      const rows = body ? await prisma.waypoint.findMany({ where: { body } }) : [];
      sweepMarks = marquer(rows);
      if (lib.sweep.state !== 'empty') broadcast('waypoints:sweep', sweepView());
    };
    const marksChanged = () => refreshMarks().catch((e) => console.error('Repères du balayage :', e.message));
    marksChanged();
    // Vue du balayage de l'EEP actif, avec son nom et son numéro ; eeps : nombre d'EEP balayés gardés
    const sweepView = () => ({
      ...lib.sweep.view(here(), sweepMarks),
      eep: lib.actif && { id: lib.actif.id, nom: lib.actif.nom, numero: lib.actif.numero },
      eeps: lib.eeps.length,
    });

    // Position en direct, au plus une fois par seconde
    const push = () => {
      last = Date.now();
      pending = null;
      broadcast('waypoints:here', here());
      if (lib.sweep.state !== 'empty') broadcast('waypoints:sweep', sweepView());
    };
    journal.on('status', (st) => {
      status = st; // position, planète, EEP ciblé : tout le module en dépend
      // L'EEP où tu es devient l'EEP actif (ou aucun, hors de tout disque balayé) ; sa carte suit
      const suivi = lib.follow(here(), siteFrais());
      if (lib.actif) remplirReperes(lib.actif); // numéro connu (cible, posé) : les repères de l'EEP le reçoivent
      if (suivi) {
        saveSweep();
        marksChanged();
        broadcast('waypoints:sweep', sweepView());
        broadcast('waypoints:eeps', { at: Date.now() });
      }
      if (lib.sweep.state !== 'empty' && lib.sweep.move(here())) saveSweep();
      const before = mining.site;
      mining.target(st.Destination, st.BodyName);
      const site = mining.site;
      // La cible est relue à chaque écriture de Status.json : on ne prévient et n'écrit qu'au changement d'EEP (ou
      // toutes les minutes, pour son heure)
      if (site && (site.body !== before?.body || site.number !== before?.number)) broadcast('waypoints:survey', { system: game.snapshot().system });
      if (site && (site.body !== before?.body || site.number !== before?.number || site.at - siteEcrit > 60_000)) {
        siteEcrit = site.at;
        try { writeJsonAtomicSync(SITE_FILE, site); } catch (err) { console.error('EEP ciblé non gardé :', err.message); }
      }
      if (pending) return;
      const wait = Math.max(0, 1000 - (Date.now() - last));
      pending = setTimeout(push, wait);
    });
    // Foreuses du Rhino : vidanges reconnues seules, poses marquées, cycle mesuré, guidage (drillsApi.js)
    const drills = mountDrills({ router, journal, broadcast, here, sweepCenter: () => lib.sweep.center, file: DRILLS_FILE });

    const view = (w) => ({
      ...w,
      categoryLabel: isCategory(w.category) ? CATEGORIES[w.category] : CATEGORIES.autre,
      depletedUntil: depletedUntil(w.depletedAt),
    });

    // Captures : le cadre de l'overlay envoie l'image (et des versions contrastées pour l'OCR), le texte est lu ici
    // Aucune capture encore, ou liste illisible (mise de côté, core/atomic.js : les images reviennent par le rapprochement)
    let captures = readJsonFile(CAPTURES_INDEX, { fallback: [], accept: Array.isArray, label: 'Liste des captures' });
    // L'id devient un nom de fichier : jamais sans vérification (erreur 400 sinon)
    const imageFile = (id) => `${CAPTURES_DIR}${captureId(id)}.png`;
    /** Dossier et liste d'accord (capturesStore.js) : images orphelines reprises, limite de 30 appliquée à tout. */
    /**
     * Efface une image ; un fichier tenu par un autre programme (visionneuse, antivirus) reste, sans rien faire échouer
     * (ni le démarrage, ni la capture) : le prochain rapprochement le retirera.
     */
    const removeQuietly = (file) => {
      try {
        fs.rmSync(file, { force: true, maxRetries: 2, retryDelay: 50 });
      } catch (err) {
        console.warn(`Captures : ${path.basename(file)} non effacée pour l'instant (${err.code || err.message}) ; elle le sera au prochain rapprochement.`);
      }
    };
    const reconcileCaptures = () => {
      let names;
      try {
        names = fs.readdirSync(CAPTURES_DIR);
      } catch {
        return; // pas encore de dossier
      }
      const r = reconcile(captures, names, MAX_CAPTURES);
      if (!r.changed) return;
      try {
        writeJsonAtomicSync(CAPTURES_INDEX, r.list);
      } catch (err) {
        console.error(`Captures : liste non rapprochée (${err.message})`);
        return;
      }
      captures = r.list;
      for (const name of r.remove) removeQuietly(path.join(CAPTURES_DIR, name));
    };
    try {
      reconcileCaptures();
    } catch (err) {
      console.error(`Captures : rapprochement impossible au démarrage (${err.message}) ; il sera refait à la prochaine capture.`);
    }

    router.post('/captures', wrap(async (req, res) => {
      const b = req.body || {};
      if (typeof b.image !== 'string' || !b.image) throw bad('Image manquante.');
      // Photo du cadre et versions contrastées pour l'OCR : de vrais PNG, reconnus à leur contenu (un texte ou un SVG
      // n'est jamais enregistré en .png, ni servi comme une image)
      const shot = decodeBase64Image(b.image, ['png']);
      if (shot.error) throw bad(shot.error);
      const image = shot.buf;
      const variants = [];
      for (const x of Array.isArray(b.ocr) ? b.ocr : []) {
        const v = decodeBase64Image(x, ['png'], { maxPixels: MAX_PIXELS });
        if (v.error) throw bad(`Version pour la lecture du texte : ${v.error}`);
        variants.push(v.buf);
      }
      const h = here();
      const id = String(Date.now());
      // L'image reste en mémoire pendant la lecture du texte et l'accès à la base : rien n'est écrit si l'une échoue
      const capture = {
        id,
        at: new Date().toISOString(),
        system: h.system,
        body: h.body,
        site: h.body && mining.site?.body === h.body ? mining.site.number : null, // EEP ciblé ou le plus proche, si le jeu l'a dit
        width: Number(b.width) || null,
        height: Number(b.height) || null,
        lines: [],
        error: null,
      };
      try {
        const best = await readBest([...variants, image]);
        capture.lines = best.lines;
        capture.language = best.language;
      } catch (e) {
        capture.error = e.message;
      }
      // Minerais du panneau, rangés dans la fiche de l'EEP ciblé (les foreuses déjà notées sont gardées)
      capture.ores = oresFromLines(capture.lines, { known: await oreNames(), system: h.system });
      if (capture.ores.length && capture.site != null && h.system) {
        const where = { body_number: { body: h.body, number: capture.site } };
        const row = await prisma.miningSite.findUnique({ where });
        const deposits = JSON.stringify(mergeOres(row ? depositsOf(row) : [], capture.ores));
        for (const o of capture.ores) lus.add(o);
        await prisma.miningSite.upsert({
          where,
          create: { system: h.system, systemAddress: h.systemAddress, body: h.body, number: capture.site, deposits },
          update: { deposits },
        });
        capture.applied = true;
        broadcast('waypoints:survey', { system: h.system });
      }
      // Image, puis liste : la liste en mémoire ne change qu'une fois les deux écrites. Liste refusée : image retirée.
      const next = [capture, ...captures.filter((c) => c.id !== id)];
      const dropped = next.splice(MAX_CAPTURES);
      try {
        writeFileAtomicSync(imageFile(id), image);
        try {
          writeJsonAtomicSync(CAPTURES_INDEX, next);
        } catch (err) {
          fs.rmSync(imageFile(id), { force: true });
          throw err;
        }
      } catch (err) {
        // Dossier ou liste verrouillés (antivirus, sauvegarde), en lecture seule, disque plein : refus expliqué, rien gardé
        if (['EPERM', 'EBUSY', 'EACCES', 'ENOSPC', 'EROFS'].includes(err.code)) {
          throw bad(`Capture non enregistrée : le dossier des captures est verrouillé, en lecture seule ou plein (${err.code}). Réessaie dans un instant.`, 409);
        }
        throw err;
      }
      captures = next;
      for (const old of dropped) if (isCaptureId(old.id)) removeQuietly(imageFile(old.id));
      try {
        reconcileCaptures();
      } catch (err) {
        console.error(`Captures : rapprochement impossible (${err.message}) ; la capture est gardée.`);
      }
      broadcast('waypoints:capture', capture);
      res.status(201).json(capture);
    }));
    router.get('/captures', (req, res) => res.json(captures));
    router.get('/captures/:id.png', wrap(async (req, res) => {
      const id = captureId(req.params.id); // « ../… » : erreur 400, rien n'est lu
      const c = captures.find((x) => x.id === id);
      if (!c) return res.status(404).end();
      // Contenu envoyé par l'overlay : jamais interprété autrement qu'en image, aucun script
      res.set({ 'Content-Security-Policy': 'sandbox', 'X-Content-Type-Options': 'nosniff' }).sendFile(imageFile(c.id));
    }));
    router.delete('/captures/:id', wrap(async (req, res) => {
      const id = captureId(req.params.id); // vérifié avant d'effacer quoi que ce soit
      // Image d'abord : coupé entre les deux, le rapprochement retire l'entrée sans image (jamais l'inverse)
      fs.rmSync(imageFile(id), { force: true });
      const next = captures.filter((x) => x.id !== id);
      writeJsonAtomicSync(CAPTURES_INDEX, next);
      captures = next;
      broadcast('waypoints:capture', null);
      res.json({ ok: true });
    }));

    router.get('/categories', (req, res) => res.json(CATEGORIES));

    // Balayage de l'EEP : centre, puis bord, depuis ta position ; DELETE recommence
    const sweepChanged = (res) => {
      saveSweep(true);
      marksChanged();
      const v = sweepView();
      broadcast('waypoints:sweep', v);
      broadcast('waypoints:eeps', { at: Date.now() });
      res.json(v);
    };
    router.get('/sweep', (req, res) => res.json(sweepView()));
    // Où vendre les minerais dans le système du balayage (ou celui où tu es) : bulle de la carte
    // Prix : Ardent, ou tes relevés s'ils sont plus récents (archive du module Routes, par son API, et Market.json)
    const markets = new SystemMarkets();
    async function myMarkets(system) {
      const mine = [];
      try {
        const res = await localFetch(`${selfUrl}/api/modules/routes/markets?system=${encodeURIComponent(system)}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) mine.push(...(await res.json()));
      } catch { /* module Routes absent : Market.json seul */ }
      const live = liveSnapshot(journal.stateData?.market, system);
      if (live) mine.push(live);
      return mine;
    }
    // Minerais du Rhino à chercher en priorité : meilleure vente du moment (demande ≥ 1 000 t), les 10 premiers
    const orePrices = new OrePrices(ORE_SYMBOLS);
    // Guide des ressources : tes observations (type de monde et prix de vente par ressource), lues dans tes journaux.
    // Rien ne sort du PC, rien n'est demandé à un site.
    router.get('/guide', (req, res) => res.json({ ressources: guide.summary(), at: new Date().toISOString() }));
    router.get('/sweep/top-ores', wrap(async (req, res) => {
      const list = await orePrices.ranking();
      res.json({ minDemand: MIN_DEMAND, ores: list.slice(0, 10), at: new Date().toISOString() });
    }));
    // Ardent n'est interrogé par cette lecture que si tu as activé les recherches automatiques ; sinon tes relevés
    // seuls, et une réponse d'Ardent déjà gardée (15 min). Ton clic passe par POST /sweep/markets/load, une écriture :
    // une lecture (balise <img> d'une page, lien ouvert dans le navigateur, ?online=1 d'une ancienne version) ne
    // l'imite jamais.
    router.get('/sweep/markets', wrap(async (req, res) => {
      const system = lib.sweep.center?.system || here().system;
      if (!system) return res.json({ system: null, ores: {}, ranking: [], error: null, ardent: { auto: online.auto, loaded: false, at: null } });
      const out = await markets.forSystem(system, await myMarkets(system), { online: online.auto });
      return res.json({ system, ...out, ardent: { auto: online.auto, ...out.ardent } });
    }));
    /**
     * Clic sur « Charger les prix d'Ardent » : la seule façon d'interroger Ardent quand les recherches automatiques sont
     * coupées. Écriture (en-tête X-Elite-Compagnon exigé par la garde) ; une demande à la fois, 30 s au moins entre
     * deux pour un même système (sinon 429, markets.js).
     */
    router.post('/sweep/markets/load', wrap(async (req, res) => {
      const system = lib.sweep.center?.system || here().system;
      if (!system) throw bad('Aucun système : ni balayage en cours, ni position connue dans le journal.', 409);
      const out = await markets.forSystem(system, await myMarkets(system), { online: true, force: true });
      if (out.ardent.loaded) broadcast('waypoints:markets', { system }); // la bulle de la carte reprend la réponse gardée
      res.json({ system, ...out, ardent: { auto: online.auto, ...out.ardent } });
    }));
    // Centre : dans un EEP déjà balayé, son balayage repart de là ; ailleurs, un nouvel EEP (numéro du jeu s'il est connu)
    router.post('/sweep/center', wrap(async (req, res) => {
      lib.marquerCentre(here(), siteFrais());
      sweepChanged(res);
    }));
    router.post('/sweep/edge', wrap(async (req, res) => {
      lib.sweep.setEdge(here());
      if (lib.actif) lib.actif.updatedAt = new Date().toISOString();
      sweepChanged(res);
    }));
    // ↺ de la fenêtre : efface l'EEP actif de la bibliothèque (ses repères restent)
    router.delete('/sweep', (req, res) => {
      if (lib.actif) lib.effacer(lib.actif.id);
      sweepChanged(res);
    });

    // --- EEP balayés : liste, carte, nom, effacement, partage ---
    const reperesDe = async (body) => {
      if (!body) return [];
      const rows = await prisma.waypoint.findMany({ where: { body } });
      return marquer(rows);
    };
    const eepId = (req) => {
      const id = String(req.params.id || '');
      if (!/^[0-9a-f-]{36}$/.test(id)) throw bad('EEP introuvable.', 404);
      return id;
    };
    router.get('/eeps', wrap(async (req, res) => {
      const parPlanete = new Map();
      const out = [];
      for (const e of lib.eeps) {
        const body = e.sweep.center?.body;
        if (!parPlanete.has(body)) parPlanete.set(body, await reperesDe(body));
        out.push(lib.resume(e, parPlanete.get(body)));
      }
      out.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      res.json({ eeps: out, actif: lib.actifId });
    }));
    /** Carte d'un EEP (vue du balayage, sans ta position), pour l'afficher depuis la liste. */
    router.get('/eeps/:id/carte', wrap(async (req, res) => {
      const e = lib.get(eepId(req));
      const marks = await reperesDe(e.sweep.center?.body);
      res.json({ ...lib.resume(e, marks), vue: e.sweep.view(null, marks) });
    }));
    router.patch('/eeps/:id', wrap(async (req, res) => {
      const e = lib.renommer(eepId(req), req.body?.nom);
      saveSweep(true);
      broadcast('waypoints:eeps', { at: Date.now() });
      res.json(lib.resume(e, await reperesDe(e.sweep.center?.body)));
    }));
    router.delete('/eeps/:id', wrap(async (req, res) => {
      const actif = lib.actifId;
      lib.effacer(eepId(req));
      saveSweep(true);
      if (actif !== lib.actifId) broadcast('waypoints:sweep', sweepView());
      broadcast('waypoints:eeps', { at: Date.now() });
      res.json({ ok: true });
    }));
    /** Carte à partager (fichier .json) : l'EEP et les repères de minerais de son disque, rien du joueur. */
    router.get('/eeps/:id/export', wrap(async (req, res) => {
      const e = lib.get(eepId(req));
      res.json(lib.exporter(e, await reperesDe(e.sweep.center?.body)));
    }));
    /**
     * Carte reçue : un EEP de plus dans la bibliothèque, et ses repères ajoutés (sauf là où tu en as déjà un à moins
     * de 30 m). Écriture (en-tête X-Elite-Compagnon exigé par la garde).
     */
    router.post('/eeps/import', wrap(async (req, res) => {
      const { eep, reperes } = lib.importer(req.body);
      const c = eep.sweep.center;
      const existants = await reperesDe(c.body);
      const nom = eep.nom || 'EEP reçu';
      const nouveaux = reperes
        .filter((r) => !existants.some((w) => Number.isFinite(w.latitude) && project(r, w, c.planetRadius).d < 30))
        .map((r) => ({
          label: `${r.ore || 'Repère'} · ${nom}`.slice(0, 120), category: 'mining', notes: 'Reçu avec une carte d’EEP partagée.',
          siteNumber: eep.numero, drills: r.drills, unprofitable: r.unprofitable, depletedAt: r.depleted ? new Date() : null,
          system: c.system, body: c.body, latitude: r.latitude, longitude: r.longitude, planetRadius: c.planetRadius, vehicle: 'srv',
        }));
      // Tout ou rien : les repères sont créés d'un bloc, et l'EEP retiré si la base refuse
      await lib.ajouterAvec(eep, async () => {
        if (nouveaux.length) await prisma.$transaction(nouveaux.map((data) => prisma.waypoint.create({ data })));
      });
      const ajoutes = nouveaux.length;
      saveSweep(true);
      lib.follow(here(), siteFrais());
      broadcast('waypoints:update', { import: true });
      broadcast('waypoints:eeps', { at: Date.now() });
      marksChanged();
      res.status(201).json({ ...lib.resume(eep, await reperesDe(c.body)), reperesAjoutes: ajoutes });
    }));
    router.get('/here', (req, res) => res.json(here()));

    // Repère suivi par la fenêtre de guidage de l'overlay : choisi depuis la liste des repères ou la page
    let guideTarget = null;
    router.get('/guide-target', (req, res) => res.json({ id: guideTarget }));
    router.put('/guide-target', (req, res) => {
      guideTarget = Number.isInteger(Number(req.body?.id)) && req.body?.id != null ? Number(req.body.id) : null;
      if (guideTarget != null) drills.guideOff(); // un repère choisi : la boussole ne suit plus les foreuses
      broadcast('waypoints:guide-target', { id: guideTarget });
      res.json({ id: guideTarget });
    });

    router.get('/waypoints', wrap(async (req, res) => {
      const rows = await prisma.waypoint.findMany({ orderBy: { createdAt: 'desc' } });
      res.json(rows.map(view));
    }));

    /** « Marquer ici » : la position est prise au moment du clic, côté serveur. */
    router.post('/waypoints', wrap(async (req, res) => {
      const h = here();
      if (!h.system) throw bad('Position inconnue : lance le jeu (ou attends ton premier saut).');
      const b = req.body || {};
      const hint = mining.suggestion(h.body);
      const category = isCategory(b.category) ? b.category : hint?.category || 'autre';
      const notes = String(b.notes || hint?.notes || '').slice(0, 2000);
      const when = new Date().toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const label = String(b.label || '').trim().slice(0, 120) || `${h.body || h.station || h.system} · ${when}`;
      const { at, grounded, ...pos } = h;
      // Numéro d'EEP : saisi, sinon déduit de la position (EEP balayé, repère numéroté proche), sinon l'EEP ciblé récent
      const reperes = h.body ? await prisma.waypoint.findMany({ where: { body: h.body, siteNumber: { not: null } } }) : [];
      const deduit = numeroEepIci({ here: h, eep: lib.locate(h), reperes, site: siteFrais() });
      const w = await prisma.waypoint.create({ data: { ...pos, label, category, notes, siteNumber: wholeNumber(b.siteNumber) ?? deduit?.numero ?? null } });
      apprendreNumero(w);
      mining.refined.clear(); // le prochain repère ne compte que ce qui a été raffiné après celui-ci
      broadcast('waypoints:update', { id: w.id });
      marksChanged();
      res.status(201).json(view(w));
    }));

    /** Enregistrer un repère reçu (onglet « Escadron ») : ses coordonnées sont celles données, pas ta position. */
    router.post('/waypoints/importer', wrap(async (req, res) => {
      const data = repereImporte(req.body);
      if (!data) throw bad('Repère reçu illisible : il lui manque son système, ou ses coordonnées sont invalides.');
      const w = await prisma.waypoint.create({ data });
      apprendreNumero(w);
      broadcast('waypoints:update', { id: w.id });
      marksChanged();
      res.status(201).json(view(w));
    }));

    /**
     * Repère de la fenêtre de balayage (📍, Alt+Maj+R) : d'abord un brouillon, rien n'est enregistré avant ✓ OK. La
     * position est prise au clic. Un repère déjà posé à moins de 150 m est repris (mêmes champs, mis à jour à ✓ OK)
     * au lieu d'en créer un deuxième au même endroit. Un seul brouillon à la fois : le suivant remplace le précédent.
     */
    let brouillon = null;
    const vueBrouillon = (d) => ({
      id: d.id, label: d.label, drills: d.drills, siteNumber: d.siteNumber, source: d.source, proche: d.proche, autres: autresMinerais(),
      eep: d.eep || [], // minerais lus sur le panneau de cible de cet EEP (📷), proposés en premier
    });
    router.post('/waypoints/brouillon', wrap(async (req, res) => {
      const h = here();
      if (!h.body || !Number.isFinite(h.latitude) || !Number.isFinite(h.longitude)) throw bad('Pose-toi sur la planète pour poser un repère.');
      const { at, grounded, ...pos } = h;
      const surPlanete = await prisma.waypoint.findMany({ where: { body: h.body } });
      const deduit = numeroEepIci({ here: h, eep: lib.locate(h), reperes: surPlanete, site: siteFrais() });
      const existant = repereIci(h, surPlanete);
      const raffine = [...mining.refined].sort((x, y) => y[1] - x[1])[0]?.[0] || null;
      const w = existant?.w;
      brouillon = {
        id: randomUUID(),
        pos,
        label: w ? w.label : raffine || 'Repère',
        drills: w?.drills ?? null,
        siteNumber: w?.siteNumber ?? deduit?.numero ?? null,
        source: w?.siteNumber != null ? 'repere' : deduit?.source ?? null,
        proche: w ? { id: w.id, label: w.label, distance: Math.round(existant.d) } : null,
        eep: [],
      };
      if (brouillon.siteNumber != null) {
        const site = await prisma.miningSite.findUnique({ where: { body_number: { body: h.body, number: brouillon.siteNumber } } }).catch(() => null);
        brouillon.eep = site ? depositsOf(site).map((x) => x.ore) : [];
      }
      const v = vueBrouillon(brouillon);
      broadcast('waypoints:pose', v); // le tiroir de la fenêtre de balayage s'ouvre
      res.json(v);
    }));

    router.post('/waypoints/brouillon/valider', wrap(async (req, res) => {
      const b = req.body || {};
      if (!brouillon || typeof b.id !== 'string' || b.id !== brouillon.id) throw bad('Ce repère a déjà été enregistré ou remplacé : pose-le de nouveau.', 404);
      const d = brouillon;
      brouillon = null;
      const data = {
        label: String(b.label ?? d.label).trim().slice(0, 120) || 'Repère',
        category: 'mining',
        drills: b.drills !== undefined ? wholeNumber(b.drills) : d.drills,
        siteNumber: b.siteNumber !== undefined ? wholeNumber(b.siteNumber) : d.siteNumber,
      };
      // Nom choisi dans le tiroir (pas celui du repère repris tel quel : « iridim », une faute, ne s'apprend pas)
      if (typeof b.label === 'string' && b.label !== d.label) apprendreMinerai(data.label);
      let w = d.proche ? await prisma.waypoint.update({ where: { id: d.proche.id }, data }).catch(() => null) : null;
      if (!w) {
        w = await prisma.waypoint.create({ data: { ...d.pos, ...data, notes: '' } });
        mining.refined.clear(); // le prochain repère ne compte que ce qui a été raffiné après celui-ci
      }
      apprendreNumero(w);
      broadcast('waypoints:update', { id: w.id });
      marksChanged();
      res.json(view(w));
    }));

    router.patch('/waypoints/:id', wrap(async (req, res) => {
      const id = requireRowId(req.params.id, 'Repère introuvable.');
      const b = req.body || {};
      const data = {};
      if (b.label !== undefined) data.label = String(b.label).trim().slice(0, 120) || 'Repère';
      if (b.category !== undefined) data.category = isCategory(b.category) ? b.category : 'autre';
      if (b.notes !== undefined) data.notes = String(b.notes).slice(0, 2000);
      if (b.siteNumber !== undefined) data.siteNumber = wholeNumber(b.siteNumber);
      if (b.drills !== undefined) data.drills = wholeNumber(b.drills);
      if (b.depleted !== undefined) data.depletedAt = b.depleted ? new Date() : null;
      if (b.unprofitable !== undefined) data.unprofitable = Boolean(b.unprofitable);
      const w = await prisma.waypoint.update({ where: { id }, data }).catch(() => null);
      if (!w) throw bad('Repère introuvable.', 404);
      apprendreNumero(w);
      broadcast('waypoints:update', { id });
      marksChanged();
      res.json(view(w));
    }));

    router.delete('/waypoints/:id', wrap(async (req, res) => {
      const id = requireRowId(req.params.id, 'Repère introuvable.');
      await prisma.waypoint.deleteMany({ where: { id } });
      broadcast('waypoints:update', { id });
      marksChanged();
      res.json({ ok: true });
    }));

    router.get('/session', (req, res) => res.json(sessionView()));

    /** Pause au bouton (on) : la période en cours se ferme ; reprise : une nouvelle commence. */
    async function pauseSession(on, at = new Date()) {
      if (!session) throw bad('Aucune session de minage en cours.');
      const segments = JSON.parse(session.row.segments);
      const last = segments.at(-1);
      if (on && !last.end) last.end = at;
      else if (!on && last.end) segments.push({ start: at });
      else {
        // Reprise demandée en pause d'inactivité : le clic est une action
        if (!on) session.live.mark(at.getTime());
        pushSession();
        return;
      }
      const row = await prisma.miningSession.update({ where: { id: session.row.id }, data: { segments: JSON.stringify(segments) } });
      openSession(row);
      pushSession();
    }
    router.post('/session/reset-time', (req, res) => {
      if (!session) throw bad('Aucune session de minage en cours.');
      chronos = { [session.row.id]: new Date().toISOString() }; // seule la session en cours compte
      writeJsonAtomicSync(CHRONO_FILE, chronos); // jamais un fichier coupé (core/atomic.js)
      pushSession();
      res.json(sessionView());
    });
    router.post('/session/pause', wrap(async (req, res) => {
      await pauseSession(Boolean(req.body?.on));
      res.json(sessionView());
    }));

    /** Sessions terminées, la plus récente d'abord. */
    router.get('/sessions', wrap(async (req, res) => {
      const rows = await prisma.miningSession.findMany({ where: { endedAt: { not: null } }, orderBy: { startedAt: 'desc' }, take: SESSIONS_LISTEES });
      res.json(rows.map((r) => ({ ...r, summary: JSON.parse(r.summary || '{}') })));
    }));

    router.post('/waypoints/:id/session', wrap(async (req, res) => {
      if (session) throw bad(`Une session tourne déjà sur « ${session.row.label} » : termine-la d'abord.`, 409);
      const w = await prisma.waypoint.findUnique({ where: { id: requireRowId(req.params.id, 'Repère introuvable.') } });
      if (!w) throw bad('Repère introuvable.', 404);
      const now = new Date();
      const row = await prisma.miningSession.create({
        data: {
          waypointId: w.id, label: w.label, siteNumber: w.siteNumber, body: w.body, system: w.system,
          startedAt: now, segments: JSON.stringify([{ start: now }]),
        },
      });
      openSession(row);
      pushSession();
      res.status(201).json(sessionView());
    }));

    /** Remise à zéro : compteurs et chrono repartent de maintenant. */
    router.post('/session/reset', wrap(async (req, res) => {
      if (!session) throw bad('Aucune session en cours.', 404);
      const now = new Date();
      const row = await prisma.miningSession.update({
        where: { id: session.row.id },
        data: { startedAt: now, segments: JSON.stringify([{ start: now }]) },
      });
      openSession(row);
      pushSession();
      res.json(sessionView());
    }));

    router.post('/session/end', wrap(async (req, res) => {
      if (!session) throw bad('Aucune session en cours.', 404);
      res.json(await endSession(new Date()));
    }));

    /** Reprise d'une session terminée : les compteurs continuent, la pause ne compte pas. */
    router.post('/sessions/:id/resume', wrap(async (req, res) => {
      if (session) throw bad(`Une session tourne déjà sur « ${session.row.label} » : termine-la d'abord.`, 409);
      const old = await prisma.miningSession.findUnique({ where: { id: requireRowId(req.params.id, 'Session introuvable.') } });
      if (!old) throw bad('Session introuvable.', 404);
      const segments = [...JSON.parse(old.segments), { start: new Date() }];
      const row = await prisma.miningSession.update({
        where: { id: old.id },
        data: { endedAt: null, segments: JSON.stringify(segments) },
      });
      openSession(row);
      pushSession();
      res.json(sessionView());
    }));

    // Prospection : planètes à EEP du système (Spansh, gardé une heure par système, 200 systèmes au plus) et ce qu'on y
    // a vu. Spansh n'est interrogé que si tu as activé les recherches automatiques, ou sur ton clic (POST /survey/load).
    const known = new KnownBodies();
    /** SystemAddress reçu (adresse ou corps) : absent → null ; présent mais invalide → 400, rien n'est demandé ni gardé. */
    const addressParam = (v) => {
      if (v == null || v === '') return null;
      const address = systemAddressOf(v);
      if (!address) throw bad('SystemAddress invalide : un entier du jeu est attendu.');
      return address;
    };

    /** Autres minerais (« Autre… » du tiroir repère, nom exact d'un repère) : ceux du jeu et ceux raffinés cette session. */
    /** Repères de la carte : automatique ou non, et leur minerai. */
    function marquer(rows) {
      const autres = autresMinerais();
      return rows.map((w) => ({ ...w, auto: w.label === AUTO_LABEL, ore: oreOf(w, COMMON_ORES, autres) }));
    }

    function autresMinerais() {
      return listeAutres(raffines, appris());
    }

    /** Minerais proposés à la saisie : ceux déjà raffinés ou notés, puis les courants. */
    async function oreNames() {
      const names = new Set(raffines);
      for (const s of await prisma.miningSite.findMany({ select: { deposits: true } })) for (const d of depositsOf(s)) names.add(d.ore);
      for (const n of COMMON_ORES) names.add(n);
      return [...names].filter((n) => !n.startsWith('$'));
    }

    /**
     * Vue d'un système. `click` : le joueur a demandé Spansh (bouton « Charger depuis Spansh ») ; sans lui, Spansh n'est
     * interrogé que si les recherches automatiques sont activées. `spansh` dit ce qui est connu et si le bouton sert.
     */
    async function survey(system, systemAddress, { click = false } = {}) {
      const where = { system };
      const [sites, bodies, waypoints, spansh, ores] = await Promise.all([
        prisma.miningSite.findMany({ where }),
        prisma.miningBody.findMany({ where }),
        prisma.waypoint.findMany({ where }),
        known.get(systemAddress, { online: click || online.auto, force: click }),
        oreNames(),
      ]);
      const h = here();
      const inside = h.system === system;
      return {
        ...buildSurvey({ system, systemAddress, known: spansh.bodies, scanned: mining.sites, classes: mining.classes, sites, bodies, waypoints: waypoints.map(view), here: inside ? h : null }),
        current: inside ? { body: h.body, site: mining.site?.body === h.body ? mining.site.number : null } : null,
        ores,
        spansh: { auto: online.auto, available: Boolean(systemAddress), loaded: spansh.loaded, at: spansh.at, error: spansh.error },
      };
    }

    // Lecture : Spansh n'est interrogé que si les recherches automatiques sont activées. Elle ne vaut jamais un clic, quel
    // que soit son paramètre (?online=1 d'une ancienne version compris) : une balise <img> d'une page, ou un lien ouvert
    // dans le navigateur, lisaient cette adresse et faisaient partir le système où tu es vers Spansh.
    router.get('/survey', wrap(async (req, res) => {
      const h = here();
      const system = String(req.query.system || h.system || '');
      if (!system) return res.json(null);
      const systemAddress = req.query.system ? addressParam(req.query.systemAddress) : systemAddressOf(h.systemAddress);
      res.json(await survey(system, systemAddress));
    }));

    /**
     * Clic sur « Charger depuis Spansh » (corps : rien pour le système où tu es, ou { system, systemAddress } pour un
     * système choisi) : la seule façon d'interroger Spansh quand les recherches automatiques sont coupées. Écriture
     * (en-tête X-Elite-Compagnon exigé par la garde) ; une demande à la fois, 30 s au moins entre deux pour un même
     * système (sinon 429, survey.js). Adresse piégée : 400, rien demandé.
     */
    router.post('/survey/load', wrap(async (req, res) => {
      const b = isPlainObject(req.body) ? req.body : {};
      const asked = Object.hasOwn(b, 'system') ? b.system : null;
      if (asked != null && (typeof asked !== 'string' || asked.length > 200)) throw bad('Système invalide : un nom de système est attendu.');
      const h = here();
      const chosen = asked && asked.trim() ? asked : null;
      const system = chosen || h.system || '';
      if (!system) throw bad('Aucun système : ta position n’est pas encore connue dans le journal.', 409);
      const systemAddress = chosen ? addressParam(Object.hasOwn(b, 'systemAddress') ? b.systemAddress : null) : systemAddressOf(h.systemAddress);
      if (!systemAddress) throw bad('Adresse du système pas encore connue (elle vient du journal) : rien à demander à Spansh.', 409);
      const view = await survey(system, systemAddress, { click: true });
      if (view.spansh.loaded) broadcast('waypoints:survey', { system }); // les autres fenêtres reprennent la réponse gardée
      res.json(view);
    }));

    /** Systèmes déjà prospectés, avec leurs planètes rentables. */
    router.get('/survey/systems', wrap(async (req, res) => {
      const [sites, bodies, waypoints] = await Promise.all([
        prisma.miningSite.findMany(),
        prisma.miningBody.findMany(),
        prisma.waypoint.findMany({ where: { category: 'mining' } }),
      ]);
      const names = [...new Set([...sites, ...bodies, ...waypoints].map((x) => x.system).filter(Boolean))];
      const list = names.map((system) => {
        const pick = (rows) => rows.filter((r) => r.system === system);
        const s = buildSurvey({ system, sites: pick(sites), bodies: pick(bodies), waypoints: pick(waypoints).map(view) });
        // Adresse déjà en base : jamais renvoyée si elle n'est pas un vrai SystemAddress (valeur piégée d'une version d'avant)
        const addr = [...pick(sites), ...pick(bodies), ...pick(waypoints)].map((r) => systemAddressOf(r.systemAddress)).find(Boolean) || null;
        return { system, systemAddress: addr, ...s.totals, ores: [...new Set(s.planets.flatMap((p) => p.ores.filter((o) => o.good.length).map((o) => o.ore)))] };
      });
      res.json(list.sort((a, b) => b.good - a.good || a.system.localeCompare(b.system, 'fr')));
    }));

    /**
     * Chercher un minerai : les endroits connus où en trouver, tous systèmes confondus (chercher.js). Lecture de la base
     * seulement : aucun site n'est interrogé.
     */
    router.get('/chercher', wrap(async (req, res) => {
      const [sites, bodies, waypoints] = await Promise.all([
        prisma.miningSite.findMany(),
        prisma.miningBody.findMany(),
        prisma.waypoint.findMany({ where: { category: 'mining' } }),
      ]);
      const vus = waypoints.map(view);
      const noms = [...new Set([...sites, ...bodies, ...waypoints].map((x) => x.system).filter(Boolean))];
      const releves = noms.map((system) => {
        const de = (rows) => rows.filter((r) => r.system === system);
        const adresse = [...de(sites), ...de(bodies), ...de(waypoints)].map((r) => systemAddressOf(r.systemAddress)).find(Boolean) || null;
        return buildSurvey({ system, systemAddress: adresse, classes: mining.classes, sites: de(sites), bodies: de(bodies), waypoints: de(vus) });
      });
      // Nom tapé sur un repère → minerai connu (fautes comprises), sinon rien : oreOf, comme pour les couleurs de la carte
      const autres = [...AUTRES_MINERAIS, ...appris()];
      const minerai = (nom) => oreOf({ label: nom, notes: '' }, COMMON_ORES, autres);
      res.json({ minerais: lieuxParMinerai(releves, new Map(vus.map((w) => [w.id, w])), minerai), at: new Date().toISOString() });
    }));

    /** Un emplacement : « rien d'intéressant », note de 1 à 10, minerais, notes. Rien de noté : la ligne disparaît. */
    router.put('/survey/site', wrap(async (req, res) => {
      const b = req.body || {};
      const body = String(b.body || '').trim();
      const number = wholeNumber(b.number);
      if (!body || number == null || !b.system) throw bad('Planète, système et numéro d\'EEP requis.');
      const data = {
        system: String(b.system),
        systemAddress: addressParam(b.systemAddress),
        bad: Boolean(b.bad),
        rating: cleanRating(b.rating),
        deposits: JSON.stringify(cleanDeposits(b.deposits)),
        notes: String(b.notes || '').slice(0, 1000),
      };
      if (!data.bad && data.rating == null && data.deposits === '[]' && !data.notes) {
        await prisma.miningSite.deleteMany({ where: { body, number } });
      } else {
        await prisma.miningSite.upsert({ where: { body_number: { body, number } }, create: { ...data, body, number }, update: data });
      }
      broadcast('waypoints:survey', { system: data.system });
      res.json(await survey(data.system, data.systemAddress));
    }));

    /** Une planète : « planète out » et notes. */
    router.put('/survey/body', wrap(async (req, res) => {
      const b = req.body || {};
      const body = String(b.body || '').trim();
      if (!body || !b.system) throw bad('Planète et système requis.');
      const data = { system: String(b.system), systemAddress: addressParam(b.systemAddress), out: Boolean(b.out), notes: String(b.notes || '').slice(0, 1000) };
      if (!data.out && !data.notes) await prisma.miningBody.deleteMany({ where: { body } });
      else await prisma.miningBody.upsert({ where: { body }, create: { ...data, body }, update: data });
      broadcast('waypoints:survey', { system: data.system });
      res.json(await survey(data.system, data.systemAddress));
    }));

    /** Guidage vers un repère : distance et cap, si l'on est sur la même planète. */
    router.get('/waypoints/:id/guide', wrap(async (req, res) => {
      const w = await prisma.waypoint.findUnique({ where: { id: requireRowId(req.params.id, 'Repère introuvable.') } });
      if (!w) throw bad('Repère introuvable.', 404);
      res.json(guide(w, here()));
    }));
  },
};

/** Distance et direction vers un repère depuis la position actuelle. */
export function guide(w, h) {
  if (w.latitude == null || w.body == null) return { state: 'no-coords' };
  if (h.system !== w.system) return { state: 'other-system', system: w.system };
  if (h.body !== w.body || h.latitude == null) return { state: 'other-body', body: w.body };
  const radius = h.planetRadius || w.planetRadius;
  if (!radius) return { state: 'no-radius' };
  const { distance, bearing } = surfaceRoute(h, w, radius);
  return {
    state: 'guiding',
    distance,
    bearing: Math.round(bearing),
    heading: h.heading,
    turn: h.heading != null ? Math.round(turn(bearing, h.heading)) : null,
    arrived: distance < 100,
  };
}
