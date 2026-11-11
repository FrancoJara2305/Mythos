/**
 * Emblemas editoriales originales de las divinidades con ficha (MYTHOS, 2026-11-09). Dibujo lineal propio, sin calcar
 * ninguna imagen: cada uno representa un símbolo con evidencia en la ficha de la deidad
 * (`emblem.symbol` en src/config/chapters.ts). No son objetos antiguos ni pretenden reconstruirlos.
 *
 * Coordenadas en un lienzo de 120 × 160; trazo con `currentColor`. El contenido es marcado SVG
 * estático generado en el build (sin datos de usuario).
 */

export const EMBLEM_VIEWBOX = '0 0 120 160';

const r = (value: number) => Math.round(value * 10) / 10;

/** Espiga de trigo: tallo desde la base y granos alternos en su mitad superior. */
function ear(x: number, y: number, angle: number, length: number): string {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const tipX = x + dx * length;
  const tipY = y + dy * length;
  const parts = [`<path d="M${r(x)} ${r(y)}L${r(tipX)} ${r(tipY)}"/>`];
  const grains = 4;
  const start = length * 0.5;
  for (let index = 0; index < grains; index += 1) {
    const t = start + ((length - start - 6) * index) / (grains - 1);
    const cx = x + dx * t;
    const cy = y + dy * t;
    for (const side of [-1, 1]) {
      const px = cx + side * Math.cos(rad) * 3.4;
      const py = cy + side * Math.sin(rad) * 3.4;
      parts.push(`<ellipse cx="${r(px)}" cy="${r(py)}" rx="2.4" ry="5" transform="rotate(${r(angle + side * 26)} ${r(px)} ${r(py)})"/>`);
    }
  }
  parts.push(`<ellipse cx="${r(tipX)}" cy="${r(tipY)}" rx="2.2" ry="4.6" transform="rotate(${r(angle)} ${r(tipX)} ${r(tipY)})"/>`);
  // Aristas
  parts.push(`<path d="M${r(tipX)} ${r(tipY - 4)}l${r(dx * 8 - 2)} ${r(dy * 10)}M${r(tipX)} ${r(tipY - 4)}l${r(dx * 8 + 2)} ${r(dy * 10)}"/>`);
  return parts.join('');
}

function wheatSheaf(): string {
  const baseX = 54;
  const baseY = 104;
  const ears = [-22, 0, 22].map((angle, index) => ear(baseX, baseY, angle, index === 1 ? 84 : 72)).join('');
  const stalks = [-9, -3, 3, 9].map((offset) => `<path d="M${baseX} ${baseY}L${baseX + offset} 148"/>`).join('');
  const binding = `<path d="M${baseX - 9} ${baseY - 2}c6 4 12 4 18 0M${baseX - 9} ${baseY + 4}c6 4 12 4 18 0"/>`;
  const scepter = '<path d="M98 150V30"/><circle cx="98" cy="25" r="4.5"/><path d="M94 36h8M95 146h6"/>';
  return scepter + stalks + ears + binding;
}

