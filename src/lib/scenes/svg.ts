/**
 * Primitivas SVG de las escenas originales de MYTHOS (src/lib/scenes/scenes.ts). Todo es marcado
 * estático generado en el build, determinista (PRNG con semilla fija): el mismo código produce
 * siempre la misma escena, sin datos de usuario ni recursos externos.
 */
import { emblemMarkup } from '../../components/archive/emblems.ts';

export const W = 1600;
export const H = 1000;
export const VIEWBOX = `0 0 ${W} ${H}`;

export type Point = readonly [number, number];

/** Número compacto con un decimal. */
export const n = (value: number): string => String(Math.round(value * 10) / 10);

/** PRNG mulberry32: escenas reproducibles. */
export function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (random: () => number, min: number, max: number): number => min + (max - min) * random();

type Stop = readonly [offset: number, color: string, opacity?: number];

const stopMarkup = (stops: readonly Stop[]) =>
  stops
    .map(([offset, color, opacity]) => `<stop offset="${Math.round(offset * 1000) / 1000}" stop-color="${color}"${opacity === undefined ? '' : ` stop-opacity="${Math.round(opacity * 1000) / 1000}"`}/>`)
    .join('');

export function linear(id: string, stops: readonly Stop[], at: { x1?: number; y1?: number; x2?: number; y2?: number; user?: boolean } = {}): string {
  const { x1 = 0, y1 = 0, x2 = 0, y2 = 1, user = false } = at;
  return `<linearGradient id="${id}" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"${user ? ' gradientUnits="userSpaceOnUse"' : ''}>${stopMarkup(stops)}</linearGradient>`;
}

export function radial(id: string, stops: readonly Stop[], at: { cx: number; cy: number; r: number; user?: boolean; fx?: number; fy?: number }): string {
  const { cx, cy, r, user = true } = at;
  const focus = at.fx === undefined || at.fy === undefined ? '' : ` fx="${n(at.fx)}" fy="${n(at.fy)}"`;
  return `<radialGradient id="${id}" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"${focus}${user ? ' gradientUnits="userSpaceOnUse"' : ''}>${stopMarkup(stops)}</radialGradient>`;
}

export function blur(id: string, deviation: number): string {
  return `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${n(deviation)}"/></filter>`;
}

