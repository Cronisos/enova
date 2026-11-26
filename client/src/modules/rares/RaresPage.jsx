import { PauseButton, pauseLabel } from '../../core/hud.jsx';
import { OverlayToggle } from '../../core/overlay.jsx';
import { clock, compact, int, time } from '../../core/format.js';
import Tile from '../../core/Tile.jsx';
import { parTonne, texteSoute, useRares } from './useRares.jsx';
import RaresCatalogue from './RaresCatalogue.jsx';

/** Page du mode Commerce de rares : la session en cours, par marchandise, et les derniers achats et ventes. */
export default function RaresPage() {
  const session = useRares();
  const { data, seconds, meritsHour, profitHour } = session;

  async function reset() {
    if (window.confirm('Remettre la session de commerce de rares à zéro ?')) await session.reset();
  }

  if (!data) return <div className="page"><h1>Commerce de rares</h1><p className="muted">Chargement…</p></div>;

  return (
    <div className="page">
      <header className="route-header">
        <div>
          <h1>Commerce de rares</h1>
          <p className="muted">Session {data.startedAt ? `depuis ${time(data.startedAt)}, ${clock(seconds)}${session.pause ? ` (${pauseLabel(session.pause)})` : ''}` : 'non commencée'}</p>
        </div>
        <div className="form-actions">
          <OverlayToggle page="rares" />
          <PauseButton session={session} />
          <button className="btn" onClick={reset}>Remettre à zéro</button>
        </div>
      </header>

      <div className="tiles tiles-4">
        <Tile label="Mérites" value={int(data.merits)} sub={`${parTonne(data.merits, data.sold)} par tonne vendue`} />
        <Tile label="Mérites / heure" value={meritsHour != null ? int(meritsHour) : '—'} />
        <Tile label="Bénéfice" value={`${compact(data.profit)} cr`} sub={profitHour != null ? `${compact(profitHour)} cr / heure` : `${compact(data.revenue)} cr encaissés`} />
        <Tile label="En soute" value={`${int(data.hold.count)} t`} sub={texteSoute(data.hold)} />
      </div>
      <p className="small muted">
        {int(data.bought)} t achetées pour {compact(data.cost)} cr, {int(data.sold)} t vendues pour {compact(data.revenue)} cr.
        Les mérites comptés sont ceux que le jeu donne dans les 15 secondes après un achat ou une vente de rares.
        Les taux à l’heure sont une moyenne arrêtée à ta dernière vente : ils ne bougent qu’à la vente suivante.
      </p>

      <h2>Par marchandise</h2>
      {data.types.length ? (
        <div className="table-wrap">
          <table className="table compact">
            <thead><tr><th>Marchandise</th><th className="right">Achetées</th><th className="right">Vendues</th><th className="right">Bénéfice</th><th className="right">Mérites</th><th className="right">Mérites / t</th></tr></thead>
            <tbody>
              {data.types.map((t) => (
                <tr key={t.label}>
                  <td>{t.label}</td>
                  <td className="right num">{int(t.bought)} t</td>
                  <td className="right num">{int(t.sold)} t</td>
                  <td className="right num">{compact(t.profit)} cr</td>
                  <td className="right num">{int(t.merits)}</td>
                  <td className="right num">{parTonne(t.merits, t.sold)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Aucune marchandise rare achetée ni vendue pendant cette session.</p>
      )}

      <h2>Derniers mouvements</h2>
      {data.recent.length ? (
        <div className="table-wrap">
          <table className="table compact">
            <thead><tr><th>Heure</th><th>Action</th><th>Marchandise</th><th className="right">Quantité</th><th className="right">Crédits</th><th className="right">Mérites</th></tr></thead>
            <tbody>
              {data.recent.map((r, k) => (
                <tr key={`${r.at}-${k}`}>
                  <td>{time(r.at)}</td>
                  <td>{r.kind}</td>
                  <td>{r.label}</td>
                  <td className="right num">{int(r.count)} t</td>
                  <td className="right num">{r.credits > 0 ? '+' : ''}{compact(r.credits)} cr</td>
                  <td className="right num">{r.merits ? `+${int(r.merits)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Rien pour l’instant.</p>
      )}
      <p className="tiny muted">
        Une marchandise est reconnue rare d’après le relevé de l’app (134 marchandises, tirées du marché du jeu) et les
        marchés que tu ouvres. Le bénéfice est celui du jeu : prix de vente moins prix moyen payé.
      </p>

      <RaresCatalogue />
    </div>
  );
}
