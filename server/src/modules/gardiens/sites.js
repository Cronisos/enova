// Structures gardiennes connues : liste de départ, pour ne pas partir de zéro. Source : galnet.fr, page « Structures
// Guardians » (CMDR Aymerix, publiée le 1er mars 2018), qui reprend le tableau de Canonn Research ; indiquée par
// Cronisos Lysiris le 22 nov. 2026. Données de 2018, non revérifiées en jeu : une structure a pu changer depuis.
//
// [système, corps, latitude, longitude, active]. « Active » : la structure se laisse activer (pylônes, orbe) ; d'après
// la page, seules celles-là fonctionnent. La page ne dit pas quel plan donne chaque structure.

import { PLAN_DES_SITES } from './guides.js';

const BRUT = [
  ['Synuefe LY-I b42-2', 'C 2', 52.6791, 115.2503, false],
  ['Vela Dark Region EG-X b1-1', 'A 1', -31.1571, 99.4384, true],
  ['Col 173 Sector HR-M b23-3', 'B 7', 43.1349, 104.3013, true],
  ['Vela Dark Region KR-W c1-24', '7 A', 28.0021, -15.4242, false],
  ['HIP 39768', 'A 14 F', -32.0927, 16.5575, false],
  ['Col 173 Sector DH-K b25-2', 'A 5', 10.6348, -12.5755, false],
  ['Synuefe ZL-J d10-119', '9 B', -44.476, -95.0524, false],
  ['Synuefe ZL-J d10-109', 'E 3', 33.5862, -54.0217, true],
  ['Synuefe EU-Q c21-10', 'A 3', -23.2718, 126.3758, true],
  ['Col 173 Sector WZ-O b22-4', 'C 5', -77.9657, -170.4414, false],
  ['Col 173 Sector BH-K b25-8', 'B 3', -50.1193, -69.9793, false],
  ['Col 173 Sector QU-O d6-32', '3 A', 31.46, -154.25, false],
  ['HD 63154', 'B 3 A', 40.7966, -106.5073, true],
  ['Col 173 Sector QU-O d6-25', '5 B', -56.6923, 91.5176, false],
  ['Col 173 Sector JX-K b24-0', 'B 2', -11.4828, 107.1574, false],
  ['Col 173 Sector KN-J b25-5', 'C 3', 37.2591, 19.255, false],
  ['Vela Dark Region HB-X c1-28', 'E 2', -57.4285, 155.0567, false],
  ['Vela Dark Region FL-Y d63', 'B 1', -21.8939, -18.9468, false],
  ['Synuefe CE-R c21-6', 'C 1', 42.1745, 72.6098, false],
  ['Synuefe ZR-I b43-10', 'D 2', 18.7047, 106.9514, false],
  ['Col 173 Sector HU-D c13-2', 'A 1', -4.9932, -37.9452, false],
  ['HD 62755', '10 B', 31.068, 130.9747, false],
  ['Synuefe SP-F b44-0', 'C 1', -24.6821, -21.6226, true],
  ['Vela Dark Region DL-Y d91', '5 A', -6.5804, -39.8589, true],
  ['Col 173 Sector IJ-G b27-1', 'A 1', 22.4474, -58.5793, false],
  ['Col 173 Sector OD-J b25-2', 'B 1', -31.6828, -141.3324, true],
  ['Synuefe TP-F b44-0', 'CD 1', -27.3238, -17.1637, false],
  ['Col 173 Sector RT-I b25-1', 'B 1', -41.6365, 126.0865, false],
  ['Vela Dark Region IW-W b1-3', 'B 1', 32.8026, 139.444, false],
  ['Vela Dark Region EL-Y d32', 'B 1', 18.3677, -69.1438, false],
  ['Vela Dark Region DL-Y d112', '1 A', -38.1717, -157.2472, true],
  ['Synuefe GT-H b43-1', 'C 4', -26.0524, 32.0035, true],
  ['Vela Dark Region JS-T b3-0', 'A 3', 25.3814, 145.5499, true],
  ['Col 173 Sector LT-Q d5-82', 'A 3', -68.9706, -37.988, true],
  ['Col 173 Sector ZL-L b24-2', 'B 1', -39.3809, -0.3041, true],
  ['Synuefe FK-P c22-2', 'E 1', -20.9783, -19.0668, true],
  ['Col 173 Sector CC-K b25-8', 'A 5', 77.4091, 62.0971, true],
  ['Col 173 Sector ME-P d6-92', 'B 5', -17.5551, 68.0306, true],
  ['Col 173 Sector YF-N b23-5', 'A 5', 5.1764, -54.8679, false],
  ['Col 173 Sector YF-N b23-6', 'A 3', 50.0511, -103.6453, false],
  ['Vela Dark Region RY-R b4-7', 'A 1', 23.1817, 51.5521, false],
  ['Vela Dark Region EL-Y d55', '1', -14.6799, 51.6902, true],
  ['Col 173 Sector RU-O d6-16', 'A 2 A', -23.8931, -58.4678, true],
  ['Col 173 Sector GS-J b25-4', 'D 2', 5.5275, 144.351, true],
  ['Col 173 Sector KY-Q d5-26', '6 A', 61.2262, 53.4023, true],
  ['Col 173 Sector DO-F c12-4', 'A 1', 15.887, -18.7158, false],
  ['Col 173 Sector BO-F c12-24', 'A 3', 46.7568, 131.9607, false],
  ['Col 173 Sector HN-I b26-5', 'A 1', -35.5002, -126.2597, true],
  ['Synuefe NL-N c23-4', 'B 3', -34.8383, 132.8863, true],
];

export const SOURCE_SITES = Object.freeze({ nom: 'galnet.fr (tableau de Canonn Research)', date: '2018-03-01', url: 'https://galnet.fr/portfolio/bases-guardians/' });

/**
 * Structures connues : { systeme, corps, latitude, longitude, active, plan }, les actives d'abord, puis par système.
 * plan : 'module', 'arme' ou null quand on ne sait pas (guides.js).
 */
export const SITES_CONNUS = Object.freeze(BRUT
  .map(([systeme, corps, latitude, longitude, active]) => Object.freeze({ systeme, corps, latitude, longitude, active, plan: PLAN_DES_SITES[`${systeme}|${corps}`] ?? null }))
  .sort((a, b) => Number(b.active) - Number(a.active) || a.systeme.localeCompare(b.systeme, 'fr', { numeric: true })));
