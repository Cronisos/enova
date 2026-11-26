// Accueil : un tableau de bord « Maintenant » qui résume l'app pour aider à choisir quoi faire. Ce qu'il y a à faire
// tout de suite (rappels du Coup d'œil, plans faisables, palier proche), la session du mode en cours, le système où tu
// es, tes mérites de la semaine, tes plans d'ingénierie, les objectifs communautaires, ce qu'il y a à encaisser et les
// projets d'extension. Chaque carte mène à sa page de détail. Pas de boutons de menu ici : les menus sont en haut.
// Chaque source se lit à part : une source absente (module coupé, données pas encore lues) retire sa carte, pas la page.

import Bienvenue from './Bienvenue.jsx';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from './api.js';
import { useOverlay } from './overlay.jsx';
import { MODES } from './modes.js';
import { modules } from '../modules/index.js';
import { compact, dateTime, duration, int, pct } from './format.js';
import { aEncaisser, chantiers, chiffresSession, conseils, escadron, meritesSemaine, objectifs } from './accueilVue.js';
import { accueilVide } from './santeVue.js';
import { useGameState } from './useGameState.js';
import { intervalleVisible } from './visible.js';

const SOURCES = {
  glance: '/modules/glance/summary',
  ingenierie: '/modules/engineering/dashboard',
  merites: '/modules/expansion/merits',
  projets: '/modules/expansion/projects',
  bilans: '/modules/bilan/sessions',
  colonisation: '/modules/colonisation/sites',
  escadron: '/modules/escadron/contribution?preset=week',
};
const RAFRAICHIR_MS = 30_000;
const SESSIONS = new Set(['rescue', 'combat', 'materials', 'shipmining', 'powerdelivery', 'gardiens', 'rares']);

function useSources(mode) {
  const [d, setD] = useState({});
  useEffect(() => {
    let vivant = true;
    const lire = () => {
      const entrees = Object.entries(SOURCES);
      if (SESSIONS.has(mode)) entrees.push(['session', `/modules/${mode}/session`]);
      Promise.allSettled(entrees.map(([, p]) => api(p))).then((r) => {
        if (!vivant) return;
        setD(Object.fromEntries(entrees.map(([k], i) => [k, r[i].status === 'fulfilled' ? r[i].value : null])));
      });
    };
    lire();
    // Relu toutes les 30 s tant que l'accueil se voit ; fenêtre cachée (réduite, derrière le jeu) : rien, puis une
    // relecture dès qu'elle revient (core/visible.js)
    const arreter = intervalleVisible(lire, RAFRAICHIR_MS);
    return () => {
      vivant = false;
      arreter();
    };
  }, [mode]);
  return d;
}

function Carte({ titre, lien, icone, children }) {
  return (
    <Link to={lien} className="acc-carte">
      <h2 className="acc-titre"><span aria-hidden="true">{icone}</span> {titre} <span className="acc-plus" aria-hidden="true">›</span></h2>
      {children}
    </Link>
  );
}

function Barre({ part, ton = '' }) {
  return <span className={`acc-barre ${ton}`}><i style={{ width: `${Math.round(Math.min(1, Math.max(0, part || 0)) * 100)}%` }} /></span>;
}

