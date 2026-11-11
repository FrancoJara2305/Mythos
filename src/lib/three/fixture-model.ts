/**
 * FIXTURE TÉCNICO — no es un objeto del archivo ni representa ninguna pieza antigua.
 *
 * Genera de forma determinista un GLB geométrico (plinto, fuste y esfera) para probar el inspector 3D
 * mientras los modelos reales de Atenea y Dioniso siguen pendientes de adquisición
 * (docs/asset_manifest.md §4). Ejercita lo que un modelo real exige al visor: varias mallas, un
 * material compartido, una textura PNG incrustada (ImageBitmap en el navegador) y anotaciones con
 * coordenadas conocidas. Solo se sirve fuera de producción (`src/pages/lab/`).
 *
 * Módulo puro: sin Three.js, sin DOM y sin dependencias de Node.
 */

export const FIXTURE_GENERATOR = 'MYTHOS fixture-model 1 — prueba técnica, no es un objeto del archivo';

interface Part {
  name: string;
  material: number;
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

type Axis = [number, number, number];

function box(name: string, material: number, size: Axis, y0: number): Part {
  const half: Axis = [size[0] / 2, size[1] / 2, size[2] / 2];
  const centre: Axis = [0, y0 + half[1], 0];
  // Normal, U y V con U × V = normal: cada cara queda en sentido antihorario vista desde fuera.
  const faces: Array<[Axis, Axis, Axis]> = [
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  ];
  const part: Part = { name, material, positions: [], normals: [], uvs: [], indices: [] };
  for (const [normal, u, v] of faces) {
    const base = part.positions.length / 3;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      for (let axis = 0; axis < 3; axis += 1) {
        part.positions.push(centre[axis]! + (normal[axis]! + su * u[axis]! + sv * v[axis]!) * half[axis]!);
      }
      part.normals.push(...normal);
      part.uvs.push((su + 1) / 2, (1 - sv) / 2);
    }
    part.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return part;
}

function cylinder(name: string, material: number, radius: number, height: number, y0: number, segments: number): Part {
  const part: Part = { name, material, positions: [], normals: [], uvs: [], indices: [] };
  const y1 = y0 + height;
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    part.positions.push(radius * sin, y0, radius * cos, radius * sin, y1, radius * cos);
    part.normals.push(sin, 0, cos, sin, 0, cos);
    part.uvs.push((index / segments) * 3, 1, (index / segments) * 3, 0);
  }
  for (let index = 0; index < segments; index += 1) {
    const b0 = index * 2;
    part.indices.push(b0, b0 + 2, b0 + 3, b0, b0 + 3, b0 + 1);
  }
  for (const [y, ny] of [[y1, 1], [y0, -1]] as const) {
    const centre = part.positions.length / 3;
    part.positions.push(0, y, 0);
    part.normals.push(0, ny, 0);
    part.uvs.push(0.5, 0.5);
    for (let index = 0; index <= segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      part.positions.push(radius * Math.sin(angle), y, radius * Math.cos(angle));
      part.normals.push(0, ny, 0);
      part.uvs.push(0.5 + Math.sin(angle) / 2, 0.5 - Math.cos(angle) / 2);
    }
    for (let index = 0; index < segments; index += 1) {
      const a = centre + 1 + index;
      if (ny > 0) part.indices.push(centre, a, a + 1);
      else part.indices.push(centre, a + 1, a);
    }
  }
  return part;
}

function sphere(name: string, material: number, radius: number, centreY: number, widthSegments: number, heightSegments: number): Part {
  const part: Part = { name, material, positions: [], normals: [], uvs: [], indices: [] };
  for (let iy = 0; iy <= heightSegments; iy += 1) {
    const phi = (iy / heightSegments) * Math.PI;
    for (let ix = 0; ix <= widthSegments; ix += 1) {
      const theta = (ix / widthSegments) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.sin(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.cos(theta);
      part.positions.push(radius * nx, centreY + radius * ny, radius * nz);
      part.normals.push(nx, ny, nz);
      part.uvs.push(ix / widthSegments, iy / heightSegments);
    }
  }
  const row = widthSegments + 1;
  for (let iy = 0; iy < heightSegments; iy += 1) {
    for (let ix = 0; ix < widthSegments; ix += 1) {
      const a = iy * row + ix;
      const b = a + row;
      if (iy !== 0) part.indices.push(a, b, a + 1);
      if (iy !== heightSegments - 1) part.indices.push(b, b + 1, a + 1);
    }
  }
  return part;
}

// ------------------------------------------------------------------ PNG mínimo (sin compresión)

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function u32be(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value >>> 0, false);
  return out;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typed = concat([new TextEncoder().encode(type), data]);
  return concat([u32be(data.length), typed, u32be(crc32(typed))]);
}

/** Damero de 16×16 px en dos tonos de piedra, RGB, como PNG con un bloque zlib almacenado. */
export function checkerPng(size = 16, cell = 4): Uint8Array<ArrayBuffer> {
  const light = [198, 186, 162];
  const dark = [160, 146, 120];
  const raw = new Uint8Array(size * (1 + size * 3));
  for (let y = 0; y < size; y += 1) {
    const row = y * (1 + size * 3);
    raw[row] = 0; // filtro «None»
    for (let x = 0; x < size; x += 1) {
      const colour = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0 ? light : dark;
      raw.set(colour, row + 1 + x * 3);
    }
  }
  let a = 1;
  let b = 0;
  for (const byte of raw) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  const length = raw.length;
  const zlib = concat([
    new Uint8Array([0x78, 0x01, 0x01, length & 0xff, length >> 8, ~length & 0xff, (~length >> 8) & 0xff]),
    raw,
    u32be(((b << 16) | a) >>> 0),
  ]);
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, size, false);
  view.setUint32(4, size, false);
  header.set([8, 2, 0, 0, 0], 8);
  return concat([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib),
    pngChunk('IEND', new Uint8Array(0)),
  ]);
}

