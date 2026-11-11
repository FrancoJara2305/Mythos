/**
 * Capítulos y selecciones editoriales (docs/content_model.md §1–2).
 *
 * Desde el Narratorio (2026-11-09) MYTHOS se organiza como «Parte I: ruta completa de la mitología
 * griega», con seis capítulos (GR-01 a GR-06) repartidos en dos temáticas. La estructura narrativa
 * (temáticas, personajes e historias de cada capítulo) vive en `src/config/saga.ts`; este archivo
 * conserva los identificadores estables de capítulo y la selección editorial del único capítulo con
 * roster: GR-04, The Dodekatheon. No duplica biografías ni genealogías (esas viven en las colecciones).
 * `src/lib/content/integrity.ts` comprueba que cada ID exista y tenga el perfil correcto.
 */

export interface Chapter {
  id: string;
  /** Código de la ruta narrativa: «GR-04». */
  number: string;
  /** Título del capítulo. Si está en otro idioma (`titleLang`), marcar `lang` al mostrarlo. */
  title: string;
  titleLang?: 'en';
  /** Rótulo completo: «GR-04 — The Dodekatheon». */
  label: string;
  publishable: boolean;
}

export const CHAPTERS = [
  { id: 'before-the-gods', number: 'GR-01', title: 'Antes de los dioses', label: 'GR-01 — Antes de los dioses', publishable: true },
  { id: 'reign-of-the-titans', number: 'GR-02', title: 'El reinado de los titanes', label: 'GR-02 — El reinado de los titanes', publishable: true },
  { id: 'war-for-the-cosmos', number: 'GR-03', title: 'La guerra por el cosmos', label: 'GR-03 — La guerra por el cosmos', publishable: true },
  { id: 'dodekatheon', number: 'GR-04', title: 'The Dodekatheon', titleLang: 'en', label: 'GR-04 — The Dodekatheon', publishable: true },
  { id: 'divine-families', number: 'GR-05', title: 'Familias, alianzas y conflictos divinos', label: 'GR-05 — Familias, alianzas y conflictos divinos', publishable: true },
  { id: 'love-and-metamorphosis', number: 'GR-06', title: 'Amor, deseo y metamorfosis', label: 'GR-06 — Amor, deseo y metamorfosis', publishable: true },
] as const satisfies readonly Chapter[];

/** Capítulo principal del MVP (el único con roster, planetario, linajes e hilo del destino). */
export const ACTIVE_CHAPTER: Chapter = CHAPTERS[3];

export interface Emblem {
  /** Etiqueta exacta de un símbolo o dominio con evidencia en la ficha. */
  symbol: string;
  /** Lo que muestra el dibujo. */
  depicts: string;
}

export interface RosterEntry {
  /** ID de la colección `deities`; debe ser un perfil `full`. */
  id: string;
  /** Posición editorial en la bóveda (1–12). No expresa jerarquía ni cronología. */
  order: number;
  /**
   * Símbolo editorial original (formas en src/components/archive/emblems.ts): objeto monumental de la
   * escena de la ficha (src/lib/scenes/). `symbol` es la etiqueta exacta de un atributo con evidencia
   * en la ficha (símbolo o dominio); `depicts`, lo que muestra el dibujo. No es un objeto antiguo ni
   * una representación de culto: se rotula siempre «símbolo editorial».
   */
  emblem: Emblem;
}

export interface VariantGroupLabels {
  /** Nombre de la cuestión que varía, p. ej. «Origen de Afrodita». */
  label: string;
  /** Rótulo de cada opción, p. ej. `{ hesiodic: 'Teogonía de Hesíodo' }`. */
  options: Readonly<Record<string, string>>;
}

/**
 * Otra tradición de los doce: la misma lista con una divinidad distinta en un asiento. Ambas figuras
 * tienen ficha completa y constelación; el planetario alterna entre ellas en tiempo real.
 */
export interface AlternativeSelection {
  id: string;
  label: string;
  /** Perfil del roster principal que no figura en esta selección. */
  without: string;
  /** Deidad con perfil `full`, fuera del roster principal, que ocupa su lugar. */
  with: string;
  /** Emblema editorial de `with` (mismas reglas que el del roster). */
  emblem: Emblem;
  /** Nombre de cada tradición en el interruptor de la bóveda. */
  traditions: { without: string; with: string };
  /** Testimonio concreto que respalda esta selección (colección `artifacts`). */
  evidenceArtifactId: string;
  note: string;
}