export default function Home() {
  const { state: overlay } = useOverlay();
  const mode = overlay?.mode || null;
  const d = useSources(mode);
  const { journal } = useGameState(); // journaux introuvables : l'accueil le dit au lieu de « Lance le jeu »
  const g = d.glance;
  const a = conseils({ glance: g, ingenierie: d.ingenierie });
  const modeInfo = MODES.find((m) => m.id === mode);
  const pageMode = modules.find((m) => m.id === mode)?.path || '/activites';
  const session = chiffresSession(mode, d.session);
  const sys = g?.system;
  const merites = meritesSemaine(d.merites);
  const plans = d.ingenierie?.perPlan || [];
  const cg = objectifs(g?.communityGoals);
  const encaisser = aEncaisser(g?.toCash);
  const projets = (d.projets || []).slice(0, 3);
  // Dernière session finie (la session en cours a sa carte « Session »)
  const derniere = (d.bilans?.sessions || []).find((b) => !b.enCours) || null;
  const moyenne = d.bilans?.comparaison;
  const sites = chantiers(d.colonisation);
  const esc = escadron(d.escadron);

  return (
    <div className="accueil">
      <header className="acc-tete">
        <h1>Bienvenue, commandant</h1>
        <p className="muted">
          {[g?.commander && `CMDR ${g.commander}`, sys?.name && `Ici : ${sys.name}`, g?.credits?.balance != null && `${compact(g.credits.balance)} cr`, g?.powerplay?.power && `${g.powerplay.power} · rang ${int(g.powerplay.rank)}`].filter(Boolean).join(' · ') || accueilVide(journal)}
        </p>
      </header>
      <Bienvenue />

      <section className="acc-faire">
        <h2 className="acc-titre">À faire maintenant</h2>
        {a.length ? (
          <ul>
            {a.map((c, i) => (
              <li key={i} className={`is-${c.ton}`}>
                <Link to={c.lien}>{c.texte}</Link>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Rien d’urgent. Choisis une activité dans « Mode de jeu », en haut.</p>}
      </section>

      <div className="acc-grille">
        <Carte titre={modeInfo ? `Session : ${modeInfo.label}` : 'Mode de jeu'} lien={modeInfo ? pageMode : '/activites'} icone={modeInfo?.icon || '◌'}>
          {modeInfo ? (
            session.length ? (
              <dl className="acc-chiffres">
                {session.map((c) => <div key={c.label}><dt>{c.label}</dt><dd>{c.valeur}</dd></div>)}
              </dl>
            ) : <p className="muted">Mode actif : sa page donne le détail.</p>
          ) : <p className="muted">Aucun mode actif. « Mode de jeu », en haut, ouvre ses fenêtres par-dessus le jeu.</p>}
        </Carte>

        {sys?.name && (
          <Carte titre="Système actuel" lien="/extension?onglet=ou-agir" icone="◎">
            <p className="acc-gros">{sys.name}</p>
            <p>{[sys.label, sys.power].filter(Boolean).join(' · ') || 'Sans puissance'}</p>
            {Number.isFinite(sys.progress) && sys.next && (
              <>
                <Barre part={sys.progress} />
                <p className="small muted">{pct(sys.progress)} vers {sys.next} · {int(sys.points)} / {int(sys.tier)} points</p>
              </>
            )}
          </Carte>
        )}

        {merites && (
          <Carte titre="Mérites de la semaine" lien="/extension" icone="⚑">
            <p className="acc-gros">{int(merites.total)}</p>
            {merites.activites.map((x) => (
              <div key={x.nom} className="acc-ligne">
                <span>{x.nom}</span>
                <Barre part={x.part} />
                <b>{int(x.merites)}</b>
              </div>
            ))}
          </Carte>
        )}

        <Carte titre="Ingénierie" lien="/ingenierie" icone="⚙︎">
          {plans.length ? plans.slice(0, 4).map((p) => (
            <div key={p.id} className="acc-ligne">
              <span title={p.name}>{p.name}</span>
              <Barre part={p.progress} ton={p.progress >= 1 ? 'is-bon' : ''} />
              <b>{pct(p.progress)}</b>
            </div>
          )) : <p className="muted">Aucun plan au tableau de bord.</p>}
          {d.ingenierie?.global?.missingCount > 0 && <p className="small bad">{int(d.ingenierie.global.missingCount)} matériaux manquants en tout</p>}
        </Carte>

        {cg.length > 0 && (
          <Carte titre="Objectifs communautaires" lien="/coup-doeil" icone="◆">
            {cg.map((o) => (
              <div key={`${o.id}-${o.aReclamer}`} className={`acc-cg${o.aReclamer ? ' is-reclamer' : ''}`}>
                <b>{o.titre}</b>
                <span className="small muted">{o.lieu}</span>
                <span className="small">{o.detail}{o.reste && ` · reste ${o.reste}`}</span>
              </div>
            ))}
          </Carte>
        )}

        {(encaisser.length > 0 || g?.rebuy) && (
          <Carte titre="À encaisser" lien="/coup-doeil" icone="¢">
            {encaisser.map((x) => (
              <div key={x.label} className="acc-ligne">
                <span>{x.label}</span>
                <b>{x.valeur}</b>
                {x.detail && <span className="small muted">{x.detail}</span>}
              </div>
            ))}
            {g?.rebuy && Number.isFinite(g.rebuy.rebuy) && (
              <p className={`small ${g.rebuy.covered ? 'good' : 'bad'}`}>
                Rachat {g.rebuy.covered ? `couvert (${int(g.rebuy.times)} fois)` : `non couvert : il manque ${compact(g.rebuy.missing)} cr`}
              </p>
            )}
          </Carte>
        )}

        {derniere && (
          <Carte titre="Dernière session" lien="/bilans" icone="▦">
            <p className="small muted">{dateTime(derniere.debut)} · {duration(derniere.duree / 1000)}</p>
            <dl className="acc-chiffres">
              <div><dt>Crédits</dt><dd>{derniere.gain != null ? `${derniere.gain >= 0 ? '+' : '−'}${compact(Math.abs(derniere.gain))}` : '—'}</dd></div>
              <div><dt>Mérites</dt><dd>{int(derniere.merites)}</dd></div>
              <div><dt>Matériaux</dt><dd>{int(derniere.materiauxTotal)}</dd></div>
              <div><dt>Morts</dt><dd>{int(derniere.morts)}</dd></div>
            </dl>
            {moyenne?.gainHeure != null && derniere.gainHeure != null && (
              <p className="small muted">{compact(derniere.gainHeure)} cr/h · d’habitude {compact(moyenne.gainHeure)} cr/h</p>
            )}
          </Carte>
        )}

        {sites.length > 0 && (
          <Carte titre="Colonisation" lien="/colonisation" icone="▣">
            {sites.map((c) => (
              <div key={c.id} className={`acc-cg${c.actif ? ' is-reclamer' : ''}`}>
                <b>{c.titre}</b>
                <span className="small muted">{c.lieu}{c.actif ? ' · chantier actif' : ''}</span>
                {c.progres != null && <Barre part={c.progres} />}
                <span className="small">{c.progres != null ? `${pct(c.progres)} · ` : ''}{c.detail}</span>
              </div>
            ))}
          </Carte>
        )}

        {esc && (
          <Carte titre={`Escadron · ${esc.nom}`} lien="/escadron" icone="⛨">
            {esc.rang && <p className="small muted">Rang : {esc.rang} · ton apport cette semaine</p>}
            {esc.lignes.length ? esc.lignes.map((l) => (
              <div key={l.label} className="acc-ligne">
                <span>{l.label}</span>
                <span />
                <b>{l.valeur}</b>
              </div>
            )) : <p className="muted">Rien d’apporté cette semaine pour l’instant.</p>}
          </Carte>
        )}

        {projets.length > 0 && (
          <Carte titre="Projets d’extension" lien="/extension?onglet=routes" icone="➤">
            {projets.map((p) => (
              <div key={p.id} className="acc-cg">
                <b>{p.name}</b>
                <span className="small muted">{int(p.toTake)} systèmes à prendre · {int(p.strongholds)} Forteresse{p.strongholds > 1 ? 's' : ''}</span>
              </div>
            ))}
          </Carte>
        )}
      </div>
    </div>
  );
}
