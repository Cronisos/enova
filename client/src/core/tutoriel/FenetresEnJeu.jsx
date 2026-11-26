// Page « Fenêtres en jeu » (/fenetres-en-jeu, puis /fenetres-en-jeu/<mode>) : les fenêtres que l'app affiche par-dessus
// le jeu, montrées ici dans la fenêtre principale pour que leur tutoriel puisse les expliquer, bouton par bouton, sans
// avoir à lancer le jeu. Chaque fenêtre est la vraie (la même page que dans l'overlay), en mode démonstration
// (core/demo.js) : données fictives, et aucun bouton ne change quoi que ce soit chez le joueur.

import { Link, useParams } from 'react-router';
import { MODES, modeById } from '../modes.js';
import { PARAMETRE_DEMO } from '../demo.js';

/** Taille d'affichage de chaque fenêtre dans la page (proche de sa taille par défaut en jeu, overlay/main.js). */
export const TAILLES = {
  waypoints: [590, 124], 'waypoints-list': [380, 440], 'waypoints-guide': [320, 210], 'waypoints-sweep': [620, 520],
  shipmining: [700, 124], combat: [700, 124], groundcombat: [700, 124], rescue: [700, 150], materials: [700, 124], powerdelivery: [700, 124], rares: [700, 124], gardiens: [700, 124], 'gardiens-site': [520, 200],
  colonisation: [700, 124], 'colonisation-list': [380, 440], glance: [480, 460],
  navroute: [340, 236], signals: [360, 380], systeme: [420, 190],
};
const TAILLE_DEFAUT = [700, 124];

/** Nom de chaque fenêtre, tel qu'on l'explique au joueur. */
export const NOMS = {
  waypoints: 'Bandeau du minage', 'waypoints-list': 'Liste des repères', 'waypoints-guide': 'Guidage', 'waypoints-sweep': 'Balayage',
  shipmining: 'Bandeau du minage en vaisseau', combat: 'Bandeau du combat', groundcombat: 'Bandeau du combat au sol',
  rescue: 'Bandeau du sauvetage', materials: 'Bandeau des matériaux', powerdelivery: 'Bandeau de la livraison Powerplay', rares: 'Bandeau du commerce de rares', gardiens: 'Bandeau des Gardiens', 'gardiens-site': 'Site gardien : carte et pylônes', colonisation: 'Bandeau de la colonisation',
  'colonisation-list': 'Liste de courses', glance: 'Coup d’œil',
  navroute: 'Itinéraire', signals: 'Signaux du système', systeme: 'Moniteur du PC',
};

/**
 * Jeux de fenêtres montrés : un par mode de jeu qui en a, plus le Coup d'œil (il s'ajoute à n'importe quel mode).
 * Les fenêtres d'appoint d'un mode (cadre de capture, volets du balayage) ne sont pas montrées : elles ne s'ouvrent
 * qu'à la demande, et leur tutoriel est dans celui de la fenêtre qui les ouvre.
 */
export function jeuxDeFenetres(modes = MODES) {
  const jeux = modes
    .map((m) => ({ id: m.id, titre: m.label, icone: m.icon, fenetres: m.windows.filter((w) => TAILLES[w]) }))
    .filter((j) => j.fenetres.length);
  return [
    ...jeux,
    { id: 'glance', titre: 'Coup d’œil', icone: '◐', fenetres: ['glance'] },
    // Celles que l'app ouvre d'elle-même, quel que soit le mode (les autres ne se montrent qu'au moment voulu)
    { id: 'auto', titre: 'Celles qui s’ouvrent seules', icone: '✦', fenetres: ['navroute', 'signals', 'systeme'] },
  ];
}

export const CHEMIN_FENETRES = '/fenetres-en-jeu';

function Fenetre({ page }) {
  const [l, h] = TAILLES[page] ?? TAILLE_DEFAUT;
  return (
    <figure className="fej-fenetre" style={{ width: l }}>
      <figcaption>{NOMS[page] ?? page}</figcaption>
      {/* La vraie fenêtre de l'overlay, en démonstration : rien n'est lu ni écrit chez le joueur */}
      <iframe title={NOMS[page] ?? page} data-fenetre={page} src={`/hud/${page}?${PARAMETRE_DEMO}=1`} width={l} height={h} />
    </figure>
  );
}

export default function FenetresEnJeu() {
  const { mode } = useParams();
  const jeux = jeuxDeFenetres();
  const jeu = jeux.find((j) => j.id === mode) ?? null;
  if (!mode) {
    return (
      <div className="page">
        <header className="route-header">
          <div>
            <h1>Fenêtres en jeu</h1>
            <p className="muted">
              Quand tu choisis un mode de jeu, l'app affiche de petites fenêtres par-dessus Elite Dangerous. Choisis un
              mode pour les voir ici, avec des données d'exemple, et te les faire expliquer bouton par bouton.
            </p>
          </div>
        </header>
        <nav className="rub-cartes" data-tuto="fej-modes">
          {jeux.map((j) => (
            <Link key={j.id} className="rub-carte" to={`${CHEMIN_FENETRES}/${j.id}`}>
              <span className="rub-tete"><span className="rub-icone" aria-hidden="true">{j.icone}</span> {j.titre}</span>
              <span className="rub-desc">{j.fenetres.map((f) => NOMS[f] ?? f).join(' · ')}</span>
            </Link>
          ))}
        </nav>
      </div>
    );
  }
  if (!jeu) {
    return (
      <div className="page">
        <p className="muted">Ce mode n'a pas de fenêtre en jeu. <Link to={CHEMIN_FENETRES}>Voir les autres</Link></p>
      </div>
    );
  }
  const nomMode = modeById(jeu.id)?.label ?? jeu.titre;
  return (
    <div className="page">
      <header className="route-header">
        <div>
          <h1>Fenêtres en jeu · {jeu.titre}</h1>
          <p className="muted">
            Voici ce que tu vois par-dessus le jeu {jeu.id === 'glance' ? 'quand le Coup d’œil est ouvert' : jeu.id === 'auto' ? 'quand ces fenêtres s’ouvrent d’elles-mêmes' : `en mode « ${nomMode} »`}.
            Ce sont des données d'exemple : tu peux cliquer partout, rien ne change chez toi.{' '}
            <Link to={CHEMIN_FENETRES}>Autres modes</Link>
          </p>
        </div>
      </header>
      <div className="fej-scene" data-tuto="fej-scene">
        {jeu.fenetres.map((f) => <Fenetre key={f} page={f} />)}
      </div>
      <p className="muted small">
        En jeu, chaque fenêtre se déplace avec le bouton ✥ et laisse passer les clics vers le jeu, sauf sur ses boutons.
        Alt+Maj+H les cache et les réaffiche toutes.
      </p>
    </div>
  );
}
