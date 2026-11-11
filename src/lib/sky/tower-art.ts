/**
 * Arte vectorial original de la Torre (`/`), generado en el build: geometría sagrada del portal,
 * anillos de columnas de cada piso, bancos de nubes del Olimpo y el paisaje mediterráneo del pie.
 * Todo es marcado SVG determinista (PRNG con semilla fija), decorativo (`aria-hidden`), sin rasters ni
 * recursos externos. Los colores se heredan con `currentColor` o se fijan con la paleta de tokens.
 */
import { between, blob, n, ridge, rng, smooth, type Point } from '../scenes/svg.ts';

const TAU = Math.PI * 2;
const polar = (radius: number, angle: number): Point => [radius * Math.cos(angle), radius * Math.sin(angle)];
const point = ([x, y]: Point) => `${n(x)} ${n(y)}`;

/**
 * Portal de entrada: círculos concéntricos, doce puntos (los Doce) unidos en estrella, hexagrama y una
 * corona de marcas. Tres grupos (`portal-ring--a/b/c`) para girarlos a distinta velocidad con CSS.
 */
export function sacredGeometry(): string {
  const twelve = Array.from({ length: 12 }, (_, index) => polar(232, (index / 12) * TAU - Math.PI / 2));
  const star = twelve.map((from, index) => `M${point(from)}L${point(twelve[(index + 5) % 12] as Point)}`).join('');
  const dots = twelve.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="4.5" fill="currentColor" stroke="none"/>`).join('');
  const ticks = Array.from({ length: 72 }, (_, index) => {
    const angle = (index / 72) * TAU;
    const inner = index % 6 === 0 ? 262 : 272;
    return `M${point(polar(inner, angle))}L${point(polar(284, angle))}`;
  }).join('');
  const triangle = (offset: number) => `M${[0, 1, 2].map((index) => point(polar(150, offset + (index / 3) * TAU))).join('L')}Z`;
  const petals = Array.from({ length: 6 }, (_, index) => {
    const [x, y] = polar(75, (index / 6) * TAU);
    return `<circle cx="${n(x)}" cy="${n(y)}" r="75"/>`;
  }).join('');
  return (
    '<svg class="portal-geometry" viewBox="-300 -300 600 600" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-linecap="round">' +
    `<g class="portal-ring portal-ring--a" stroke-width="1"><circle r="284"/><path d="${ticks}"/></g>` +
    `<g class="portal-ring portal-ring--b" stroke-width="0.9"><circle r="232"/><path d="${star}" opacity="0.55"/>${dots}</g>` +
    `<g class="portal-ring portal-ring--c" stroke-width="0.9"><circle r="150"/><path d="${triangle(-Math.PI / 2)}${triangle(Math.PI / 2)}" opacity="0.7"/><g opacity="0.35">${petals}</g></g>` +
    '<circle class="portal-core" r="26" fill="currentColor" stroke="none"/>' +
    '</svg>'
  );
}

/** Piso de la torre: un anillo de columnas (tholos) visto en perspectiva, centrado en el eje. */
export function tierRing(columns = 13): string {
  const cx = 220;
  const rx = 200;
  const ry = 30;
  const top = 44;
  const bottom = 132;
  const shafts = Array.from({ length: columns }, (_, index) => {
    const angle = Math.PI * (index / (columns - 1));
    const x = cx + rx * Math.cos(angle);
    const dy = ry * Math.sin(angle);
    const depth = 0.35 + 0.65 * Math.sin(angle);
    return `<path d="M${n(x)} ${n(top + dy)}V${n(bottom + dy)}" opacity="${n(depth)}" stroke-width="${n(1 + depth * 1.6)}"/>`;
  }).join('');
  return (
    '<svg class="tier-ring" viewBox="0 0 440 180" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">' +
    `<ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" stroke-width="1.4"/>` +
    `<ellipse cx="${cx}" cy="${top}" rx="${rx * 0.72}" ry="${ry * 0.72}" stroke-width="0.8" opacity="0.5"/>` +
    shafts +
    `<path d="M${cx - rx} ${bottom}A${rx} ${ry} 0 0 0 ${cx + rx} ${bottom}" stroke-width="1.8"/>` +
    `<path d="M${cx - rx - 14} ${bottom + 12}A${rx + 14} ${ry + 3} 0 0 0 ${cx + rx + 14} ${bottom + 12}" stroke-width="0.9" opacity="0.6"/>` +
    '</svg>'
  );
}

/**
 * Banco de nubes luminosas (transición entre niveles). `tone` decide la luz: `gold` para la llegada al
 * Olimpo, `dusk` para las nubes bajas sobre la Tierra.
 */
