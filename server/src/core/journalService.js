// Service commun de lecture des journaux.
//
// Au démarrage : lit l'historique de tous les journaux (uniquement les événements
// demandés par les modules), puis suit le journal actif en temps réel.
// Il publie :
//   - 'ready'  ({ history })   : historique complet, une fois au démarrage (un écouteur par tour, voir emitReady)
//   - 'pret'                   : tous les écouteurs de « ready » sont passés (diffusé au client en « journal:ready »)
//   - 'event'  (événement)     : chaque nouvelle ligne du journal actif
//   - 'status' / 'market' / 'cargo' / 'navroute' / 'modulesinfo' / 'shiplocker' / 'backpack' : fichiers d'état modifiés
//   - 'switch' (nom du fichier): bascule sur un nouveau journal
// Chaque événement publié porte le commandant chargé à ce moment-là (core/commander.js : ev[COMMANDER], FID sinon nom) :
// plusieurs comptes peuvent écrire dans le même dossier, et un ShipID n'est unique que pour un commandant.
// Seules les séances de la galaxie Live sont publiées : une partie Legacy ou bêta (core/galaxy.js) ne touche ni à
// l'historique, ni aux événements en direct, ni aux fichiers d'état.
// Le Loadout du vaisseau d'un autre commandant (équipage multijoueur, core/autrui.js) n'est ni gardé ni publié.
//
// Pourquoi un sondage (polling) plutôt que des notifications du système de fichiers ?
// Sous Windows, le jeu garde ses fichiers ouverts et les notifications arrivent de
// façon irrégulière. Relire la fin du fichier toutes les 500 ms est simple et fiable,
// et garantit qu'un événement apparaît dans l'app en moins d'une seconde.

import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { setImmediate as laisserPasser } from 'node:timers/promises';
import { journalSortKey, journalStartTime, listJournals, parseLines, readJsonFile } from './journalFiles.js';
import { GALAXY_EVENTS, galaxyOf } from './galaxy.js';
import { COMMANDER, CommanderTracker } from './commander.js';
import { loadoutDAutrui, suiteAutrui } from './autrui.js';

const TICK_MS = 500;
// Relecture de l'historique par morceaux : entre deux morceaux, le serveur répond aux requêtes, au flux temps réel
// et à l'overlay. Un vétéran peut avoir plusieurs Go de journaux : lus d'un bloc, ils gelaient tout de 10 à 20 s.
export const MORCEAU_OCTETS = 1024 * 1024;
const ENTETES_PAR_TOUR = 100; // premières lignes des journaux lues (ordre des journaux) entre deux pauses
const SKIPPED_RETRY_MS = 10_000; // journal illisible au démarrage : nouvel essai toutes les 10 s
const GALAXY_SET = new Set(GALAXY_EVENTS);
// Toujours analysés pendant la relecture : ils disent quel commandant est chargé (core/commander.js)
const COMMANDER_EVENTS = ['Commander', 'LoadGame'];

