// Tests du constructeur de builds : statistiques comparées au jeu, aller-retour du lien EDSY,
// règles d'installation des modules. Nécessite les données de référence (sinon ignorés).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REF_DIR } from '../../core/reference/download.js';
import { loadEddb, decodeEdsy, extractHash } from '../../core/reference/edsy.js';
import { decodedToBuild, encodeEdsy, loadoutToBuild, maxCoreBuild, moduleAllowed, stockBuild, buildToDecoded } from '../../core/reference/edsyBuild.js';
import { computeStats, massCurve, effectiveResistance } from './stats.js';
import { inaraName, inaraSearch, parseInaraPage } from './inara.js';
import { ingenierieDe } from './index.js';

const eddb = fs.existsSync(`${REF_DIR}/edsy/eddb.js`) ? loadEddb(REF_DIR) : null;
const withEdsy = eddb ? test : test.skip;
// Configuration réelle d'un Panther Clipper Mk II (journal du 28 oct. 2026, nom et immatriculation retirés)
const panther = JSON.parse(fs.readFileSync(new URL('./fixtures/panther-loadout.json', import.meta.url), 'utf8'));

withEdsy('Panther réel : masse et portée identiques à celles calculées par le jeu', () => {
  const { build, warnings } = loadoutToBuild(eddb, panther);
  assert.deepEqual(warnings, []);
  const s = computeStats(eddb, build);
  assert.equal(Math.round(s.mass.dry * 10) / 10, panther.UnladenMass); // 1 506 t
  assert.equal(s.jump.max.toFixed(2), panther.MaxJumpRange.toFixed(2)); // 37,84 al
  assert.equal(s.cargo, panther.CargoCapacity);
  assert.equal(s.fuel, panther.FuelCapacity.Main);
});