export function cloudBand(seed: number, tone: 'gold' | 'dusk'): string {
  const random = rng(seed);
  const width = 1600;
  const height = 320;
  const fills = tone === 'gold' ? ['#1d2a4d', '#33456f', '#6f7fa6', '#f3ecdf'] : ['#172544', '#3a3350', '#7a4a3a', '#e8b98a'];
  const layers = fills.map((fill, layer) => {
    const count = 7 + layer * 2;
    const shapes: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const cx = (index / (count - 1)) * width + between(random, -60, 60);
      const cy = height * (0.72 - layer * 0.13) + between(random, -22, 22);
      shapes.push(`<path d="${blob(random, cx, cy, between(random, 150, 260) - layer * 22, between(random, 46, 84) - layer * 8, 8, 0.24)}"/>`);
    }
    const opacity = [0.95, 0.8, 0.5, 0.2][layer] ?? 0.2;
    return `<g fill="${fill}" opacity="${opacity}" filter="url(#cloud-${seed}-${layer < 2 ? 'soft' : 'softer'})">${shapes.join('')}</g>`;
  });
  return (
    `<svg class="cloud-band" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false">` +
    `<defs><filter id="cloud-${seed}-soft" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="14"/></filter>` +
    `<filter id="cloud-${seed}-softer" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="24"/></filter></defs>` +
    layers.join('') +
    '</svg>'
  );
}

function cypress(x: number, base: number, height: number): string {
  const half = height * 0.11;
  return `<path d="M${n(x)} ${n(base - height)}C${n(x + half * 1.5)} ${n(base - height * 0.55)} ${n(x + half)} ${n(base - height * 0.1)} ${n(x)} ${n(base)}C${n(x - half)} ${n(base - height * 0.1)} ${n(x - half * 1.5)} ${n(base - height * 0.55)} ${n(x)} ${n(base - height)}Z"/>`;
}

/** Paisaje del pie de la torre: sierras, mar al fondo, cipreses y un pequeño templo en la colina. */
export function landscape(seed = 77): string {
  const random = rng(seed);
  const width = 1600;
  const height = 520;
  const far = ridge(random, 250, 26, 90);
  const mid = ridge(random, 330, 22, 70);
  const near = ridge(random, 420, 14, 60);
  const mass = (points: readonly Point[]) => {
    const first = points[0] as Point;
    const last = points[points.length - 1] as Point;
    return `${smooth(points)}L${n(last[0])} ${height + 20}L${n(first[0])} ${height + 20}Z`;
  };
  // Templo sobre una colina del plano medio
  const tx = 1130;
  const ty = 318;
  const columns = Array.from({ length: 6 }, (_, index) => `<rect x="${tx + 8 + index * 21}" y="${ty - 58}" width="7" height="58"/>`).join('');
  const temple =
    `<g fill="#e9dcc3" opacity="0.92"><path d="M${tx - 6} ${ty - 58}L${tx + 66} ${ty - 92}L${tx + 138} ${ty - 58}Z"/>` +
    `<rect x="${tx - 6}" y="${ty - 62}" width="144" height="6"/>${columns}<rect x="${tx - 12}" y="${ty}" width="156" height="7"/><rect x="${tx - 20}" y="${ty + 7}" width="172" height="7"/></g>`;
  const trees: string[] = [];
  for (let index = 0; index < 16; index += 1) {
    const x = between(random, 20, width - 20);
    trees.push(cypress(x, between(random, 430, 470), between(random, 70, 150)));
  }
  return (
    `<svg class="landscape" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">` +
    '<defs><linearGradient id="land-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0b27a" stop-opacity="0.55"/><stop offset="1" stop-color="#1f4a5c" stop-opacity="0.9"/></linearGradient>' +
    '<radialGradient id="land-sun" cx="800" cy="236" r="320" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffe2a8" stop-opacity="0.95"/><stop offset="0.25" stop-color="#f5a35c" stop-opacity="0.5"/><stop offset="1" stop-color="#c2562c" stop-opacity="0"/></radialGradient></defs>' +
    `<rect width="${width}" height="${height}" fill="url(#land-sun)"/>` +
    `<rect y="226" width="${width}" height="60" fill="url(#land-sea)"/>` +
    `<path d="${mass(far)}" fill="#5c4038"/>` +
    `<path d="${mass(mid)}" fill="#2f4a36"/>` +
    temple +
    `<path d="${mass(near)}" fill="#14321f"/>` +
    `<g fill="#0c1f14">${trees.join('')}</g>` +
    `<rect y="${height - 40}" width="${width}" height="60" fill="#0c1711"/>` +
    '</svg>'
  );
}

/** Rueda de las doce constelaciones (adelanto del planetario en la tarjeta de GR-04). */
export function zodiacWheel(colors: readonly string[]): string {
  const dots = colors
    .map((color, index) => {
      const [x, y] = polar(84, (index / colors.length) * TAU - Math.PI / 2);
      return (
        `<circle cx="${n(x)}" cy="${n(y)}" r="9" fill="${color}" opacity="0.22"/>` +
        `<circle cx="${n(x)}" cy="${n(y)}" r="3.4" fill="${color}"/>`
      );
    })
    .join('');
  const spokes = colors.map((_, index) => `M0 0L${point(polar(84, (index / colors.length) * TAU - Math.PI / 2))}`).join('');
  return (
    '<svg class="zodiac-wheel" viewBox="-110 -110 220 220" aria-hidden="true" focusable="false" fill="none">' +
    '<circle r="100" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><circle r="84" stroke="currentColor" stroke-width="0.6" stroke-dasharray="2 5" opacity="0.7"/>' +
    `<path d="${spokes}" stroke="currentColor" stroke-width="0.4" opacity="0.3"/>` +
    dots +
    '<circle r="5" fill="currentColor"/></svg>'
  );
}
