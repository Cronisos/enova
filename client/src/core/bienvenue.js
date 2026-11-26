// Premiers pas (carte en haut de l'accueil) : les choses à faire quand on ouvre l'app pour la première fois, cochées
// d'après l'état réel de l'app. Sans React : testé seul.

import { ecrire } from './raccourcisVue.js';

export const ID_BIENVENUE = 'bienvenue';
// Étape « Ta touche pour la souris » : cochée quand le joueur dit la connaître, ou quand il a suivi le tutoriel du même
// identifiant dans Paramètres (tutoriel/parcours.js), où mène son bouton (retenu avec les tutoriels vus). Sans
// elle, impossible de cliquer ou de déplacer une fenêtre en jeu : c'est la première chose à savoir (l’auteur, 19 nov. 2026)
export const ID_SOURIS = 'touche-souris';

/**
 * Les étapes, dans l'ordre : [{ id, titre, fait, texte, lien, bouton }].
 *   - journal : l'app a-t-elle trouvé les journaux du jeu, et le jeu a-t-il déjà tourné ? ({ ready, file, error })
 *   - escadron : état du capteur ({ hasToken, enabled }), ou null si le module Escadron n'est pas dans cette version
 *   - mode : mode de jeu choisi (identifiant), ou null
 *   - souris : { touche, vue } : le raccourci du mode souris (« Alt+Shift+K », '' s'il n'y en a pas, undefined s'il
 *     n'est pas encore lu), et si le joueur a dit le connaître
 * Une étape peut avoir `valider` (identifiant à noter comme vu) et `boutonValider` : un second bouton, « J'ai compris ».
 */
export function etapesBienvenue({ journal, escadron, mode, souris }) {
  const jeuVu = Boolean(journal?.ready && journal?.file);
  const etapes = [{
    id: 'jeu',
    titre: 'L’app voit ton jeu',
    fait: jeuVu,
    texte: jeuVu
      ? 'Tes journaux sont lus : ton commandant, ton solde et ta position s’affichent en haut.'
      : journal?.ready
        ? 'Dossier des journaux trouvé, mais aucun journal dedans : lance Elite Dangerous une fois sur ce PC.'
        : 'L’app n’a pas trouvé les journaux du jeu. Lance Elite Dangerous une fois sur ce PC, ou indique leur dossier dans Paramètres.',
    lien: jeuVu ? null : '/parametres',
    bouton: 'Ouvrir Paramètres',
  }];
  const touche = souris?.touche;
  const sansTouche = touche === '';
  const sourisVue = Boolean(souris?.vue) && !sansTouche;
  etapes.push({
    id: 'souris',
    titre: 'Ta touche pour la souris',
    fait: sourisVue,
    texte: sansTouche
      ? 'Aucune touche n’est réglée pour la souris : sans elle, tu ne peux ni cliquer ni déplacer une fenêtre d’Enova pendant que tu joues. Choisis-en une dans Paramètres, section Raccourcis.'
      : sourisVue
        ? `${ecrire(touche || 'Alt+Shift+K')} te rend la souris en jeu, et la rend au jeu quand tu le refais.`
        : `Indispensable. En jeu, la souris appartient au jeu : ${ecrire(touche || 'Alt+Shift+K')} te la rend pour cliquer dans les fenêtres d’Enova et les déplacer ; refais-le pour la rendre au jeu. Si cette combinaison te gêne, change-la dans Paramètres, section Raccourcis.`,
    lien: sourisVue ? null : '/parametres',
    bouton: sansTouche ? 'Choisir une touche' : 'Me montrer où la régler',
    valider: sourisVue || sansTouche ? null : ID_SOURIS,
    boutonValider: 'J’ai compris',
  });
  if (escadron) {
    const inscrit = Boolean(escadron.hasToken);
    const envoi = inscrit && Boolean(escadron.enabled);
    etapes.push({
      id: 'escadron',
      titre: 'Rejoindre ton escadron',
      fait: envoi,
      texte: envoi
        ? 'Tu es inscrit et tes mérites partent au tableau de l’escadron.'
        : inscrit
          ? 'Tu es inscrit, mais l’envoi de tes mérites n’est pas activé.'
          : 'Colle le code posté par ton chef sur Discord (il commence par « ESC1. »). Facultatif : l’app marche aussi sans escadron.',
      lien: envoi ? null : '/escadron/rejoindre',
      bouton: inscrit ? 'Activer l’envoi' : 'Rejoindre l’escadron',
    });
  }
  etapes.push({
    id: 'mode',
    titre: 'Choisir un mode de jeu',
    fait: Boolean(mode),
    texte: mode
      ? 'Un mode est choisi : ses fenêtres s’affichent par-dessus le jeu.'
      : 'Dis à l’app ce que tu fais (minage, commerce, combat…) avec le bouton en haut à gauche : elle affiche les fenêtres qui vont avec, par-dessus le jeu.',
    lien: mode ? null : '/fenetres-en-jeu',
    bouton: 'Voir les fenêtres en jeu',
  });
  return etapes;
}

/** La carte se montre-t-elle ? Tant que le joueur ne l'a pas fermée (elle se ferme aussi d'elle-même, tout fait). */
export function montrerBienvenue(etat, etapes) {
  if (!etat || (etat.vus ?? []).includes(ID_BIENVENUE)) return false;
  return etapes.some((e) => !e.fait);
}
