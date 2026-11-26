// Vaisseau d'un autre commandant : sa fiche (Loadout) ne doit jamais entrer dans l'app.
//
// Quand tu montes à bord du vaisseau d'un autre joueur (équipage multijoueur, ou ton SRV rentré dans son hangar), le
// jeu écrit dans TON journal le Loadout de SON vaisseau, avec son numéro (ShipID) et son immatriculation. Mesuré le
// 22 nov. 2026 : Embark SRV:true Multicrew:true, puis DockSRV et Loadout « mandalay » n° 21 d'un équipier, puis
// Disembark Multicrew:true. Lu tel quel, ce vaisseau entrait dans la flotte, l'état du jeu, le rachat, la route…
//
// Le lecteur de journaux (journalService.js) écarte donc ces Loadout à la source, pour tous les modules. Deux indices,
// l'un ou l'autre suffit :
// - la fiche elle-même : ni HullValue ni ModulesValue, et Rebuy à 0 (le jeu ne donne pas la valeur du vaisseau d'un
//   autre ; 334 Loadout du joueur sur 334 portent HullValue, le seul sans est celui de l'équipier). Un très vieux
//   journal sans aucun de ces champs (Rebuy absent) n'est pas écarté ;
// - la situation : à bord chez un autre depuis un JoinACrew ou un Embark Multicrew, jusqu'au QuitACrew, à un Embark
//   dans ton vaisseau, à un LoadGame, à un Shutdown ou au journal suivant (documentation du journal).

/** Événements qui font changer la situation « à bord chez un autre ». */
export const AUTRUI_EVENTS = Object.freeze(['Fileheader', 'LoadGame', 'Shutdown', 'Embark', 'JoinACrew', 'QuitACrew']);
const SUIVIS = new Set(AUTRUI_EVENTS);

/** Situation après l'événement : true si tu es à bord du vaisseau d'un autre commandant. */
export function suiteAutrui(autrui, ev) {
  if (!SUIVIS.has(ev?.event)) return Boolean(autrui);
  if (ev.event === 'JoinACrew') return true;
  if (ev.event === 'Embark') return ev.Multicrew === true;
  return false; // Fileheader, LoadGame, Shutdown, QuitACrew
}

/** Ce Loadout est-il celui du vaisseau d'un autre commandant ? `autrui` : la situation suivie par suiteAutrui. */
export function loadoutDAutrui(ev, autrui = false) {
  if (ev?.event !== 'Loadout') return false;
  return Boolean(autrui) || (!('HullValue' in ev) && ev.Rebuy === 0);
}