withEdsy('lien EDSY : export puis import redonne exactement le même build', () => {
  const { build } = loadoutToBuild(eddb, panther);
  build.name = 'Panther marchand ⇄ Cemiess';
  const url = encodeEdsy(eddb, build);
  assert.match(url, /^https:\/\/edsy\.org\/#\/L=/);
  const back = decodedToBuild(eddb, decodeEdsy(eddb, extractHash(url)));
  assert.equal(back.name, 'Panther marchand <-> Cemiess'); // « ⇄ » n'existe pas dans le format EDSY
  assert.deepEqual(back.slots, build.slots);
  assert.equal(back.shipId, build.shipId);
});

withEdsy('aller-retour sur tous les vaisseaux d\'origine', () => {
  for (const id of Object.keys(eddb.ship)) {
    const b = stockBuild(eddb, id, 'test');
    const back = decodedToBuild(eddb, decodeEdsy(eddb, extractHash(encodeEdsy(eddb, b))));
    assert.deepEqual(back.slots, b.slots, eddb.ship[id].name);
  }
});

/** Lien → build → lien. */
const relink = (url) => encodeEdsy(eddb, decodedToBuild(eddb, decodeEdsy(eddb, extractHash(url))));

withEdsy('lien EDSY décodé puis réencodé : exactement le même lien (corpus du golden, tous les vaisseaux)', () => {
  const corpus = JSON.parse(fs.readFileSync(new URL('./__golden__/corpus.json', import.meta.url), 'utf8'));
  for (const c of corpus.cases) {
    const url = encodeEdsy(eddb, c.build);
    assert.equal(relink(url), url, c.id);
  }
  for (const id of Object.keys(eddb.ship)) {
    for (const b of [stockBuild(eddb, id, `origine ${id}`), maxCoreBuild(eddb, id, 'max « A » é')]) {
      const url = encodeEdsy(eddb, b);
      assert.equal(relink(url), url, eddb.ship[id].name);
    }
  }
  // Lien écrit par edsy.org (prix, priorités, valeurs saisies) : normalisé une fois, puis stable
  let checked = 0;
  for (const l of corpus.links) {
    let once;
    try {
      once = relink(l.input);
    } catch {
      continue; // lien refusé (trop ancien, vaisseau inconnu, pas de lien) : couvert par le golden
    }
    assert.equal(relink(once), once, l.id);
    checked++;
  }
  assert.ok(checked >= 4);
});

withEdsy('eddb.js lu comme une donnée : tableaux comparables, valeurs spéciales conservées', () => {
  assert.equal(Object.keys(eddb.ship).length, 49);
  assert.equal(Object.keys(eddb.module).length, 965);
  // Tableaux de ce contexte (avec l'ancien chargeur par vm, deepStrictEqual échouait sur des builds identiques)
  assert.deepStrictEqual(stockBuild(eddb, 6).slots.component.length, eddb.ship[6].slots.component.length);
  assert.deepStrictEqual([...eddb.ship[6].slots.hardpoint], eddb.ship[6].slots.hardpoint);
  assert.ok(Object.values(eddb.module).some((m) => m.activerng === Infinity || m.rof === Infinity));
});

withEdsy('modification et effet expérimental conservés par le lien, et pris en compte dans les stats', () => {
  const { build } = loadoutToBuild(eddb, panther);
  const fsd = build.slots.component[3];
  const plain = { ...build, slots: { ...build.slots, component: build.slots.component.map((s, i) => (i === 3 ? { ...fsd, bpid: null, grade: 0, expid: null } : s)) } };
  const engineered = { ...build, slots: { ...build.slots, component: build.slots.component.map((s, i) => (i === 3 ? { ...fsd, bpid: 'cfsd_ir', grade: 5, expid: 'cfsdx_mm' } : s)) } };
  const back = decodedToBuild(eddb, decodeEdsy(eddb, extractHash(encodeEdsy(eddb, engineered))));
  assert.deepEqual(back.slots.component[3], engineered.slots.component[3]);
  assert.ok(computeStats(eddb, engineered).jump.max > computeStats(eddb, plain).jump.max * 1.3);
});

withEdsy('build → noms du journal (pour l\'ingénierie)', () => {
  const { build } = loadoutToBuild(eddb, panther);
  const d = buildToDecoded(eddb, build);
  const fsd = d.slots.find((s) => s.group === 'component' && s.index === 3);
  assert.equal(fsd.symbol, 'int_hyperdrive_overcharge_size7_class5');
  assert.equal(fsd.blueprint, panther.Modules.find((m) => m.Slot === 'FrameShiftDrive').Engineering.BlueprintName);
});

withEdsy('emplacements : taille, groupe et restrictions respectés', () => {
  const pid = loadoutToBuild(eddb, panther).build.shipId;
  const find = (fd) => Number(Object.keys(eddb.module).find((k) => eddb.module[k].fdname === fd));
  const rack8 = find('Int_CargoRack_Size8_Class1');
  const sg7 = find('Int_ShieldGenerator_Size7_Class5');
  const ship = eddb.ship[pid];
  const small = ship.slots.internal.findIndex((s) => s === 1);
  assert.equal(moduleAllowed(eddb, pid, 'internal', small, rack8), false); // trop grand
  assert.equal(moduleAllowed(eddb, pid, 'hardpoint', 0, rack8), false); // mauvais groupe
  const cargoOnly = ship.slotnames.internal.findIndex((n) => /^Cargo/i.test(n));
  assert.equal(moduleAllowed(eddb, pid, 'internal', cargoOnly, sg7), false); // soute uniquement
  assert.equal(moduleAllowed(eddb, pid, 'internal', cargoOnly, rack8), true);
  // FSD SCO plus petite que l'emplacement : acceptée par le jeu (SCO 5A sur la FSD de classe 8 du Panther)
  assert.equal(moduleAllowed(eddb, pid, 'component', 3, find('Int_Hyperdrive_Overcharge_Size5_Class5')), true);
});

test('courbe de masse : optimum à la masse optimale, bornes respectées', () => {
  assert.equal(Math.round(massCurve(1060, 530, 1060, 2650, 70, 120, 170)), 120);
  assert.equal(Math.round(massCurve(2650, 530, 1060, 2650, 70, 120, 170)), 70);
  assert.equal(Math.round(massCurve(100, 530, 1060, 2650, 70, 120, 170)), 170);
});

test('résistances : rendements décroissants au-delà de 30 %', () => {
  assert.equal(Math.round(effectiveResistance(0, 20)), 20);
  assert.ok(effectiveResistance(0, 80) < 80);
  assert.ok(effectiveResistance(0, 80) > 30);
});

test('nom pour Inara : classe, note, monture entre crochets, blindage avec le vaisseau', () => {
  assert.equal(inaraName({ class: 6, rating: 'E', name: 'Cargo Rack (Cap: 64)' }), '6E Cargo Rack');
  assert.equal(inaraName({ class: 2, rating: 'G', name: 'Pulse Laser', mount: 'T' }), '2G Pulse Laser [Tourelle]');
  assert.equal(inaraName({ class: 3, rating: 'C', name: 'Beam Laser', mount: 'G' }), '3C Beam Laser [Gimbal]');
  assert.equal(inaraName({ class: 5, rating: 'E', name: 'Anti-Corrosion Cargo Rack' }), '5E Corrosion Resistant Cargo Rack');
  assert.equal(inaraName({ class: 1, rating: 'C', name: 'Lightweight Alloy' }, { armour: true, ship: 'Python' }), 'Lightweight Alloy - Python');
});

test('recherche Inara : numéros lus dans la page enregistrée, adresse avec le système, noms absents à part', () => {
  const ids = parseInaraPage(`<select name="pa3[]"><option value="xship60">Python</option>
    <option value="71501">6E Cargo Rack</option><option value="72685">3A Collector Limpet Controller</option>
    <option value="18255">3C Beam Laser [Gimbal]</option></select>`);
  assert.deepEqual(ids, { 'ship:python': 'xship60', '6e cargo rack': 71501, '3a collector limpet controller': 72685, '3c beam laser [gimbal]': 18255 });
  const r = inaraSearch(['6E Cargo Rack', '6E Cargo Rack', '3A Collector Limpet Controller', '9Z Inconnu'], ids, 'Synuefe OU-E c28-2', 'Python');
  assert.equal(r.url, 'https://inara.cz/elite/nearest-outfitting/?formbrief=1&pa3%5B%5D=xship60&pa3%5B%5D=71501&pa3%5B%5D=72685&ps1=Synuefe+OU-E+c28-2&pi18=0&pi19=0&pi17=0&pi14=0');
  assert.equal(r.found, 3);
  assert.deepEqual(r.missing, ['9Z Inconnu']);
});

withEdsy('vaisseau neuf : modules de base au plus grand en A, blindage et types d\'origine gardés', () => {
  const pid = Number(Object.keys(eddb.ship).find((k) => eddb.ship[k].name === 'Type-8 Transporter'));
  const stock = stockBuild(eddb, pid);
  const max = maxCoreBuild(eddb, pid);
  assert.deepEqual(max.slots.component[0], stock.slots.component[0]);
  const fsd = eddb.module[max.slots.component[3].modid];
  assert.deepEqual([fsd.mtype, fsd.class, fsd.rating], [eddb.module[stock.slots.component[3].modid].mtype, eddb.ship[pid].slots.component[3], 'A']);
  for (const [i, s] of max.slots.component.entries()) {
    if (i === 0) continue;
    assert.equal(eddb.module[s.modid].name, eddb.module[stock.slots.component[i].modid].name); // pas de variante PreEng
    assert.ok(moduleAllowed(eddb, pid, 'component', i, s.modid));
  }
  assert.deepEqual(max.slots.internal, stock.slots.internal);
});

withEdsy('statistiques détaillées : boucliers, armes, distributeur, portée totale, prix', () => {
  const pid = Number(Object.keys(eddb.ship).find((k) => eddb.ship[k].name === 'Python'));
  const find = (fd) => Number(Object.keys(eddb.module).find((k) => eddb.module[k].fdname === fd));
  const build = maxCoreBuild(eddb, pid);
  build.slots.internal[0] = { modid: find('Int_ShieldGenerator_Size6_Class5'), bpid: null, grade: 0, expid: null };
  build.slots.hardpoint = build.slots.hardpoint.map(() => null); // lasers d'origine retirés
  build.slots.hardpoint[0] = { modid: find('Hpt_MultiCannon_Gimbal_Large'), bpid: null, grade: 0, expid: null };
  const s = computeStats(eddb, build);
  assert.ok(s.shields > 0);
  // -20 % thermique, +40 % cinétique, par rapport à l'absolu (pips SYS compris, 2 par défaut comme EDSY)
  assert.ok(s.shield.effective.thm < s.shield.effective.abs && s.shield.effective.kin > s.shield.effective.abs);
  assert.ok(s.shield.effective.abs > s.shields && s.shield.pips === 2);
  assert.ok(computeStats(eddb, build, { sysPips: 4 }).shield.effective.abs > s.shield.effective.abs);
  assert.equal(computeStats(eddb, build, { sysPips: 0 }).shield.effective.abs, s.shields, 'sans pip SYS : le bouclier brut');
  assert.ok(s.shield.rebuild > 0 && s.shield.regen > 0);
  assert.ok(s.armament.byType.kin > 0 && s.armament.byType.thm === 0);
  assert.ok(s.armament.burst >= s.armament.sustained);
  assert.ok(s.distributor.wep.cap > 0 && s.boosts >= 1);
  assert.ok(s.jump.range > s.jump.max);
  assert.ok(s.cost.total > s.cost.hull && Math.abs(s.cost.rebuy - s.cost.total * 0.05) < 1);
});

withEdsy('noms français : tous les modules EDSY traduits, capacité et monture dans le libellé', async () => {
  const { moduleLabel, untranslated } = await import('./names.js');
  const names = new Set();
  for (const m of Object.values(eddb.module)) if (m.name) names.add(m.name);
  assert.deepEqual(untranslated([...names]), []);
  const find = (fd) => eddb.module[Object.keys(eddb.module).find((k) => eddb.module[k].fdname === fd)];
  assert.equal(moduleLabel(find('Int_CargoRack_Size6_Class1')), '6E Soute (64 t)');
  assert.equal(moduleLabel(find('Hpt_MultiCannon_Gimbal_Large')), '3C Multicanon (cardan)');
  assert.equal(moduleLabel(find('Int_Hyperdrive_Overcharge_Size5_Class5')), '5A Réacteur FSD (SCO)');
});

withEdsy('Loadout abîmé (journal, export collé) : modules qui ne sont pas une liste d’objets ignorés, jamais d’exception', () => {
  for (const Modules of ['pas une liste', { Slot: 'Armour' }, [null, 3, 'x', ...panther.Modules.slice(0, 2)]]) {
    const r = loadoutToBuild(eddb, { ...panther, Modules, ShipName: 42 });
    assert.ok(r, JSON.stringify(Modules).slice(0, 40));
    assert.equal(r.build.name, '', 'nom qui n’est pas un texte : vide');
  }
});

test('page Inara piégée : 4 Mo mal formés lus en temps linéaire ; « __proto__ » ou « constructor » restent de simples noms', () => {
  // « <option value="1" » répété sans « > » : avant, chaque essai relisait la suite (plusieurs minutes de serveur bloqué)
  const piege = '<option value="1" '.repeat(Math.ceil((4 * 1024 * 1024) / 18));
  const t0 = performance.now();
  assert.deepEqual(parseInaraPage(piege), {});
  assert.deepEqual(parseInaraPage('<option value="2">'.repeat(200_000)), {});
  assert.ok(performance.now() - t0 < 2000, `${Math.round(performance.now() - t0)} ms`);
  const ids = parseInaraPage('<option value="7">__proto__</option><option value="8">6E Cargo Rack</option>');
  assert.equal(Object.getPrototypeOf(ids), Object.prototype);
  assert.equal(ids.__proto__, 7);
  assert.deepEqual(inaraSearch(['constructor', 'toString', '6E Cargo Rack'], ids, 'Sol').missing, ['constructor', 'toString']);
});

test('badge ingénierie : modules ingéniérés lus dans le Loadout, grade le plus haut', () => {
  assert.deepEqual(ingenierieDe(panther), { modules: 2, gradeMax: 5 });
  assert.deepEqual(ingenierieDe({ Modules: [{ Slot: 'A' }, { Engineering: null }, null] }), { modules: 0, gradeMax: null });
  assert.deepEqual(ingenierieDe({ Modules: [{ Engineering: { Level: 'x' } }] }), { modules: 1, gradeMax: null });
  assert.deepEqual(ingenierieDe({ Modules: 'pas une liste' }), { modules: 0, gradeMax: null });
  assert.deepEqual(ingenierieDe(null), { modules: 0, gradeMax: null });
});

withEdsy('aperçu des vaisseaux : tous les vaisseaux, emplacements, soute et sauts cohérents', async () => {
  const { apercuVaisseaux } = await import('./apercu.js');
  const liste = apercuVaisseaux(eddb);
  assert.equal(liste.length, Object.keys(eddb.ship).length);
  for (const v of liste) {
    assert.ok([1, 2, 3].includes(v.pad), v.name);
    assert.ok(v.sautMax >= v.sautOrigine, `${v.name} : saut max ${v.sautMax} < origine ${v.sautOrigine}`);
    assert.ok(v.souteMax >= 0 && v.internes.length > 0, v.name);
  }
  const par = new Map(liste.map((v) => [v.name, v]));
  // Panther Clipper Mk II de l’auteur : 1 184 t de soute en jeu (nov. 2026), le maximum permis ne peut être plus petit
  assert.ok(par.get('Panther Clipper Mk II').souteMax >= 1184);
  assert.equal(par.get('Anaconda').pad, 3);
  assert.deepEqual(par.get('Imperial Cutter').militaires, [5, 5]);
  // Le Mandalay, vaisseau d'exploration, saute plus loin que l'Anaconda en configuration d'explo
  assert.ok(par.get('Mandalay').sautMax > par.get('Anaconda').sautMax);
});

withEdsy('limites du jeu : deux générateurs de boucliers refusés, un seul accepté ; quatre armes expérimentales au plus', async () => {
  const { depassements, limitText } = await import('./limites.js');
  const { stockBuild, moduleAllowed } = await import('../../core/reference/edsyBuild.js');
  const shipId = Number(Object.keys(eddb.ship).find((k) => eddb.ship[k].name === 'Python'));
  const build = stockBuild(eddb, shipId);
  const sg = Object.keys(eddb.module).map(Number).filter((id) => eddb.module[id].mtype === 'isg' && eddb.module[id].class === 3);
  const places = build.slots.internal.map((_, i) => i).filter((i) => moduleAllowed(eddb, shipId, 'internal', i, sg[0]));
  assert.ok(places.length >= 2);
  const fit = (modid) => ({ modid, bpid: null, grade: 0, expid: null });
  build.slots.internal = build.slots.internal.map(() => null);
  build.slots.internal[places[0]] = fit(sg[0]);
  assert.deepEqual(depassements(eddb, build), []);
  build.slots.internal[places[1]] = fit(sg[0]);
  const d = depassements(eddb, build);
  assert.equal(d.length, 1);
  assert.equal(d[0].key, 'isg');
  assert.match(d[0].texte, /^un seul générateur de boucliers par vaisseau \(2 installés\)$/);
  assert.equal(limitText('hex', 4), '4 armes expérimentales au plus par vaisseau');
});

// Corsaire de combat de l’auteur (15 nov. 2026), lu dans edsy.org : boucliers effectifs avec 2 pips SYS (défaut d'EDSY),
// retour à 50 % (16 s d'attente comprises) et 50 → 100 %, bridés par le distributeur
withEdsy('boucliers comme EDSY : pips SYS, recharge bridée par le distributeur (Corsaire, 15 nov. 2026)', () => {
  const lien = 'https://edsy.org/#/L=KH00000H4C0S00,HgBG0BH_W0HgBG0BH_W0EkhG03P_W0HewG0BH_W0HewG05I_W0EjHG03P_W0,DBwG09I_W0DBwG09I_W0DBwG09I_W0DBwG05I_W0,9onG05I_W0ABkG07K_W0ARMG05I_W0AdtG05J_W0AsOG03G_W0BAEG0DH_W0BOIG03G_W0Bcg00,,7UeG09K_W07jwG054_W07jwG054_W016yG05I_W016yG05I_W016yG05I_W015OG05I_W013qG05I_W012GG05I_W00nF00,Cordaire';
  let decoded;
  try {
    decoded = decodeEdsy(eddb, extractHash(lien));
  } catch {
    return; // données EDSY d'une autre version : lien illisible
  }
  const sh = computeStats(eddb, decodedToBuild(eddb, decoded)).shield;
  const proche = (a, b) => assert.ok(Math.abs(a - b) < 1e-3 * Math.max(1, b), `${a} ≠ ${b}`);
  proche(sh.effective.abs, 1179.3180227812438);
  proche(sh.effective.kin, 2575.811355686579);
  proche(sh.effective.thm, 3090.9736268238944);
  proche(sh.effective.exp, 3709.168352188673);
  proche(sh.pipResistance, 0.33287084162035346);
  proche(sh.rebuild, 164.158026334012);
  proche(sh.fromHalf, 169.82258572334655);
});

withEdsy('aperçu des vaisseaux : capacités (Rhino, soute Mk II, chasseurs…) et modules exclusifs', async () => {
  const { apercuVaisseaux } = await import('./apercu.js');
  const par = new Map(apercuVaisseaux(eddb).map((v) => [v.name, v]));
  // Rhino : seulement là où le grand hangar de véhicule planétaire est accepté
  assert.equal(par.get('Type-11 Prospector').capacites.rhino, true);
  assert.equal(par.get('Panther Clipper Mk II').capacites.rhino, true);
  assert.equal(par.get('Python').capacites.rhino, false);
  assert.equal(par.get('Python').capacites.srv, true);
  const souteMk2 = [...par.values()].filter((v) => v.capacites.souteMk2).map((v) => v.name).sort();
  assert.deepEqual(souteMk2, ['Anaconda Mk II', 'Panther Clipper Mk II']);
  assert.equal(par.get('Type-11 Prospector').capacites.droneMinageMk2, true);
  assert.equal(par.get('Sidewinder').capacites.chasseurs, false);
  assert.ok(par.get('Caspian Explorer').exclusifs.length > 0);
});

withEdsy('aperçu des vaisseaux : les caches du calcul (fiches, modules permis) ne changent rien, vaisseau par vaisseau', async () => {
  const { apercuVaisseau, apercuVaisseaux } = await import('./apercu.js');
  const liste = apercuVaisseaux(eddb);
  // Sans les caches partagés (une fiche seule) : la même chose
  for (const v of liste.slice(0, 5)) assert.deepEqual(apercuVaisseau(eddb, v.id), v, v.name);
});