export interface ChapterSelection {
  chapterId: string;
  roster: readonly RosterEntry[];
  /** Entidades con perfil `context` que la exposición menciona expresamente. */
  contextual: readonly string[];
  alternatives: readonly AlternativeSelection[];
  /** Opción mostrada por defecto en cada grupo de variantes genealógicas (elección editorial). */
  defaultVariants: Readonly<Record<string, string>>;
  /** Rótulos visibles de cada grupo de variantes y de sus opciones. */
  variantLabels: Readonly<Record<string, VariantGroupLabels>>;
}

export const DODEKATHEON: ChapterSelection = {
  chapterId: 'dodekatheon',
  roster: [
    { id: 'zeus', order: 1, emblem: { symbol: 'Rayo', depicts: 'rayo' } },
    { id: 'hera', order: 2, emblem: { symbol: 'Cetro', depicts: 'cetro' } },
    { id: 'poseidon', order: 3, emblem: { symbol: 'Tridente', depicts: 'tridente' } },
    { id: 'demeter', order: 4, emblem: { symbol: 'Gavilla de trigo y cetro', depicts: 'gavilla de trigo y cetro' } },
    { id: 'athena', order: 5, emblem: { symbol: 'Lechuza y casco', depicts: 'lechuza' } },
    { id: 'apollo', order: 6, emblem: { symbol: 'Cítara', depicts: 'cítara' } },
    { id: 'artemis', order: 7, emblem: { symbol: 'Arco y aljaba', depicts: 'arco y aljaba' } },
    { id: 'ares', order: 8, emblem: { symbol: 'Casco y lanza', depicts: 'casco y lanza' } },
    { id: 'aphrodite', order: 9, emblem: { symbol: 'Velo', depicts: 'velo' } },
    { id: 'hephaestus', order: 10, emblem: { symbol: 'Yunque, martillo y tenazas', depicts: 'yunque, martillo y tenazas' } },
    { id: 'hermes', order: 11, emblem: { symbol: 'Gorro y bastón', depicts: 'gorro y bastón' } },
    { id: 'dionysus', order: 12, emblem: { symbol: 'Vid e hiedra', depicts: 'racimo de uvas y hoja de hiedra' } },
  ],
  contextual: [],
  alternatives: [
    {
      id: 'walters-procession',
      label: 'Selección con Hestia (relieve Walters 23.40)',
      without: 'dionysus',
      with: 'hestia',
      emblem: { symbol: 'Hogar y libación', depicts: 'llama del hogar sobre su altar' },
      traditions: { without: 'Tradición Dionisíaca: Dioniso', with: 'Tradición del Hogar Sagrado: Hestia' },
      evidenceArtifactId: 'walters-23-40',
      note:
        'El relieve 23.40 del Walters Art Museum muestra doce divinidades con Hestia y sin Dioniso. Respalda ' +
        'esa selección concreta; no prueba una sustitución universal ni un relato antiguo de cesión del trono.',
    },
  ],
  defaultVariants: {
    'aphrodite-origin': 'hesiodic',
    'hephaestus-parentage': 'hesiodic',
  },
  variantLabels: {
    'aphrodite-origin': {
      label: 'Origen de Afrodita',
      options: { hesiodic: 'Teogonía de Hesíodo', iliadic: 'Ilíada' },
    },
    'hephaestus-parentage': {
      label: 'Filiación de Hefesto',
      options: { hesiodic: 'Teogonía de Hesíodo', homeric: 'Ilíada y Odisea' },
    },
  },
};

export const CHAPTER_SELECTIONS: readonly ChapterSelection[] = [DODEKATHEON];

/** Tamaño exigido del roster principal del Dodekatheon. */
export const DODEKATHEON_SIZE = 12;

/** IDs con ficha propia en una selección: el roster y las divinidades de sus otras tradiciones. */
export function profileIds(selection: ChapterSelection): string[] {
  return [...[...selection.roster].sort((a, b) => a.order - b.order).map((item) => item.id), ...selection.alternatives.map((item) => item.with)];
}

/** Emblema editorial de una deidad con ficha (roster u otra tradición). */
export function emblemOf(selection: ChapterSelection, id: string): Emblem | undefined {
  return selection.roster.find((item) => item.id === id)?.emblem ?? selection.alternatives.find((item) => item.with === id)?.emblem;
}