/** Raison d'un journal illisible, en clair pour le joueur (le code système reste entre parenthèses, pour le diagnostic). */
export function skippedReason(code) {
  if (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES') return 'il est bloqué par un autre programme (antivirus, sauvegarde, synchronisation)';
  return "Windows refuse de le lire pour l'instant";
}

/**
 * Galaxie après un événement : le Fileheader ouvre une séance (sa version décide), un LoadGame qui porte sa version la
 * confirme ou la change. Les autres événements ne changent rien.
 */
function nextGalaxy(current, ev) {
  if (ev.event === 'Fileheader') return galaxyOf(ev.gameversion, ev.timestamp);
  if (ev.event === 'LoadGame' && typeof ev.gameversion === 'string' && ev.gameversion) return galaxyOf(ev.gameversion, ev.timestamp);
  return current;
}

const FAILURE_LOG_MS = 60_000; // une même erreur d'écouteur : une ligne par minute au plus
const FAILURE_KEYS_MAX = 100;
const STATE_FILES = {
  'Status.json': 'status',
  'Market.json': 'market',
  'Cargo.json': 'cargo',
  'NavRoute.json': 'navroute',
  // Lus par la synthèse de l'état du jeu (core/synthese.js) : puissance des modules, casier et sac à dos (Odyssey)
  'ModulesInfo.json': 'modulesinfo',
  'ShipLocker.json': 'shiplocker',
  'Backpack.json': 'backpack',
};

/**
 * Trace d'un événement pour la liste « Événements en direct » : son nom et son heure, rien d'autre.
 * Le reste de la ligne peut contenir du chat, l'identifiant Frontier (FID) ou le nom d'autres CMDR.
 */
export const recentEntry = (ev) => ({ event: ev.event, timestamp: ev.timestamp });

const ALL = Symbol('tous'); // règle par défaut : tous les événements du type restent dans l'historique

/**
 * Historique en cours de lecture, réduit au fil des journaux selon ce que les modules ont demandé de garder
 * (addInterest(noms, { history })) :
 *   - rien : tous les événements du type (par défaut) ;
 *   - { last: true, useful?(ev) } : seulement le dernier (utile) ; les précédents sont lâchés dès qu'un autre arrive ;
 *   - { since: [noms] } : seulement ceux qui suivent le dernier de ces événements (par exemple le dernier saut).
 * Les événements lâchés le sont pendant la lecture : ils ne pèsent plus sur la mémoire du démarrage. Les modules
 * reçoivent toujours, en direct, tous les événements.
 */
class HistoryList {
  constructor(keep) {
    this.keep = keep;
    this.list = [];
    this.dropped = 0;
    this.last = new Map(); // type → position du dernier gardé
    this.since = new Map(); // type → positions gardées depuis la dernière remise à zéro
    this.resets = new Map(); // événement qui remet à zéro → types concernés
    for (const [name, rule] of keep) {
      if (rule === ALL || !Array.isArray(rule.since)) continue;
      for (const r of rule.since) {
        if (!this.resets.has(r)) this.resets.set(r, []);
        this.resets.get(r).push(name);
      }
    }
  }

  push(ev) {
    for (const name of this.resets.get(ev.event) || []) {
      for (const i of this.since.get(name) || []) this.drop(i);
      this.since.set(name, []);
    }
    const rule = this.keep.get(ev.event);
    if (rule && rule !== ALL) {
      if (rule.last) {
        if (typeof rule.useful === 'function' && !usefulFor(rule, ev)) return;
        if (this.last.has(ev.event)) this.drop(this.last.get(ev.event));
        this.last.set(ev.event, this.list.length);
      } else if (Array.isArray(rule.since)) {
        if (!this.since.has(ev.event)) this.since.set(ev.event, []);
        this.since.get(ev.event).push(this.list.length);
      }
    }
    this.list.push(ev);
  }

  drop(i) {
    this.list[i] = null;
    this.dropped++;
  }

  done() {
    return this.dropped ? this.list.filter((ev) => ev !== null) : this.list;
  }
}

/** Le tri d'un module qui lève une exception garde l'événement (jamais de perte à cause d'un bogue). */
function usefulFor(rule, ev) {
  try {
    return Boolean(rule.useful(ev));
  } catch {
    return true;
  }
}

export class JournalService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // chaque module écoute « ready » et « event » : 11 modules dépassent la limite de 10
    this.dir = null;
    this.file = null; // journal actif (chemin complet)
    this.starts = new Map(); // journal → heure UTC de sa première ligne (journalFiles.js : ordre des journaux)
    this.misses = new Map(); // journal sans première ligne lisible → « mtime:taille » (pas rouvert tant qu'il ne change pas)
    this.seen = new Map(); // journal déjà lu → { pos, galaxy } : jamais republié s'il redevient le plus récent
    this.skipped = new Map(); // journal illisible pendant la relecture de l'historique → code d'erreur (réessayé)
    this.skippedRetryAt = 0;
    this.galaxy = 'live'; // galaxie de la séance suivie (core/galaxy.js) : seule la galaxie Live est publiée
    this.autrui = false; // à bord du vaisseau d'un autre commandant (core/autrui.js) : son Loadout n'est pas publié
    this.pos = 0; // position de lecture (octets)
    this.partial = Buffer.alloc(0); // fin de ligne pas encore terminée
    this.interest = new Set();
    this.keep = new Map(); // type → règle de l'historique (HistoryList), ALL par défaut
    this.stateStamps = {}; // fichier → "mtime:taille"
    this.stateData = {}; // dernier contenu lu de chaque fichier d'état
    this.recent = []; // 50 derniers événements (page Paramètres) : nom et heure seulement, voir recentEntry
    this.lastEventAt = null;
    this.timer = null;
    this.run = 0; // numéro de la lecture en cours : un nouveau start() ou un stop() abandonne la précédente
    this.ready = false;
    this.error = null;
    this.readError = false; // this.error vient d'une lecture ratée en temps réel (effacée au tour réussi suivant)
    this.failures = new Map(); // erreur d'un écouteur → { at, repeats } (reportFailure)
    this.commanders = new CommanderTracker(); // commandant chargé, et ceux vus dans les journaux (séances Live)
  }

  /** Commandant chargé (FID, sinon « nom:… »), ou null tant qu'aucun n'est connu. */
  commander() {
    return this.commanders.current;
  }

  /** Commandant le plus vu dans les journaux (le plus de lancements), ou null : propriétaire des données d'avant. */
  mostSeenCommander() {
    return this.commanders.mostSeen();
  }

  /** Un seul commandant (ou aucun) dans les journaux : une donnée sans commandant est la sienne (core/commander.js). */
  singleCommander() {
    return this.commanders.single();
  }

  /** Note sur l'événement le commandant chargé (et le suit). */
  tagCommander(ev) {
    const c = this.commanders.see(ev);
    if (c) ev[COMMANDER] = c;
  }

  /**
   * Les modules déclarent les événements dont ils ont besoin dans l'historique, et éventuellement ce qu'il faut en
   * garder (`history`, voir HistoryList). Un type demandé par plusieurs modules suit la règle la plus large : tous,
   * sauf si chacun a donné la MÊME règle (le même objet).
   */
  addInterest(names, { history } = {}) {
    const rule = history && typeof history === 'object' && (history.last === true || Array.isArray(history.since)) ? history : ALL;
    for (const n of names) {
      this.interest.add(n);
      const prev = this.keep.get(n);
      this.keep.set(n, prev === undefined || prev === rule ? rule : ALL);
    }
    // Les événements qui remettent à zéro doivent être lus (et ils restent dans l'historique)
    if (rule !== ALL && Array.isArray(rule.since)) {
      for (const r of rule.since) {
        this.interest.add(r);
        if (!this.keep.has(r)) this.keep.set(r, ALL);
      }
    }
  }

  /**
   * Publication isolée : chaque écouteur (un par module) reçoit l'événement dans son propre try/catch. Le bogue d'un
   * module n'empêche plus les modules suivants de le recevoir, ni les lignes suivantes du même lot d'être publiées,
   * ni le serveur de démarrer (écouteur de « ready ») : l'erreur est écrite dans la console, avec l'événement en cause.
   */
  emit(type, ...args) {
    const list = this.rawListeners(type);
    if (!list.length) return false;
    for (const fn of list) {
      try {
        Reflect.apply(fn, this, args);
      } catch (err) {
        this.reportFailure(type === 'event' ? `l'événement ${args[0]?.event ?? '?'}` : `« ${type} »`, err);
      }
    }
    return true;
  }

  /**
   * Échec d'un écouteur, écrit dans la console avec sa pile : une même erreur au plus une fois par minute, avec le
   * nombre de fois où elle s'est répétée entre-temps (un module qui échoue sur chaque Status.json ne noie pas la
   * console sous une pile par seconde).
   */
  reportFailure(what, err) {
    const key = `${what}|${String(err?.message ?? err)}`;
    const now = Date.now();
    const seen = this.failures.get(key);
    if (seen && now - seen.at < FAILURE_LOG_MS) {
      seen.repeats += 1;
      return;
    }
    if (!seen && this.failures.size >= FAILURE_KEYS_MAX) this.failures.delete(this.failures.keys().next().value);
    this.failures.delete(key);
    this.failures.set(key, { at: now, repeats: 0 });
    const again = seen?.repeats ? `, ${seen.repeats} fois de plus depuis la ligne précédente` : '';
    console.error(`Journal : un module a échoué sur ${what}${again} (les autres l'ont reçu) :`, err);
  }

  /**
   * Relit l'historique de `dir`, puis suit le journal actif. Rend une promesse, tenue quand « ready » est passé (ou
   * quand cette lecture a été abandonnée par un autre start() ou par stop()) ; elle n'est jamais rejetée : un problème
   * va dans this.error. Rien de lourd pendant l'appel lui-même : un gestionnaire HTTP qui l'appelle (changement de
   * dossier dans Paramètres) répond tout de suite, et « ready » arrive plus tard (diffusé en « journal:ready »).
   */
  start(dir) {
    this.stop();
    const run = this.run;
    this.dir = dir;
    this.error = null;
    this.readError = false;
    this.ready = false;
    this.partial = Buffer.alloc(0);
    this.stateStamps = {};
    this.stateData = {};
    this.starts = new Map();
    this.misses = new Map();
    this.seen = new Map();
    this.skipped = new Map();
    this.skippedRetryAt = Date.now() + SKIPPED_RETRY_MS;
    this.galaxy = 'live';
    this.autrui = false;
    this.commanders = new CommanderTracker();
    return this.load(run);
  }

  /** Lecture de l'historique, par morceaux (voir MORCEAU_OCTETS), puis suivi en temps réel. */
  async load(run) {
    try {
      await laisserPasser(); // jamais dans l'appel de start()
      if (run !== this.run) return;
      if (!fs.existsSync(this.dir)) {
        this.error = `Dossier introuvable : ${this.dir}`;
        this.file = null;
        this.emit('ready', { history: [] });
        this.ready = true;
        this.emit('pret');
        this.timer = setInterval(() => this.retryMissingDir(), 5000);
        return;
      }
      // 1. Ordre des journaux : leurs premières lignes, lues par paquets (des milliers de journaux chez un vétéran)
      if (!(await this.readStarts(run))) return;
      // 2. Historique : tous les journaux, filtrés par intérêt, remis aux modules une fois puis libéré. Rien ici ne le
      // garde : la minuterie du suivi est créée par follow(), hors de cette fonction. Avant, le rappel de forEach (qui
      // remplissait l'historique) et la minuterie partageaient le même contexte : la minuterie gardait TOUT
      // l'historique en mémoire jusqu'à l'arrêt du serveur, environ 1 Mo par Mo de journaux (core/journalMemory.test.js).
      const read = await this.readHistory(this.listJournals(), run);
      if (!read) return; // abandonnée : une autre lecture a pris la place
      this.file = read.file;
      this.pos = read.pos;
      this.partial = read.partial;
      this.galaxy = read.galaxy;
      this.autrui = read.autrui;
      if (!(await this.emitReady(read.history, run))) return; // abandonnée pendant la remise aux modules
      // 3. Suivi en temps réel
      this.follow();
    } catch (err) {
      // Imprévu (dossier disparu en pleine lecture…) : signalé, jamais une promesse rejetée qui arrêterait le serveur
      if (run !== this.run) return;
      this.error = `Relecture des journaux impossible : ${err.message}`;
      if (!this.ready) {
        this.ready = true;
        this.emit('ready', { history: [] });
        this.emit('pret');
      }
      if (!this.timer) this.follow();
    }
  }

  follow() {
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  /** Journaux du dossier, du plus ancien au plus récent (caches des premières lignes : journalFiles.js). */
  listJournals() {
    return listJournals(this.dir, { starts: this.starts, misses: this.misses });
  }

  /** Premières lignes des journaux (heure de début, journalFiles.js), avec une pause tous les ENTETES_PAR_TOUR. */
  async readStarts(run) {
    let names;
    try {
      names = await fs.promises.readdir(this.dir);
    } catch {
      return run === this.run; // dossier illisible : listJournals rendra une liste vide
    }
    let n = 0;
    for (const name of names) {
      if (!journalSortKey(name)) continue;
      const file = path.join(this.dir, name);
      if (this.starts.has(file)) continue;
      const t = journalStartTime(file);
      if (t !== null) this.starts.set(file, t);
      if (++n % ENTETES_PAR_TOUR === 0) {
        await laisserPasser();
        if (run !== this.run) return false;
      }
    }
    return run === this.run;
  }

  /**
   * Lit les journaux, du plus ancien au plus récent : les événements demandés par les modules, dans l'ordre. Les séances
   * Legacy ou bêta (core/galaxy.js) sont lues pour suivre la galaxie, mais rien n'en est gardé. Lecture asynchrone, et
   * une pause après chaque morceau d'environ MORCEAU_OCTETS. Rend null si la lecture a été abandonnée entre-temps,
   * sinon { history, file, pos, partial, galaxy } (journal suivi ensuite, où en reprendre la lecture, et sa galaxie).
   */
  async readHistory(files, run) {
    const history = new HistoryList(this.keep);
    // Fileheader et LoadGame toujours analysés : ils disent la galaxie, même si aucun module ne les demande
    // Commander aussi : le commandant chargé est noté sur chaque événement
    const parsed = new Set([...this.interest, ...GALAXY_EVENTS, ...COMMANDER_EVENTS]);
    const out = { history: null, file: null, pos: 0, partial: Buffer.alloc(0), galaxy: 'live', autrui: false };
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isLast = i === files.length - 1;
      let buf;
      try {
        // Un journal à la fois, d'un bloc (quelques Mo au plus : le jeu en ouvre un nouveau toutes les ~500 000 lignes) ;
        // le travail long, l'analyse, se fait par morceaux (parseInto)
        buf = fs.readFileSync(file);
      } catch (err) {
        if (run !== this.run) return null;
        // Journal illisible (verrouillé, droits) : passé, signalé et réessayé (retrySkipped) ; le démarrage continue
        // avec les autres. Tant qu'il manque, l'historique est incomplet (les routes ne suppriment aucune boucle). Le
        // dernier reste le journal suivi, à partir de sa fin : ses lignes ne sont pas publiées comme nouvelles.
        const code = err.code || err.message;
        this.skipped.set(file, code);
        this.error = `Journal illisible pour l'instant : ${path.basename(file)}, ${skippedReason(err.code)} (code ${code}). Nouvel essai toutes les ${SKIPPED_RETRY_MS / 1000} s.`;
        if (isLast) {
          out.file = file;
          try {
            out.pos = fs.statSync(file).size;
          } catch {
            out.pos = 0;
          }
        }
        continue;
      }
      if (run !== this.run) return null;
      const taille = buf.length;
      let complete = buf;
      if (isLast) {
        // On garde de côté une éventuelle ligne en cours d'écriture
        const lastNl = buf.lastIndexOf(0x0a);
        complete = buf.subarray(0, lastNl + 1);
        out.partial = Buffer.from(buf.subarray(lastNl + 1));
        out.file = file;
        out.pos = taille;
      }
      buf = null;
      const etat = { galaxy: 'live', autrui: false }; // chaque journal ouvre sa séance par un Fileheader
      if (!(await this.parseInto(history, complete, run, parsed, etat))) return null;
      this.seen.set(file, { pos: taille, galaxy: etat.galaxy, autrui: etat.autrui });
      if (isLast) {
        out.galaxy = etat.galaxy;
        out.autrui = etat.autrui;
      }
    }
    out.history = history.done();
    return out;
  }

  /**
   * Analyse un journal lu par morceaux d'environ MORCEAU_OCTETS, coupés en fin de ligne (un octet 0x0A ne fait jamais
   * partie d'un caractère UTF-8 : aucune lettre coupée en deux), avec une pause après chacun. La galaxie de la séance
   * (etat.galaxy) suit les Fileheader et LoadGame : rien n'est gardé d'une séance Legacy ou bêta. false : abandonnée.
   */
  async parseInto(history, buf, run, parsed, etat) {
    let from = 0;
    while (from < buf.length) {
      let to = from + MORCEAU_OCTETS;
      if (to >= buf.length) to = buf.length;
      else {
        const nl = buf.indexOf(0x0a, to);
        to = nl < 0 ? buf.length : nl + 1;
      }
      for (const ev of parseLines(buf.toString('utf8', from, to), parsed)) {
        if (GALAXY_SET.has(ev.event)) etat.galaxy = nextGalaxy(etat.galaxy, ev);
        if (etat.galaxy !== 'live') continue; // séance Legacy ou bêta : rien n'en est gardé
        etat.autrui = suiteAutrui(etat.autrui, ev);
        if (loadoutDAutrui(ev, etat.autrui)) continue; // fiche du vaisseau d'un autre commandant : jamais la tienne
        this.tagCommander(ev);
        if (this.interest.has(ev.event)) history.push(ev);
      }
      from = to;
      await laisserPasser();
      if (run !== this.run) return false;
    }
    return true;
  }

  /**
   * Journaux sautés au démarrage (verrouillés par un antivirus, une sauvegarde…) : réessayés toutes les 10 s. Dès que
   * l'un se lit, tout l'historique est relu (start) : les modules le reçoivent complet, et le message disparaît. Un
   * journal disparu entre-temps est oublié. Rend true si la relecture a été lancée.
   */
  retrySkipped(now = Date.now()) {
    if (!this.skipped.size || now < this.skippedRetryAt) return false;
    this.skippedRetryAt = now + SKIPPED_RETRY_MS;
    let readable = false;
    for (const file of [...this.skipped.keys()]) {
      // Exactement la lecture de readHistory : un fichier qui s'ouvre mais ne se lit pas (verrou de plage, EBUSY à la
      // lecture seulement) relançait sinon toute la relecture toutes les 10 s, sans fin.
      try {
        fs.readFileSync(file);
        readable = true;
      } catch (err) {
        if (err.code === 'ENOENT') this.skipped.delete(file);
      }
    }
    if (readable) {
      this.relecture = this.start(this.dir); // relecture par morceaux, en arrière-plan (ne rejette jamais)
      return true;
    }
    if (!this.skipped.size && !this.readError) this.error = null; // tous disparus : plus rien à signaler
    return false;
  }

  /**
   * Fichiers d'état lus une première fois, puis l'historique remis aux modules (« ready »), un écouteur par tour : chaque
   * module réduit l'historique d'une traite, mais entre deux modules le serveur répond aux requêtes et au flux (une
   * vingtaine de modules : avant, ils passaient tous dans le même tour, des secondes de gel chez un vétéran). Puis
   * « pret », une fois tous passés. Chaque écouteur reste isolé (un module qui lève n'arrête pas les suivants). Rend
   * false si la lecture a été abandonnée entre-temps (nouveau dossier, arrêt) : la suivante remettra son historique.
   */
  async emitReady(history, run) {
    this.pollStateFiles(true);
    // ready (GET /api/state) reste faux tant qu'un module n'est pas passé : personne ne lit l'état d'avant d'un module
    for (const fn of this.rawListeners('ready')) {
      try {
        Reflect.apply(fn, this, [{ history }]);
      } catch (err) {
        this.reportFailure('« ready »', err);
      }
      await laisserPasser();
      if (run !== this.run) return false;
    }
    this.ready = true;
    this.emit('pret');
    return true;
  }

  /** Arrête le suivi, et abandonne une relecture de l'historique en cours (elle ne publiera pas « ready »). */
  stop() {
    this.run += 1;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  retryMissingDir() {
    // Depuis une minuterie : une erreur ici n'était rattrapée par rien et arrêtait le serveur (start() ne rejette jamais)
    try {
      if (fs.existsSync(this.dir)) this.start(this.dir);
    } catch (err) {
      this.error = err.message;
    }
  }

  tick() {
    try {
      if (this.retrySkipped()) return; // historique relu en entier : ce tour est fait
      this.checkForNewJournal();
      this.readNewLines();
      this.pollStateFiles(false);
      // Lecture réussie : le problème de lecture d'un tour précédent n'a plus cours (il restait affiché sans fin)
      if (this.readError) {
        this.error = null;
        this.readError = false;
      }
    } catch (err) {
      this.error = err.message;
      this.readError = true;
    }
  }

  /**
   * Le jeu crée un nouveau journal à chaque lancement (ou tous les ~500 000 lignes). Le plus récent est celui dont la
   * première ligne est la plus récente (heure UTC), pas celui au plus grand nom : la nuit du passage à l'heure d'hiver,
   * le nom d'une nouvelle séance peut être plus « ancien » que celui de la précédente (journalFiles.js).
   */
  checkForNewJournal() {
    const files = this.listJournals();
    const newest = files[files.length - 1];
    if (!newest || newest === this.file) return;
    if (this.file) {
      // Finir de lire l'ancien fichier avant de basculer. Disparu (déplacé, supprimé) : on bascule quand même ; avant,
      // l'erreur arrêtait la bascule à chaque tour. Verrouillé : on réessaie au tour suivant (rien de perdu).
      try {
        this.readNewLines();
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      this.seen.set(this.file, { pos: this.pos, galaxy: this.galaxy, autrui: this.autrui });
    }
    // Journal déjà lu qui redevient le plus récent (le journal actif a été déplacé ou supprimé) : on reprend où on en
    // était. Avant, il était relu depuis le début et toutes ses lignes republiées comme nouvelles (mérites et matériaux
    // comptés deux fois, alertes après coup).
    const known = this.seen.get(newest);
    this.file = newest;
    this.pos = known?.pos ?? 0;
    this.galaxy = known?.galaxy ?? 'live';
    this.autrui = known?.autrui ?? false;
    this.partial = Buffer.alloc(0);
    this.emit('switch', path.basename(newest));
  }

  /** Lecture incrémentale : uniquement les octets ajoutés depuis la dernière lecture. */
  readNewLines() {
    if (!this.file) return;
    let fd;
    try {
      fd = fs.openSync(this.file, 'r');
      const size = fs.fstatSync(fd).size;
      if (size < this.pos) {
        // Fichier raccourci (cas anormal : le jeu ne fait qu'ajouter) : rien n'est republié, on suit sa nouvelle fin.
        // Avant, il était relu depuis le début et ses lignes déjà lues republiées comme nouvelles.
        console.warn(`Journal : ${path.basename(this.file)} a raccourci (${this.pos} → ${size} octets) ; ses lignes déjà lues ne sont pas republiées.`);
        this.pos = size;
        this.partial = Buffer.alloc(0);
        return;
      }
      if (size === this.pos) return;
      const chunk = Buffer.alloc(size - this.pos);
      fs.readSync(fd, chunk, 0, chunk.length, this.pos);
      this.pos = size;

      const data = Buffer.concat([this.partial, chunk]);
      const lastNl = data.lastIndexOf(0x0a);
      if (lastNl < 0) {
        this.partial = data;
        return;
      }
      this.partial = Buffer.from(data.subarray(lastNl + 1));
      for (const ev of parseLines(data.subarray(0, lastNl + 1).toString('utf8'))) {
        if (GALAXY_SET.has(ev.event)) this.galaxy = nextGalaxy(this.galaxy, ev);
        if (this.galaxy !== 'live') continue; // partie Legacy ou bêta : rien n'est publié (core/galaxy.js)
        this.autrui = suiteAutrui(this.autrui, ev);
        if (loadoutDAutrui(ev, this.autrui)) continue; // fiche du vaisseau d'un autre commandant (core/autrui.js)
        this.tagCommander(ev);
        this.lastEventAt = new Date();
        this.recent.push(recentEntry(ev));
        if (this.recent.length > 50) this.recent.shift();
        this.emit('event', ev);
      }
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  pollStateFiles(initial) {
    for (const [name, kind] of Object.entries(STATE_FILES)) {
      const file = path.join(this.dir, name);
      let st;
      try {
        st = fs.statSync(file);
      } catch {
        continue;
      }
      const stamp = `${st.mtimeMs}:${st.size}`;
      if (this.stateStamps[name] === stamp) continue;
      if (this.galaxy !== 'live') {
        // Écrit par une partie Legacy ou bêta : vu, mais ni gardé ni publié (et pas republié au retour en Live)
        this.stateStamps[name] = stamp;
        continue;
      }
      const data = readJsonFile(file);
      if (!data) continue; // illisible pour l'instant : on retentera au prochain tour
      this.stateStamps[name] = stamp;
      this.stateData[kind] = data;
      this.emit(kind, data, { initial });
    }
  }

  info() {
    return {
      dir: this.dir,
      file: this.file ? path.basename(this.file) : null,
      ready: this.ready,
      error: this.error,
      lastEventAt: this.lastEventAt,
      galaxy: this.galaxy, // 'live', 'legacy' ou 'beta' : seule la galaxie Live est suivie
      skipped: [...this.skipped.keys()].map((f) => path.basename(f)), // journaux illisibles, réessayés
    };
  }
}
