import { PauseButton, pauseLabel } from '../../core/hud.jsx';
import { OverlayToggle } from '../../core/overlay.jsx';
import { clock, int, time } from '../../core/format.js';
import Tile from '../../core/Tile.jsx';
import { etatQuota, texteSoute, usePowerDelivery } from './usePowerDelivery.jsx';

/** Page du mode Livraison Powerplay : la session en cours, par ressource, et les derniers chargements et livraisons. */
export default function PowerDeliveryPage() {
  const session = usePowerDelivery();
  const { data, seconds, meritsHour, now } = session;

  async function reset() {
    if (window.confirm('Remettre la session de livraison à zéro ?')) await session.reset();
  }

  if (!data) return <div className="page"><h1>Livraison Powerplay</h1><p className="muted">Chargement…</p></div>;

  return (
    <div className="page">
      <header className="route-header">
        <div>
          <h1>Livraison Powerplay</h1>
          <p className="muted">Session {data.startedAt ? `depuis ${time(data.startedAt)}, ${clock(seconds)}${session.pause ? ` (${pauseLabel(session.pause)})` : ''}` : 'non commencée'}</p>
        </div>
        <div className="form-actions">
          <OverlayToggle page="powerdelivery" />
          <PauseButton session={session} />
          <button className="btn" onClick={reset}>Remettre à zéro</button>
        </div>
      </header>

      <div className="tiles tiles-4">
        <Tile label="En soute" value={`${int(data.hold.count)} t`} sub={texteSoute(data.hold)} />
        <Tile label="Livrées" value={`${int(data.delivered)} t`} sub={`${int(data.collected)} t chargées`} />
        <Tile label="Mérites" value={int(data.merits)} sub="gagnés par tes livraisons" />
        <Tile label="Mérites / heure" value={meritsHour != null ? int(meritsHour) : '—'} />
      </div>

      <p className="small">
        <strong>Allocation :</strong> {(() => {
          const q = etatQuota(data.quota, now);
          return q.possible ? `tu peux recharger (${q.sous}).` : `tu pourras recharger dans ${q.texte} (${q.sous}).`;
        })()}
        <span className="muted"> Règle des 30 minutes après le chargement : à vérifier, le jeu ne l’écrit nulle part. Le nombre de tonnes par période, qui dépend de ton rang, n’est pas encore connu.</span>
      </p>

      <h2>Par ressource</h2>
      {data.types.length ? (
        <div className="table-wrap">
          <table className="table compact">
            <thead><tr><th>Ressource</th><th className="right">Chargées</th><th className="right">Livrées</th><th className="right">Mérites</th><th className="right">Mérites / t</th></tr></thead>
            <tbody>
              {data.types.map((t) => (
                <tr key={t.label}>
                  <td>{t.label}</td>
                  <td className="right num">{int(t.collected)} t</td>
                  <td className="right num">{int(t.delivered)} t</td>
                  <td className="right num">{int(t.merits)}</td>
                  <td className="right num">{t.delivered > 0 ? (t.merits / t.delivered).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Rien de chargé ni de livré pendant cette session.</p>
      )}

      <h2>Derniers mouvements</h2>
      {data.recent.length ? (
        <div className="table-wrap">
          <table className="table compact">
            <thead><tr><th>Heure</th><th>Action</th><th>Ressource</th><th className="right">Quantité</th><th className="right">Mérites</th></tr></thead>
            <tbody>
              {data.recent.map((r, k) => (
                <tr key={`${r.at}-${k}`}>
                  <td>{time(r.at)}</td>
                  <td>{r.kind}</td>
                  <td>{r.label}</td>
                  <td className="right num">{int(r.count)} t</td>
                  <td className="right num">{r.merits > 0 ? `+${int(r.merits)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Aucun mouvement pour l’instant.</p>
      )}

      <p className="tiny muted">
        Les ressources sont celles que ta puissance te confie (dossiers de presse, contrats sous scellé, programmes…) : le
        jeu note chaque chargement et chaque livraison. Les mérites comptés sont ceux que le jeu donne dans les dix
        secondes qui suivent une livraison ; ceux d’une autre activité ne sont pas mélangés.
      </p>
    </div>
  );
}
