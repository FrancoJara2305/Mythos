/**
 * Modelo del Planetario de Constelaciones (GR-04). Módulo puro, sin DOM ni Three.js: lo usa el build
 * (datos mínimos que viajan a la isla y figura SVG de respaldo), la isla (`planetarium.ts`) y las
 * pruebas de Node.
 *
 * - Doce asientos en la bóveda. Un asiento puede tener dos ocupantes según la tradición (Dioniso en
 *   la principal, Hestia en la del relieve Walters 23.40): nunca se muestran los dos a la vez.
 * - Estado compartible en el fragmento (ADR-05): `#dios=zeus&faceta=origin&tradicion=hogar`. Solo se
 *   escribe lo que difiere del valor por defecto; un valor desconocido se ignora.
 */
import type { ChapterSelection } from '../../config/chapters.ts';
import type { ArchiveData, ConstellationConfig } from '../../types/content.ts';
// Desde `facets.ts`, no desde `schema.ts`: este módulo viaja al navegador y no debe arrastrar Zod.
import { STAR_FACETS, type StarFacet } from '../content/facets.ts';

export { STAR_FACETS, type StarFacet };

/** Rótulos de las cuatro facetas: cada una es una estrella principal de la constelación. */
export const FACET_LABELS: Readonly<Record<StarFacet, string>> = {
  origin: 'Quién es y su origen',
  tales: 'Sus grandes relatos',
  domains: 'Dominios y símbolos',
  names: 'Secretos de su nombre y epítetos',
};

export interface PlanetariumStar {
  x: number;
  y: number;
  z: number;
  magnitude: number;
  facet?: StarFacet | undefined;
}

export interface PlanetariumDeity {
  id: string;
  name: string;
  color: string;
  shape: string;
  /** Dirección del centro de la constelación en la bóveda (vector unitario). */
  direction: [number, number, number];
  stars: PlanetariumStar[];
  links: [number, number][];
}

/** Tradición de los doce: `main` es el roster del capítulo; `alt`, la selección alternativa. */
export type Tradition = 'main' | 'alt';

export interface PlanetariumData {
  /** Asientos en orden editorial. `alt` solo existe en el asiento que cambia con la tradición. */
  seats: { main: string; alt?: string | undefined }[];
  deities: Record<string, PlanetariumDeity>;
  /** Rótulos del interruptor; `undefined` si la otra tradición no es visible en este ambiente. */
  traditions: { main: string; alt: string } | undefined;
}

export interface PlanetariumState {
  /** Constelación enfocada; `null` es la vista general de la bóveda. */
  focus: string | null;
  facet: StarFacet | null;
  tradition: Tradition;
}

export const DEFAULT_STATE: PlanetariumState = { focus: null, facet: null, tradition: 'main' };

/** Valor de `tradicion` en el fragmento para la tradición alternativa. */
export const ALT_TRADITION_PARAM = 'hogar';
/** Prefijo del ancla de cada constelación en la lista (`#constelacion-zeus`). */
export const CONSTELLATION_ANCHOR_PREFIX = 'constelacion-';

function normalise([x, y, z]: readonly [number, number, number]): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  const round = (value: number) => Math.round((value / length) * 10000) / 10000;
  return [round(x), round(y), round(z)];
}

function toDeity(id: string, name: string, config: ConstellationConfig): PlanetariumDeity {
  return {
    id,
    name,
    color: config.color,
    shape: config.shape,
    direction: normalise(config.position),
    stars: config.stars.map((star) => ({ x: star.x, y: star.y, z: star.z, magnitude: star.magnitude, facet: star.facet })),
    links: config.links.map(([from, to]) => [from, to]),
  };
}

/** Datos del planetario a partir del archivo visible. La integridad ya exigió `constellationConfig`. */
export function planetariumData(visible: ArchiveData, selection: ChapterSelection): PlanetariumData {
  const byId = new Map(visible.deities.map((entry) => [entry.id, entry.data]));
  const deities: Record<string, PlanetariumDeity> = {};
  const add = (id: string): boolean => {
    const data = byId.get(id);
    if (data?.constellationConfig === undefined) return false;
    deities[id] = toDeity(id, data.name, data.constellationConfig);
    return true;
  };

  const seats: PlanetariumData['seats'] = [];
  let traditions: PlanetariumData['traditions'];
  for (const item of [...selection.roster].sort((a, b) => a.order - b.order)) {
    if (!add(item.id)) throw new Error(`planetario: "${item.id}" no tiene constelación.`);
    const alternative = selection.alternatives.find((candidate) => candidate.without === item.id);
    if (alternative !== undefined && add(alternative.with)) {
      seats.push({ main: item.id, alt: alternative.with });
      traditions = { main: alternative.traditions.without, alt: alternative.traditions.with };
    } else {
      seats.push({ main: item.id });
    }
  }
  return { seats, deities, traditions };
}

/** Ocupante de cada asiento en una tradición. */
export function activeSeats(data: PlanetariumData, tradition: Tradition): string[] {
  return data.seats.map((seat) => (tradition === 'alt' && seat.alt !== undefined ? seat.alt : seat.main));
}

/** Asiento (0…n−1) de una deidad, sea cual sea su tradición. */
export function seatOf(data: PlanetariumData, id: string): number {
  return data.seats.findIndex((seat) => seat.main === id || seat.alt === id);
}

