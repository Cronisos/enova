// EEP balayés (Mes repères › EEP balayés) : chaque EEP dont tu as fait le balayage, rangé par système et par planète,
// avec son numéro (quand le jeu l'a donné), son nom, sa couverture et ses minerais. « 🗺 Afficher la carte » ouvre la
// carte ronde ; « Partager » l'enregistre en fichier de carte (à envoyer : un autre joueur l'importe dans son app) ou
// en image (à poster sur Discord) ; « 📥 Importer une carte » ajoute un EEP reçu, avec ses repères de minerais.

import { useEffect, useRef, useState } from 'react';
import { useEvent } from '../../core/stream.js';
import Modale from '../../core/Modale.jsx';
import NomSysteme from '../../core/NomSysteme.jsx';
import { dateTime } from '../../core/format.js';
import { meters, wpApi } from './api.js';
import { couleurMinerai } from './oreColors.js';
import CarteEEP from './CarteEEP.jsx';

const pct = (p) => `${Math.floor((p || 0) * 100)} %`;
/** « EEP 4 · Platine nord », « EEP 4 », « Platine nord », ou « EEP sans numéro ». */
export const titreEep = (e) => [e.numero != null && `EEP ${e.numero}`, e.nom].filter(Boolean).join(' · ') || 'EEP sans numéro';
/** Nom de fichier sûr : « EEP 4 - Synuefe OU-E c28-2 4 ». */
const nomFichier = (e) => `${titreEep(e)} - ${e.body || ''}`.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 100);

function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Teinte de l'app en clair (« 255, 154, 60 ») : l'image n'a pas la feuille de style. */
const teinte = () => getComputedStyle(document.documentElement).getPropertyValue('--acc-rgb').trim() || '255, 154, 60';

/** Image PNG de la carte, avec son titre, sa planète et ses minerais : à poster sur Discord. */
async function image(e, vue) {
  const acc = teinte();
  // react-dom/server (190 Ko) chargé seulement ici, au premier export en image : pas dans chaque fenêtre de l'app
  const { renderToStaticMarkup } = await import('react-dom/server');
  const svg = renderToStaticMarkup(<CarteEEP v={vue} accRgb={acc} className="" />);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const W = 900;
  const H = 1080;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#07090c';
  g.fillRect(0, 0, W, H);
  g.fillStyle = `rgb(${acc})`;
  g.font = '700 34px "Segoe UI", system-ui, sans-serif';
  g.fillText(titreEep(e), 30, 56);
  g.fillStyle = '#dfe4ea';
  g.font = '22px "Segoe UI", system-ui, sans-serif';
  g.fillText(`${e.body || ''} · ${e.system || ''}`, 30, 92);
  g.fillStyle = '#8a94a0';
  g.font = '18px "Segoe UI", system-ui, sans-serif';
  g.fillText(`Rayon ${meters(e.radius)} · balayé à ${pct(e.covered)} · centre ${e.center.latitude.toFixed(4)} / ${e.center.longitude.toFixed(4)}`, 30, 122);
  g.drawImage(img, 20, 140, 860, 860);
  let x = 30;
  g.font = '18px "Segoe UI", system-ui, sans-serif';
  for (const m of e.minerais) {
    const t = `${m.ore} ×${m.n}`;
    g.fillStyle = couleurMinerai(m.ore);
    g.fillRect(x, 1030, 12, 12);
    g.fillStyle = '#dfe4ea';
    g.fillText(t, x + 18, 1042);
    x += g.measureText(t).width + 40;
    if (x > W - 120) break;
  }
  g.fillStyle = '#4a525c';
  g.font = '14px "Segoe UI", system-ui, sans-serif';
  g.fillText('Enova · carte d’EEP', W - 220, H - 12);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}

function CarteModale({ id, onFermer }) {
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    wpApi.eepCarte(id).then(setD, (e) => setErreur(e.message));
  }, [id]);
  const pied = d?.state === 'ready' && <Partage e={d} vue={d.vue} />;
  return (
    <Modale titre={d ? titreEep(d) : 'Carte de l’EEP'} onFermer={onFermer} pied={pied}>
      {erreur && <p className="bad">{erreur}</p>}
      {!d && !erreur && <p className="muted">Chargement…</p>}
      {d && (
        <div className="eep-carte">
          <p className="small muted">{d.body} · <NomSysteme nom={d.system} /> · rayon {meters(d.radius)} · balayé à {pct(d.covered)}</p>
          {d.state === 'ready' ? <CarteEEP v={d.vue} className="eep-svg" /> : <p className="muted">Bord pas encore marqué : pas de carte.</p>}
          {d.minerais.length > 0 && (
            <p className="eep-minerais">
              {d.minerais.map((m) => <span key={m.ore}><i style={{ background: couleurMinerai(m.ore) }} />{m.ore} ×{m.n}</span>)}
            </p>
          )}
        </div>
      )}
    </Modale>
  );
}

function Partage({ e, vue }) {
  const [msg, setMsg] = useState('');
  const fichier = async () => {
    const carte = await wpApi.eepExport(e.id);
    telecharger(new Blob([JSON.stringify(carte)], { type: 'application/json' }), `${nomFichier(e)}.eep.json`);
    setMsg('Fichier de carte enregistré : envoie-le, l’autre joueur l’importe dans son app.');
  };
  const png = async () => {
    const v = vue || (await wpApi.eepCarte(e.id)).vue;
    telecharger(await image(e, v), `${nomFichier(e)}.png`);
    setMsg('Image enregistrée : à poster où tu veux.');
  };
  const faire = (fn) => () => fn().catch((err) => setMsg(err.message));
  return (
    <span className="eep-partage">
      <button type="button" className="btn" onClick={faire(fichier)} title="Fichier .eep.json : la carte et les repères de minerais, à importer dans Enova">📤 Fichier de carte</button>
      <button type="button" className="btn" onClick={faire(png)} title="Image PNG de la carte, pour Discord">🖼 Image</button>
      {msg && <span className="small muted">{msg}</span>}
    </span>
  );
}

