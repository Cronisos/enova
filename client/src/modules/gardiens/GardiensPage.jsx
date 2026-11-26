// Page « Gardiens » : le planificateur (ce que tu veux débloquer → ce qu'il te manque), les sites (les tiens, ceux de
// l'escadron, la liste connue) et la méthode. Le stock vient du module Ingénierie et les sites sont des repères du
// module Mes repères, lus par leur API : les modules ne s'importent pas entre eux.

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../../core/api.js';
import { tenter } from '../../core/actions.js';
import { useEvent } from '../../core/stream.js';
import { useLiveSession } from '../../core/hud.jsx';
import { int, time } from '../../core/format.js';
import { BoutonPartager, RecusEscadron } from '../../core/PartageEscadron.jsx';
import { besoins, stockDepuis, nomsDepuis } from './besoins.js';
import { activations, corpsComplet, dejaChezMoi, mesSites, repereDepuis, sitesFiltres } from './sitesVue.js';

const BASE = '/modules/gardiens';
const REPERES = '/modules/waypoints';
const GENRE = 'repere-gardien';
const GENRES = { gardien: 'Matériaux gardiens', donnees: 'Données d’obélisque', brut: 'Matières premières', fabrique: 'Matériaux fabriqués', marchandise: 'Marchandises (en soute)', autre: 'Autres' };
const COULEURS = { gardien: '#4fd8e6', donnees: '#b48cff', brut: '#e0a45c', fabrique: '#7fd08a', marchandise: '#f0d264', autre: '#9aa4b2' };
const coords = (lat, lon) => `${lat.toLocaleString('fr-FR', { maximumFractionDigits: 4 })} / ${lon.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}`;

/** Une recette à cocher : son nom, et « prête » quand tout est en stock. */
function Recette({ r, choisie, prete, onBasculer }) {
  return (
    <button type="button" className={`gd-recette${choisie ? ' is-on' : ''}${prete ? ' is-prete' : ''}`} aria-pressed={choisie} onClick={() => onBasculer(r.id)} title={r.en}>
      <span className="gd-coche" aria-hidden="true">{choisie ? '✓' : ''}</span>
      <span>{r.nom}</span>
      {prete && <em>prête</em>}
    </button>
  );
}

