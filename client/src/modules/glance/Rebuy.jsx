// Rachat couvert et mode de jeu : case de la fenêtre en jeu (RebuyCell, seulement quand le rachat pose problème),
// mode de jeu de la case Crédits (ModeJeu) et bloc du panneau (RebuyBlock).
// Les données viennent du résumé du Coup d'œil (summary.rebuy, calculé dans server/src/modules/glance/rebuy.js).

import { compact, cr, dateTime, int } from '../../core/format.js';
import { GREEN, RED, modeColor, modeText, rebuyStatus as status } from './rebuyText.js';

const GOLD = '#ffd24a';

// Détail du total « en jeu » : seulement ce qu'une destruction fait perdre (pas les récompenses gardées à la mort)
const stakeTitle = (s) => `rachat ${cr(s.rebuy)} + primes, obligations, exploration et exobio ${cr(s.toCash)} + soute ${cr(s.cargo)}${s.missionTons > 0 ? ` (sans les ${int(s.missionTons)} t de mission, qui ne sont pas à toi)` : ''}`;
/** « + 50 t de mission, non comptées » : cargaison de mission à bord, hors du total en jeu. */
export const missionText = (s) => (s?.missionTons > 0 ? `+ ${int(s.missionTons)} t de mission, non comptées` : '');

const CSS = `
.gwr-head { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.gwr-head .hud-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gwr-mode { margin-left: auto; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; white-space: nowrap; }
.gwr-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 2px; }
.gwr-row > div { min-width: 0; display: flex; flex-direction: column; }
.gwr-row > div + div { border-left: 1px solid rgba(255,255,255,.07); padding-left: 10px; }
.gwr-status { font-size: 13px; font-weight: 700; letter-spacing: .08em; white-space: nowrap; }
.gwr-line { font-size: 12px; margin-top: 4px; color: #f4f6f8; line-height: 1.35; }
.gwr-line.is-alert { color: #ff6b6b; font-weight: 700; }
`;

/**
 * Case de la fenêtre en jeu : rachat et son état, total en jeu ; alerte au décollage, bilan d'une résurrection.
 * Seulement quand elle dit quelque chose : rachat non couvert, décollage sans rachat, résurrection récente. Couvert,
 * elle disparaît (« toujours vert, ça ne m'apprend rien », 15 nov. 2026). Le mode de jeu est dans la case Crédits.
 */
export function RebuyCell({ rebuy: r }) {
  if (!r || !(r.covered === false || r.alert || r.resurrect?.recent)) return null;
  const s = status(r);
  const res = r.resurrect?.recent ? r.resurrect : null;
  const cls = r.alert ? 'hud-alert' : r.covered === false ? 'hud-warn' : '';
  return (
    <div className={`hud-cell gw-wide ${cls}`} style={{ '--c': r.covered === false ? RED : GREEN }}>
      <style>{CSS}</style>
      <div className="gwr-head">
        <div className="hud-label">Rachat{r.ship ? ` · ${r.ship.label}` : ''}</div>
      </div>
      {r.rebuy != null && (
        <div className="gwr-row">
          <div>
            <span className="hud-value">{compact(r.rebuy)}{r.estimated ? ' ?' : ''}</span>
            <span className="gwr-status" style={{ color: s.color }}>{s.text}</span>
            <span className="hud-sub">{s.sub}</span>
          </div>
          {r.atStake && (
            <div title={stakeTitle(r.atStake)}>
              <span className="hud-value" style={{ color: GOLD }}>{compact(r.atStake.total)}</span>
              <span className="gwr-status" style={{ color: GOLD }}>En jeu</span>
              <span className="hud-sub">rachat + à encaisser + soute{r.atStake.unpriced.length ? ` (${r.atStake.unpriced.length} sans prix)` : ''}</span>
              {missionText(r.atStake) && <span className="hud-sub tiny">{missionText(r.atStake)}</span>}
            </div>
          )}
        </div>
      )}
      {r.alert && <div className="gwr-line is-alert">Tu as décollé sans pouvoir payer ton rachat : il manque {cr(r.alert.missing)}.</div>}
      {res && <div className={`gwr-line ${res.bankrupt ? 'is-alert' : ''}`}>{[res.text, res.loss].filter(Boolean).join(' ')}</div>}
    </div>
  );
}

/** Mode de jeu (Open, Solo, groupe privé), tout à droite de la barre de titre de la fenêtre en jeu (l’auteur, 19 nov. 2026). */
export function ModeJeu({ rebuy: r }) {
  if (!r?.mode) return null;
  // Styles en ligne : la feuille de la case Rachat n'est là que quand la case l'est
  return <span style={{ color: modeColor(r.mode), fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>{modeText(r.mode)}</span>;
}

/** Bloc du panneau Coup d'œil (app et page plein écran). */
export function RebuyBlock({ rebuy: r }) {
  if (!r) return null;
  const s = status(r);
  const tone = r.covered === true ? 'good' : r.covered === false ? 'bad' : '';
  const res = r.resurrect;
  return (
    <section className="glance-block">
      <div className="glance-block-head">
        <h3>Rachat</h3>
      </div>
      {r.rebuy != null ? (
        <>
          <div className={`glance-big num ${tone}`}>{compact(r.rebuy)}{r.estimated ? ' ?' : ''}</div>
          <div className="small">
            <strong className={tone}>{s.text}</strong> <span className="muted">{[s.sub, r.ship?.label].filter(Boolean).map((t) => ` · ${t}`).join('')}</span>
          </div>
        </>
      ) : (
        <p className="small muted">Rachat inconnu : il arrive avec le prochain Loadout (lancement du jeu, changement de vaisseau).</p>
      )}
      <dl className="kv glance-kv">
        {r.atStake && (
          <>
            <dt>En jeu</dt>
            <dd className="num warn" title={stakeTitle(r.atStake)}>
              {compact(r.atStake.total)} cr
              {missionText(r.atStake) && <span className="tiny muted"> {missionText(r.atStake)}</span>}
            </dd>
          </>
        )}
        <dt>Mode de jeu</dt>
        <dd>{modeText(r.mode) || <span className="muted">inconnu</span>}</dd>
        {res && (
          <>
            <dt>Dernière résurrection</dt>
            <dd className={res.bankrupt ? 'bad' : ''}>{dateTime(res.at)} · {res.text}{res.loss ? ` ${res.loss}` : ''}</dd>
          </>
        )}
      </dl>
      <p className="tiny muted">
        En jeu : ce qu'une destruction coûterait, rachat + à encaisser + soute.
        {r.atStake?.unpriced.length > 0 && ` Sans prix connu : ${r.atStake.unpriced.map((c) => `${int(c.count)} t ${c.label}`).join(', ')}.`}
        {' '}Soute au dernier prix de vente ou d'achat vu dans le journal{r.estimated ? ' ; rachat estimé à 5 % de la valeur du vaisseau' : ''}.
      </p>
    </section>
  );
}