/** Curva suave (Catmull-Rom → Bézier cúbica) por los puntos dados. */
export function smooth(points: readonly Point[], closed = false, tension = 1): string {
  if (points.length < 2) return '';
  const at = (index: number): Point => {
    const count = points.length;
    const wrapped = closed ? ((index % count) + count) % count : Math.min(Math.max(index, 0), count - 1);
    return points[wrapped] as Point;
  };
  const first = at(0);
  let d = `M${n(first[0])} ${n(first[1])}`;
  const segments = closed ? points.length : points.length - 1;
  for (let index = 0; index < segments; index += 1) {
    const p0 = at(index - 1);
    const p1 = at(index);
    const p2 = at(index + 1);
    const p3 = at(index + 2);
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d += `C${n(c1x)} ${n(c1y)} ${n(c2x)} ${n(c2y)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

export const poly = (points: readonly Point[]): string => `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`;

/** Línea quebrada aleatoria de izquierda a derecha (crestas, bordes de roca, estratos). */
export function ridge(random: () => number, y: number, amplitude: number, step: number, from = -40, to = W + 40): Point[] {
  const points: Point[] = [];
  let current = y;
  for (let x = from; x <= to + step; x += step) {
    current += between(random, -amplitude, amplitude);
    current = Math.min(y + amplitude * 2, Math.max(y - amplitude * 2, current));
    points.push([x, current]);
  }
  return points;
}

/** Cierra una cresta hasta el borde inferior para formar una masa. */
export function massBelow(points: readonly Point[], bottom = H + 20): string {
  const first = points[0] as Point;
  const last = points[points.length - 1] as Point;
  return `${smooth(points)}L${n(last[0])} ${n(bottom)}L${n(first[0])} ${n(bottom)}Z`;
}

/** Contorno orgánico cerrado alrededor de un centro (nubes, rocas, gotas de luz). */
export function blob(random: () => number, cx: number, cy: number, rx: number, ry: number, lobes = 7, jitter = 0.28): string {
  const points: Point[] = [];
  const offset = random() * Math.PI * 2;
  for (let index = 0; index < lobes; index += 1) {
    const angle = offset + (index / lobes) * Math.PI * 2;
    const scale = 1 - jitter + random() * jitter * 2;
    points.push([cx + Math.cos(angle) * rx * scale, cy + Math.sin(angle) * ry * scale]);
  }
  return smooth(points, true);
}

export interface MonumentOptions {
  x: number;
  y: number;
  /** Escala del emblema (lienzo 120 × 160). */
  scale: number;
  rotate?: number;
  /** Sombra, tono medio y brillo del metal. */
  metal: readonly [dark: string, mid: string, light: string];
  /** Grosor del trazo en unidades del emblema. */
  weight: number;
  /** Rellena las formas cerradas como un volumen macizo. */
  solid?: boolean;
  /** Luz desde abajo (fragua) en lugar de desde arriba a la izquierda. */
  underlight?: boolean;
  /** Prefijo único para los identificadores internos. */
  prefix: string;
}

/**
 * Objeto monumental a partir de un emblema editorial: mismas formas que el símbolo documentado, pero
 * con volumen (sombra proyectada, metal con brillo diagonal y filo de luz). No reproduce ninguna
 * pieza antigua: es la interpretación del atributo documentado en la ficha.
 */
export function monument(id: string, options: MonumentOptions): { defs: string; body: string } {
  const markup = emblemMarkup(id);
  const { x, y, scale, rotate = 0, metal, weight, solid = false, underlight = false, prefix } = options;
  const [dark, mid, light] = metal;
  const sheen = underlight
    ? linear(`${prefix}-metal`, [[0, dark], [0.55, mid], [0.86, light], [1, mid]], { x1: 60, y1: 0, x2: 60, y2: 160, user: true })
    : linear(`${prefix}-metal`, [[0, dark], [0.3, mid], [0.46, light], [0.6, mid], [1, dark]], { x1: 8, y1: 4, x2: 112, y2: 156, user: true });
  const body = linear(`${prefix}-body`, [[0, dark], [0.5, mid, 0.85], [1, dark]], { x1: 0, y1: 0, x2: 120, y2: 160, user: true });
  const defs = sheen + body + blur(`${prefix}-shadow`, 3.2) + blur(`${prefix}-halo`, 1.2);
  const transform = `translate(${n(x)} ${n(y)}) rotate(${n(rotate)}) scale(${n(scale)}) translate(-60 -80)`;
  const fill = solid ? `url(#${prefix}-body)` : 'none';
  const group = (attributes: string) => `<g ${attributes} stroke-linecap="round" stroke-linejoin="round">${markup}</g>`;
  const result = [
    `<g transform="${transform}">`,
    // Sombra proyectada sobre el fondo
    `<g transform="translate(3.5 5)" filter="url(#${prefix}-shadow)" opacity="0.55">${group(`fill="${solid ? '#000' : 'none'}" stroke="#000" stroke-width="${n(weight * 1.4)}"`)}</g>`,
    // Volumen y metal
    group(`fill="${fill}" stroke="url(#${prefix}-metal)" stroke-width="${n(weight)}"`),
    // Filo de luz (canto iluminado)
    `<g transform="translate(${underlight ? '-0.3 0.5' : '-0.45 -0.55'})" opacity="0.5">${group(`fill="none" stroke="${light}" stroke-width="${n(weight * 0.26)}"`)}</g>`,
    `</g>`,
  ].join('');
  return { defs, body: result };
}

/** Red de cáusticas en un patrón continuo (celdas de luz con bordes brillantes). */
export function causticPattern(id: string, random: () => number, size: number, cells: number, color: string, width: number, rotate = 0): string {
  const step = size / cells;
  const shapes: string[] = [];
  for (let row = 0; row < cells; row += 1) {
    for (let column = 0; column < cells; column += 1) {
      const cx = (column + 0.5) * step + between(random, -step * 0.18, step * 0.18);
      const cy = (row + 0.5) * step + between(random, -step * 0.18, step * 0.18);
      const rx = step * between(random, 0.42, 0.56);
      const ry = step * between(random, 0.4, 0.55);
      const shape = blob(random, 0, 0, rx, ry, 6, 0.3);
      // Copias desplazadas en los bordes para que el patrón no tenga costuras.
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          const px = cx + dx;
          const py = cy + dy;
          if (px + rx * 1.4 < 0 || px - rx * 1.4 > size || py + ry * 1.4 < 0 || py - ry * 1.4 > size) continue;
          shapes.push(`<path transform="translate(${n(px)} ${n(py)})" d="${shape}"/>`);
        }
      }
    }
  }
  return (
    `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"${rotate === 0 ? '' : ` patternTransform="rotate(${rotate})"`}>` +
    `<g fill="none" stroke="${color}" stroke-width="${n(width)}" stroke-linejoin="round">${shapes.join('')}</g></pattern>`
  );
}

/** Documento SVG completo (para archivo o `<img>`). */
export function svgDocument(defs: string, body: string, attributes = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" preserveAspectRatio="none"${attributes}><defs>${defs}</defs>${body}</svg>`;
}

/** SVG de una capa de efecto, en línea dentro del encabezado (decorativo). */
export function svgLayer(defs: string, body: string): string {
  return `<svg viewBox="${VIEWBOX}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs>${defs}</defs>${body}</svg>`;
}
