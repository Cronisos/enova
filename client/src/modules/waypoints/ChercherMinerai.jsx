// Mes repères › Chercher : « je veux de l'iridium, je vais où ? ». On choisit un minerai (à sa couleur, comme sur la
// carte de l'EEP), l'app liste les endroits connus où en trouver, tous systèmes confondus, les meilleurs d'abord.
// Données : GET /chercher (server/src/modules/waypoints/chercher.js), tirées des EEP notés et des repères.

import { useEffect, useState } from 'react';
import { useEvent } from '../../core/stream.js';
import NomSysteme from '../../core/NomSysteme.jsx';
import { wpApi } from './api.js';
import { couleurMinerai } from './oreColors.js';
import IconeMonde from './IconeMonde.jsx';

const ETATS = {
  bon: { label: 'Rentable', classe: 'is-bon' },
  petit: { label: 'Petit gisement', classe: 'is-petit' },
  vu: { label: 'Vu, pas noté', classe: 'is-vu' },
  tari: { label: 'Tari', classe: 'is-tari' },
};
const RETENU = 'enova.reperes.minerai'; // dernier minerai cherché, gardé sur ce PC

/** Les endroits d'un minerai, regroupés par système dans l'ordre où ils arrivent (les meilleurs d'abord). */
export function parSysteme(lieux) {
  const groupes = [];
  for (const l of lieux) {
    let g = groupes.find((x) => x.system === l.system);
    if (!g) groupes.push(g = { system: l.system, systemAddress: l.systemAddress, lieux: [] });
    g.lieux.push(l);
  }
  return groupes;
}

export default function ChercherMinerai({ ici, ouvrir, ouvrirSysteme }) {
  const [minerais, setMinerais] = useState(null);
  const [choix, setChoix] = useState(() => {
    try {
      return localStorage.getItem(RETENU) || '';
    } catch {
      return '';
    }
  });
  const charger = () => wpApi.chercher().then((d) => setMinerais(d?.minerais ?? [])).catch(() => setMinerais([]));
  useEffect(() => {
    charger();
  }, []);
  useEvent('waypoints:update', charger);
  useEvent('waypoints:survey', charger);

  if (!minerais) return <p className="muted">Chargement…</p>;
  if (!minerais.length) {
    return (
      <section className="panel">
        <p>Aucun gisement connu pour l’instant.</p>
        <p className="small muted">Note un EEP (de 1 à 10) ou pose un repère de minage avec son minerai : il apparaîtra ici, et tu pourras y revenir en cherchant ce minerai.</p>
      </section>
    );
  }
  const actif = minerais.find((m) => m.ore === choix) || minerais[0];
  const choisir = (ore) => {
    setChoix(ore);
    try {
      localStorage.setItem(RETENU, ore);
    } catch {
      // stockage refusé : le choix tient jusqu'à la fermeture de la page
    }
  };
  const groupes = parSysteme(actif.lieux);
  return (
    <div className="ch">
      <div className="ch-minerais" role="group" aria-label="Minerai cherché">
        {minerais.map((m) => (
          <button key={m.ore} type="button" className={`ch-minerai${m.ore === actif.ore ? ' is-on' : ''}${m.bons ? '' : ' is-rien'}`} style={{ '--c': couleurMinerai(m.ore) }} onClick={() => choisir(m.ore)}
            title={`${m.bons} endroit${m.bons > 1 ? 's' : ''} rentable${m.bons > 1 ? 's' : ''} connu${m.bons > 1 ? 's' : ''}, ${m.lieux.length} en tout`}>
            <i aria-hidden="true" />{m.ore}<b>{m.bons}</b>
          </button>
        ))}
      </div>

      <h2 className="ch-titre" style={{ '--c': couleurMinerai(actif.ore) }}>
        <i aria-hidden="true" />{actif.ore}
        <span>{actif.bons ? `${actif.bons} endroit${actif.bons > 1 ? 's' : ''} rentable${actif.bons > 1 ? 's' : ''}` : 'aucun endroit rentable connu'} · {groupes.length} système{groupes.length > 1 ? 's' : ''}</span>
      </h2>

      {groupes.map((g) => (
        <section key={g.system} className={`ch-systeme${g.system === ici ? ' is-ici' : ''}`}>
          <header>
            {/* Le système s'ouvre : ses planètes, dans l'onglet « Ici » (l’auteur, 19 nov. 2026) */}
            <button type="button" className="ch-systeme-nom" onClick={() => ouvrirSysteme(g)} title="Voir toutes les planètes de ce système">
              <NomSysteme nom={g.system} /> <span aria-hidden="true">›</span>
            </button>
            {g.system === ici && <span className="ch-ici">tu y es</span>}
          </header>
          <ul>
            {g.lieux.map((l) => {
              const e = ETATS[l.etat] || ETATS.vu;
              return (
                <li key={`${l.body}-${l.eep}`}>
                  <button type="button" className={`ch-lieu ${e.classe}`} onClick={() => ouvrir(l)} title="Ouvrir cet EEP">
                    <span className="ch-note" title="Foreuses qu’on peut y poser">{l.foreuses ? <><b>{l.foreuses}</b> foreuse{l.foreuses > 1 ? 's' : ''}</> : <small>foreuses ?</small>}</span>
                    <span className="ch-corps">
                      <b>{l.name}</b> · EEP {l.eep}
                      {l.type && <small><IconeMonde type={l.type} taille={13} />{l.type}</small>}
                    </span>
                    {l.note != null && <span className="ch-foreuses" title="Ta note de cet EEP">noté {l.note}/10</span>}
                    <span className="ch-etat">{e.label}{l.etat === 'tari' && l.retour ? ` · retour le ${new Date(l.retour).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}</span>
                    <span className="ch-fleche" aria-hidden="true">›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