export const EMBLEMS: Readonly<Record<string, string>> = {
  // Rayo: haz de doble punta con dientes en zigzag y atadura central.
  zeus:
    '<path d="M60 54l4 26-4 26-4-26z"/><ellipse cx="60" cy="80" rx="8" ry="3"/>' +
    '<path d="M60 54l-5-13 8-7-6-18"/><path d="M57 57L45 47l6-8-12-14"/><path d="M63 57l12-10-6-8 12-14"/>' +
    '<path d="M60 106l5 13-8 7 6 18"/><path d="M63 103l12 10-6 8 12 14"/><path d="M57 103l-12 10 6 8-12 14"/>',
  // Cetro con remate de flor de loto.
  hera:
    '<path d="M60 150V47"/><circle cx="60" cy="150" r="3"/><path d="M54 47h12M55 66h10M55 70h10M56 128h8"/>' +
    '<path d="M60 44c-7-7-7-19 0-30 7 11 7 23 0 30z"/><path d="M58 45c-9-1-16-8-18-19 9 2 15 9 18 19z"/>' +
    '<path d="M62 45c9-1 16-8 18-19-9 2-15 9-18 19z"/>',
  // Tridente.
  poseidon:
    '<path d="M60 150V60M56 150h8M55 92h10"/><path d="M40 30v18c0 8 9 12 20 12s20-4 20-12V30"/><path d="M60 60V18"/>' +
    '<path d="M53 29l7-15 7 15"/><path d="M35 34l5-13 5 13"/><path d="M75 34l5-13 5 13"/>',
  demeter: wheatSheaf(),
  // Lechuza posada.
  athena:
    '<path d="M60 30c-20 0-26 16-24 32 2 24 8 46 24 54 16-8 22-30 24-54 2-16-4-32-24-32z"/>' +
    '<path d="M42 37l-4-12 12 8M78 37l4-12-12 8"/><circle cx="50" cy="52" r="9"/><circle cx="70" cy="52" r="9"/>' +
    '<circle cx="50" cy="52" r="3"/><circle cx="70" cy="52" r="3"/><path d="M57 60l3 8 3-8"/>' +
    '<path d="M40 70c6 14 10 26 16 40M80 70c-6 14-10 26-16 40"/>' +
    '<path d="M54 78l6 4 6-4M53 88l7 4 7-4M55 98l5 4 5-4"/>' +
    '<path d="M28 122h64M54 116l-2 6M58 116v6M62 116v6M66 116l2 6"/>',
  // Cítara: caja de resonancia, brazos, yugo y siete cuerdas.
  apollo:
    '<path d="M32 112h56l-4 38H36z"/><path d="M36 112c-8-22-6-52 2-76M84 112c8-22 6-52-2-76"/>' +
    '<path d="M32 40h56"/><circle cx="30" cy="40" r="3"/><circle cx="90" cy="40" r="3"/>' +
    '<path d="M48 40v98M52 40v98M56 40v98M60 40v98M64 40v98M68 40v98M72 40v98"/><path d="M44 138h32"/>',
  // Arco con su cuerda y aljaba con flechas.
  artemis:
    '<path d="M46 18c32 22 32 102 0 124"/><path d="M46 18L46 142"/><path d="M46 18c-4-2-7 1-6 4M46 142c-4 2-7-1-6-4"/>' +
    '<path d="M66 74h7M66 86h7"/><path d="M82 56l14-4 8 72-14 4z"/><path d="M84 66l14-4"/>' +
    '<path d="M86 55l-4-19M91 54l-2-20M96 52l1-19"/><path d="M79 40l3-4 3 4M86 38l3-4 3 4M94 37l3-4 3 4"/>',
  // Casco corintio de frente y lanza.
  ares:
    '<path d="M52 40c-20 0-26 16-26 32v32c0 8 6 14 14 16h4v-20c0-4 4-6 8-6s8 2 8 6v20h4c8-2 14-8 14-16V72c0-16-6-32-26-32z"/>' +
    '<path d="M34 74c4-4 12-4 15 0v6c-5 2-11 2-15 0zM70 74c-4-4-12-4-15 0v6c5 2 11 2 15 0z"/>' +
    '<path d="M30 36c0-24 44-24 44 0z"/><path d="M38 36V24M45 36V18M52 36V16M59 36V18M66 36V24"/>' +
    '<path d="M100 150V34"/><path d="M100 12c5 9 4 17 0 22-4-5-5-13 0-22z"/><path d="M96 34h8M97 150h6"/>',
  // Velo que cae en pliegues.
  aphrodite:
    '<circle cx="60" cy="20" r="3"/><path d="M60 23c-22 12-30 48-32 86-1 16-4 30-8 40"/>' +
    '<path d="M60 23c22 12 30 48 32 86 1 16 4 30 8 40"/>' +
    '<path d="M20 149c10-6 18 4 28-2s16 5 24 0 18 5 28 2"/>' +
    '<path d="M60 23c-8 28-12 68-14 124M60 23c8 28 12 68 14 124M60 23c-2 38-2 78 0 125"/>',
  // Yunque, martillo y tenazas.
  hephaestus:
    '<path d="M14 98c8 3 16 2 18 2h58v8c-6 2-12 6-14 12v8l8 10H38l8-10v-8c-2-6-8-10-14-12v-4c-6 0-14-2-18-6z"/>' +
    '<path d="M42 90l33-55"/><path d="M93.2 34l-5.4 8.4-25-16.4 5.4-8.4z"/>' +
    '<path d="M84 90L50 38M78 92L46 41"/><circle cx="65" cy="63" r="2.5"/>' +
    '<path d="M50 38c-3-6-6-8-10-7M46 41c-4-4-8-4-10-2"/>',
  // Bastón y gorro de ala ancha (pétaso) colgado de él.
  hermes:
    '<path d="M28 150L92 30"/><circle cx="94" cy="26" r="4.5"/><path d="M26 154l2-4"/>' +
    '<g transform="rotate(-14 62 74)"><ellipse cx="62" cy="80" rx="38" ry="9"/><path d="M41 78c0-24 42-24 42 0"/>' +
    '<path d="M43 72c12 4 26 4 38 0"/></g>',
  // Racimo de uvas y hoja de hiedra pendientes de un sarmiento.
  dionysus:
    '<g transform="translate(0 18)"><path d="M18 30c16-6 34 0 42 8s30 8 44-6"/><path d="M28 27c-6 10-14 10-14 4 0-4 4-4 5-1"/>' +
    '<path d="M54 36v10"/>' +
    [
      [36, 52], [48, 52], [60, 52], [72, 52],
      [42, 63], [54, 63], [66, 63],
      [48, 74], [60, 74],
      [54, 85],
    ]
      .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="6"/>`)
      .join('') +
    '<path d="M96 38v8"/><path d="M96 46c8 6 16 6 18 14-4 2-6 6-4 12-8 0-12 4-14 10-2-6-6-10-14-10 2-6 0-10-4-12 2-8 10-8 18-14z"/>' +
    '<path d="M96 48v32M96 64l12-6M96 64l-12-6"/></g>',
  // Llama del hogar sobre un altar bajo (Hestia, la otra tradición de los doce).
  hestia:
    '<path d="M60 118C44 110 36 94 46 72c2 10 6 14 10 16C52 62 60 44 68 28c2 18 14 28 16 46 2 18-6 34-24 44z"/>' +
    '<path d="M60 110c-8-6-9-16-3-24 2 5 5 7 8 8-1-10 2-17 6-23 2 10 7 16 6 26-1 7-7 11-17 13z"/>' +
    '<path d="M32 122h56l-7 14H39z"/><path d="M44 136v12h32v-12M34 150h52"/>',
};

export function emblemMarkup(id: string): string {
  const markup = EMBLEMS[id];
  if (markup === undefined) throw new Error(`No hay emblema editorial para "${id}".`);
  return markup;
}
