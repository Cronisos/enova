// Fabrique corpus.json : une vingtaine de builds réels et variés, et les entrées des autres sections du golden.
// Outil ponctuel, lancé à la main, en LECTURE SEULE sur les données du joueur (journaux, API en GET) :
//   node server/src/modules/builder/__golden__/make-corpus.mjs "<dossier des journaux>" [http://127.0.0.1:3001]
// Sources : configurations (Loadout) des journaux de référence, ses builds enregistrés et ses plans d'ingénierie (lus par
// l'API HTTP), la fixture du Panther, et quelques builds composés ici pour couvrir ce que les vrais n'ont pas
// (bouclier prismatique, booster de FSD et armes guardian, armes rares, cas limites).
// Données personnelles retirées : nom, immatriculation et ShipID des vaisseaux, heure exacte ; noms de builds remplacés.

import fs from 'node:fs';
import path from 'node:path';
import { api } from './adapter.js';
import { format } from './snapshot.js';

const [journalDir, apiBase = 'http://127.0.0.1:3001'] = process.argv.slice(2);
if (!journalDir) {
  console.error('Usage : node make-corpus.mjs "<dossier des journaux>" [adresse du serveur]');
  process.exit(1);
}
const OUT = new URL('./corpus.json', import.meta.url);
const data = api.loadData(api.REF_DIR);
if (!data) throw new Error('Données de référence absentes (server/data/reference).');
const { eddb, ref } = data;
const lower = (x) => String(x || '').toLowerCase();

// --- Outils : identifiants d'eddb.js à partir des noms du journal ---

function modidOf(ship, fdname) {
  const t = lower(fdname);
  const own = Object.keys(ship.module || {}).find((k) => lower(ship.module[k].fdname) === t);
  const id = own ?? Object.keys(eddb.module).find((k) => lower(eddb.module[k].fdname) === t);
  if (id == null) throw new Error(`Module inconnu : ${fdname}`);
  return Number(id);
}

/** Modification d'un type de module, par son nom du journal ou par la clé coriolis de l'ingénierie (MC_Overcharged). */
function bpidOf(ship, modid, name) {
  if (!name) return null;
  const mt = eddb.mtype[api.moduleOf(eddb, ship, modid).mtype] || {};
  const symbol = lower(api.moduleOf(eddb, ship, modid).fdname);
  const hit = (mt.blueprints || []).find((b) => {
    const fd = eddb.blueprint[b]?.fdname;
    if (!fd) return false;
    if (lower(fd) === lower(name)) return true;
    return ref && ref.blueprintIn(ref.groupOf(symbol), ref.blueprintKey(fd)) === name;
  });
  if (!hit) throw new Error(`Modification inconnue pour ${symbol} : ${name}`);
  return hit;
}

function expidOf(ship, modid, name) {
  if (!name) return null;
  const mt = eddb.mtype[api.moduleOf(eddb, ship, modid).mtype] || {};
  const hit = (mt.expeffects || []).find((x) => lower(eddb.expeffect[x]?.fdname) === lower(name));
  if (!hit) throw new Error(`Effet expérimental inconnu pour ${modid} : ${name}`);
  return hit;
}

function shipIdByName(name) {
  const id = Object.keys(eddb.ship).find((k) => eddb.ship[k].name === name);
  if (!id) throw new Error(`Vaisseau inconnu : ${name}`);
  return Number(id);
}

/** Build composé : spec = { groupe: [ [nom, modification, grade, effet] | nom | null, … ] }, emplacements dans l'ordre. */
function compose(shipName, name, spec) {
  const shipId = shipIdByName(shipName);
  const ship = eddb.ship[shipId];
  const build = { shipId, name, slots: {} };
  for (const g of api.GROUPS) {
    build.slots[g] = (ship.slots[g] || []).map((_, i) => {
      const s = spec[g]?.[i];
      if (!s) return null;
      const [fd, bp, grade, exp] = Array.isArray(s) ? s : [s];
      const modid = modidOf(ship, fd);
      if (!api.moduleAllowed(eddb, shipId, g, i, modid)) throw new Error(`${shipName} : ${fd} impossible en ${g}[${i}]`);
      const bpid = bpidOf(ship, modid, bp);
      return { modid, bpid, grade: bpid ? grade || eddb.blueprint[bpid].maxgrade : 0, expid: expidOf(ship, modid, exp) };
    });
  }
  return build;
}