// ------------------------------------------------------------------ GLB

/** Anotaciones del fixture, en el espacio local del GLB (metros nominales, +Y arriba, frente +Z). */
export const FIXTURE_HOTSPOTS = [
  { id: 'plinto-frente', position: [0, 0.1, 0.4], label: 'Cara frontal del plinto', description: 'Centro de la cara que mira a la cámara inicial.' },
  { id: 'fuste-frente', position: [0, 0.65, 0.16], label: 'Fuste, cara frontal', description: 'Punto medio del cilindro, visible de frente.' },
  { id: 'fuste-dorso', position: [0, 0.65, -0.16], label: 'Fuste, cara posterior', description: 'Mismo punto en el dorso: queda oculto de frente y se muestra al girar.' },
  { id: 'esfera-cima', position: [0, 1.62, 0], label: 'Cima de la esfera', description: 'Punto más alto del fixture.' },
] as const satisfies ReadonlyArray<{ id: string; position: readonly [number, number, number]; label: string; description: string }>;

function fixtureParts(): Part[] {
  return [box('plinto', 0, [0.8, 0.2, 0.8], 0), cylinder('fuste', 0, 0.16, 0.9, 0.2, 32), sphere('esfera', 1, 0.26, 1.36, 32, 20)];
}

export function fixtureTriangles(): number {
  return fixtureParts().reduce((sum, part) => sum + part.indices.length / 3, 0);
}

const pad4 = (length: number) => (4 - (length % 4)) % 4;

export interface FixtureOptions {
  /**
   * Declara Draco como extensión obligatoria (sin datos Draco reales): un archivo que este visor no
   * puede abrir, para probar el fallo de descodificador.
   */
  requireDraco?: boolean;
}

export function buildFixtureGlb(options: FixtureOptions = {}): Uint8Array<ArrayBuffer> {
  const parts = fixtureParts();
  const chunks: Uint8Array[] = [];
  let byteOffset = 0;
  const bufferViews: Array<Record<string, number>> = [];
  const accessors: Array<Record<string, unknown>> = [];

  const pushView = (bytes: Uint8Array, target?: number) => {
    bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.length, ...(target === undefined ? {} : { target }) });
    chunks.push(bytes, new Uint8Array(pad4(bytes.length)));
    byteOffset += bytes.length + pad4(bytes.length);
    return bufferViews.length - 1;
  };
  const floats = (values: number[], type: 'VEC2' | 'VEC3', withBounds = false) => {
    const width = type === 'VEC3' ? 3 : 2;
    const view = pushView(new Uint8Array(new Float32Array(values).buffer), 34962);
    const accessor: Record<string, unknown> = { bufferView: view, componentType: 5126, count: values.length / width, type };
    if (withBounds) {
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (let index = 0; index < values.length; index += 3) {
        for (let axis = 0; axis < 3; axis += 1) {
          const value = Math.fround(values[index + axis]!);
          min[axis] = Math.min(min[axis]!, value);
          max[axis] = Math.max(max[axis]!, value);
        }
      }
      Object.assign(accessor, { min, max });
    }
    accessors.push(accessor);
    return accessors.length - 1;
  };

  const meshes = parts.map((part) => {
    const POSITION = floats(part.positions, 'VEC3', true);
    const NORMAL = floats(part.normals, 'VEC3');
    const TEXCOORD_0 = floats(part.uvs, 'VEC2');
    const indexView = pushView(new Uint8Array(new Uint16Array(part.indices).buffer), 34963);
    accessors.push({ bufferView: indexView, componentType: 5123, count: part.indices.length, type: 'SCALAR' });
    return { name: part.name, primitives: [{ attributes: { POSITION, NORMAL, TEXCOORD_0 }, indices: accessors.length - 1, material: part.material }] };
  });
  const imageView = pushView(checkerPng());

  const draco = options.requireDraco === true ? ['KHR_draco_mesh_compression'] : undefined;
  const json = {
    asset: { version: '2.0', generator: FIXTURE_GENERATOR, extras: { mythosFixture: true } },
    ...(draco === undefined ? {} : { extensionsUsed: draco, extensionsRequired: draco }),
    scene: 0,
    scenes: [{ name: 'fixture', nodes: parts.map((_, index) => index) }],
    nodes: parts.map((part, index) => ({ name: part.name, mesh: index })),
    meshes,
    materials: [
      { name: 'piedra (fixture)', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.85 } },
      { name: 'metal (fixture)', pbrMetallicRoughness: { baseColorFactor: [0.78, 0.6, 0.34, 1], metallicFactor: 0.7, roughnessFactor: 0.38 } },
    ],
    samplers: [{ magFilter: 9728, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    images: [{ bufferView: imageView, mimeType: 'image/png' }],
    textures: [{ sampler: 0, source: 0 }],
    accessors,
    bufferViews,
    buffers: [{ byteLength: byteOffset }],
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPadded = concat([jsonBytes, new Uint8Array(pad4(jsonBytes.length)).fill(0x20)]);
  const binary = concat(chunks);
  const total = 12 + 8 + jsonPadded.length + 8 + binary.length;
  const header = new Uint8Array(12);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  const chunkHeader = (length: number, type: number) => {
    const bytes = new Uint8Array(8);
    const chunkView = new DataView(bytes.buffer);
    chunkView.setUint32(0, length, true);
    chunkView.setUint32(4, type, true);
    return bytes;
  };
  return concat([header, chunkHeader(jsonPadded.length, 0x4e4f534a), jsonPadded, chunkHeader(binary.length, 0x004e4942), binary]);
}