function Planificateur({ ref_, choix, setChoix, inventaire }) {
  const [erreur, setErreur] = useState(null);
  const stock = useMemo(() => stockDepuis(inventaire), [inventaire]);
  const noms = useMemo(() => nomsDepuis(inventaire), [inventaire]);
  const b = useMemo(() => besoins(ref_.recettes, choix, ref_.ingredients, stock), [ref_, choix, stock]);
  const parId = useMemo(() => new Map(ref_.recettes.map((r) => [r.id, r])), [ref_]);

  const enregistrer = (liste) => {
    setChoix(liste);
    tenter(() => api(`${BASE}/plan`, { method: 'PUT', body: { choix: liste } }), setErreur);
  };
  const basculer = (id) => enregistrer(choix.includes(id) ? choix.filter((c) => c !== id) : [...choix, id]);
  /** Le nom du jeu quand l'inventaire le donne en français, sinon notre traduction. */
  const nom = (l) => {
    const info = ref_.ingredients[l.cle] || {};
    const duJeu = noms.get(l.cle);
    return duJeu && duJeu !== info.en ? duJeu : info.fr || info.en || l.cle;
  };
  const aFaire = b.lignes.filter((l) => l.manque > 0);
  const sites = activations(b.lignes);
  const groupes = Object.keys(GENRES).map((g) => ({ g, lignes: b.lignes.filter((l) => l.genre === g) })).filter((x) => x.lignes.length);

  return (
    <div className="gd">
      <p className="muted">
        Coche ce que tu veux débloquer chez un courtier en technologie des Gardiens. Un déblocage se paie une fois en
        matériaux ; ensuite le module s’achète en crédits autant de fois que tu veux.
      </p>
      {erreur && <p className="small bad">{erreur}</p>}
      <div className="gd-groupes">
        {Object.entries(ref_.groupes).map(([g, titre]) => (
          <section key={g} className="gd-groupe">
            <h3>{titre}</h3>
            <div className="gd-recettes">
              {ref_.recettes.filter((r) => r.groupe === g).map((r) => <Recette key={r.id} r={r} choisie={choix.includes(r.id)} prete={b.pretes.includes(r.id)} onBasculer={basculer} />)}
            </div>
          </section>
        ))}
      </div>

      <div className="gd-tete">
        <h2>Ce qu’il te faut</h2>
        {choix.length > 0 && <button type="button" className="btn btn-ghost small" onClick={() => enregistrer([])}>Tout décocher</button>}
      </div>
      {!b.total && <p className="muted">Rien de coché pour l’instant.</p>}
      {b.total > 0 && (
        <>
          <div className="gd-bilan">
            <div><b>{b.total}</b><span>à débloquer</span></div>
            <div className={b.pretes.length ? 'is-bon' : ''}><b>{b.pretes.length}</b><span>prête{b.pretes.length > 1 ? 's' : ''} (matériaux en stock)</span></div>
            <div className={aFaire.length ? 'is-manque' : 'is-bon'}><b>{aFaire.length}</b><span>ingrédient{aFaire.length > 1 ? 's' : ''} à trouver</span></div>
            {sites.map((s) => <div key={s.type}><b>{s.nombre}</b><span>activation{s.nombre > 1 ? 's' : ''} d’une structure à plans de {s.type}</span></div>)}
          </div>
          <div className="table-wrap gd-fond">
            <table className="table gd-table">
              <thead>
                <tr><th>Ingrédient</th><th className="num">Besoin</th><th className="num">En stock</th><th className="num">Manque</th><th>Où le trouver</th></tr>
              </thead>
              {groupes.map(({ g, lignes }) => (
                <tbody key={g} style={{ '--c': COULEURS[g] }}>
                  <tr className="gd-genre"><th colSpan={5}><i aria-hidden="true" />{GENRES[g]}</th></tr>
                  {lignes.map((l) => (
                    <tr key={l.cle} className={l.manque > 0 ? '' : 'is-ok'}>
                      <td>
                        <b>{nom(l)}</b>
                        {nom(l) !== l.en && <span className="gd-en">{l.en}</span>}
                        <span className="gd-pour" title={l.pour.map((id) => parId.get(id)?.nom).join('\n')}>pour {l.pour.length} déblocage{l.pour.length > 1 ? 's' : ''}</span>
                      </td>
                      <td className="num">{l.besoin}</td>
                      <td className="num">{l.stock == null ? <span className="muted" title="Une marchandise se transporte en soute : l’app ne connaît pas ton stock">—</span> : l.stock}</td>
                      <td className="num">{l.manque > 0 ? <b className={l.stock == null ? 'gd-achat' : 'bad'}>{l.stock == null ? `${l.manque} t` : l.manque}</b> : <span className="good">✓</span>}</td>
                      <td className="small">{l.ou}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          <p className="tiny muted">
            Stock lu dans tes journaux (matériaux), comme dans Ingénierie › Matériaux. Les marchandises doivent être dans
            ta soute au moment du déblocage. Un segment de plan s’obtient à chaque activation d’une structure : pour en
            refaire une, reviens au menu du jeu puis relance. « Prête » compte les déblocages cochés dans l’ordre, sans
            compter deux fois le même matériau. Recettes : EDEngineer, relevées le 22 nov. 2026.
          </p>
        </>
      )}
    </div>
  );
}

function Sites({ connus }) {
  const [reperes, setReperes] = useState([]);
  const [ici, setIci] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [actives, setActives] = useState(true);
  const [texte, setTexte] = useState('');
  const [copie, setCopie] = useState(null);
  const lire = () => api(`${REPERES}/waypoints`).then(setReperes).catch(() => {});
  useEffect(() => {
    lire();
    api(`${REPERES}/here`).then(setIci).catch(() => {});
  }, []);
  useEvent('waypoints:update', lire);

  const miens = mesSites(reperes);
  const liste = sitesFiltres(connus?.sites, { actives, texte });
  const marquer = () => tenter(() => api(`${REPERES}/waypoints`, { method: 'POST', body: { category: 'guardian', label: `Site gardien · ${ici?.body || ici?.system || ''}`.trim() } }).then(lire), setErreur);
  const ajouter = (s) => tenter(() => api(`${REPERES}/waypoints/importer`, { method: 'POST', body: repereDepuis(s, connus.source) }).then(lire), setErreur);
  const copier = (s) => navigator.clipboard?.writeText(s.systeme).then(() => setCopie(corpsComplet(s))).catch(() => {});

  return (
    <div className="gd">
      <div className="gd-tete">
        <h2>Mes sites ({miens.length})</h2>
        {ici?.body && ici.latitude != null && <button type="button" className="btn small" onClick={marquer} title="Enregistre ta position actuelle comme site gardien">Marquer ici comme site gardien</button>}
      </div>
      {erreur && <p className="small bad">{erreur}</p>}
      {!miens.length && <p className="muted">Aucun site gardien dans tes repères. Pose-toi sur un site et marque-le, ou prends-en un dans la liste connue plus bas.</p>}
      {miens.length > 0 && (
        <div className="gd-sites">
          {miens.map((w) => (
            <article key={w.id} className="gd-site">
              <div>
                <b><Link to={`/reperes/repere/${w.id}`}>{w.label}</Link></b>
                <div className="small muted">{[w.body, w.system].filter(Boolean).join(' · ')}{w.latitude != null && ` · ${coords(w.latitude, w.longitude)}`}</div>
                {w.notes && <div className="small gd-notes">{w.notes}</div>}
              </div>
              <BoutonPartager kind={GENRE} refId={w.id} titre={w.label} apercu={[w.body, w.system].filter(Boolean).join(' · ')} className="btn btn-ghost small" />
            </article>
          ))}
        </div>
      )}
      <p className="tiny muted">Tes sites sont des repères de type « Site Gardien » : notes, guidage et suppression se font dans Mes repères (clique sur le nom).</p>

      <RecusEscadron
        kinds={[GENRE]}
        copier="Copier dans mes sites"
        vide="Aucun site gardien partagé pour l’instant."
        onCopier={async (s) => {
          await api(`${REPERES}/waypoints/importer`, { method: 'POST', body: { ...s.data, category: 'guardian', notes: [s.data.notes, `Reçu de CMDR ${s.cmdr}`].filter(Boolean).join('\n') } });
          lire();
        }}
        detail={(s) => (
          <>
            {[s.data.body, s.data.system].filter(Boolean).join(' · ')}
            {s.data.latitude != null && <span className="muted"> · {coords(s.data.latitude, s.data.longitude)}</span>}
            {s.data.notes && <div className="muted">{String(s.data.notes).slice(0, 300)}</div>}
          </>
        )}
      />

      <div className="gd-tete">
        <h2>Structures connues</h2>
        <div className="form-actions">
          <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Chercher un système" aria-label="Chercher un système" />
          <label className="check"><input type="checkbox" checked={actives} onChange={(e) => setActives(e.target.checked)} /> Actives seulement</label>
        </div>
      </div>
      {!connus && <p className="muted">Chargement…</p>}
      {connus && (
        <>
          <div className="table-wrap gd-fond">
            <table className="table gd-table">
              <thead><tr><th>Système</th><th>Corps</th><th>Latitude / longitude</th><th>État</th><th /></tr></thead>
              <tbody>
                {liste.map((s) => {
                  const deja = dejaChezMoi(s, reperes);
                  return (
                    <tr key={corpsComplet(s)}>
                      <td>
                        <button type="button" className="lien" onClick={() => copier(s)} title="Copier le nom du système (pour la carte de la galaxie)">{s.systeme}</button>
                        {copie === corpsComplet(s) && <span className="small good"> copié</span>}
                      </td>
                      <td>{s.corps}</td>
                      <td className="gd-coords">{coords(s.latitude, s.longitude)}</td>
                      <td>{s.active ? <span className="pill pill-info">active</span> : <span className="muted small">inactive</span>}{s.plan && <span className="pill gd-plan"> plan {s.plan === 'arme' ? 'd’arme' : `de ${s.plan}`}</span>}</td>
                      <td className="num">{deja ? <span className="small good">dans mes sites ✓</span> : <button type="button" className="btn btn-ghost small" onClick={() => ajouter(s)}>Ajouter à mes sites</button>}</td>
                    </tr>
                  );
                })}
                {!liste.length && <tr><td colSpan={5} className="muted">Aucune structure à ce nom.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="tiny muted">
            {liste.length} structure{liste.length > 1 ? 's' : ''} sur {connus.sites.length}. Liste de 2018 ({connus.source.nom}), pas revérifiée en jeu : elle
            ne dit pas quel type de plan donne chaque structure, et le jeu en a ajouté depuis. Quand tu en visites une, note
            dans le repère ce qu’elle donne, puis partage-la : c’est comme ça que la liste de l’escadron devient fiable.
          </p>
        </>
      )}
    </div>
  );
}

const COULEURS_PLAN = { module: '#4fd8e6', arme: '#ff7a6b', vaisseau: '#e0a45c' };

/** Où aller pour chaque type de plan : le site conseillé, les cartes des pylônes (en lien), l'ordre à suivre. */
function OuAller({ guides }) {
  if (!guides) return null;
  const p = guides.pylones;
  return (
    <>
      <h2>Où aller, et les cartes des pylônes</h2>
      <div className="gd-guides">
        {guides.guides.map((g) => (
          <article key={g.plan} style={{ '--c': COULEURS_PLAN[g.plan] }}>
            <h3>{g.titre}</h3>
            <p className="gd-lieu"><b>{g.systeme}</b> · corps {g.corps}{g.forme && <span className="muted"> · site appelé {g.forme}</span>}</p>
            <p className="form-actions">
              {g.cartes.map((c) => <a key={c.url} className="btn small" href={c.url} target="_blank" rel="noopener noreferrer">{c.nom} ↗</a>)}
              <a className="btn btn-ghost small" href={g.guide} target="_blank" rel="noopener noreferrer">Guide complet (anglais) ↗</a>
            </p>
            <ol>{g.etapes.map((e) => <li key={e}>{e}</li>)}</ol>
          </article>
        ))}
      </div>
      <h2>Les pylônes, sur tous les sites</h2>
      <ul className="gd-liste">{guides.regles.map((r) => <li key={r}>{r}</li>)}</ul>
      <h2>Pylônes relevés : {p.systeme} {p.corps}</h2>
      <p className="small muted">Un autre site à plans d’arme, avec la position de chaque pylône ({p.source}). À suivre avec les coordonnées affichées en SRV.</p>
      <div className="table-wrap gd-fond">
        <table className="table gd-table">
          <thead><tr><th>Pylône</th><th>Latitude / longitude</th><th>Repère</th></tr></thead>
          <tbody>{p.pylones.map((x) => <tr key={x.n}><td>{x.n}</td><td className="gd-coords">{coords(x.latitude, x.longitude)}</td><td className="small">{x.note}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="tiny muted">
        Cartes et parcours : « Elite: Dangerous Guides » (cartes de u/Mnemoch et CMDR Loch147). Les cartes s’ouvrent dans ton
        navigateur : elles ne sont pas copiées dans Enova. Rien de tout cela n’a été revérifié en jeu.
      </p>
    </>
  );
}

function Methode({ guides }) {
  return (
    <div className="gd gd-methode">
      <div className="gd-cartes">
        <article style={{ '--c': '#b48cff' }}>
          <h3>Ruines antiques</h3>
          <p>Des obélisques à scanner au SRV : ils donnent les <b>données d’obélisque</b> (Alpha à Epsilon). C’est aussi là que se fait la quête de Ram Tah.</p>
        </article>
        <article style={{ '--c': '#4fd8e6' }}>
          <h3>Structures gardiennes</h3>
          <p>Des sites gardés par des sentinelles. Une structure <b>active</b> donne un <b>segment de plan</b> (arme, module ou vaisseau selon le site), plus des cellules, conduits et composants dans les panneaux et les caisses.</p>
        </article>
        <article style={{ '--c': '#e0a45c' }}>
          <h3>Balises gardiennes</h3>
          <p>En orbite. Une balise donne la <b>clé</b> qu’il faut apporter à la structure pour un plan de vaisseau (chasseurs).</p>
        </article>
      </div>

      <OuAller guides={guides} />

      <h2>Activer une structure, en bref</h2>
      <ol className="gd-etapes">
        <li><b>Viens équipé.</b> Un SRV, de quoi tenir face aux sentinelles (elles réapparaissent), et une place en soute pour la relique.</li>
        <li><b>Fais sortir les pylônes.</b> Six pylônes sont enterrés autour du site : approche-toi de chacun pour qu’il monte.</li>
        <li><b>Charge-les.</b> Tire sur la sphère bleue de chaque pylône. Dès le premier, un compte à rebours de 6 minutes démarre, et chaque pylône chargé en rajoute 2 : il faut finir les six avant la fin.</li>
        <li><b>Dépose la relique.</b> Une fois les six chargés, pose une relique antique au centre, sur le socle. Les reliques se ramassent sur le site même.</li>
        <li><b>Scanne l’orbe.</b> Une sphère de données apparaît au-dessus du socle : scanne-la avec le scanner de données du SRV. Tu reçois le segment de plan.</li>
        <li><b>Pour un autre segment</b>, reviens au menu du jeu et relance : le site est remis à zéro.</li>
      </ol>

      <h2>Les matériaux</h2>
      <ul className="gd-liste">
        <li><b>Cellules, conduits, composants technologiques</b> : panneaux muraux, piliers et caisses du site, à détruire puis ramasser au SRV.</li>
        <li><b>Pièces d’arme et débris de sentinelle</b> : sur les sentinelles détruites.</li>
        <li><b>Données d’obélisque</b> : en scannant les obélisques actifs des ruines.</li>
        <li><b>Marchandises</b> (bobines, moteurs, plaques…) : à acheter sur un marché et à avoir <b>en soute</b> en arrivant chez le courtier.</li>
      </ul>
      <p className="tiny muted">
        Types de sites et méthode d’activation d’après le guide de galnet.fr (CMDR Aymerix, 2018). Le planificateur te dit combien
        d’activations il te faut ; l’onglet « Sites » te dit où aller.
      </p>
    </div>
  );
}

/** La session du mode de jeu : ce que tu as ramassé sur les sites depuis qu'elle a commencé. */
function Session() {
  const { data, reset, error } = useLiveSession('/modules/gardiens', 'gardiens:update', { horloge: false });
  if (!data?.startedAt) return null;
  return (
    <p className="gd-session">
      <b>Session</b> depuis {time(data.startedAt)} : <b>+{int(data.plans)}</b> segment{data.plans > 1 ? 's' : ''} de plan · <b>{int(data.total)}</b> matériau{data.total > 1 ? 'x' : ''} des Gardiens, dont <b>{int(data.donnees)}</b> donnée{data.donnees > 1 ? 's' : ''} d’obélisque{' '}
      <button type="button" className="btn btn-ghost small" onClick={reset}>Remettre à zéro</button>
      {error && <span className="small bad"> {error}</span>}
    </p>
  );
}

/** Le site gardien où tu es : rappel, et bouton pour rouvrir sa carte en jeu si tu l'as fermée. */
function SiteEnVue() {
  const [vue, setVue] = useState(null);
  useEffect(() => {
    api(`${BASE}/site`).then(setVue).catch(() => {});
  }, []);
  useEvent('gardiens:site', setVue);
  if (!vue?.site) return null;
  return (
    <p className="gd-session">
      <b>Site en vue</b> : {vue.site.nom} · {vue.site.corps} · {vue.points.length} point{vue.points.length > 1 ? 's' : ''} sur ta carte{' '}
      <button type="button" className="btn btn-ghost small" onClick={() => api(`${BASE}/site/ouvrir`, { method: 'POST' }).catch(() => {})}>Ouvrir la carte en jeu</button>
    </p>
  );
}

const ONGLETS = [['plan', 'Planificateur'], ['sites', 'Sites'], ['methode', 'Méthode']];

export default function GardiensPage() {
  const [params, setParams] = useSearchParams();
  const onglet = ONGLETS.some(([k]) => k === params.get('onglet')) ? params.get('onglet') : 'plan';
  const [ref_, setRef] = useState(null);
  const [choix, setChoix] = useState([]);
  const [inventaire, setInventaire] = useState(null);
  const [connus, setConnus] = useState(null);
  const [guides, setGuides] = useState(null);
  const lireStock = () => api('/modules/engineering/inventory').then(setInventaire).catch(() => setInventaire(null));
  useEffect(() => {
    api(`${BASE}/recettes`).then(setRef).catch(() => {});
    api(`${BASE}/plan`).then((d) => setChoix(d?.choix ?? [])).catch(() => {});
    api(`${BASE}/sites`).then(setConnus).catch(() => {});
    api(`${BASE}/guides`).then(setGuides).catch(() => {});
    lireStock();
  }, []);
  useEvent('engineering:update', lireStock);
  useEvent('gardiens:plan', (d) => Array.isArray(d?.choix) && setChoix(d.choix));

  return (
    <div className="page">
      <h1>Gardiens</h1>
      <Session />
      <SiteEnVue />
      <nav className="wp-onglets" aria-label="Gardiens">
        {ONGLETS.map(([k, label]) => (
          <button key={k} type="button" className={onglet === k ? 'is-on' : ''} onClick={() => setParams(k === 'plan' ? {} : { onglet: k })}>{label}</button>
        ))}
      </nav>
      {onglet === 'plan' && (ref_ ? <Planificateur ref_={ref_} choix={choix} setChoix={setChoix} inventaire={inventaire} /> : <p className="muted">Chargement…</p>)}
      {onglet === 'sites' && <Sites connus={connus} />}
      {onglet === 'methode' && <Methode guides={guides} />}
    </div>
  );
}