/** Plan d'ingénierie (emplacements coriolis) → build EDSY, même correspondance que edsyToTargets, à l'envers. */
function planToBuild(shipId, plan, name) {
  const ship = eddb.ship[shipId];
  const CORE = ['std-bh', 'std-pp', 'std-t', 'std-fsd', 'std-ls', 'std-pd', 'std-s', 'std-ft'];
  const build = { shipId, name, slots: Object.fromEntries(api.GROUPS.map((g) => [g, (ship.slots[g] || []).map(() => null)])) };
  const warnings = [];
  for (const s of plan.slots) {
    const t = s.target;
    if (!t?.module || s.restriction === 'PlanetaryApproachSuite') continue;
    const modid = modidOf(ship, t.module);
    let group;
    let index;
    if (CORE.includes(s.key)) {
      group = 'component';
      index = CORE.indexOf(s.key);
    } else {
      group = s.group === 'hardpoint' ? 'hardpoint' : s.group === 'utility' ? 'utility' : s.restriction === 'Military' ? 'military' : 'internal';
      const sizes = ship.slots[group] || [];
      const free = sizes.map((size, i) => i).filter((i) => !build.slots[group][i] && api.moduleAllowed(eddb, shipId, group, i, modid));
      index = free.find((i) => sizes[i] === s.size) ?? free.find((i) => sizes[i] >= s.size);
    }
    if (index == null) {
      warnings.push(`${s.key} : ${t.module} sans emplacement`);
      continue;
    }
    const bpid = bpidOf(ship, modid, t.blueprint);
    build.slots[group][index] = { modid, bpid, grade: bpid ? t.grade || 1 : 0, expid: expidOf(ship, modid, t.experimental) };
  }
  if (warnings.length) console.warn(name, warnings);
  return build;
}

/** Configuration du journal, sans rien qui identifie le joueur ou ses vaisseaux. */
function anonymize(lo) {
  const { ShipName, ShipIdent, ShipID, timestamp, ...rest } = lo;
  return { ...rest, timestamp: String(timestamp).slice(0, 10) };
}

/** Ce que couvre un build (aide à la lecture du corpus). */
function tagsOf(build) {
  const ship = eddb.ship[build.shipId];
  const tags = new Set();
  let eng = 0;
  let exp = 0;
  for (const g of api.GROUPS) {
    (build.slots[g] || []).forEach((s, i) => {
      if (!s?.modid) return;
      const m = api.moduleOf(eddb, ship, s.modid);
      const fd = lower(m.fdname);
      if (s.bpid) eng++;
      if (s.expid) exp++;
      if (m.mtype === 'isg') tags.add(fd.endsWith('_strong') ? 'bouclier prismatique' : fd.endsWith('_fast') ? 'bouclier bi-weave' : 'bouclier classique');
      if (m.mtype === 'cfsd' || m.mtype === 'cfsdo') {
        tags.add(m.mtype === 'cfsdo' ? 'FSD SCO' : 'FSD classique');
        if (s.bpid) tags.add(`FSD ingénié (${eddb.blueprint[s.bpid].fdname} G${s.grade}${s.expid ? ` + ${eddb.expeffect[s.expid].fdname}` : ''})`);
        if (m.class < ship.slots.component[3]) tags.add("FSD plus petit que l'emplacement");
      }
      if (m.mtype === 'ifsdb') tags.add('booster de FSD guardian');
      if (/guardian/.test(fd) && m.mtype !== 'ifsdb') tags.add('module guardian');
      if (/metaalloy/.test(fd)) tags.add('renfort méta-alliage');
      if (m.mtype === 'iscb') tags.add('cellules de bouclier');
      if (m.mtype === 'usb') tags.add('boosters de bouclier');
      if (m.mtype === 'ihrp') tags.add('renforts de coque');
      if (m.mtype === 'imrp') tags.add('renforts de modules');
      if (m.mtype === 'ipc') tags.add('cabines passagers');
      if (m.mtype === 'cbh' && s.bpid) tags.add('blindage ingénié');
      if (g === 'hardpoint') tags.add(`arme : ${eddb.mtype[m.mtype]?.name || m.mtype}`);
    });
  }
  if (!tags.has('bouclier prismatique') && !tags.has('bouclier bi-weave') && !tags.has('bouclier classique')) tags.add('sans bouclier');
  return [`${eng} modules ingéniés`, `${exp} effets expérimentaux`, ...[...tags].sort()];
}

// --- 1. Configurations réelles, lues dans les journaux (choisies pour leur variété) ---

