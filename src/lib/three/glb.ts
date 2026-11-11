/**
 * Lectura de la cabecera de un GLB (glTF 2.0 binario) antes de entregarlo a GLTFLoader: valida el
 * contenedor y decide qué descodificadores necesita. Así un fallo de formato o de descodificador se
 * informa con precisión y el descodificador Meshopt solo se descarga si el archivo lo declara.
 *
 * Módulo puro (sin Three.js ni DOM). Especificación: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#binary-gltf-layout
 */

const MAGIC = 0x46546c67; // «glTF»
const CHUNK_JSON = 0x4e4f534a; // «JSON»
const HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;

export type GlbProblem = 'invalid-file' | 'decoder';

export class GlbError extends Error {
  readonly problem: GlbProblem;

  constructor(problem: GlbProblem, message: string) {
    super(message);
    this.name = 'GlbError';
    this.problem = problem;
  }
}

export interface GlbInfo {
  version: number;
  byteLength: number;
  generator: string | undefined;
  extensionsUsed: string[];
  extensionsRequired: string[];
  /** `asset.extras.mythosFixture`: el archivo es un fixture técnico, no un objeto del archivo. */
  fixture: boolean;
}

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

export function readGlb(buffer: ArrayBuffer): GlbInfo {
  if (buffer.byteLength < HEADER_BYTES + CHUNK_HEADER_BYTES) throw new GlbError('invalid-file', 'Archivo demasiado corto para ser un GLB.');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC) throw new GlbError('invalid-file', 'Falta la firma «glTF»: no es un GLB.');
  const version = view.getUint32(4, true);
  if (version !== 2) throw new GlbError('invalid-file', `Versión de GLB no admitida: ${version}.`);
  const byteLength = view.getUint32(8, true);
  if (byteLength !== buffer.byteLength) {
    throw new GlbError('invalid-file', `Longitud declarada (${byteLength} B) distinta de la recibida (${buffer.byteLength} B): archivo truncado o alterado.`);
  }
  const jsonLength = view.getUint32(HEADER_BYTES, true);
  if (view.getUint32(HEADER_BYTES + 4, true) !== CHUNK_JSON) throw new GlbError('invalid-file', 'El primer bloque del GLB no es JSON.');
  const start = HEADER_BYTES + CHUNK_HEADER_BYTES;
  if (start + jsonLength > buffer.byteLength) throw new GlbError('invalid-file', 'El bloque JSON excede el archivo.');

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, start, jsonLength))) as Record<string, unknown>;
  } catch {
    throw new GlbError('invalid-file', 'El bloque JSON del GLB no se puede leer.');
  }
  const asset = (json.asset ?? {}) as Record<string, unknown>;
  if (asset.version !== '2.0') throw new GlbError('invalid-file', 'El GLB no declara glTF 2.0.');
  const extras = (asset.extras ?? {}) as Record<string, unknown>;
  return {
    version,
    byteLength,
    generator: typeof asset.generator === 'string' ? asset.generator : undefined,
    extensionsUsed: strings(json.extensionsUsed),
    extensionsRequired: strings(json.extensionsRequired),
    fixture: extras.mythosFixture === true,
  };
}

/** Extensiones que exigen un descodificador externo a GLTFLoader. */
export const DECODER_EXTENSIONS = {
  EXT_meshopt_compression: 'meshopt',
  KHR_draco_mesh_compression: 'draco',
  KHR_texture_basisu: 'ktx2',
} as const;
export type Decoder = (typeof DECODER_EXTENSIONS)[keyof typeof DECODER_EXTENSIONS];

/**
 * Descodificadores que este visor sirve. Meshopt es la primera opción del presupuesto 3D y viaja como
 * módulo JS de Three (sin wasm externo). Draco y KTX2 se añadirán solo si un modelo real lo justifica,
 * con sus archivos locales en `public/assets/decoders/` y su licencia inventariada.
 */
export const SUPPORTED_DECODERS: ReadonlySet<Decoder> = new Set<Decoder>(['meshopt']);

export interface DecoderPlan {
  needed: Decoder[];
  /** Extensiones usadas cuyo descodificador falta. */
  missing: string[];
}

/**
 * Un descodificador hace falta si su extensión se usa (aunque no sea obligatoria, GLTFLoader la
 * aplica cuando está presente). Si falta y la extensión es obligatoria, el modelo no se puede abrir.
 */
export function decoderPlan(info: GlbInfo): DecoderPlan {
  const needed: Decoder[] = [];
  const missing: string[] = [];
  for (const [extension, decoder] of Object.entries(DECODER_EXTENSIONS) as Array<[string, Decoder]>) {
    if (!info.extensionsUsed.includes(extension) && !info.extensionsRequired.includes(extension)) continue;
    if (SUPPORTED_DECODERS.has(decoder)) needed.push(decoder);
    else if (info.extensionsRequired.includes(extension)) missing.push(extension);
  }
  return { needed, missing };
}

/** Valida y planifica en un paso; lanza `GlbError('decoder')` si falta un descodificador obligatorio. */
export function inspectGlb(buffer: ArrayBuffer): { info: GlbInfo; decoders: Decoder[] } {
  const info = readGlb(buffer);
  const plan = decoderPlan(info);
  if (plan.missing.length > 0) {
    throw new GlbError('decoder', `El modelo exige ${plan.missing.join(', ')} y este visor no incluye ese descodificador.`);
  }
  return { info, decoders: plan.needed };
}