export default function EepsPanel() {
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState('');
  const [carte, setCarte] = useState(null);
  const [nommer, setNommer] = useState(null); // { id, nom }
  const [msg, setMsg] = useState('');
  const fichier = useRef(null);
  const charger = () => wpApi.eeps().then(setD, (e) => setErreur(e.message));
  useEffect(() => {
    charger();
  }, []);
  useEvent('waypoints:eeps', charger);
  useEvent('waypoints:update', charger);

  const importer = async (ev) => {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (!f) return;
    setMsg('');
    try {
      if (f.size > 900_000) throw new Error('Fichier trop gros pour une carte d’EEP.');
      const r = await wpApi.eepImport(JSON.parse(await f.text()));
      setMsg(`Carte importée : ${titreEep(r)} sur ${r.body}${r.reperesAjoutes ? `, ${r.reperesAjoutes} repère${r.reperesAjoutes > 1 ? 's' : ''} ajouté${r.reperesAjoutes > 1 ? 's' : ''}` : ''}.`);
      charger();
    } catch (err) {
      setMsg(err instanceof SyntaxError ? 'Ce fichier n’est pas une carte d’EEP.' : err.message);
    }
  };
  const effacer = async (e) => {
    if (!window.confirm(`Effacer ${titreEep(e)} de tes EEP balayés ? Ses repères restent.`)) return;
    await wpApi.eepEffacer(e.id).catch((err) => setMsg(err.message));
    charger();
  };
  const renommer = async () => {
    await wpApi.eepRenommer(nommer.id, nommer.nom).catch((err) => setMsg(err.message));
    setNommer(null);
    charger();
  };

  if (!d) return <p className="muted">{erreur || 'Chargement…'}</p>;
  // Rangés par système, puis par planète
  const groupes = new Map();
  for (const e of d.eeps) {
    const cle = `${e.system || '?'}|${e.body || '?'}`;
    if (!groupes.has(cle)) groupes.set(cle, { system: e.system, body: e.body, eeps: [] });
    groupes.get(cle).eeps.push(e);
  }
  return (
    <div className="eeps">
      <section className="panel eeps-tete">
        <p className="small muted">
          Chaque balayage d’EEP est gardé : sa carte revient d’elle-même quand tu retournes dans le disque, et tu peux la
          revoir ou la partager d’ici. Le numéro de l’EEP vient du jeu (cible, ou destination au posé).
        </p>
        <button type="button" className="btn" onClick={() => fichier.current?.click()}>📥 Importer une carte</button>
        <input ref={fichier} type="file" accept=".json,application/json" hidden onChange={importer} />
        {msg && <p className="small">{msg}</p>}
      </section>
      {!d.eeps.length && <p className="muted">Aucun EEP balayé pour l’instant : en SRV, ouvre le balayage (🎯 du HUD de minage) au centre d’un EEP.</p>}
      {[...groupes.values()].map((g) => (
        <section key={`${g.system}|${g.body}`} className="panel">
          <h2 className="eeps-planete">🪐 {g.body} <span className="small muted">· <NomSysteme nom={g.system} /></span></h2>
          <div className="eeps-liste">
            {g.eeps.map((e) => (
              <article key={e.id} className={`eep-carte-liste${e.actif ? ' is-actif' : ''}`}>
                <header>
                  {nommer?.id === e.id ? (
                    <span className="form-actions">
                      <input value={nommer.nom} maxLength={80} autoFocus onChange={(x) => setNommer({ ...nommer, nom: x.target.value })} onKeyDown={(x) => x.key === 'Enter' && renommer()} placeholder="Nom de l’EEP" />
                      <button type="button" className="btn btn-primary" onClick={renommer}>OK</button>
                    </span>
                  ) : <b>{titreEep(e)}</b>}
                  {e.actif && <span className="pill pill-good">tu es ici</span>}
                </header>
                <p className="small muted">
                  {e.state === 'ready' ? `Rayon ${meters(e.radius)} · balayé à ${pct(e.covered)}${e.done ? ' ✓' : ''}` : 'Centre marqué, bord à marquer'} · {dateTime(e.updatedAt)}
                </p>
                {e.minerais.length > 0 && (
                  <p className="eep-minerais">
                    {e.minerais.map((m) => <span key={m.ore}><i style={{ background: couleurMinerai(m.ore) }} />{m.ore} ×{m.n}</span>)}
                  </p>
                )}
                <div className="form-actions">
                  <button type="button" className="btn btn-primary" disabled={e.state !== 'ready'} onClick={() => setCarte(e.id)}>🗺 Afficher la carte</button>
                  {e.state === 'ready' && <Partage e={e} />}
                  <button type="button" className="btn btn-ghost" onClick={() => setNommer({ id: e.id, nom: e.nom || '' })}>✎ Nommer</button>
                  <button type="button" className="btn btn-ghost" onClick={() => effacer(e)}>Effacer</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      {carte && <CarteModale id={carte} onFermer={() => setCarte(null)} />}
    </div>
  );
}