const JOURNAL = [
  { id: 'J02', at: '2026-11-05T17:02:19Z', label: 'Federal Corvette : combat, ingénierie G5 et effets expérimentaux partout' },
  { id: 'J03', at: '2026-10-30T19:46:02Z', label: 'Anaconda : polyvalent, FSD SCO, bi-weave, effets expérimentaux' },
  { id: 'J04', at: '2026-11-02T18:57:20Z', label: 'Caspian Explorer : exploration, FSD SCO « Overcharge Booster Mk II » ingénié, sans bouclier' },
  { id: 'J05', at: '2026-10-30T19:52:59Z', label: 'Mandalay : exploration, plus de 70 al' },
  { id: 'J06', at: '2026-11-03T16:55:44Z', label: 'Panther Clipper Mk II : commerce, ingénierie et effets partiels' },
  { id: 'J07', at: '2026-11-05T16:06:04Z', label: "Panther Clipper Mk II : combat, 10 points d'emport, bi-weave 8C" },
  { id: 'J08', at: '2026-11-05T13:04:27Z', label: 'Lynx Highliner : cabines passagers et armes, effets expérimentaux' },
  { id: 'J09', at: '2026-11-01T16:24:22Z', label: 'Krait Mk II : multicanons fixes et lasers, bi-weave' },
  { id: 'J10', at: '2026-10-23T22:38:21Z', label: 'Type-11 Prospector : minage (laser, abrasion, missiles sub-surface, charges sismiques)' },
];
const wanted = new Map(JOURNAL.map((j) => [j.at, j]));
const found = new Map();
for (const f of fs.readdirSync(journalDir).filter((n) => /^Journal\..*\.log$/.test(n)).sort()) {
  for (const line of fs.readFileSync(path.join(journalDir, f), 'utf8').split('\n')) {
    if (!line.includes('"event":"Loadout"')) continue;
    const ev = JSON.parse(line);
    if (wanted.has(ev.timestamp)) found.set(ev.timestamp, ev);
  }
}

const cases = [];
const fromLoadout = (id, label, lo, source) => {
  const r = api.loadoutToBuild(eddb, lo);
  if (!r) throw new Error(`${id} : vaisseau inconnu d'EDSY`);
  const loadout = anonymize(lo);
  cases.push({ id, label, source, loadout, build: { ...r.build, name: label.split(' : ')[0] } });
};

const panther = JSON.parse(fs.readFileSync(new URL('../fixtures/panther-loadout.json', import.meta.url), 'utf8'));
fromLoadout('J01', 'Panther Clipper Mk II : commerce, FSD SCO Portée augmentée G5 (fixture du constructeur)', panther, 'fixture fixtures/panther-loadout.json');
for (const j of JOURNAL) {
  const ev = found.get(j.at);
  if (!ev) throw new Error(`${j.id} : Loadout du ${j.at} introuvable dans les journaux`);
  fromLoadout(j.id, j.label, ev, 'journal');
}

// --- 2. Builds enregistrés et plans d'ingénierie de l’auteur (API en lecture) ---

const get = async (p) => {
  const r = await fetch(`${apiBase}${p}`);
  if (!r.ok) throw new Error(`GET ${p} : ${r.status}`);
  return r.json();
};
const saved = await get('/api/modules/builder/builds');
const SAVED = [
  { id: 'B01', ship: 'Type-8 Transporter', label: 'Type-8 Transporter : build enregistré, FSD, propulseurs et distributeur ingéniés' },
  { id: 'B02', ship: 'Panther Clipper Mk II', label: 'Panther Clipper Mk II : build enregistré, combat et sauvetage, sans ingénierie' },
];
for (const s of SAVED) {
  const b = saved.find((x) => x.ship === s.ship);
  if (!b) throw new Error(`${s.id} : build enregistré introuvable`);
  cases.push({ id: s.id, label: s.label, source: 'build enregistré (constructeur)', build: { shipId: b.shipId, name: s.label.split(' : ')[0], slots: b.slots } });
}

const fleet = await get('/api/modules/builder/fleet');
const PLANS = [
  { id: 'P01', planShip: 'imperial_cutter', label: 'Imperial Cutter : plan importé d’EDSY, soutien, bi-weave thermique, 7 renforts de coque' },
  { id: 'P02', planShip: 'panthermkii', label: 'Panther Clipper Mk II : plan importé d’EDSY, commerce, bouclier prismatique' },
  { id: 'P03', planShip: 'explorer_nx', label: 'Caspian Explorer : plan importé d’EDSY, FSD SCO 8A Portée augmentée + Charge profonde, prismatique' },
];
const plans = await get('/api/modules/engineering/plans');
for (const p of PLANS) {
  const head = plans.find((x) => x.shipType === p.planShip);
  if (!head) throw new Error(`${p.id} : plan introuvable`);
  const plan = await get(`/api/modules/engineering/plans/${head.id}`);
  const shipId = fleet.find((f) => f.gameShipId === plan.plan.shipId)?.shipId;
  if (!shipId) throw new Error(`${p.id} : vaisseau du plan introuvable`);
  cases.push({ id: p.id, label: p.label, source: "plan d'ingénierie (cibles)", build: planToBuild(shipId, plan, p.label.split(' : ')[0]) });
}

// --- 3. Builds composés : ce que les builds réels ne couvrent pas ---

