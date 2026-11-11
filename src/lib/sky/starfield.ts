/**
 * Cielo estrellado de fondo: una tesela SVG determinista (PRNG con semilla fija), generada en el build
 * y servida como archivo estático (`/sky.svg`). Sin rasters ni recursos externos; se repite sin costuras
 * porque ninguna estrella toca el borde. Los destellos mayores llevan una cruz de luz muy tenue.
 */
import { between, n, rng } from '../scenes/svg.ts';

export const SKY_TILE = 900;

const TINTS = ['#f3ecdf', '#f3ecdf', '#f3ecdf', '#dbeafe', '#fde047', '#38bdf8', '#c4b5fd'];

export function starfieldSvg(seed = 2026, count = 210): string {
  const random = rng(seed);
  const stars: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const big = random() > 0.93;
    const radius = big ? between(random, 1.3, 2.1) : between(random, 0.35, 1.05);
    const margin = big ? 12 : 3;
    const x = between(random, margin, SKY_TILE - margin);
    const y = between(random, margin, SKY_TILE - margin);
    const tint = TINTS[Math.floor(random() * TINTS.length)] ?? '#f3ecdf';
    const opacity = big ? between(random, 0.75, 1) : between(random, 0.25, 0.85);
    stars.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(radius)}" fill="${tint}" opacity="${n(opacity)}"/>`);
    if (big) {
      const arm = radius * 5;
      stars.push(
        `<path d="M${n(x - arm)} ${n(y)}H${n(x + arm)}M${n(x)} ${n(y - arm)}V${n(y + arm)}" stroke="${tint}" stroke-width="0.5" opacity="${n(opacity * 0.45)}"/>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SKY_TILE} ${SKY_TILE}" width="${SKY_TILE}" height="${SKY_TILE}">${stars.join('')}</svg>`;
}
