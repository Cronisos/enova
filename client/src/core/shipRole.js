// Rôles des vaisseaux côté interface : textes, petites règles d'édition, et ce que montrent les HUD et le menu « Mode de
// jeu » (avis de bascule, propositions normales ou discrètes, « Retenir »), sans React (testés par node --test) : hud.jsx
// et ModeMenu.jsx ne font qu'afficher ce que rendent hudBottom et menuBubbles.
// Les règles elles-mêmes (rôles possibles, combien de secondaires…) sont celles de la déclaration commune
// (core/modes.js, checkRole) : le serveur refuse ce que ces aides ne laisseraient pas passer.

import { api } from './api.js';
import { activatedOf, hasRole, MAX_SECONDARY_ROLES, modeName, POLYVALENT, roleById, windowsOf } from './modes.js';

/** Copie modifiable d'un rôle (ou d'aucun). */
export const draftOf = (role) => ({ primary: role?.primary ?? null, secondary: [...(role?.secondary ?? [])] });

/** Couleur de chaque rôle, la même partout (tags des cartes et des fiches de vaisseau). */
export const COULEURS_ROLE = Object.freeze({
  routes: '#5fd38d', rares: '#ff9ed8', waypoints: '#e3b341', shipmining: 'var(--accent)', combat: '#ff6b6b', rescue: '#6fd3ff',
  materials: '#b48cff', colonisation: '#4fd1c5', powerdelivery: '#ffd24a', gardiens: '#4fd8e6', polyvalent: '#c8ced6',
});

/** Tags d'un rôle : le principal d'abord (plein), puis les secondaires (contour) ; [] sans rôle. */
export function tagsRole(role) {
  if (!hasRole(role)) return [];
  const tag = (id, principal) => {
    const r = roleById(id);
    return { id, label: r ? r.label : String(id), icone: r?.icon ?? '', couleur: COULEURS_ROLE[id] ?? '#c8ced6', principal };
  };
  return [...(role.primary ? [tag(role.primary, true)] : []), ...(role.secondary || []).filter((id) => id !== role.primary).map((id) => tag(id, false))];
}

/** « ⛏ Minage Rhino · aussi ☄ Minage vaisseau », « ✦ Polyvalent », « Sans rôle »… */
export function roleSummary(role) {
  if (!hasRole(role)) return 'Sans rôle';
  const others = (role.secondary || []).map(modeName);
  if (!role.primary) return `${others.join(', ')} (sans rôle principal)`;
  return others.length ? `${modeName(role.primary)} · aussi ${others.join(', ')}` : modeName(role.primary);
}

/** Ce que fait le rôle, en une phrase (sous l'éditeur). */
export function roleHelp(role) {
  if (role?.primary === POLYVALENT.id) return 'Polyvalent : rien ne s’ouvre seul ; l’app propose un mode d’après ce que tu fais et l’équipement du vaisseau, comme sans rôle.';
  const others = 'Les rôles secondaires sont proposés quand tu t’y mets, le reste discrètement.';
  if (role?.primary && !windowsOf(role.primary).length) {
    return `Quand tu montes dans ce vaisseau, l’app passe d’elle-même en ${modeName(role.primary)}. Ce mode n’a pas de fenêtre en jeu : si d’autres sont ouvertes, l’app te le propose au lieu de les fermer. ${others}`;
  }
  if (role?.primary) return `Quand tu montes dans ce vaisseau, l’app passe d’elle-même en ${modeName(role.primary)} et ouvre ses fenêtres (tu peux annuler). ${others}`;
  if (hasRole(role)) return 'Sans rôle principal, rien ne s’ouvre seul : les rôles secondaires sont proposés quand tu t’y mets, le reste discrètement.';
  return 'Sans rôle, rien ne s’ouvre seul : l’app te propose un mode d’après ce que tu fais et l’équipement du vaisseau.';
}

/** Nouveau rôle principal : retiré des secondaires ; Polyvalent n'en garde aucun. */
export function setPrimary(draft, id) {
  const primary = id || null;
  const secondary = primary === POLYVALENT.id ? [] : draft.secondary.filter((s) => s !== primary);
  return { primary, secondary };
}

/** Coche ou décoche un rôle secondaire, jamais au-delà de MAX_SECONDARY_ROLES ni le rôle principal. */
export function toggleSecondary(draft, id) {
  if (draft.secondary.includes(id)) return { ...draft, secondary: draft.secondary.filter((s) => s !== id) };
  if (id === draft.primary || draft.primary === POLYVALENT.id || draft.secondary.length >= MAX_SECONDARY_ROLES) return draft;
  return { ...draft, secondary: [...draft.secondary, id] };
}

