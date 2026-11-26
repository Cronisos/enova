// « Je veux de l'iridium : je vais où ? » (Mes repères › Chercher). Pour chaque minerai, les endroits connus où en
// trouver, tous systèmes confondus : planète, numéro d'EEP, note, foreuses, tari ou non. Rien de neuf n'est relevé : ce
// sont les EEP notés et les repères du joueur, tels que buildSurvey les range déjà par système (survey.js).

const ORDRE = { bon: 0, petit: 1, vu: 2, tari: 3 };

/** État d'un EEP pour la recherche, d'après son état dans le relevé ; null : à ne pas proposer (mauvais). */
function etatDe(site) {
  if (!site) return 'vu';
  if (site.state === 'good') return 'bon';
  if (site.state === 'depleted') return 'tari';
  if (site.state === 'low') return 'petit';
  if (site.state === 'bad') return null;
  return 'vu';
}

/**
 * @param releves [{ system, systemAddress, planets }] : un relevé par système (buildSurvey)
 * @param reperes repères du joueur (pour le nombre de foreuses d'un EEP), par identifiant : Map(id → { drills })
 * @param minerai nom lu sur un EEP ou un repère → vrai nom du minerai, ou null si ce n'en est pas un. Un repère porte
 *   ce que le joueur a tapé (« Iridiul », « iridim », « pas rentable le 12 ») : sans ce passage, chaque faute devenait
 *   un minerai à part dans la recherche.
 * @returns [{ ore, bons, lieux: [{ system, systemAddress, body, name, type, eep, note, etat, retour, foreuses }] }],
 *   les minerais qui ont le plus de bons endroits d'abord ; dans un minerai : les bons, ceux qui prennent le plus de
 *   foreuses d'abord (puis les mieux notés), puis les petits gisements, puis ceux seulement vus, puis les taris (avec leur date de retour).
 */
export function lieuxParMinerai(releves, reperes = new Map(), minerai = (nom) => nom) {
  const parMinerai = new Map();
  for (const r of Array.isArray(releves) ? releves : []) {
    for (const p of r?.planets || []) {
      if (p.out || p.verdict === 'out') continue; // planète écartée : on n'y renvoie pas
      for (const o of p.ores || []) {
        const nom = minerai(String(o.ore || '').trim());
        const cle = String(nom || '').toLowerCase();
        if (!cle) continue;
        if (!parMinerai.has(cle)) parMinerai.set(cle, { ore: nom, lieux: [] });
        for (const e of [...(o.good || []), ...(o.weak || [])]) {
          const site = (p.sites || []).find((s) => s.number === e.number);
          const etat = etatDe(site);
          if (!etat) continue;
          const foreuses = Math.max(0, ...(site?.waypoints || []).map((id) => reperes.get(id)?.drills ?? 0)) || null;
          // Deux noms ramenés au même minerai sur le même EEP (« Iridium » et « iridim ») : un seul endroit
          if (parMinerai.get(cle).lieux.some((l) => l.body === p.body && l.eep === e.number)) continue;
          parMinerai.get(cle).lieux.push({
            system: r.system,
            systemAddress: r.systemAddress ?? null,
            body: p.body,
            name: p.name,
            type: p.type ?? null,
            eep: e.number,
            note: e.rating ?? site?.rating ?? null,
            etat,
            retour: etat === 'tari' ? site?.depletedUntil ?? null : null,
            foreuses,
          });
        }
      }
    }
  }
  const sortie = [...parMinerai.values()].filter((m) => m.lieux.length);
  for (const m of sortie) {
    m.lieux.sort((a, b) => ORDRE[a.etat] - ORDRE[b.etat] || (b.foreuses ?? 0) - (a.foreuses ?? 0) || (b.note ?? 0) - (a.note ?? 0)
      || String(a.system).localeCompare(String(b.system), 'fr') || String(a.body).localeCompare(String(b.body), 'fr', { numeric: true }) || a.eep - b.eep);
    m.bons = m.lieux.filter((l) => l.etat === 'bon').length;
  }
  return sortie.sort((a, b) => b.bons - a.bons || b.lieux.length - a.lieux.length || a.ore.localeCompare(b.ore, 'fr'));
}