cases.push({
  id: 'S01',
  label: 'Python : combat, bouclier prismatique, boosters, cellules, renforts, armes variées',
  source: 'composé',
  build: compose('Python', 'Python combat (prismatique)', {
    component: [
      ['Python_Armour_Reactive', 'Armour_HeavyDuty', 5, 'special_armour_chunky'],
      ['Int_Powerplant_Size7_Class5', 'PowerPlant_Boosted', 5, 'special_powerplant_highcharge'],
      ['Int_Engine_Size6_Class5', 'Engine_Dirty', 5, 'special_engine_overloaded'],
      ['Int_Hyperdrive_Size5_Class5', 'FSD_LongRange', 5, 'special_fsd_heavy'],
      ['Int_LifeSupport_Size4_Class4', 'Misc_LightWeight', 3],
      ['Int_PowerDistributor_Size7_Class5', 'PowerDistributor_HighFrequency', 5, 'special_powerdistributor_fast'],
      ['Int_Sensors_Size6_Class4', 'Sensor_LightWeight', 5],
      'Int_FuelTank_Size5_Class3',
    ],
    hardpoint: [
      ['Hpt_MultiCannon_Gimbal_Large', 'Weapon_Overcharged', 5, 'special_auto_loader'],
      ['Hpt_PlasmaAccelerator_Fixed_Large', 'Weapon_Efficient', 5, 'special_plasma_slug'],
      ['Hpt_BeamLaser_Gimbal_Large', 'Weapon_Efficient', 5, 'special_thermal_vent'],
      ['Hpt_Railgun_Fixed_Medium', 'Weapon_LongRange', 5, 'special_feedback_cascade_cooled'],
      ['Hpt_BasicMissileRack_Fixed_Medium', 'Weapon_HighCapacity', 5, 'special_overload_munitions'],
    ],
    utility: [
      ['Hpt_ShieldBooster_Size0_Class5', 'ShieldBooster_HeavyDuty', 5, 'special_shieldbooster_chunky'],
      ['Hpt_ShieldBooster_Size0_Class5', 'ShieldBooster_HeavyDuty', 5, 'special_shieldbooster_chunky'],
      ['Hpt_ShieldBooster_Size0_Class5', 'ShieldBooster_Resistive', 5, 'special_shieldbooster_thermic'],
      ['Hpt_PlasmaPointDefence_Turret_Tiny', 'Misc_PointDefenseCapacity', 1],
    ],
    internal: [
      ['Int_ShieldGenerator_Size6_Class5_Strong', 'ShieldGenerator_Reinforced', 5, 'special_shield_health'],
      ['Int_ShieldCellBank_Size6_Class2', 'ShieldCellBank_Specialised', 4, 'special_shieldcell_gradual'],
      ['Int_HullReinforcement_Size5_Class2', 'HullReinforcement_HeavyDuty', 5, 'special_hullreinforcement_chunky'],
      ['Int_HullReinforcement_Size5_Class2', 'HullReinforcement_Thermic', 5, 'special_hullreinforcement_kinetic'],
      ['Int_ModuleReinforcement_Size5_Class2', 'MRP_HeavyDuty', 5],
      'Int_FSDInterdictor_Size4_Class5',
      'Int_DroneControl_Repair_Size3_Class5',
      'Int_Repairer_Size3_Class5',
      ['Int_CargoRack_Size2_Class1', 'CargoRack_IncreasedCapacity', 5],
      ['Int_DetailedSurfaceScanner_Tiny', 'Sensor_Expanded', 3],
    ],
  }),
});

cases.push({
  id: 'S02',
  label: 'Krait Phantom : exploration, FSD SCO + Charge profonde, booster de FSD guardian, générateur et distributeur guardian, bi-weave',
  source: 'composé',
  build: compose('Krait Phantom', 'Krait Phantom exploration', {
    component: [
      ['Krait_Light_Armour_Grade1', 'Armour_Advanced', 5],
      ['Int_GuardianPowerplant_Size5', 'GuardianModule_Sturdy', 1],
      ['Int_Engine_Size6_Class4', 'Engine_Tuned', 3, 'special_engine_lightweight'],
      ['Int_Hyperdrive_Overcharge_Size5_Class5', 'FSD_LongRange', 5, 'special_fsd_fuelcapacity'],
      ['Int_LifeSupport_Size4_Class4', 'Misc_LightWeight', 5],
      'Int_GuardianPowerDistributor_Size5',
      ['Int_Sensors_Size6_Class4', 'Sensor_LightWeight', 5],
      'Int_FuelTank_Size5_Class3',
    ],
    utility: [['Hpt_HeatSinkLauncher_Turret_Tiny', 'Misc_HeatSinkCapacity', 1]],
    internal: [
      ['Int_FuelScoop_Size6_Class5', 'FuelScoop_ScoopRateEnhanced', 3],
      'Int_GuardianFSDBooster_Size5',
      ['Int_ShieldGenerator_Size5_Class3_Fast', 'ShieldGenerator_Optimised', 5, 'special_shield_lightweight'],
      'Int_Repairer_Size5_Class2',
      'Int_DroneControl_Repair_Size3_Class2',
      'Int_SuperCruiseAssist',
      'Int_DockingComputer_Advanced',
      null,
      ['Int_DetailedSurfaceScanner_Tiny', 'Sensor_Expanded', 5],
    ],
  }),
});