/**
 * Avis de bascule : « ⛏ Minage Rhino activé — vaisseau « Pioche » », accordé au nom du mode (« 🏗 Colonisation
 * activée », « ◈ Matériaux activés » : core/modes.js, activated).
 */
export function switchText(notice) {
  if (!notice) return '';
  return `${modeName(notice.mode)} ${activatedOf(notice.mode)} — ${notice.ship ? `vaisseau « ${notice.ship} »` : 'rôle principal du vaisseau'}`;
}

/** Étiquette de l'avis sur la ligne du bas d'un HUD : « RÔLE ⛏ Minage Rhino activé — … » (le texte dit déjà « activé »). */
export const SWITCH_TAG = 'Rôle';

/**
 * « Retenir comme rôle de ce vaisseau » (vaisseau sans rôle, mode proposé d'après son équipement) : le texte entier à
 * côté du menu ; sur la ligne du bas d'un HUD, plus étroite, court mais explicite (l'infobulle ne se voit pas toujours
 * dans une fenêtre de l'overlay que les clics traversent). Un clic donne ce mode comme rôle principal, durable.
 */
export const REMEMBER_TEXT = 'Retenir comme rôle de ce vaisseau';
export const REMEMBER_SHORT = '⚑ Retenir comme rôle';
/** Infobulle de « Retenir » : ce que le clic changera. */
export const rememberTitle = (mode) => `À chaque embarquement dans ce vaisseau, l’app passera d’elle-même en ${modeName(mode)}`;

/**
 * Ligne du bas d'un HUD (hud.jsx HudOverlay) : l'avis de bascule d'abord, sinon une proposition normale (avec
 * « Retenir » pour un vaisseau sans rôle dont l'équipement l'a fait proposer). Une proposition discrète (hors des rôles
 * du vaisseau) ne prend jamais la ligne : elle s'ajoute au bout, en gris (quiet). Rien pendant le déplacement du cadre.
 * @returns {{ line: 'switch'|'suggest'|null, tag: string|null, quiet: boolean, remember: boolean }}
 */
export function hudBottom({ notice = null, suggestion = null, editing = false } = {}) {
  if (editing) return { line: null, tag: null, quiet: false, remember: false };
  const quiet = Boolean(suggestion?.discreet);
  if (notice) return { line: 'switch', tag: SWITCH_TAG, quiet, remember: false };
  if (suggestion && !quiet) return { line: 'suggest', tag: 'Proposé', quiet: false, remember: Boolean(suggestion.canRemember) };
  return { line: null, tag: null, quiet, remember: false };
}

/**
 * Bulles à côté du menu « Mode de jeu » (ModeMenu.jsx) : avis de bascule, proposition normale (« Retenir » seulement si
 * le serveur l'offre, jamais en discret) ou discrète. known : le mode proposé est un mode de l'interface. installed :
 * overlay présent ; sans lui, « Oui » ne pourrait ouvrir aucune fenêtre (PUT /api/overlay répond 409) : il devient
 * « Ouvrir la page », qui ouvre la page du mode dans l'app et retire la proposition.
 * @returns {{ notice: boolean, suggest: 'normal'|'quiet'|null, remember: boolean, accept: string }}
 */
export function menuBubbles({ notice = null, suggestion = null, known = true, installed = true } = {}) {
  const shown = Boolean(suggestion) && known;
  const quiet = shown && Boolean(suggestion.discreet);
  return {
    notice: Boolean(notice),
    suggest: shown ? (quiet ? 'quiet' : 'normal') : null,
    remember: shown && !quiet && Boolean(suggestion.canRemember),
    accept: installed ? 'Oui' : 'Ouvrir la page',
  };
}

/** Infobulle d'une proposition : d'où elle vient. */
export function suggestionTitle(s) {
  if (!s) return '';
  if (s.source === 'role') return 'Rôle principal de ce vaisseau';
  return s.discreet ? `Hors des rôles de ce vaisseau, d’après ce que tu fais : ${s.reason}` : `D’après ce que tu fais : ${s.reason}`;
}

/**
 * Avis de bascule à montrer dans une fenêtre libre qui reste ouverte (Coup d'œil) : seulement pour un mode sans fenêtre
 * à lui (Commerce), qu'aucun HUD n'affiche. Les autres modes ont leur HUD, qui le montre déjà.
 */
export const noticeInPanel = (notice) => Boolean(notice) && windowsOf(notice.mode).length === 0;

/** Enregistre le rôle d'un vaisseau (PUT, avec l'en-tête X-Elite-Compagnon : core/api.js). */
export function saveRole(shipId, role) {
  return api(`/ships/${encodeURIComponent(shipId)}/role`, { method: 'PUT', body: { primary: role.primary ?? null, secondary: [...(role.secondary ?? [])] } });
}
