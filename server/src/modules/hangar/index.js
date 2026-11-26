// Module « Hangar » : alerte en jeu quand tu décolles avec un hangar acheté mais sans véhicule dedans (state.js).
// La fenêtre /hud/hangar-vide s'ouvre au décollage et se ferme seule au bout de deux minutes, à l'amarrage, quand un
// véhicule est acheté, ou au bouton.

import { HANGAR_EVENTS, HangarState } from './state.js';

const PAGE = 'hangar-vide';
const DUREE_MS = 2 * 60_000;

export default {
  id: 'hangar',
  name: 'Hangar sans véhicule',

  async register({ router, journal, broadcast, overlay }) {
    let state = new HangarState();
    let alerte = null; // { shipId, vaisseau, hangars, at } pendant que la fenêtre est ouverte
    let minuterie = null;

    const fermer = () => {
      clearTimeout(minuterie);
      minuterie = null;
      if (alerte) {
        alerte = null;
        broadcast('hangar:alerte', { alerte });
      }
      overlay?.setExtra?.(PAGE, false);
    };
    const alerter = (vides, at) => {
      alerte = { ...vides, at };
      broadcast('hangar:alerte', { alerte });
      overlay?.setExtra?.(PAGE, true);
      clearTimeout(minuterie);
      minuterie = setTimeout(fermer, DUREE_MS);
      minuterie.unref?.();
    };

    journal.addInterest(HANGAR_EVENTS);
    // Historique : seulement pour savoir où en est chaque hangar, jamais d'alerte pour un décollage passé
    journal.on('ready', ({ history }) => {
      state = new HangarState();
      const voulus = new Set(HANGAR_EVENTS);
      for (const ev of history) if (voulus.has(ev.event)) state.apply(ev);
    });
    journal.on('event', (ev) => {
      const r = state.apply(ev);
      if (!r) return;
      const vides = state.vides();
      if (r.decollage && vides) alerter(vides, ev.timestamp);
      else if (alerte && (!vides || ev.event === 'Docked')) fermer(); // garni, ou de retour à quai
    });

    router.get('/etat', (req, res) => res.json({ alerte, ...state.vue() }));
    router.post('/fenetre/fermer', (req, res) => {
      fermer();
      res.json({ alerte });
    });
    /** « Il est plein » : les hangars du vaisseau actuel sont tenus pour garnis (l'app s'est trompée, ou c'est réglé). */
    router.post('/plein', (req, res) => {
      state.garnir();
      fermer();
      res.json({ alerte, ...state.vue() });
    });
  },
};