cases.push({
  id: 'S03',
  label: 'Krait Mk II : anti-xéno, armes guardian et AX, renforts guardian et méta-alliage, bouclier classique ingénié',
  source: 'composé',
  build: compose('Krait Mk II', 'Krait Mk II anti-xéno', {
    component: [
      ['Krait_MkII_Armour_Grade3', 'Armour_Explosive', 5, 'special_armour_explosive'],
      'Int_GuardianPowerplant_Size7',
      ['Int_Engine_Size6_Class5', 'Engine_Dirty', 5, 'special_engine_cooled'],
      ['Int_Hyperdrive_Size5_Class5', 'FSD_FastBoot', 3],
      'Int_LifeSupport_Size4_Class4',
      'Int_GuardianPowerDistributor_Size7',
      'Int_Sensors_Size6_Class4',
      'Int_FuelTank_Size5_Class3',
    ],
    hardpoint: [
      ['Hpt_Guardian_PlasmaLauncher_Turret_Large', 'Weapon_Overcharged', 1],
      ['Hpt_Guardian_ShardCannon_Fixed_Large', 'Weapon_LongRange', 1],
      ['Hpt_ATMultiCannon_Gimbal_Large', 'Weapon_Overcharged', 5, 'special_auto_loader'],
      ['Hpt_Guardian_GaussCannon_Fixed_Medium', 'Weapon_RapidFire', 1],
      'Hpt_FlakMortar_Turret_Medium',
    ],
    utility: [
      'Hpt_XenoScanner_Advanced_Tiny',
      'Hpt_AntiUnknownShutdown_Tiny_V2',
      'Hpt_CausticSinkLauncher_Turret_Tiny',
      ['Hpt_ShieldBooster_Size0_Class5', 'ShieldBooster_Kinetic', 5, 'special_shieldbooster_toughened'],
    ],
    internal: [
      ['Int_ShieldGenerator_Size6_Class5', 'ShieldGenerator_Kinetic', 5, 'special_shield_resistive'],
      'Int_GuardianShieldReinforcement_Size5_Class2',
      'Int_MetaAlloyHullReinforcement_Size5_Class2',
      'Int_GuardianHullReinforcement_Size5_Class2',
      'Int_GuardianModuleReinforcement_Size4_Class2',
      'Int_DroneControl_Decontamination_Size3_Class1',
      'Int_Repairer_Size3_Class5',
      ['Int_HullReinforcement_Size2_Class2', 'HullReinforcement_Explosive', 3, 'special_hullreinforcement_thermic'],
    ],
  }),
});

