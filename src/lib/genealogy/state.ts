/**
 * Estado compartible del explorador en el fragmento de la URL: `#deity=hera&hephaestus-parentage=homeric`.
 * Solo se escriben las variantes distintas de la opción por defecto. También se acepta el ancla
 * `#familia-{id}` de la lista completa, que funciona sin JavaScript: con JS, selecciona esa figura.
 * Cualquier valor desconocido se ignora y se conserva el valor por defecto.
 */
import type { GenealogyData, GenealogyState } from './model.ts';

export const FAMILY_ANCHOR_PREFIX = 'familia-';

export function defaultState(data: GenealogyData): GenealogyState {
  return {
    focus: data.defaultFocus,
    choice: Object.fromEntries(data.groups.map((group) => [group.id, group.defaultOption])),
  };
}

export function parseState(hash: string, data: GenealogyData): GenealogyState {
  const state = defaultState(data);
  const choice: Record<string, string> = { ...state.choice };
  const ids = new Set(data.entities.map((entity) => entity.id));
  const raw = decodeURIComponent(hash.replace(/^#/, ''));

  if (raw.startsWith(FAMILY_ANCHOR_PREFIX)) {
    const id = raw.slice(FAMILY_ANCHOR_PREFIX.length);
    return ids.has(id) ? { focus: id, choice } : state;
  }

  let focus = state.focus;
  for (const [key, value] of new URLSearchParams(raw)) {
    if (key === 'deity') {
      if (ids.has(value)) focus = value;
      continue;
    }
    const group = data.groups.find((item) => item.id === key);
    if (group?.options.some((option) => option.id === value)) choice[key] = value;
  }
  return { focus, choice };
}

export function serializeState(state: GenealogyState, data: GenealogyData): string {
  const params = new URLSearchParams({ deity: state.focus });
  for (const group of data.groups) {
    const option = state.choice[group.id];
    if (option !== undefined && option !== group.defaultOption) params.set(group.id, option);
  }
  return `#${params.toString()}`;
}

export function sameState(a: GenealogyState, b: GenealogyState, data: GenealogyData): boolean {
  return serializeState(a, data) === serializeState(b, data);
}
