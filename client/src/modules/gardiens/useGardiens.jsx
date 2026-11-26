// Mode « Gardiens » en temps réel : la session (ce que tu ramasses), ton plan et ton stock, et le contenu du bandeau.
// Le bandeau montre ce qu'il te manque encore pour ton plan : c'est ce qu'on veut savoir sur un site.

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../core/api.js';
import { useLiveSession } from '../../core/hud.jsx';
import { useEvent } from '../../core/stream.js';
import { int, time } from '../../core/format.js';
import { besoins, stockDepuis } from './besoins.js';
import { resteSurSite } from './resteSurSite.js';

/** Noms courts, pour les cases du bandeau (étroites). */
export const COURTS = {
  guardian_powercell: 'Cellules', guardian_powerconduit: 'Conduits', guardian_techcomponent: 'Composants',
  guardian_sentinel_weaponparts: 'Pièces d’arme', guardian_sentinel_wreckagecomponents: 'Débris',
  guardian_weaponblueprint: 'Plan d’arme', guardian_moduleblueprint: 'Plan de module', guardian_vesselblueprint: 'Plan de vaisseau',
  ancientbiologicaldata: 'Obél. Alpha', ancientculturaldata: 'Obél. Bêta', ancienthistoricaldata: 'Obél. Gamma',
  ancientlanguagedata: 'Obél. Delta', ancienttechnologicaldata: 'Obél. Epsilon',
};
export function useGardiens() {
  const session = useLiveSession('/modules/gardiens', 'gardiens:update');
  const [ref_, setRef] = useState(null);
  const [choix, setChoix] = useState([]);
  const [inventaire, setInventaire] = useState(null);
  const lireStock = () => api('/modules/engineering/inventory').then(setInventaire).catch(() => {});
  useEffect(() => {
    api('/modules/gardiens/recettes').then(setRef).catch(() => {});
    api('/modules/gardiens/plan').then((d) => setChoix(d?.choix ?? [])).catch(() => {});
  }, []);
  // Le stock change à chaque matériau ramassé : relu quand la session bouge, et quand Ingénierie le dit
  const total = session.data?.total;
  useEffect(() => {
    lireStock();
  }, [total]);
  useEvent('engineering:update', lireStock);
  useEvent('gardiens:plan', (d) => Array.isArray(d?.choix) && setChoix(d.choix));
  const plan = useMemo(() => (ref_ ? besoins(ref_.recettes, choix, ref_.ingredients, stockDepuis(inventaire)) : null), [ref_, choix, inventaire]);
  return { ...session, plan };
}

/** Props du bandeau : les segments de plan, puis les trois matériaux qui manquent le plus (stock / besoin). */
export function gardiensHud({ data, plan, seconds, chrono, resetTime, pause, togglePause }) {
  if (!data) return null;
  const reste = resteSurSite(plan);
  const aUnPlan = (plan?.total || 0) > 0;
  const cases = reste.lignes.slice(0, 3).map((l) => ({
    label: COURTS[l.cle] || l.nom, value: `${int(l.stock)}/${int(l.besoin)}`, color: l.genre === 'donnees' ? '#b48cff' : '#4fd8e6', centerValue: true, sub: `manque ${int(l.manque)}`,
  }));
  // Moins de trois manques : la place sert à ce qui a été ramassé pendant la session
  if (cases.length < 3) cases.push({ label: 'Ramassés', value: int(data.total), color: 'var(--accent)', centerValue: true, sub: aUnPlan && !reste.lignes.length ? 'matériaux du plan : complets' : 'pendant la session' });
  if (cases.length < 3) cases.push({ label: 'Données', value: int(data.donnees), color: '#b48cff', centerValue: true, sub: 'obélisques scannés' });
  const last = data.recent?.[0];
  return {
    title: '◬ Gardiens',
    seconds: chrono ?? seconds,
    pause,
    onPause: togglePause,
    onResetTime: resetTime,
    columns: 'auto 1fr 1fr 1fr 1fr',
    dense: true,
    cells: [
      aUnPlan
        ? { label: 'Plans', value: `${int(reste.plans.stock)}/${int(reste.plans.besoin)}`, color: reste.plans.manque ? '#ffd24a' : '#5fd38d', centerValue: true, sub: reste.plans.manque ? `manque ${int(reste.plans.manque)}` : 'complet' }
        : { label: 'Plans', value: `+${int(data.plans)}`, color: '#ffd24a', centerValue: true, sub: 'pendant la session' },
      ...cases.slice(0, 3),
    ],
    last: last ? (
      <>
        <b>+{int(last.count)} {COURTS[last.cle] || last.cle}</b>
        <span>{time(last.at)}</span>
        {!aUnPlan && <span>coche tes déblocages dans Enova › Gardiens</span>}
      </>
    ) : <span>{aUnPlan ? 'ramasse un matériau gardien : la session démarre toute seule' : 'coche tes déblocages dans Enova › Gardiens pour voir ce qu’il te manque'}</span>,
  };
}