cases.push({
  id: 'S04',
  label: 'Anaconda : armes rares (canon, fragmentation, rafale, torpilles, mines, missiles), soutes, cabines, hangar',
  source: 'composé',
  build: compose('Anaconda', 'Anaconda armes variées', {
    component: [
      ['Anaconda_Armour_Mirrored', 'Armour_Thermic', 5, 'special_armour_thermic'],
      ['Int_Powerplant_Size8_Class5', 'PowerPlant_Armoured', 5, 'special_powerplant_toughened'],
      ['Int_Engine_Size7_Class5', 'Engine_Reinforced', 5, 'special_engine_toughened'],
      ['Int_Hyperdrive_Overcharge_Size6_Class5', 'FSD_Shielded', 5, 'special_fsd_toughened'],
      ['Int_LifeSupport_Size5_Class4', 'Misc_Reinforced', 5],
      ['Int_PowerDistributor_Size8_Class5', 'PowerDistributor_PriorityWeapons', 5, 'special_powerdistributor_capacity'],
      ['Int_Sensors_Size8_Class5', 'Sensor_LongRange', 5],
      'Int_FuelTank_Size5_Class3',
    ],
    hardpoint: [
      ['Hpt_Cannon_Fixed_Huge', 'Weapon_HighCapacity', 5, 'special_force_shell'],
      ['Hpt_Slugshot_Fixed_Large', 'Weapon_DoubleShot', 5, 'special_screening_shell'],
      ['Hpt_PulseLaserBurst_Gimbal_Large', 'Weapon_Focused', 5, 'special_distortion_field'],
      ['Hpt_AdvancedTorpPylon_Fixed_Large', 'Weapon_Sturdy', 3, 'special_deep_cut_payload'],
      ['Hpt_MineLauncher_Fixed_Medium', 'Weapon_RapidFire', 3, 'special_choke_canister'],
      ['Hpt_DumbfireMissileRack_Fixed_Medium', 'Weapon_HighCapacity', 5, 'special_overload_munitions'],
      ['Hpt_PulseLaser_Gimbal_Small', 'Weapon_RapidFire', 5, 'special_scramble_spectrum'],
      ['Hpt_PulseLaser_Fixed_Small', 'Weapon_Overcharged', 2],
    ],
    utility: [
      ['Hpt_ShieldBooster_Size0_Class5', 'ShieldBooster_Explosive', 5, 'special_shieldbooster_explosive'],
      ['Hpt_ShieldBooster_Size0_Class5', 'ShieldBooster_Thermic', 5, 'special_shieldbooster_efficient'],
      ['Hpt_ShieldBooster_Size0_Class5', 'ShieldBooster_Kinetic', 5, 'special_shieldbooster_kinetic'],
      'Hpt_ShieldBooster_Size0_Class1',
      ['Hpt_ChaffLauncher_Tiny', 'Misc_ChaffCapacity', 1],
      'Hpt_ElectronicCountermeasure_Tiny',
      'Hpt_HeatSinkLauncher_Turret_Tiny',
      ['Hpt_CrimeScanner_Size0_Class5', 'Sensor_FastScan', 5],
    ],
    military: [['Int_HullReinforcement_Size5_Class2', 'HullReinforcement_Kinetic', 5, 'special_hullreinforcement_explosive']],
    internal: [
      ['Int_ShieldGenerator_Size7_Class5', 'ShieldGenerator_Thermic', 5, 'special_shield_kinetic'],
      ['Int_ShieldCellBank_Size6_Class5', 'ShieldCellBank_Rapid', 4, 'special_shieldcell_oversized'],
      'Int_FighterBay_Size6_Class1',
      'Int_PassengerCabin_Size6_Class3',
      ['Int_CargoRack_Size5_Class1', 'CargoRack_IncreasedCapacity', 5],
      'Int_FuelTank_Size5_Class3',
      'Int_Refinery_Size4_Class5',
      ['Int_DroneControl_Collection_Size3_Class5', 'Misc_LightWeight', 3],
      'Int_DroneControl_Prospector_Size3_Class5',
      'Int_BuggyBay_Size4_Class2',
      'Int_FSDInterdictor_Size2_Class5',
      'Int_DockingComputer_Standard',
    ],
  }),
});

cases.push({
  id: 'E01',
  label: 'Anaconda : cas limites (bouclier trop faible pour la coque, générateur et distributeur trop petits, propulseurs trop faibles, FSD SCO 2E)',
  source: 'composé',
  build: compose('Anaconda', 'Anaconda cas limites', {
    component: [
      'Anaconda_Armour_Grade1',
      'Int_Powerplant_Size4_Class1',
      'Int_Engine_Size3_Class1',
      'Int_Hyperdrive_Overcharge_Size2_Class1',
      'Int_LifeSupport_Size5_Class1',
      'Int_PowerDistributor_Size1_Class1',
      'Int_Sensors_Size8_Class1',
      'Int_FuelTank_Size1_Class3',
    ],
    internal: [null, null, null, null, null, null, null, null, null, null, 'Int_ShieldGenerator_Size2_Class1'],
  }),
});

for (const c of cases) c.covers = tagsOf(c.build);

// --- 4. Liens EDSY écrits à la main (format complet d'EDSY, pas seulement ce que l'app produit) ---

