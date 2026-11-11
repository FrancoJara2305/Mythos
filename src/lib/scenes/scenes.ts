/**
 * Escenas originales de las fichas (rediseño 2026-11-09; Hestia se añadió con el Narratorio). Cada escena es una ilustración propia
 * de MYTHOS: entorno, materia y luz alrededor del atributo documentado de la deidad (su emblema
 * editorial, a escala monumental). No calca fotografías, no reproduce piezas antiguas y no pretende ser
 * una reconstrucción arqueológica; el pie de cada encabezado lo dice.
 *
 * Una escena tiene una base estática (archivo `/scenes/{id}.svg`) y capas de
 * efecto opcionales que la ficha inserta en línea y anima solo con CSS (transform/opacity) mientras la
 * escena es visible (src/scripts/site-nav.ts). Sin esas capas animadas, la escena sigue completa.
 */
import { DEITY_THEMES, type DeityTheme } from '../../config/deity-themes.ts';
import {
  between,
  blob,
  blur,
  causticPattern,
  H,
  linear,
  massBelow,
  monument,
  n,
  poly,
  radial,
  ridge,
  rng,
  smooth,
  svgDocument,
  svgLayer,
  W,
  type Point,
} from './svg.ts';

export interface SceneLayer {
  /** Nombre de la capa: clase `scene__fx--{name}` y animación en src/styles/scenes.css. */
  name: string;
  svg: string;
}

export interface Scene {
  id: string;
  /** Documento SVG completo de la base estática. */
  base: string;
  /** Capas de efecto en línea (decorativas). */
  fx: readonly SceneLayer[];
}

interface Part {
  defs: string;
  body: string;
}


/** Viñeta común: oscurece bordes y base para que el texto se apoye en un fondo sólido. */
function vignette(prefix: string, color: string, strength = 0.75): Part {
  return {
    defs:
      radial(`${prefix}-vig`, [[0.45, color, 0], [1, color, strength]], { cx: W / 2, cy: H * 0.45, r: W * 0.62 }) +
      linear(`${prefix}-floor`, [[0.55, color, 0], [1, color, 0.85]]),
    body: `<rect width="${W}" height="${H}" fill="url(#${prefix}-vig)"/><rect width="${W}" height="${H}" fill="url(#${prefix}-floor)"/>`,
  };
}

/* ——————————————————— Poseidón: abismo, piedra mojada, bronce oxidado ——————————————————— */

/** Desplazamiento horizontal de la familia «monolito»: el objeto ocupa el tercio derecho. */
const MONOLITH_SHIFT = 290;

function poseidon(theme: DeityTheme): Scene {
  const p = theme.palette;
  const random = rng(303);
  const defs: string[] = [
    linear('bg', [[0, '#16525d'], [0.3, '#0b3343'], [0.65, '#061a24'], [1, p.deep]]),
    radial('surf', [[0, p.glow, 0.6], [0.45, '#3f8f95', 0.2], [1, '#0b3343', 0]], { cx: 1120, cy: -80, r: 860 }),
    linear('shaft', [[0, p.glow, 0.5], [0.6, p.glow, 0.12], [1, p.glow, 0]]),
    linear('rock', [[0, '#21393f'], [0.5, '#0f2228'], [1, '#050c0f']]),
    linear('stone', [[0, '#2a4146'], [1, '#0a1518']]),
    blur('b40', 40),
    blur('b14', 14),
    blur('b5', 5),
    blur('b2', 2),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#bg)"/>`, `<rect width="${W}" height="${H}" fill="url(#surf)"/>`];
  // Haces desde la superficie (estáticos, tenues)
  const shafts: string[] = [];
  for (let index = 0; index < 8; index += 1) {
    const top = between(random, 720, 1500);
    const topWidth = between(random, 24, 70);
    const drift = between(random, -220, 60);
    const bottomWidth = between(random, 140, 320);
    shafts.push(
      `<path d="${poly([
        [top, -20],
        [top + topWidth, -20],
        [top + drift + bottomWidth, H],
        [top + drift, H],
      ])}" fill="url(#shaft)" opacity="${n(between(random, 0.25, 0.6))}"/>`,
    );
  }
  body.push(`<g filter="url(#b14)">${shafts.join('')}</g>`);
  // Relieve del fondo en dos planos (perspectiva atmosférica)
  body.push(`<path d="${massBelow(ridge(random, 640, 26, 70))}" fill="#0d2a33" opacity="0.85" filter="url(#b5)"/>`);
  body.push(`<path d="${massBelow(ridge(random, 760, 30, 60))}" fill="#08191f"/>`);
  // Roca mojada en primer plano, izquierda
  const leftRock: Point[] = [
    [-40, 470],
    [90, 455],
    [200, 492],
    [300, 548],
    [372, 610],
    [452, 700],
    [520, 790],
    [570, 900],
    [600, 1040],
  ];
  body.push(`<path d="${smooth(leftRock)}L-40 1040Z" fill="url(#rock)"/>`);
  body.push(`<path d="${smooth(leftRock.slice(0, 6))}" fill="none" stroke="${p.light}" stroke-width="3.5" opacity="0.55" filter="url(#b2)"/>`);
  // Repisas con brillo húmedo
  for (const [x, y, w] of [
    [70, 640, 210],
    [160, 780, 260],
    [40, 900, 320],
  ] as const) {
    body.push(`<path d="M${x} ${y}q${n(w / 2)} -14 ${w} 6" fill="none" stroke="${p.light}" stroke-width="2.4" opacity="0.28" filter="url(#b2)"/>`);
  }
  // Afloramiento derecho
  const rightRock: Point[] = [
    [1300, 1040],
    [1340, 860],
    [1400, 760],
    [1480, 700],
    [1560, 690],
    [1660, 700],
  ];
  body.push(`<path d="${smooth(rightRock)}L1660 1040Z" fill="url(#rock)"/>`);
  body.push(`<path d="${smooth(rightRock.slice(1))}" fill="none" stroke="${p.light}" stroke-width="2.5" opacity="0.3" filter="url(#b2)"/>`);
  // Plinto escalonado de piedra
  body.push(
    `<path d="M930 1040V900h360v140z" fill="url(#stone)"/><path d="M975 900V842h270v58z" fill="url(#stone)"/>` +
      `<path d="M930 900h360M975 842h270" stroke="${p.light}" stroke-width="2.5" opacity="0.4"/>`,
  );
  // Halo del objeto y tridente monumental
  defs.push(radial('halo', [[0, p.glow, 0.35], [1, p.glow, 0]], { cx: 1110, cy: 420, r: 420 }));
  body.push(`<ellipse cx="1110" cy="420" rx="420" ry="460" fill="url(#halo)"/>`);
  const trident = monument('poseidon', { x: 1130, y: 560, scale: 7.4, rotate: -7, metal: ['#0b1c1a', '#3f6b61', '#b3d2c0'], weight: 4.6, prefix: 'tri' });
  defs.push(trident.defs);
  body.push(trident.body);
  const vig = vignette('v', p.deep, 0.8);
  defs.push(vig.defs);
  body.push(vig.body);

  // Capas de efecto: dos redes de cáusticas (refracción) y los haces que ondulan
  const causticA = svgLayer(
    causticPattern('pos-ca', rng(31), 560, 6, p.glow, 1.7) +
      radial('pos-ma', [[0, '#fff', 1], [0.45, '#fff', 0.45], [1, '#fff', 0]], { cx: 1150, cy: 200, r: 820 }) +
      `<mask id="pos-mask-a"><rect width="${W}" height="${H}" fill="url(#pos-ma)"/></mask>` +
      blur('pos-ba', 1.4),
    `<g mask="url(#pos-mask-a)" opacity="0.26"><rect x="-120" y="-120" width="${W + 240}" height="${H + 240}" fill="url(#pos-ca)" filter="url(#pos-ba)"/></g>`,
  );
  const causticB = svgLayer(
    causticPattern('pos-cb', rng(77), 380, 5, p.light, 1.2, 21) +
      radial('pos-mb', [[0, '#fff', 0.9], [0.5, '#fff', 0.3], [1, '#fff', 0]], { cx: 1050, cy: 320, r: 760 }) +
      `<mask id="pos-mask-b"><rect width="${W}" height="${H}" fill="url(#pos-mb)"/></mask>` +
      blur('pos-bb', 1),
    `<g mask="url(#pos-mask-b)" opacity="0.18"><rect x="-120" y="-120" width="${W + 240}" height="${H + 240}" fill="url(#pos-cb)" filter="url(#pos-bb)"/></g>`,
  );
  const shaftRandom = rng(9);
  const swaying: string[] = [];
  for (let index = 0; index < 4; index += 1) {
    const top = between(shaftRandom, 860, 1360);
    const width = between(shaftRandom, 40, 90);
    swaying.push(`<path d="${poly([[top, -40], [top + width, -40], [top - 120 + width * 3, H * 0.92], [top - 160, H * 0.92]])}" fill="url(#pos-sh)"/>`);
  }
  const shaftLayer = svgLayer(
    linear('pos-sh', [[0, p.glow, 0.32], [0.7, p.glow, 0.05], [1, p.glow, 0]]) + blur('pos-bs', 18),
    `<g filter="url(#pos-bs)">${swaying.join('')}</g>`,
  );
  return {
    id: theme.id,
    base: svgDocument(defs.join(''), body.join('')),
    fx: [
      { name: 'caustics-a', svg: causticA },
      { name: 'caustics-b', svg: causticB },
      { name: 'shafts', svg: shaftLayer },
    ],
  };
}

/* ——————————————————— Zeus: tormenta, mármol, oro envejecido ——————————————————— */

function cloudBank(random: () => number, y: number, spread: number, count: number, fill: string, rim: string, scale = 1): string {
  const parts: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const cx = between(random, -120, W + 120);
    const cy = y + between(random, -spread, spread);
    const half = (between(random, 180, 340) * scale) / 2;
    const puffs: string[] = [`<ellipse cx="${n(cx)}" cy="${n(cy + half * 0.12)}" rx="${n(half * 1.1)}" ry="${n(half * 0.22)}"/>`];
    const total = 7 + Math.floor(random() * 5);
    for (let k = 0; k < total; k += 1) {
      const offset = between(random, -1, 1);
      const px = cx + offset * half;
      const crown = 1 - Math.abs(offset);
      const radius = between(random, 34, 70) * scale * (0.55 + crown * 0.6);
      const py = cy - crown * half * 0.28 + between(random, -10, 10);
      puffs.push(`<circle cx="${n(px)}" cy="${n(py)}" r="${n(radius)}"/>`);
    }
    const shape = puffs.join('');
    parts.push(`<g fill="${rim}" transform="translate(0 -7)">${shape}</g><g fill="${fill}">${shape}</g>`);
  }
  return parts.join('');
}

