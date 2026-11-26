// Module « Livraison Powerplay » (mode de jeu) : ressources allouées par ta puissance chargées et livrées, ce qu'il y
// en a en soute, et les mérites de la session, en temps réel.

import { liveSession } from '../../core/sessions.js';
import { PowerDeliveryState, DELIVERY_EVENTS } from './state.js';

export default {
  id: 'powerdelivery',
  name: 'Livraison Powerplay',

  async register({ router, journal, game, broadcast, overlay }) {
    const session = liveSession({
      id: 'powerdelivery', router, journal, overlay, broadcast, events: DELIVERY_EVENTS,
      create: () => new PowerDeliveryState(),
      summary: (state) => state.summary(game.snapshot().cargo),
    });
    game.on('change', session.notify); // soute
  },
};