const e = api.hashEncode;
const slot = (modid, eng, mods = 0) => e(modid, 3) + e(eng ? 0x10 : 0, 1) + e(0, 1) + (eng ? e(eng, 2) + e(4000, 2) + e(mods, 1) + 'Ab12'.repeat(mods) : '');
const shipChunk = (id) => e(id, 1) + e(0, 1) + e(0, 1) + e(0, 2) + e(0, 1) + e(0x444, 2);
const anaconda = 6;
const python = 5;
// Lien de engineering.test.js : Anaconda, blindage composite militaire, FSD 6A Portée augmentée G5 + Gestionnaire de masse, soute 4E
const sampleHash = e(20, 1) + [shipChunk(anaconda), '', '', slot(40113) + e(199900 + 2, 3) + slot(43610, (2 << 7) | (5 << 4) | 3), '', e(199900 + 7, 3) + slot(450), api.hashEncodeT('Anaconda test é')].join(',');
// Emplacement avec prix (0x20 : octet de coût puis 2 à 5 caractères), priorités et alimentation (bits bas),
// effet pré-ingénié (0x800), deux valeurs de modification saisies (4 caractères chacune, ignorées)
const costed = (modid, eng, costLen) => e(modid, 3) + e(0x20 | (eng ? 0x10 : 0) | 0x0b, 1) + e(((costLen - 2) & 3) << 4, 1) + 'Zz9_X'.slice(0, costLen) + (eng ? e(eng, 2) + e(2345, 2) + e(2, 1) + 'Q1w2E3r4' : '');
const mcLarge = modidOf(eddb.ship[python], 'Hpt_MultiCannon_Gimbal_Large');
const sbooster = modidOf(eddb.ship[python], 'Hpt_ShieldBooster_Size0_Class5');
const sg = modidOf(eddb.ship[python], 'Int_ShieldGenerator_Size6_Class5_Strong');
const fsd5 = modidOf(eddb.ship[python], 'Int_Hyperdrive_Size5_Class5');
const mt = (id) => eddb.mtype[eddb.module[id].mtype];
const engOf = (id, bp, grade, x, pre = false) => (((mt(id).blueprints.indexOf(bp) + 1) & 0xf) << 7) | (grade << 4) | ((x ? mt(id).expeffects.indexOf(x) + 1 : 0) & 0xf) | (pre ? 0x800 : 0);
const fullHash = e(20, 1) + [
  shipChunk(python) + e(49180, 3) + e(0, 1) + e(0, 1),
  costed(mcLarge, engOf(mcLarge, 'wpn_oc', 5, 'wpnx_aulo'), 4) + e(199900 + 1, 3) + slot(mcLarge),
  costed(sbooster, engOf(sbooster, 'usb_hd', 5, 'usbx_sc', true), 2) + costed(sbooster, 0, 5),
  slot(modidOf(eddb.ship[python], 'Python_Armour_Grade3')) + e(199900 + 2, 3) + slot(fsd5, engOf(fsd5, 'cfsd_ir', 4, 'cfsdx_mm'), 3),
  '',
  slot(sg, engOf(sg, 'isg_rf', 5, 'isgx_hc'), 1) + e(199900 + 3, 3) + slot(450),
  api.hashEncodeT('Python : test (EDSY) #3 ! « Été »'),
].join(',');

const links = [
  { id: 'D01', label: 'lien v20 de engineering.test.js (Anaconda, FSD ingénié, soute après 7 emplacements vides)', input: `https://edsy.org/#/L=${encodeURIComponent(sampleHash)}` },
  { id: 'D02', label: 'lien de engineering.test.js : blindage de Federal Corvette modifié G5', input: 'https://edsy.org/#/L=Kz00000O6C0S00,,,9onG05I_W0,,,' },
  { id: 'D03', label: 'format complet : prix, priorités, effet pré-ingénié, valeurs de modification, trous, nom avec ponctuation', input: `https://edsy.org/#/L=${encodeURIComponent(fullHash)}&extra=1` },
  { id: 'D04', label: 'version 15 (la plus ancienne acceptée), sans nom', input: `https://edsy.org/#/L=${e(15, 1)}${[shipChunk(1), '', '', slot(40131), '', ''].join(',')}` },
  { id: 'D05', label: 'version 12 : refusée', input: `L=${e(12, 1)}6,,` },
  { id: 'D06', label: 'vaisseau inconnu (#30) : refusé', input: `https://edsy.org/#/L=${e(20, 1)}${shipChunk(30)},,,,,,` },
  { id: 'D07', label: 'module inconnu (#99999) dans les internes', input: `https://edsy.org/#/L=${e(20, 1)}${[shipChunk(1), '', '', slot(40131), '', slot(99999)].join(',')}` },
  { id: 'D08', label: 'texte collé sans lien', input: 'Voici mon build : pas de lien ici' },
];

// --- 5. Codage des nombres et des noms, extraction ---

const hash = {
  encode: [[0, 1], [5, 1], [63, 1], [64, 2], [0x444, 2], [4000, 2], [4095, 2], [5000, 2], [199900, 3], [199907, 3], [262143, 3], [12, 3]],
  decode: ['0', 'z', '-', '_', '10', '_-', 'Kz0', '!!', 'é', ''],
  texts: ['Panther marchand', 'Anaconda test é', 'Cutter « full déf »', 'a b-c_d.e/f', 'Ünïcødé ŒŸ ∑', 'A ⇄ B 🚀', '~`{}|\\"\'', '', 'ÿĀ'],
  rawT: ['_0', '_W', '-00', '-0-', '-zz', 'ab_', '-0', '_'],
  names: ['A ⇄ B', 'x ↔ y', 'emoji 🚀 ok', 'Été', '', null, 'ሀ'],
  extract: [
    'https://edsy.org/#/L=Kz00000O6C0S00,,,9onG05I_W0,,,',
    'https://edsy.org/#/L=abc%2Cdef&I=1',
    '  L=xyz  ',
    'https://edsy.org/#/I=1/L=K1',
    'https://edsy.org/#/L=%E0%A4%A',
    'pas de lien',
    '',
    'https://edsy.org/?L=abc',
  ],
};