function zeus(theme: DeityTheme): Scene {
  const p = theme.palette;
  const random = rng(101);
  const defs: string[] = [
    linear('bg', [[0, '#252c38'], [0.45, '#151a22'], [1, p.deep]]),
    radial('break', [[0, p.glow, 0.75], [0.35, '#a99f88', 0.3], [1, '#2a303b', 0]], { cx: 1080, cy: 360, r: 620 }),
    linear('marble', [[0, '#cfc9bb'], [0.5, '#8d887d'], [1, '#2a2925']]),
    linear('marbleSide', [[0, '#57534b'], [1, '#15140f']]),
    blur('b30', 30),
    blur('b10', 10),
    blur('b4', 4),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#bg)"/>`, `<rect width="${W}" height="${H}" fill="url(#break)"/>`];
  body.push(`<g filter="url(#b10)" opacity="0.9">${cloudBank(random, 140, 80, 16, '#2f3540', '#59606b', 1.4)}</g>`);
  body.push(`<g filter="url(#b4)">${cloudBank(random, 300, 70, 14, '#1c2129', '#8a857a', 1.15)}</g>`);
  // Cumbre de mármol en gradas
  const steps = [
    [380, 760, 1220, 800],
    [300, 840, 1300, 880],
    [200, 920, 1400, 960],
  ] as const;
  for (const [x1, y1, x2, y2] of steps) {
    body.push(`<path d="M${x1} ${y1}H${x2}L${x2 + 70} ${y2}H${x1 - 70}Z" fill="url(#marble)"/>`);
    body.push(`<path d="M${x1 - 70} ${y2}H${x2 + 70}V${y2 + 40}H${x1 - 70}Z" fill="url(#marbleSide)"/>`);
  }
  body.push(`<path d="M${-40} 1000V990H1640V1000z" fill="#0c0d10"/>`);
  // Vetas del mármol
  const veins: string[] = [];
  for (let index = 0; index < 14; index += 1) {
    const x = between(random, 260, 1300);
    const y = between(random, 765, 950);
    veins.push(`<path d="M${n(x)} ${n(y)}q${n(between(random, 30, 80))} ${n(between(random, -8, 8))} ${n(between(random, 90, 180))} ${n(between(random, -6, 10))}"/>`);
  }
  body.push(`<g fill="none" stroke="#5f5a50" stroke-width="1.4" opacity="0.5">${veins.join('')}</g>`);
  // Rayo monumental con halo
  defs.push(radial('halo', [[0, p.glow, 0.5], [1, p.glow, 0]], { cx: 1080, cy: 420, r: 360 }));
  body.push(`<ellipse cx="1080" cy="420" rx="360" ry="380" fill="url(#halo)"/>`);
  const bolt = monument('zeus', { x: 1080, y: 440, scale: 5.6, rotate: 10, metal: ['#4d3a19', '#b8954f', '#f6e3ad'], weight: 3.6, solid: true, prefix: 'bolt' });
  defs.push(bolt.defs);
  body.push(bolt.body);
  body.push(`<g filter="url(#b4)" opacity="0.85">${cloudBank(rng(5), 690, 40, 7, '#14181f', '#3d4048', 1.2)}</g>`);
  const vig = vignette('v', p.deep, 0.75);
  defs.push(vig.defs);
  body.push(vig.body);

  const drift = svgLayer(blur('zeu-b', 8), `<g filter="url(#zeu-b)" opacity="0.8">${cloudBank(rng(44), 240, 80, 9, '#1a1f27', '#585a5e', 1.25)}</g>`);
  const light = svgLayer(
    radial('zeu-l', [[0, p.glow, 0.55], [0.5, p.glow, 0.12], [1, p.glow, 0]], { cx: 1100, cy: 330, r: 560 }),
    `<rect width="${W}" height="${H}" fill="url(#zeu-l)"/>`,
  );
  return { id: theme.id, base: svgDocument(defs.join(''), body.join('')), fx: [{ name: 'storm-light', svg: light }, { name: 'clouds', svg: drift }] };
}

/* ——————————————————— Hera: pórtico ceremonial, piedra cálida, friso ——————————————————— */

function rosette(cx: number, cy: number, radius: number, petals: number): string {
  const parts: string[] = [`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(radius * 0.22)}"/>`];
  for (let index = 0; index < petals; index += 1) {
    const angle = (index / petals) * Math.PI * 2;
    const px = cx + Math.cos(angle) * radius * 0.6;
    const py = cy + Math.sin(angle) * radius * 0.6;
    parts.push(`<ellipse cx="${n(px)}" cy="${n(py)}" rx="${n(radius * 0.36)}" ry="${n(radius * 0.15)}" transform="rotate(${n((angle * 180) / Math.PI)} ${n(px)} ${n(py)})"/>`);
  }
  return parts.join('');
}

function palmette(cx: number, bottom: number, height: number): string {
  const parts: string[] = [];
  for (let index = -4; index <= 4; index += 1) {
    const angle = (index / 4) * 0.95;
    const tipX = cx + Math.sin(angle) * height * 0.62;
    const tipY = bottom - Math.cos(angle) * height;
    parts.push(`<path d="M${n(cx)} ${n(bottom)}Q${n(cx + Math.sin(angle) * height * 0.2)} ${n(bottom - height * 0.55)} ${n(tipX)} ${n(tipY)}"/>`);
  }
  parts.push(`<path d="M${n(cx - height * 0.35)} ${n(bottom + 6)}c${n(height * 0.2)} -16 ${n(height * 0.5)} -16 ${n(height * 0.7)} 0"/>`);
  return parts.join('');
}

function hera(theme: DeityTheme): Scene {
  const p = theme.palette;
  const defs: string[] = [
    linear('bg', [[0, '#3c2b21'], [0.55, '#21170f'], [1, p.deep]]),
    radial('warm', [[0, p.glow, 0.35], [1, p.glow, 0]], { cx: 800, cy: 420, r: 700 }),
    linear('frieze', [[0, '#6b4f3a'], [1, '#3d2c21']]),
    linear('col', [[0, '#24180f'], [0.35, '#6a4e39'], [0.55, '#8a6a4f'], [1, '#1f150e']], { x1: 0, y1: 0, x2: 1, y2: 0 }),
    linear('floor', [[0, '#3b2a1e'], [1, '#0f0a07']]),
    blur('b6', 6),
    blur('b2', 1.5),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#bg)"/>`, `<rect width="${W}" height="${H}" fill="url(#warm)"/>`];
  // Friso de paneles con rosetas y palmetas (ornamento original)
  body.push(`<rect x="-20" y="80" width="${W + 40}" height="170" fill="url(#frieze)"/>`);
  body.push(`<path d="M-20 80H${W + 20}M-20 250H${W + 20}M-20 92H${W + 20}M-20 238H${W + 20}" stroke="#1a110b" stroke-width="3"/>`);
  const carving: string[] = [];
  const highlight: string[] = [];
  for (let index = 0; index < 11; index += 1) {
    const x = 40 + index * 150;
    carving.push(`<rect x="${x}" y="106" width="126" height="118" rx="3"/>`);
    const ornament = index % 2 === 0 ? rosette(x + 63, 165, 46, 10) : palmette(x + 63, 210, 82);
    carving.push(ornament);
    highlight.push(ornament);
  }
  body.push(`<g fill="none" stroke="#1d130c" stroke-width="5" transform="translate(2 3)">${carving.join('')}</g>`);
  body.push(`<g fill="none" stroke="${p.light}" stroke-width="2.4" opacity="0.55">${highlight.join('')}</g>`);
  // Columnata bajo el friso
  const columns: string[] = [];
  for (const x of [60, 230, 400, 1120, 1290, 1460]) {
    columns.push(`<rect x="${x}" y="250" width="80" height="350" fill="url(#col)"/><rect x="${x - 14}" y="250" width="108" height="20" fill="#7a5b43"/><rect x="${x - 12}" y="584" width="104" height="18" fill="#5a4231"/>`);
  }
  body.push(columns.join(''));
  // Podio en gradas de piedra cálida: el texto de la ficha se apoya en él
  const stairs: string[] = [];
  for (let index = 0; index < 7; index += 1) {
    const top = 602 + index * 58;
    const tone = ['#4a3627', '#3e2d21', '#34261c', '#2b1f17', '#231912', '#1c140e', '#160f0b'][index];
    stairs.push(`<path d="M-20 ${top}H${W + 20}V${top + 58}H-20Z" fill="${tone}"/><path d="M-20 ${top + 1}H${W + 20}" stroke="${p.light}" stroke-width="1.6" opacity="${n(0.36 - index * 0.04)}"/>`);
  }
  body.push(stairs.join(''));
  // Altar redondo y cetro axial
  body.push(`<ellipse cx="800" cy="602" rx="170" ry="20" fill="#2c1f16"/><path d="M660 602V552h280v50z" fill="#5a4231"/><ellipse cx="800" cy="552" rx="140" ry="18" fill="#7a5b43"/>`);
  defs.push(radial('halo', [[0, p.glow, 0.45], [1, p.glow, 0]], { cx: 800, cy: 380, r: 300 }));
  body.push(`<ellipse cx="800" cy="380" rx="260" ry="300" fill="url(#halo)"/>`);
  const scepter = monument('hera', { x: 800, y: 340, scale: 2.95, metal: ['#3a2814', '#9a7444', '#f2d3a0'], weight: 3, solid: true, prefix: 'sce' });
  defs.push(scepter.defs);
  body.push(scepter.body);
  const vig = vignette('v', p.deep, 0.7);
  defs.push(vig.defs);
  body.push(vig.body);

  const sweep = svgLayer(
    linear('her-sw', [[0, p.glow, 0], [0.5, p.glow, 0.55], [1, p.glow, 0]], { x1: 0, y1: 0, x2: 1, y2: 0 }) + blur('her-b', 10),
    `<g filter="url(#her-b)"><path d="M560 70h200l-90 540H470z" fill="url(#her-sw)"/></g>`,
  );
  return { id: theme.id, base: svgDocument(defs.join(''), body.join('')), fx: [{ name: 'relief-sweep', svg: sweep }] };
}

/* ——————————————————— Deméter: tierra, trigo, caliza, oro de mies ——————————————————— */

function wheatStalk(random: () => number, x: number, ground: number, height: number, lean: number): { stem: string; ear: string } {
  const topX = x + lean;
  const topY = ground - height;
  const stem = `M${n(x)} ${n(ground)}Q${n(x + lean * 0.3)} ${n(ground - height * 0.5)} ${n(topX)} ${n(topY)}`;
  const grains: string[] = [];
  const earLength = height * between(random, 0.16, 0.22);
  const angle = Math.atan2(lean, height);
  for (let index = 0; index < 5; index += 1) {
    const t = index / 5;
    const gx = topX - Math.sin(angle) * earLength * t;
    const gy = topY + Math.cos(angle) * earLength * t;
    for (const side of [-1, 1]) {
      const ox = gx + side * 3.2;
      grains.push(`<ellipse cx="${n(ox)}" cy="${n(gy)}" rx="2.6" ry="6" transform="rotate(${n(side * 24 + (angle * 180) / Math.PI)} ${n(ox)} ${n(gy)})"/>`);
    }
  }
  return { stem, ear: grains.join('') };
}

function demeter(theme: DeityTheme): Scene {
  const p = theme.palette;
  const random = rng(404);
  const defs: string[] = [
    linear('sky', [[0, '#2b2113'], [0.4, '#6b5026'], [0.62, '#c99b4c'], [0.66, '#8a6a33'], [1, '#100c06']]),
    radial('sun', [[0, '#fff2c4', 0.95], [0.18, p.glow, 0.7], [0.6, p.glow, 0.12], [1, p.glow, 0]], { cx: 1180, cy: 610, r: 640 }),
    linear('earth', [[0, '#4a3818'], [1, '#0d0904']]),
    linear('lime', [[0, '#e3d3a8'], [1, '#7c6c4a']]),
    blur('b8', 8),
    blur('b3', 3),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#sky)"/>`, `<rect width="${W}" height="${H}" fill="url(#sun)"/>`];
  body.push(`<path d="${massBelow(ridge(random, 600, 14, 90))}" fill="#5a4421" opacity="0.8" filter="url(#b8)"/>`);
  body.push(`<path d="${massBelow(ridge(random, 650, 8, 120))}" fill="url(#earth)"/>`);
  // Trigo en el plano medio (muchas espigas finas, a contraluz)
  const mid: string[] = [];
  const midEars: string[] = [];
  for (let index = 0; index < 64; index += 1) {
    const x = between(random, -20, W + 20);
    const stalk = wheatStalk(random, x, between(random, 700, 760), between(random, 70, 120), between(random, -10, 14));
    mid.push(`<path d="${stalk.stem}"/>`);
    midEars.push(stalk.ear);
  }
  body.push(`<g opacity="0.75"><g fill="none" stroke="#a88a4a" stroke-width="1.6">${mid.join('')}</g><g fill="#d9b867">${midEars.join('')}</g></g>`);
  // Mojones de caliza
  body.push(`<path d="${blob(random, 250, 760, 120, 60, 7, 0.18)}" fill="url(#lime)"/><path d="${blob(random, 400, 790, 70, 40, 6, 0.2)}" fill="url(#lime)" opacity="0.9"/>`);
  // Gavilla y cetro monumentales
  defs.push(radial('halo', [[0, p.glow, 0.5], [1, p.glow, 0]], { cx: 1060, cy: 470, r: 360 }));
  body.push(`<ellipse cx="1060" cy="470" rx="330" ry="380" fill="url(#halo)"/>`);
  const sheaf = monument('demeter', { x: 1060, y: 460, scale: 5, metal: ['#5a4116', '#c9a24a', '#fbe7a6'], weight: 3.4, prefix: 'sh' });
  defs.push(sheaf.defs);
  body.push(sheaf.body);
  const vig = vignette('v', p.deep, 0.7);
  defs.push(vig.defs);
  body.push(vig.body);

  // Espigas de primer plano (capa que oscila) y sombras largas
  const front = rng(12);
  const stems: string[] = [];
  const ears: string[] = [];
  for (let index = 0; index < 24; index += 1) {
    const x = between(front, -40, W + 40);
    const stalk = wheatStalk(front, x, H + 30, between(front, 210, 340), between(front, -30, 26));
    stems.push(`<path d="${stalk.stem}"/>`);
    ears.push(stalk.ear);
  }
  const wheat = svgLayer(
    '',
    `<g fill="none" stroke="#1a1207" stroke-width="3.2">${stems.join('')}</g><g fill="#22180a" stroke="#c9a24a" stroke-width="0.8" stroke-opacity="0.55">${ears.join('')}</g>`,
  );
  const shadows = svgLayer(
    linear('dem-sh', [[0, '#000', 0], [0.5, '#000', 0.4], [1, '#000', 0]], { x1: 0, y1: 0, x2: 1, y2: 0 }) + blur('dem-b', 14),
    `<g filter="url(#dem-b)" fill="url(#dem-sh)">${[160, 520, 880, 1240]
      .map((x) => `<path d="${poly([[x, 700], [x + 70, 700], [x - 240, H + 40], [x - 380, H + 40]])}"/>`)
      .join('')}</g>`,
  );
  return { id: theme.id, base: svgDocument(defs.join(''), body.join('')), fx: [{ name: 'shadows', svg: shadows }, { name: 'wheat', svg: wheat }] };
}

/* ——————————————————— Atenea: templo, geometría contenida, haz preciso ——————————————————— */

function meander(x0: number, y: number, length: number, unit: number): string {
  let d = `M${n(x0)} ${n(y + unit)}`;
  for (let x = x0; x < x0 + length; x += unit * 4) {
    d += `h${n(unit * 3)}v${n(-unit * 2)}h${n(-unit * 2)}v${n(unit)}h${n(unit)}v${n(unit)}h${n(unit * 2)}`;
    d += `v${n(-unit * 0)}`;
  }
  return d;
}

function athena(theme: DeityTheme): Scene {
  const p = theme.palette;
  const random = rng(505);
  const defs: string[] = [
    linear('bg', [[0, '#1d2023'], [1, '#08090a']]),
    linear('col', [[0, '#0d0f10'], [0.3, '#4c514f'], [0.48, '#6a6d68'], [0.7, '#2c3032'], [1, '#0b0c0d']], { x1: 0, y1: 0, x2: 1, y2: 0 }),
    linear('beam', [[0, p.glow, 0.62], [0.75, p.glow, 0.22], [1, p.glow, 0.1]]),
    linear('step', [[0, '#5b5e5a'], [1, '#1b1d1e']]),
    linear('block', [[0, '#3d413f'], [1, '#17191a']]),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#bg)"/>`];
  // Sillares del muro del fondo
  const blocks: string[] = [];
  for (let row = 0; row < 12; row += 1) {
    const y = 200 + row * 56;
    let x = row % 2 === 0 ? -60 : -150;
    while (x < W) {
      const width = between(random, 170, 240);
      blocks.push(`<rect x="${n(x)}" y="${y}" width="${n(width - 4)}" height="52" fill="#${['15181b', '171a1d', '1a1d20', '131518'][Math.floor(random() * 4)]}"/>`);
      x += width;
    }
  }
  body.push(`<g>${blocks.join('')}</g>`);
  // Haz preciso (bordes nítidos, sin difusión)
  body.push(`<path d="M744 196H856L900 600H700Z" fill="url(#beam)" opacity="0.55"/>`);
  // Entablamento: arquitrabe, friso de triglifos y cornisa; frontón
  body.push(`<path d="M-20 150H${W + 20}V200H-20Z" fill="#3b3f3f"/><path d="M-20 196H${W + 20}" stroke="#0c0d0e" stroke-width="4"/>`);
  body.push(`<path d="${meander(-20, 162, W + 40, 8)}" fill="none" stroke="${p.light}" stroke-width="2.2" opacity="0.5"/>`);
  const triglyphs: string[] = [];
  for (let x = -10; x < W; x += 110) {
    triglyphs.push(`<rect x="${x}" y="88" width="46" height="58" fill="#2a2d2e"/><path d="M${x + 15} 92v50M${x + 31} 92v50" stroke="#121314" stroke-width="5"/>`);
  }
  body.push(`<path d="M-20 84H${W + 20}V150H-20Z" fill="#454948"/>${triglyphs.join('')}`);
  body.push(`<path d="M-30 84H${W + 30}V62H-30Z" fill="#5c605d"/><path d="M-30 62L800 -150L${W + 30} 62Z" fill="#2e3132"/><path d="M-30 62L800 -150L${W + 30} 62" fill="none" stroke="${p.light}" stroke-width="2" opacity="0.4"/>`);
  // Columnas estriadas (dórico, con éntasis leve) sobre el estilóbato
  const columns: string[] = [];
  for (const x of [130, 345, 560, 1040, 1255, 1470]) {
    const half = 40;
    columns.push(`<path d="M${x - half} 600L${x - half + 6} 214H${x + half - 6}L${x + half} 600Z" fill="url(#col)"/>`);
    const flutes: string[] = [];
    for (let k = -3; k <= 3; k += 1) flutes.push(`M${x + k * 10} 596L${x + k * 8.6} 218`);
    columns.push(`<path d="${flutes.join('')}" stroke="#0b0c0d" stroke-width="2" opacity="0.6"/>`);
    columns.push(`<path d="M${x - 50} 214h100l-12 -14h-76z" fill="#5f625f"/><rect x="${x - 54}" y="200" width="108" height="14" fill="#6c6f6a"/>`);
  }
  body.push(columns.join(''));
  // Estilóbato y escalinata frontal: el texto de la ficha se apoya en las gradas
  body.push(`<path d="M-20 600H${W + 20}V636H-20Z" fill="url(#step)"/>`);
  const stairs: string[] = [];
  for (let index = 0; index < 9; index += 1) {
    const top = 636 + index * 42;
    const tone = ['#2b2e2f', '#26292a', '#222526', '#1e2122', '#1b1d1e', '#181a1b', '#151718', '#131516', '#111213'][index];
    stairs.push(`<path d="M-20 ${top}H${W + 20}V${top + 42}H-20Z" fill="${tone}"/><path d="M-20 ${top + 1}H${W + 20}" stroke="${p.light}" stroke-width="1.4" opacity="${n(0.3 - index * 0.025)}"/>`);
  }
  body.push(stairs.join(''));
  body.push(`<path d="M-20 600H${W + 20}" stroke="${p.light}" stroke-width="1.8" opacity="0.4"/>`);
  // Plinto y lechuza de bronce en el intercolumnio central, bajo el haz
  body.push(`<path d="M718 600V488H882V600Z" fill="url(#block)"/><path d="M706 488H894V470H706Z" fill="#5b5f5c"/><path d="M718 584H882" stroke="#0e0f10" stroke-width="3"/>`);
  body.push(`<ellipse cx="800" cy="474" rx="96" ry="9" fill="${p.glow}" opacity="0.35"/>`);
  const owl = monument('athena', { x: 800, y: 362, scale: 2.55, metal: ['#2c1e10', '#8c6b43', '#f1d9ad'], weight: 2.8, solid: true, prefix: 'owl' });
  defs.push(owl.defs);
  body.push(owl.body);
  const vig = vignette('v', p.deep, 0.65);
  defs.push(vig.defs);
  body.push(vig.body);

  const beam = svgLayer(
    linear('ath-beam', [[0, p.glow, 0.5], [0.8, p.glow, 0.16], [1, p.glow, 0.05]]),
    `<path d="M752 196H848L884 600H716Z" fill="url(#ath-beam)"/><path d="M752 196V200M848 196V200" stroke="${p.glow}"/>`,
  );
  return { id: theme.id, base: svgDocument(defs.join(''), body.join('')), fx: [{ name: 'beam', svg: beam }] };
}

/* ——————————————————— Apolo: marfil cálido, ámbar, bandas de luz ——————————————————— */

function apollo(theme: DeityTheme): Scene {
  const p = theme.palette;
  const defs: string[] = [
    linear('bg', [[0, '#3a2a17'], [0.5, '#24190d'], [1, p.deep]]),
    linear('wall', [[0, '#7a6143'], [0.5, '#a88d66'], [1, '#5b4630']], { x1: 0, y1: 0, x2: 1, y2: 0 }),
    linear('band', [[0, p.glow, 0], [0.5, p.glow, 0.42], [1, p.glow, 0]], { x1: 0, y1: 0, x2: 1, y2: 0 }),
    linear('ivory', [[0, '#efe4cc'], [1, '#8f7a5a']]),
    linear('pil', [[0, '#2a1e10'], [0.5, '#b49a74'], [1, '#2a1e10']], { x1: 0, y1: 0, x2: 1, y2: 0 }),
    blur('b12', 12),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#bg)"/>`];
  // Monolito: el objeto ocupa el tercio derecho; el texto de la ficha, la izquierda.
  const dx = MONOLITH_SHIFT;
  // Muro de marfil entre pilastras
  body.push(`<rect x="${420 + dx}" y="0" width="760" height="${H}" fill="url(#wall)" opacity="0.38"/>`);
  for (const x of [300 + dx, 1180 + dx]) body.push(`<rect x="${x}" y="0" width="120" height="${H}" fill="url(#pil)" opacity="0.85"/>`);
  // Bandas de luz horizontales (vano en celosía), no un disco solar
  const bands: string[] = [];
  for (const [y, h] of [
    [120, 34],
    [230, 52],
    [360, 24],
    [470, 60],
    [610, 30],
  ] as const) {
    bands.push(`<rect x="-40" y="${y}" width="${W + 80}" height="${h}" fill="url(#band)"/>`);
  }
  body.push(`<g filter="url(#b12)">${bands.join('')}</g>`);
  // Gradas de marfil
  body.push(
    `<g transform="translate(${dx} 0)"><path d="M420 860h760v40H420z" fill="url(#ivory)"/><path d="M360 900h880v40H360z" fill="url(#ivory)" opacity="0.85"/><path d="M300 940h1000v80H300z" fill="url(#ivory)" opacity="0.7"/>` +
      `<path d="M420 860h760M360 900h880M300 940h1000" stroke="#fff5dc" stroke-width="2" opacity="0.5"/></g>`,
  );
  defs.push(radial('halo', [[0, p.glow, 0.42], [1, p.glow, 0]], { cx: 800 + dx, cy: 470, r: 380 }));
  body.push(`<ellipse cx="${800 + dx}" cy="470" rx="360" ry="420" fill="url(#halo)"/>`);
  const lyre = monument('apollo', { x: 800 + dx, y: 455, scale: 5.6, metal: ['#5a3d17', '#c79a52', '#fff0c8'], weight: 2.5, prefix: 'ly' });
  defs.push(lyre.defs);
  body.push(lyre.body);
  const vig = vignette('v', p.deep, 0.62);
  defs.push(vig.defs);
  body.push(vig.body);

  const moving = svgLayer(
    linear('apo-b', [[0, p.glow, 0], [0.5, p.glow, 0.5], [1, p.glow, 0]], { x1: 0, y1: 0, x2: 1, y2: 0 }) + blur('apo-bl', 9),
    `<g filter="url(#apo-bl)">${[180, 420, 560].map((y, index) => `<rect x="-40" y="${y}" width="${W + 80}" height="${[26, 40, 22][index]}" fill="url(#apo-b)"/>`).join('')}</g>`,
  );
  return { id: theme.id, base: svgDocument(defs.join(''), body.join('')), fx: [{ name: 'light-bands', svg: moving }] };
}

/* ——————————————————— Ártemis: bosque profundo, plata ——————————————————— */

function artemis(theme: DeityTheme): Scene {
  const p = theme.palette;
  const random = rng(707);
  const defs: string[] = [
    linear('bg', [[0, '#10241c'], [0.6, '#08130f'], [1, '#030705']]),
    radial('moon', [[0, '#f1f6f5', 1], [0.08, '#dfe9ea', 0.95], [0.11, p.glow, 0.35], [0.4, p.glow, 0.08], [1, p.glow, 0]], { cx: 1430, cy: 170, r: 700 }),
    linear('mist', [[0, p.light, 0], [0.5, p.light, 0.22], [1, p.light, 0]]),
    linear('trunkNear', [[0, '#020504'], [0.7, '#0b1712'], [0.92, '#56655f'], [1, '#0b1310']], { x1: 0, y1: 0, x2: 1, y2: 0 }),
    blur('b8', 8),
    blur('b3', 3),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#bg)"/>`, `<rect width="${W}" height="${H}" fill="url(#moon)"/>`];
  const trunks = (count: number, minWidth: number, maxWidth: number, fill: string, extra = '') => {
    const parts: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const x = between(random, -40, W + 40);
      if (x > 560 && x < 980 && maxWidth > 60) continue; // claro central para el arco
      const width = between(random, minWidth, maxWidth);
      parts.push(`<path d="M${n(x)} -20h${n(width)}l${n(width * 0.12)} ${H + 40}h${n(-width * 1.24)}z" fill="${fill}"${extra}/>`);
    }
    return parts.join('');
  };
  body.push(`<g filter="url(#b8)" opacity="0.7">${trunks(16, 14, 30, '#1f3a31')}</g>`);
  body.push(`<rect x="-20" y="560" width="${W + 40}" height="240" fill="url(#mist)"/>`);
  body.push(`<g filter="url(#b3)">${trunks(11, 26, 52, '#0e1d17')}</g>`);
  body.push(trunks(7, 70, 120, 'url(#trunkNear)'));
  // Sotobosque de helechos
  const ferns: string[] = [];
  for (let index = 0; index < 26; index += 1) {
    const x = between(random, -40, W + 40);
    const y = between(random, 870, 1010);
    const length = between(random, 90, 180);
    const direction = random() > 0.5 ? 1 : -1;
    const points: Point[] = [];
    for (let k = 0; k <= 6; k += 1) points.push([x + direction * length * (k / 6), y - Math.sin((k / 6) * Math.PI * 0.9) * length * 0.5]);
    ferns.push(`<path d="${smooth(points)}"/>`);
    for (let k = 1; k < 6; k += 1) {
      const [px, py] = points[k] as Point;
      ferns.push(`<path d="M${n(px)} ${n(py)}l${n(direction * 10)} ${n(-18 + k * 2)}M${n(px)} ${n(py)}l${n(direction * 14)} ${n(10)}"/>`);
    }
  }
  body.push(`<g fill="none" stroke="#14261f" stroke-width="3">${ferns.join('')}</g>`);
  const bow = monument('artemis', { x: 1060, y: 470, scale: 5.4, rotate: -6, metal: ['#2c3537', '#b9c3c5', '#ffffff'], weight: 4.4, prefix: 'bow' });
  defs.push(bow.defs);
  body.push(bow.body);
  const vig = vignette('v', p.deep, 0.75);
  defs.push(vig.defs);
  body.push(vig.body);

  const dapple = rng(8);
  const spots: string[] = [];
  for (let index = 0; index < 34; index += 1) {
    spots.push(`<ellipse cx="${n(between(dapple, 0, W))}" cy="${n(between(dapple, 420, 990))}" rx="${n(between(dapple, 14, 46))}" ry="${n(between(dapple, 6, 16))}"/>`);
  }
  const light = svgLayer(blur('art-b', 6), `<g fill="${p.glow}" opacity="0.32" filter="url(#art-b)">${spots.join('')}</g>`);
  const leaves: string[] = [];
  const canopy = rng(15);
  for (let index = 0; index < 40; index += 1) {
    leaves.push(`<path d="${blob(canopy, between(canopy, -60, W + 60), between(canopy, -60, 90), between(canopy, 60, 150), between(canopy, 30, 70), 7, 0.35)}"/>`);
  }
  const crown = svgLayer(blur('art-c', 5), `<g fill="#020604" opacity="0.92" filter="url(#art-c)">${leaves.join('')}</g>`);
  return { id: theme.id, base: svgDocument(defs.join(''), body.join('')), fx: [{ name: 'dapple', svg: light }, { name: 'canopy', svg: crown }] };
}

/* ——————————————————— Ares: hierro, piedra erosionada, rojo mineral ——————————————————— */

function ares(theme: DeityTheme): Scene {
  const p = theme.palette;
  const random = rng(808);
  const defs: string[] = [
    linear('bg', [[0, '#322b28'], [0.6, '#1b1716'], [1, p.deep]]),
    linear('side', [[0, '#e9ddd0', 0.3], [0.45, '#e9ddd0', 0], [1, '#000', 0.35]], { x1: 0, y1: 0, x2: 1, y2: 0 }),
    linear('red', [[0, '#8c3423'], [1, '#3e140d']]),
    blur('b2', 2),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#bg)"/>`];
  // Erosión: placas de piedra de tonos próximos
  const plates: string[] = [];
  for (let index = 0; index < 90; index += 1) {
    const tone = ['#2e2826', '#262120', '#352e2b', '#221d1c'][Math.floor(random() * 4)];
    plates.push(`<path d="${blob(random, between(random, 0, W), between(random, 0, 760), between(random, 40, 130), between(random, 20, 70), 6, 0.4)}" fill="${tone}"/>`);
  }
  body.push(`<g opacity="0.5">${plates.join('')}</g>`);
  // Grietas ramificadas
  const cracks: string[] = [];
  for (let index = 0; index < 9; index += 1) {
    let x = between(random, 0, W);
    let y = between(random, 0, 300);
    let d = `M${n(x)} ${n(y)}`;
    for (let k = 0; k < 9; k += 1) {
      x += between(random, -40, 40);
      y += between(random, 30, 70);
      d += `L${n(x)} ${n(y)}`;
    }
    cracks.push(`<path d="${d}"/>`);
  }
  body.push(`<g fill="none" stroke="#0b0909" stroke-width="2.4" opacity="0.8">${cracks.join('')}</g>`);
  // Estrato de rojo mineral y suelo
  const top = ridge(random, 770, 12, 60);
  body.push(`<path d="${massBelow(top)}" fill="url(#red)"/>`);
  body.push(`<path d="${massBelow(ridge(random, 860, 10, 70))}" fill="#120e0d"/>`);
  body.push(`<rect width="${W}" height="${H}" fill="url(#side)"/>`);
  // Bloque frontal y casco con lanza, en el tercio derecho
  const dx = MONOLITH_SHIFT;
  body.push(`<path d="M${610 + dx} 900V780h380v120z" fill="#2a2321"/><path d="M${610 + dx} 780h380" stroke="#b9aea4" stroke-width="2" opacity="0.4"/>`);
  const helm = monument('ares', { x: 800 + dx, y: 584, scale: 4.8, metal: ['#141312', '#6e6a65', '#e2ddd5'], weight: 2.8, solid: true, prefix: 'hel' });
  defs.push(helm.defs);
  body.push(helm.body);
  const vig = vignette('v', p.deep, 0.72);
  defs.push(vig.defs);
  body.push(vig.body);

  // Destellos breves: dos brillos en puntos del metal, alternados
  const glintA = svgLayer(
    radial('are-g1', [[0, '#fffaf2', 0.95], [0.25, '#fffaf2', 0.35], [1, '#fffaf2', 0]], { cx: 690 + dx, cy: 450, r: 120 }),
    `<ellipse cx="${690 + dx}" cy="450" rx="130" ry="26" fill="url(#are-g1)" transform="rotate(-28 ${690 + dx} 450)"/>`,
  );
  const glintB = svgLayer(
    radial('are-g2', [[0, '#fffaf2', 0.9], [0.3, '#fffaf2', 0.3], [1, '#fffaf2', 0]], { cx: 992 + dx, cy: 280, r: 90 }),
    `<ellipse cx="${992 + dx}" cy="280" rx="22" ry="100" fill="url(#are-g2)"/>`,
  );
  return { id: theme.id, base: svgDocument(defs.join(''), body.join('')), fx: [{ name: 'glint-a', svg: glintA }, { name: 'glint-b', svg: glintB }] };
}

/* ——————————————————— Afrodita: mármol claro, nácar, cobre rosado, agua ——————————————————— */

function aphrodite(theme: DeityTheme): Scene {
  const random = rng(909);
  const defs: string[] = [
    linear('bg', [[0, '#fbf6f2'], [0.55, '#eadfd8'], [1, '#c9b8b0']]),
    linear('water', [[0, '#a9c3c4'], [0.5, '#7fa3a8'], [1, '#56787d']]),
    linear('nacreA', [[0, '#f2dfe6'], [0.5, '#dbe9ea'], [1, '#f5e4d2']], { x1: 0, y1: 0, x2: 1, y2: 1 }),
    radial('glow', [[0, '#ffffff', 0.9], [1, '#ffffff', 0]], { cx: 1000, cy: 360, r: 560 }),
    blur('b6', 6),
    blur('b2', 2),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#bg)"/>`, `<rect width="${W}" height="${H}" fill="url(#glow)"/>`];
  // Vetas del mármol
  const veins: string[] = [];
  for (let index = 0; index < 9; index += 1) {
    const points: Point[] = [];
    let x = between(random, -100, W);
    let y = between(random, -40, 600);
    for (let k = 0; k < 6; k += 1) {
      points.push([x, y]);
      x += between(random, 80, 180);
      y += between(random, -30, 60);
    }
    veins.push(`<path d="${smooth(points)}"/>`);
  }
  body.push(`<g fill="none" stroke="#b9a7a2" stroke-width="2" opacity="0.35" filter="url(#b2)">${veins.join('')}</g>`);
  // Arcos de concha (nácar), concéntricos y en abanico
  const arcs: string[] = [];
  for (let index = 0; index < 9; index += 1) {
    const radius = 220 + index * 46;
    arcs.push(`<path d="M${1000 - radius} 760A${radius} ${radius * 0.92} 0 0 1 ${1000 + radius} 760" stroke-width="${n(26 - index * 1.6)}" opacity="${n(0.55 - index * 0.04)}"/>`);
  }
  body.push(`<g fill="none" stroke="url(#nacreA)" filter="url(#b2)">${arcs.join('')}</g>`);
  // Agua con espuma
  body.push(`<path d="${massBelow(ridge(random, 760, 4, 80))}" fill="url(#water)"/>`);
  const foam: string[] = [];
  for (let index = 0; index < 40; index += 1) {
    foam.push(`<ellipse cx="${n(between(random, -20, W + 20))}" cy="${n(between(random, 752, 778))}" rx="${n(between(random, 20, 70))}" ry="${n(between(random, 3, 7))}"/>`);
  }
  body.push(`<g fill="#ffffff" opacity="0.7" filter="url(#b2)">${foam.join('')}</g>`);
  // Tela translúcida del velo (misma silueta que el emblema) bajo los pliegues de cobre
  defs.push(
    linear('veil', [[0, '#fff8f4', 0.92], [0.55, '#f3d9cd', 0.62], [1, '#e2b9a6', 0.45]]),
    linear('fold', [[0, '#a8664a', 0], [0.5, '#a8664a', 0.22], [1, '#a8664a', 0]], { x1: 0, y1: 0, x2: 1, y2: 0 }),
  );
  const veilShape = 'M60 23c-22 12-30 48-32 86-1 16-4 30-8 40c10-6 18 4 28-2s16 5 24 0 18 5 28 2C96 139 93 125 92 109C90 71 82 35 60 23Z';
  body.push(
    `<g transform="translate(1000 440) scale(5) translate(-60 -80)"><path d="${veilShape}" fill="url(#veil)"/>` +
      `<path d="M46 147C48 91 52 51 60 23 56 60 54 100 54 147ZM74 147C72 91 68 51 60 23 64 60 66 100 66 147Z" fill="url(#fold)"/></g>`,
  );
  const veil = monument('aphrodite', { x: 1000, y: 440, scale: 5, metal: ['#5c2e20', '#a8664a', '#f6cdb4'], weight: 2.6, prefix: 'vel' });
  defs.push(veil.defs);
  body.push(veil.body);
  // Reflejo del velo en el agua
  body.push(`<g opacity="0.18" transform="translate(0 1530) scale(1 -1)">${veil.body}</g>`);
  defs.push(linear('lift', [[0, '#fff', 0], [0.7, '#fff', 0], [1, '#5a4a4d', 0.25]]));
  body.push(`<rect width="${W}" height="${H}" fill="url(#lift)"/>`);

  const ripples: string[] = [];
  const rippleRandom = rng(19);
  for (let index = 0; index < 26; index += 1) {
    const cx = between(rippleRandom, 0, W);
    const cy = between(rippleRandom, 790, 990);
    const rx = between(rippleRandom, 40, 140);
    ripples.push(`<path d="M${n(cx - rx)} ${n(cy)}q${n(rx)} -10 ${n(rx * 2)} 0"/>`);
  }
  const water = svgLayer('', `<g fill="none" stroke="#ffffff" stroke-width="2.2" opacity="0.55">${ripples.join('')}</g>`);
  const sheen = svgLayer(
    linear('aph-s', [[0, '#e6f2f2', 0], [0.5, '#f9e3ec', 0.6], [1, '#e6f2f2', 0]], { x1: 0, y1: 0, x2: 1, y2: 0.4 }) + blur('aph-b', 20),
    `<g filter="url(#aph-b)"><path d="M700 280L1060 160L1320 760L900 760Z" fill="url(#aph-s)"/></g>`,
  );
  return { id: theme.id, base: svgDocument(defs.join(''), body.join('')), fx: [{ name: 'sheen', svg: sheen }, { name: 'ripples', svg: water }] };
}

/* ——————————————————— Hefesto: basalto, cobre, calor ——————————————————— */

function hephaestus(theme: DeityTheme): Scene {
  const p = theme.palette;
  const random = rng(1010);
  const defs: string[] = [
    linear('bg', [[0, '#151312'], [0.6, '#0c0a0a'], [1, '#040303']]),
    radial('forge', [[0, '#ffd59a', 0.95], [0.18, p.glow, 0.75], [0.5, '#7a2a0c', 0.35], [1, '#2a0d04', 0]], { cx: 800 + MONOLITH_SHIFT, cy: 940, r: 620 }),
    linear('prism', [[0, '#0d0c0c'], [0.5, '#2c2826'], [1, '#0a0909']], { x1: 0, y1: 0, x2: 1, y2: 0 }),
    linear('block', [[0, '#3a2a22'], [1, '#121010']]),
    blur('b20', 20),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#bg)"/>`];
  const dx = MONOLITH_SHIFT;
  // Prismas de basalto a ambos lados de la fragua (tercio derecho)
  const prisms: string[] = [];
  for (const side of [0, 1]) {
    let x = side === 0 ? -40 : 1060 + dx;
    const end = side === 0 ? 540 + dx : W + 40;
    while (x < end) {
      const width = between(random, 60, 110);
      const top = between(random, -40, 220) + (side === 0 ? (x / (540 + dx)) * 120 : ((W - x) / 540) * 120);
      prisms.push(`<path d="M${n(x)} ${H + 20}V${n(top + 20)}l${n(width / 2)} -20l${n(width / 2)} 20V${H + 20}Z" fill="url(#prism)" stroke="#050404" stroke-width="3"/>`);
      x += width;
    }
  }
  body.push(prisms.join(''));
  // Boca de la fragua y resplandor localizado
  body.push(`<path d="M${600 + dx} 1020V880a200 150 0 0 1 400 0v140z" fill="#1a0c06"/>`);
  body.push(`<rect width="${W}" height="${H}" fill="url(#forge)"/>`);
  // Bloque de basalto y monumento de cobre, iluminado desde abajo
  body.push(`<path d="M${590 + dx} 840V700h420v140z" fill="url(#block)"/><path d="M${590 + dx} 838h420" stroke="${p.glow}" stroke-width="3" opacity="0.55"/>`);
  const tools = monument('hephaestus', { x: 800 + dx, y: 470, scale: 4.7, metal: ['#2a1308', '#b06a3b', '#ffd2a0'], weight: 2.8, solid: true, underlight: true, prefix: 'anv' });
  defs.push(tools.defs);
  body.push(tools.body);
  const vig = vignette('v', p.deep, 0.65);
  defs.push(vig.defs);
  body.push(vig.body);

  const glowA = svgLayer(
    radial('hep-a', [[0, '#ffc27a', 0.7], [0.4, p.glow, 0.35], [1, p.glow, 0]], { cx: 800 + dx, cy: 900, r: 460 }),
    `<rect width="${W}" height="${H}" fill="url(#hep-a)"/>`,
  );
  const glowB = svgLayer(
    radial('hep-b', [[0, '#ff8a3a', 0.5], [0.5, '#ff8a3a', 0.12], [1, '#ff8a3a', 0]], { cx: 780 + dx, cy: 760, r: 300 }),
    `<rect width="${W}" height="${H}" fill="url(#hep-b)"/>`,
  );
  return { id: theme.id, base: svgDocument(defs.join(''), body.join('')), fx: [{ name: 'forge-a', svg: glowA }, { name: 'forge-b', svg: glowB }] };
}

/* ——————————————————— Hermes: camino de piedra, aire azul, bronce ——————————————————— */

function hermes(theme: DeityTheme): Scene {
  const p = theme.palette;
  const random = rng(1111);
  const vanishing: Point = [1240, 560];
  const defs: string[] = [
    linear('sky', [[0, '#253a47'], [0.45, '#5c7a8c'], [0.56, '#a9c3d2'], [0.6, '#7b8f9a'], [1, '#141a1e']]),
    linear('road', [[0, '#69737b'], [1, '#232a30']], { x1: 1, y1: 0, x2: 0, y2: 1 }),
    linear('pillar', [[0, '#3a434a'], [0.5, '#8c9aa3'], [1, '#2b3237']], { x1: 0, y1: 0, x2: 1, y2: 0 }),
    blur('b6', 6),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#sky)"/>`];
  body.push(`<path d="${massBelow(ridge(random, 545, 16, 90))}" fill="#4e6271" opacity="0.8" filter="url(#b6)"/>`);
  body.push(`<path d="${massBelow(ridge(random, 590, 10, 120))}" fill="#2a3540"/>`);
  // Camino en perspectiva hacia el horizonte (diagonal)
  const roadLeft: Point = [-200, H + 20];
  const roadRight: Point = [780, H + 20];
  body.push(`<path d="${poly([roadLeft, roadRight, [vanishing[0] + 10, vanishing[1]], [vanishing[0] - 10, vanishing[1]]])}" fill="url(#road)"/>`);
  // Juntas de las losas
  const joints: string[] = [];
  for (let k = 1; k < 14; k += 1) {
    const t = Math.pow(k / 14, 1.8);
    const y = vanishing[1] + (H + 20 - vanishing[1]) * t;
    const left = vanishing[0] + (roadLeft[0] - vanishing[0]) * t;
    const right = vanishing[0] + (roadRight[0] - vanishing[0]) * t;
    joints.push(`M${n(left)} ${n(y)}L${n(right)} ${n(y)}`);
    for (let j = 0; j < 3; j += 1) {
      const u = (j + between(random, 0.2, 0.8)) / 3;
      const x = left + (right - left) * u;
      joints.push(`M${n(x)} ${n(y)}l${n((vanishing[0] - x) * 0.04)} ${n(-(y - vanishing[1]) * 0.06)}`);
    }
  }
  body.push(`<path d="${joints.join('')}" stroke="#1b2126" stroke-width="2.4" fill="none"/>`);
  // Mojones a lo largo del camino
  for (let k = 0; k < 5; k += 1) {
    const t = 0.18 + k * 0.17;
    const x = vanishing[0] + (roadRight[0] + 80 - vanishing[0]) * (1 - t);
    const y = vanishing[1] + (H + 20 - vanishing[1]) * (1 - t);
    const s = 1 - t * 0.95;
    body.push(`<rect x="${n(x)}" y="${n(y - 220 * s)}" width="${n(46 * s)}" height="${n(220 * s)}" fill="url(#pillar)"/><rect x="${n(x - 6 * s)}" y="${n(y - 230 * s)}" width="${n(58 * s)}" height="${n(14 * s)}" fill="#9aa8b0"/>`);
  }
  // Trazos de viento estáticos
  const wind: string[] = [];
  for (let index = 0; index < 9; index += 1) {
    const x = between(random, -300, W - 300);
    const y = between(random, 80, 560);
    const length = between(random, 420, 820);
    wind.push(`<path d="M${n(x)} ${n(y)}q${n(length * 0.5)} ${n(-length * 0.16)} ${n(length)} ${n(-length * 0.38)}"/>`);
  }
  body.push(`<g fill="none" stroke="${p.glow}" stroke-width="1.2" stroke-linecap="round" opacity="0.2">${wind.join('')}</g>`);
  const staff = monument('hermes', { x: 1060, y: 380, scale: 4.3, rotate: 6, metal: ['#3b2a16', '#a07c4c', '#f2d6a6'], weight: 2.8, solid: true, prefix: 'her' });
  defs.push(staff.defs);
  body.push(staff.body);
  const vig = vignette('v', p.deep, 0.6);
  defs.push(vig.defs);
  body.push(vig.body);

  const gust = (seed: number) => {
    const local = rng(seed);
    const strokes: string[] = [];
    for (let index = 0; index < 7; index += 1) {
      const x = between(local, -400, W - 400);
      const y = between(local, 100, 640);
      const length = between(local, 480, 900);
      strokes.push(`<path d="M${n(x)} ${n(y)}q${n(length * 0.5)} ${n(-length * 0.15)} ${n(length)} ${n(-length * 0.36)}"/>`);
    }
    return svgLayer('', `<g fill="none" stroke="${p.glow}" stroke-width="1.6" stroke-linecap="round" opacity="0.38">${strokes.join('')}</g>`);
  };
  return { id: theme.id, base: svgDocument(defs.join(''), body.join('')), fx: [{ name: 'wind-a', svg: gust(31) }, { name: 'wind-b', svg: gust(63) }] };
}

/* ——————————————————— Dioniso: vino profundo, hiedra, oro ——————————————————— */

const IVY: readonly Point[] = [
  [0, 12],
  [-7, 10],
  [-15, 6],
  [-12, 1],
  [-17, -4],
  [-8, -5],
  [-6, -12],
  [0, -18],
  [6, -12],
  [8, -5],
  [17, -4],
  [12, 1],
  [15, 6],
  [7, 10],
];
const ivyLeaf = (x: number, y: number, size: number, angle: number) =>
  `<path transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)}) scale(${n(size)})" d="${poly(IVY)}"/>`;

function vine(random: () => number, start: Point, end: Point, sag: number, leaves: number, size: [number, number]): { stem: string; leaves: string; anchors: Point[] } {
  const mid: Point = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + sag];
  const stem = `M${n(start[0])} ${n(start[1])}Q${n(mid[0])} ${n(mid[1])} ${n(end[0])} ${n(end[1])}`;
  const parts: string[] = [];
  const anchors: Point[] = [];
  for (let index = 0; index < leaves; index += 1) {
    const t = (index + 0.5) / leaves;
    const x = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * mid[0] + t * t * end[0];
    const y = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * mid[1] + t * t * end[1];
    anchors.push([x, y]);
    const side = index % 2 === 0 ? 1 : -1;
    parts.push(ivyLeaf(x + side * 12, y + 14, between(random, size[0], size[1]), side * between(random, 10, 40) + 180 * (random() > 0.7 ? 1 : 0)));
  }
  return { stem, leaves: parts.join(''), anchors };
}

function cluster(random: () => number, x: number, y: number, rows: number, radius: number, fill: string): string {
  const berries: string[] = [];
  for (let row = 0; row < rows; row += 1) {
    const count = Math.max(1, rows - row);
    for (let k = 0; k < count; k += 1) {
      const bx = x + (k - (count - 1) / 2) * radius * 1.9 + between(random, -2, 2);
      const by = y + row * radius * 1.65;
      berries.push(`<circle cx="${n(bx)}" cy="${n(by)}" r="${n(radius)}"/>`);
    }
  }
  return `<g fill="${fill}">${berries.join('')}</g>`;
}

function dionysus(theme: DeityTheme): Scene {
  const p = theme.palette;
  const random = rng(1212);
  const defs: string[] = [
    radial('bg', [[0, '#5b1731'], [0.45, '#2c0915'], [1, '#0b0306']], { cx: 1020, cy: 420, r: 1000 }),
    radial('gold', [[0, p.glow, 0.5], [0.4, p.glow, 0.14], [1, p.glow, 0]], { cx: 1120, cy: 360, r: 560 }),
    radial('berry', [[0, '#ffe7a8'], [0.35, '#c08a3a'], [0.75, '#5a1a1f'], [1, '#22060c']], { cx: 0.35, cy: 0.3, r: 0.75, user: false }),
    linear('ivyDark', [[0, '#26402a'], [1, '#0d170e']]),
    linear('ivyLit', [[0, '#5d7a3c'], [0.6, '#2f4a2b'], [1, '#162414']]),
    blur('b10', 10),
    blur('b3', 3),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#bg)"/>`, `<rect width="${W}" height="${H}" fill="url(#gold)"/>`];
  // Pérgola: sarmientos que bajan desde arriba y desde la derecha
  const stems: string[] = [];
  const litLeaves: string[] = [];
  const darkLeaves: string[] = [];
  const clusters: string[] = [];
  const vines: Array<[Point, Point, number, number, [number, number], boolean]> = [
    [[-60, 40], [900, 70], 120, 18, [1.6, 2.4], false],
    [[480, -20], [1660, 120], 160, 22, [1.8, 2.8], true],
    [[1680, 260], [1180, 880], -120, 14, [1.9, 2.9], true],
    [[1650, 620], [1320, 1060], 60, 8, [2.2, 3.2], false],
    [[-40, 260], [380, 1060], 90, 12, [2, 3], false],
  ];
  for (const [start, end, sag, count, size, lit] of vines) {
    const strand = vine(random, start, end, sag, count, size);
    stems.push(`<path d="${strand.stem}"/>`);
    (lit ? litLeaves : darkLeaves).push(strand.leaves);
    if (lit) {
      for (const [index, anchor] of strand.anchors.entries()) {
        if (index % 5 === 2) clusters.push(cluster(random, anchor[0], anchor[1] + 26, 5, 11, 'url(#berry)'));
      }
    }
  }
  body.push(`<g fill="none" stroke="#3a2412" stroke-width="7" stroke-linecap="round">${stems.join('')}</g>`);
  body.push(`<g fill="url(#ivyDark)" stroke="#060b06" stroke-width="0.4">${darkLeaves.join('')}</g>`);
  body.push(`<g fill="url(#ivyLit)" stroke="${p.metal}" stroke-width="0.35" stroke-opacity="0.7">${litLeaves.join('')}</g>`);
  body.push(clusters.join(''));
  // Hojas grandes en primer plano, desenfocadas, enmarcando abajo a la izquierda
  const front: string[] = [];
  for (let index = 0; index < 9; index += 1) {
    front.push(ivyLeaf(between(random, -40, 420), between(random, 760, 1040), between(random, 5, 8), between(random, -40, 40)));
  }
  body.push(`<g fill="#070b07" filter="url(#b3)">${front.join('')}</g>`);
  // Monumento: racimo y hoja de hiedra en oro, suspendido en la luz
  defs.push(radial('halo', [[0, p.glow, 0.42], [1, p.glow, 0]], { cx: 960, cy: 470, r: 320 }));
  body.push(`<ellipse cx="960" cy="470" rx="320" ry="330" fill="url(#halo)"/>`);
  const grapes = monument('dionysus', { x: 960, y: 470, scale: 3.6, rotate: -6, metal: ['#4a2c10', '#c49a4a', '#fbe3a6'], weight: 2.4, solid: true, prefix: 'gra' });
  defs.push(grapes.defs);
  body.push(grapes.body);
  const vig = vignette('v', p.deep, 0.78);
  defs.push(vig.defs);
  body.push(vig.body);

  const shadowRandom = rng(27);
  const shade: string[] = [];
  for (let index = 0; index < 26; index += 1) {
    shade.push(ivyLeaf(between(shadowRandom, 300, W), between(shadowRandom, 120, 900), between(shadowRandom, 3, 6), between(shadowRandom, -60, 60)));
  }
  const leafShadow = svgLayer(blur('dio-b', 12), `<g fill="#0b0204" opacity="0.5" filter="url(#dio-b)">${shade.join('')}</g>`);
  const slowLight = svgLayer(
    radial('dio-l', [[0, p.glow, 0.42], [0.5, p.glow, 0.1], [1, p.glow, 0]], { cx: 1000, cy: 380, r: 420 }),
    `<rect width="${W}" height="${H}" fill="url(#dio-l)"/>`,
  );
  return { id: theme.id, base: svgDocument(defs.join(''), body.join('')), fx: [{ name: 'slow-light', svg: slowLight }, { name: 'leaf-shadow', svg: leafShadow }] };
}

/* ——————————————————— Hestia: atrio de mármol, altar bajo, fuego central ——————————————————— */

function hestia(theme: DeityTheme): Scene {
  const p = theme.palette;
  const random = rng(1313);
  const cx = W / 2;
  const defs: string[] = [
    linear('bg', [[0, '#0b0707'], [0.55, '#1a100c'], [1, '#080505']]),
    radial('hearth', [[0, '#fff0d2', 0.95], [0.16, p.glow, 0.8], [0.45, '#b5531c', 0.32], [1, '#2a0f05', 0]], { cx, cy: 640, r: 720 }),
    linear('col', [[0, '#090606'], [0.45, p.mid], [0.6, '#6a4a38'], [1, '#0a0606']], { x1: 0, y1: 0, x2: 1, y2: 0 }),
    linear('floor', [[0, '#3a271d'], [1, '#0c0706']]),
    linear('altar', [[0, '#7a5a44'], [1, '#1d120d']]),
    blur('b30', 30),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#bg)"/>`];
  // Columnas simétricas que se pierden en la penumbra
  const columns: string[] = [];
  for (const offset of [330, 520, 690]) {
    const width = 150 - offset * 0.12;
    const top = 40 + (offset - 330) * 0.16;
    const base = 800 - (offset - 330) * 0.12;
    for (const side of [-1, 1]) {
      const x = cx + side * offset - width / 2;
      columns.push(
        `<rect x="${n(x)}" y="${n(top)}" width="${n(width)}" height="${n(base - top)}" fill="url(#col)" opacity="${n(1.05 - offset / 1000)}"/>` +
          `<rect x="${n(x - 12)}" y="${n(base)}" width="${n(width + 24)}" height="22" fill="#241710"/>` +
          `<rect x="${n(x - 12)}" y="${n(top - 22)}" width="${n(width + 24)}" height="22" fill="#241710"/>`,
      );
    }
  }
  body.push(columns.join(''));
  // Suelo de losas concéntricas alrededor del hogar
  body.push(`<path d="M-40 ${H + 20}V800h${W + 80}v${H - 780}z" fill="url(#floor)"/>`);
  const rings: string[] = [];
  for (let index = 1; index <= 6; index += 1) {
    rings.push(`<ellipse cx="${cx}" cy="880" rx="${n(index * 150)}" ry="${n(index * 30)}" fill="none" stroke="${p.light}" stroke-width="1.5" opacity="${n(0.3 - index * 0.04)}"/>`);
  }
  body.push(rings.join(''));
  body.push(`<rect width="${W}" height="${H}" fill="url(#hearth)"/>`);
  // Altar bajo y llama monumental
  body.push(`<path d="M${cx - 190} 880l30 -90h320l30 90z" fill="url(#altar)"/><path d="M${cx - 160} 790h320" stroke="${p.glow}" stroke-width="3" opacity="0.6"/>`);
  const flame = monument('hestia', { x: cx, y: 500, scale: 4.4, metal: ['#5a1f08', '#e58a3c', '#fff0c8'], weight: 2.6, solid: true, underlight: true, prefix: 'hst' });
  defs.push(flame.defs);
  body.push(flame.body);
  // Pavesas
  const embers: string[] = [];
  for (let index = 0; index < 34; index += 1) {
    const x = cx + between(random, -260, 260);
    const y = between(random, 120, 620);
    embers.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(between(random, 1.2, 3.4))}" fill="${p.glow}" opacity="${n(between(random, 0.25, 0.8))}"/>`);
  }
  body.push(embers.join(''));
  const vig = vignette('v', p.deep, 0.7);
  defs.push(vig.defs);
  body.push(vig.body);

  const glowA = svgLayer(
    radial('hst-a', [[0, '#ffd9a8', 0.7], [0.4, p.glow, 0.3], [1, p.glow, 0]], { cx, cy: 620, r: 520 }),
    `<rect width="${W}" height="${H}" fill="url(#hst-a)"/>`,
  );
  const glowB = svgLayer(
    radial('hst-b', [[0, '#ff9a4a', 0.5], [0.5, '#ff9a4a', 0.12], [1, '#ff9a4a', 0]], { cx: cx - 20, cy: 520, r: 300 }),
    `<rect width="${W}" height="${H}" fill="url(#hst-b)"/>`,
  );
  return { id: theme.id, base: svgDocument(defs.join(''), body.join('')), fx: [{ name: 'forge-a', svg: glowA }, { name: 'forge-b', svg: glowB }] };
}

const BUILDERS: Readonly<Record<string, (theme: DeityTheme) => Scene>> = {
  zeus,
  hera,
  poseidon,
  demeter,
  athena,
  apollo,
  artemis,
  ares,
  aphrodite,
  hephaestus,
  hermes,
  dionysus,
  hestia,
};

const cache = new Map<string, Scene>();

/** Escena de una deidad del roster (memorizada durante el build). */
export function sceneFor(id: string): Scene {
  const cached = cache.get(id);
  if (cached !== undefined) return cached;
  const theme = DEITY_THEMES[id];
  const build = BUILDERS[id];
  if (theme === undefined || build === undefined) throw new Error(`Sin escena para "${id}" (src/lib/scenes/scenes.ts).`);
  const scene = build(theme);
  cache.set(id, scene);
  return scene;
}

export const SCENE_IDS = Object.keys(BUILDERS);
export { H as SCENE_HEIGHT, W as SCENE_WIDTH };