/** Tradición en la que una deidad ocupa su asiento (`undefined` si figura en ambas). */
export function traditionOf(data: PlanetariumData, id: string): Tradition | undefined {
  const seat = data.seats[seatOf(data, id)];
  if (seat === undefined || seat.alt === undefined) return undefined;
  return seat.alt === id ? 'alt' : 'main';
}

/**
 * Estado coherente: la deidad enfocada existe y, si su asiento depende de la tradición, la tradición
 * la acompaña (enfocar a Hestia activa su tradición). Sin foco no hay faceta.
 */
export function reconcile(data: PlanetariumData, state: PlanetariumState): PlanetariumState {
  const tradition: Tradition = state.tradition === 'alt' && data.traditions !== undefined ? 'alt' : 'main';
  if (state.focus === null || data.deities[state.focus] === undefined) return { focus: null, facet: null, tradition };
  const required = traditionOf(data, state.focus);
  return { focus: state.focus, facet: state.facet, tradition: required ?? tradition };
}

/** Cambiar de tradición con un asiento variable enfocado traslada el foco a su otro ocupante. */
export function switchTradition(data: PlanetariumData, state: PlanetariumState, tradition: Tradition): PlanetariumState {
  if (data.traditions === undefined) return { ...state, tradition: 'main' };
  if (state.focus === null) return { ...state, tradition };
  const seat = data.seats[seatOf(data, state.focus)];
  if (seat === undefined || seat.alt === undefined) return { ...state, tradition };
  return { focus: tradition === 'alt' ? seat.alt : seat.main, facet: state.facet, tradition };
}

/** Constelación anterior o siguiente en la tradición activa (circular). Desde la vista general, la primera o la última. */
export function step(data: PlanetariumData, state: PlanetariumState, delta: 1 | -1): string {
  const seats = activeSeats(data, state.tradition);
  const current = state.focus === null ? -1 : seats.indexOf(state.focus);
  if (current === -1) return (delta === 1 ? seats[0] : seats.at(-1)) as string;
  return seats[(current + delta + seats.length) % seats.length] as string;
}

/** Estado a partir del fragmento. Un fragmento ilegible (codificación inválida) es la vista general. */
export function parseState(data: PlanetariumData, hash: string): PlanetariumState {
  let raw: string;
  try {
    raw = decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return DEFAULT_STATE;
  }
  if (raw === '') return DEFAULT_STATE;
  if (!raw.includes('=')) {
    const id = raw.startsWith(CONSTELLATION_ANCHOR_PREFIX) ? raw.slice(CONSTELLATION_ANCHOR_PREFIX.length) : '';
    return reconcile(data, { ...DEFAULT_STATE, focus: id === '' ? null : id });
  }
  const params = new URLSearchParams(raw);
  const facet = params.get('faceta');
  return reconcile(data, {
    focus: params.get('dios'),
    facet: (STAR_FACETS as readonly string[]).includes(facet ?? '') ? (facet as StarFacet) : null,
    tradition: params.get('tradicion') === ALT_TRADITION_PARAM ? 'alt' : 'main',
  });
}

/** Fragmento del estado, o cadena vacía para el estado por defecto. */
export function serializeState(data: PlanetariumData, state: PlanetariumState): string {
  const params = new URLSearchParams();
  if (state.focus !== null) params.set('dios', state.focus);
  if (state.focus !== null && state.facet !== null) params.set('faceta', state.facet);
  // La tradición solo se escribe si no queda implícita en la deidad enfocada.
  const implied = state.focus === null ? undefined : traditionOf(data, state.focus);
  if (state.tradition === 'alt' && implied === undefined) params.set('tradicion', ALT_TRADITION_PARAM);
  const query = params.toString();
  return query === '' ? '' : `#${query}`;
}

/**
 * Figura estática de una constelación (SVG del build): lo que se ve sin JavaScript o sin WebGL, y la
 * miniatura de la ficha. Decorativa: el nombre de la figura va en texto junto a ella.
 */
export function constellationSvg(deity: Pick<PlanetariumDeity, 'color' | 'stars' | 'links'>, className = 'constellation-figure'): string {
  const scale = 100;
  const at = (star: PlanetariumStar) => [Math.round(star.x * scale * 10) / 10, Math.round(-star.y * scale * 10) / 10] as const;
  const lines = deity.links
    .map(([from, to]) => {
      const a = deity.stars[from];
      const b = deity.stars[to];
      if (a === undefined || b === undefined) return '';
      const [x1, y1] = at(a);
      const [x2, y2] = at(b);
      return `M${x1} ${y1}L${x2} ${y2}`;
    })
    .join('');
  const stars = deity.stars
    .map((star) => {
      const [x, y] = at(star);
      const radius = Math.round((2 + star.magnitude * 4) * 10) / 10;
      const halo = `<circle cx="${x}" cy="${y}" r="${Math.round(radius * 3 * 10) / 10}" opacity="0.16"/>`;
      return `${halo}<circle cx="${x}" cy="${y}" r="${radius}"/>${star.facet === undefined ? '' : `<circle cx="${x}" cy="${y}" r="${Math.round(radius * 0.45 * 10) / 10}" fill="#fff"/>`}`;
    })
    .join('');
  return (
    `<svg class="${className}" viewBox="-125 -125 250 250" aria-hidden="true" focusable="false">` +
    `<path d="${lines}" fill="none" stroke="${deity.color}" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>` +
    `<g fill="${deity.color}">${stars}</g></svg>`
  );
}