// --- 6. Configurations du journal inhabituelles ---

const loadoutEdges = [
  { id: 'L01', label: 'vaisseau inconnu', input: { event: 'Loadout', Ship: 'vaisseau_inconnu', Modules: [] } },
  {
    id: 'L02',
    label: 'Sidewinder : module inconnu, modification inconnue, interne sans emplacement, décoration ignorée',
    input: {
      event: 'Loadout',
      Ship: 'SideWinder',
      Modules: [
        { Slot: 'Armour', Item: 'sidewinder_armour_grade1' },
        { Slot: 'FrameShiftDrive', Item: 'int_hyperdrive_size2_class5', Engineering: { BlueprintName: 'FSD_LongRange', Level: 5, ExperimentalEffect: 'special_fsd_heavy' } },
        { Slot: 'SmallHardpoint1', Item: 'hpt_pulselaser_fixed_small', Engineering: { BlueprintName: 'Weapon_Overcharged', Level: 3 } },
        { Slot: 'TinyHardpoint1', Item: 'hpt_heatsinklauncher_turret_tiny' },
        { Slot: 'Slot01_Size2', Item: 'int_module_inconnu_size2' },
        { Slot: 'Slot02_Size2', Item: 'int_cargorack_size2_class1', Engineering: { BlueprintName: 'Modification_Inconnue', Level: 3 } },
        { Slot: 'Slot09_Size4', Item: 'int_cargorack_size4_class1' },
        { Slot: 'Decal1', Item: 'decal_trade_elite' },
      ],
    },
  },
  { id: 'L03', label: 'export imbriqué (tableau, en-tête, data)', input: [{ header: {} }, { data: { event: 'Loadout', Ship: 'Python', Modules: [{ Slot: 'Armour', Item: 'python_armour_grade1' }] } }] },
  { id: 'L04', label: 'export avec « ship » en minuscules : trouvé mais non converti', input: { ship: 'python', Modules: [] } },
  { id: 'L05', label: 'JSON sans configuration', input: { foo: { bar: [1, 2, 3] } } },
];

// --- 7. Grilles des formules ---

const massCurve = [[1060, 530, 1060, 2650, 70, 120, 170], [2650, 530, 1060, 2650, 70, 120, 170], [100, 530, 1060, 2650, 70, 120, 170], [3000, 530, 1060, 2650, 70, 120, 170], [800, 800, 800, 2000, 50, 100, 150]];
for (const fd of ['Int_Engine_Size3_Class5_Fast', 'Int_Engine_Size7_Class5', 'Int_Engine_Size7_Class5_GravityOptimised_MkII', 'Int_ShieldGenerator_Size6_Class5_Strong', 'Int_ShieldGenerator_Size5_Class3_Fast', 'Int_ShieldGenerator_Size8_Class1']) {
  const m = eddb.module[modidOf({}, fd)];
  const isg = m.mtype === 'isg';
  const [mn, op, mx] = isg ? [m.genminmass, m.genoptmass, m.genmaxmass] : [m.engminmass, m.engoptmass, m.engmaxmass];
  const [a, b, c] = isg ? [m.genminmul, m.genoptmul, m.genmaxmul] : [m.engminmul, m.engoptmul, m.engmaxmul];
  for (const mass of [0, mn, (mn + op) / 2, op, (op + mx) / 2, mx]) massCurve.push([mass, mn, op, mx, a, b, c]);
}
const effectiveResistance = [];
for (const base of [-20, 0, 20, 30, 45, 60]) for (const extra of [0, 10, 25, 50, 75, 95]) for (const exempt of [0, 25]) for (const best of [0, 30, 60]) effectiveResistance.push([base, extra, exempt, best]);

const corpus = {
  about: "Entrées du golden du constructeur de builds (voir golden.test.js). Builds au format EDSY (identifiants d'eddb.js) ; loadout : configuration du journal d'origine, anonymisée.",
  eddb: data.version,
  cases,
  links,
  hash,
  loadoutEdges,
  formulas: { massCurve, effectiveResistance },
};
fs.writeFileSync(OUT, format(corpus, { cases: 2 })); // une ligne par champ de chaque build
console.log(`corpus.json : ${cases.length} builds, ${links.length} liens, ${loadoutEdges.length} configurations limites`);
for (const c of cases) console.log(`${c.id}  ${c.label}\n      ${c.covers.join(' · ')}`);
