// « Disposer les fenêtres » (Paramètres) : la liste des fenêtres en jeu des modules, avec un nom lisible pour leur cadre.
// Les tiroirs (Top 10, repère posé) n'y sont pas : ils suivent la fenêtre de balayage.

/** Tiroirs collés à une autre fenêtre (overlay/main.js, DOCKED) : jamais disposés seuls. */
export const TIROIRS = new Set(['waypoints-sweep-top', 'waypoints-sweep-pose']);

/** Noms des fenêtres en plus d'un module (hudPages) ; la fenêtre principale d'un module prend son titre. */
const NOMS = {
  waypoints: 'Minage Rhino',
  'waypoints-list': 'Repères du système',
  'waypoints-guide': 'Guidage vers un repère',
  'waypoints-sweep': 'Balayage de l’EEP',
  capture: 'Cadre de capture',
  'colonisation-list': 'Liste de courses (colonisation)',
  'colonisation-station': 'À acheter ici (colonisation)',
  'engineering-visit': 'Chez l’ingénieur',
  'engineering-passage': 'Échangeur sur la route',
  'expansion-sale': 'Vente (projet extension)',
  vigie: 'Vigie des règles',
  bilan: 'Bilan de session',
  'hangar-vide': 'Alerte hangar sans véhicule',
  'rares-alerte': 'Alerte de rares en stock',
  'gardiens-site': 'Site gardien : carte et pylônes',
  fsdcool: 'Refroidissement SCO',
  carrier: 'Saut du porteur',
  navroute: 'Itinéraire',
  bindings: 'Garde des commandes',
  systeme: 'Moniteur PC',
  bouclier: 'Jauge des boucliers',
  ia: 'IA de bord',
};

/** Nom d'une fenêtre en jeu. */
export function nomFenetre(page, titreModule = null) {
  return NOMS[page] || titreModule || page;
}

/**
 * Fenêtres à disposer, dans l'ordre des modules : [{ page, nom }] (sans les tiroirs, sans doublon).
 * @param {Iterable<string>} [exclues] fenêtres qui ne s'ouvrent jamais ici (la vigie des règles coupée)
 */
export function fenetresOverlay(modules, exclues = []) {
  const vues = new Set(exclues);
  const out = [];
  const ajouter = (page, titre) => {
    if (TIROIRS.has(page) || vues.has(page)) return;
    vues.add(page);
    out.push({ page, nom: nomFenetre(page, titre) });
  };
  for (const m of modules) {
    if (m.Hud) ajouter(m.id, m.title);
    for (const page of Object.keys({ ...m.hudPages, ...m.hudExtras })) ajouter(page, m.title);
  }
  return out;
}
