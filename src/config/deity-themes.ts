/**
 * Dirección visual de cada ficha (rediseño 2026-11-09, docs/design_guidelines.md «Temas por deidad»).
 *
 * Cada deidad tiene una composición, una materia y una luz propias; no es una plantilla que solo cambia
 * de color. Las escenas son ilustraciones originales de MYTHOS generadas en el build
 * (src/lib/scenes/): interpretan un atributo con evidencia en la ficha (el emblema editorial de
 * src/config/chapters.ts) y nunca imitan una fotografía de museo ni reconstruyen un objeto antiguo.
 *
 * Familias de composición (cinco, repartidas para que dos fichas contiguas del roster no compartan;
 * tests/unit/visual-identity.test.ts lo comprueba):
 * - `inmersion`: la escena ocupa toda la primera vista; el texto se apoya abajo a la izquierda.
 * - `arquitectura`: simetría y orden constructivo; un eje de luz central parte el texto en dos
 *   columnas (nombre a la izquierda, resumen y acciones a la derecha) sin tapar el objeto.
 * - `monolito`: un objeto vertical domina el tercio derecho; el texto es una columna con filete a la
 *   izquierda, sobre una veladura propia.
 * - `organica`: masa vegetal o acuática asimétrica; el texto ocupa una columna sobre fondo propio.
 * - `cinetica`: diagonal dominante y trazos de dirección; el texto acompaña el movimiento.
 *
 * La superposición texto-escena solo se aplica cuando la ficha mide ≥60rem (container query en
 * src/components/deity/DeityHero.astro); por debajo, la escena va arriba y el texto debajo.
 */

export type CompositionFamily = 'inmersion' | 'arquitectura' | 'monolito' | 'organica' | 'cinetica';

export type AmbientEffect =
  | 'caustics'
  | 'storm-light'
  | 'relief-sweep'
  | 'wheat'
  | 'precise-light'
  | 'light-bands'
  | 'canopy'
  | 'glint'
  | 'reflections'
  | 'forge'
  | 'wind'
  | 'leaf-shadow'
  | 'hearth';

export interface ScenePalette {
  /** Fondo más profundo de la escena. */
  deep: string;
  /** Masa media (piedra, nube, tierra, follaje). */
  mid: string;
  /** Luz principal sobre la materia. */
  light: string;
  /** Metal del objeto monumental (tono medio). */
  metal: string;
  /** Halo del foco de luz. */
  glow: string;
  /** Acento decorativo de la ficha (filetes, marcadores). Nunca texto pequeño. */
  accent: string;
}

export interface DeityTheme {
  id: string;
  family: CompositionFamily;
  /** Dirección artística en una frase. */
  direction: string;
  palette: ScenePalette;
  materials: readonly string[];
  /** Motivos de la escena (todos originales). */
  motifs: readonly string[];
  /** De dónde viene la luz y qué revela. */
  light: string;
  /** Punto de interés horizontal (0–1) para recortar la escena en escritorio y en móvil. */
  focus: { desktop: number; mobile: number };
  effect: {
    kind: AmbientEffect;
    /** Qué aporta el movimiento (función, no adorno). */
    purpose: string;
    /** Versión estática: lo que se ve sin JavaScript, fuera de pantalla o con movimiento reducido. */
    staticVersion: string;
  };
  /** Superficie del encabezado: `light` exige texto oscuro y anillo de foco oscuro. */
  surface: 'dark' | 'light';
  /** Pie de la escena: qué muestra la ilustración (siempre «escena original»). */
  caption: string;
}

export const DEITY_THEMES: Readonly<Record<string, DeityTheme>> = {
  zeus: {
    id: 'zeus',
    family: 'inmersion',
    direction: 'Cumbre de mármol bajo un frente de tormenta; el rayo suspendido en una luz atmosférica.',
    palette: { deep: '#0b0e14', mid: '#2a303b', light: '#d9d4c7', metal: '#b8954f', glow: '#efe3c2', accent: '#b8954f' },
    materials: ['mármol', 'nubes de tormenta', 'oro envejecido'],
    motifs: ['bancos de nubes', 'gradas de mármol', 'rayo de doble punta'],
    light: 'Claridad difusa que se abre detrás de las nubes y recorta el rayo.',
    focus: { desktop: 0.55, mobile: 0.68 },
    effect: {
      kind: 'storm-light',
      purpose: 'Las nubes derivan y la luz respira tras ellas: el cielo está vivo sin destellos.',
      staticVersion: 'Nubes y claridad fijas en su posición media.',
    },
    surface: 'dark',
    caption: 'rayo de oro envejecido sobre una cumbre de mármol en tormenta',
  },
  hera: {
    id: 'hera',
    family: 'arquitectura',
    direction: 'Pórtico ceremonial de piedra cálida; relieves en ritmo regular y un cetro axial.',
    palette: { deep: '#160f0c', mid: '#4a3426', light: '#cfb08a', metal: '#9a7444', glow: '#f0d3a0', accent: '#b0865a' },
    materials: ['piedra cálida', 'bronce'],
    motifs: ['friso de paneles con rosetas', 'columnata', 'cetro con remate de loto'],
    light: 'Luz rasante que barre el friso de izquierda a derecha.',
    focus: { desktop: 0.5, mobile: 0.5 },
    effect: {
      kind: 'relief-sweep',
      purpose: 'Un barrido lento de luz hace legible el relieve, como al recorrer el pórtico.',
      staticVersion: 'Luz rasante fija en el centro del friso.',
    },
    surface: 'dark',
    caption: 'cetro de bronce ante un pórtico ceremonial con friso ornamental',
  },
  poseidon: {
    id: 'poseidon',
    family: 'inmersion',
    direction: 'Profundidad abisal: piedra mojada, bronce oxidado y la luz del mar que se quiebra en el agua.',
    palette: { deep: '#03090e', mid: '#0b3343', light: '#7fc3c2', metal: '#4f7f73', glow: '#a6dcd6', accent: '#5f9f98' },
    materials: ['piedra mojada', 'bronce oxidado', 'agua profunda'],
    motifs: ['haces de luz desde la superficie', 'cáusticas', 'rocas del fondo', 'tridente monumental'],
    light: 'Desde la superficie, arriba a la derecha; las cáusticas recorren piedra y metal.',
    focus: { desktop: 0.5, mobile: 0.7 },
    effect: {
      kind: 'caustics',
      purpose: 'Cáusticas lentas, refracción y una ondulación leve: el agua se percibe sin partículas.',
      staticVersion: 'Red de cáusticas y haces de luz detenidos.',
    },
    surface: 'dark',
    caption: 'tridente de bronce oxidado en un fondo marino',
  },
  demeter: {
    id: 'demeter',
    family: 'organica',
    direction: 'Campo de cosecha al atardecer: tierra, trigo, piedra caliza y oro de mies.',
    palette: { deep: '#15110a', mid: '#4b3c1f', light: '#dcc99a', metal: '#c9a24a', glow: '#f3dc96', accent: '#c9a24a' },
    materials: ['tierra', 'trigo', 'piedra caliza', 'oro de mies'],
    motifs: ['espigas en primer plano', 'mojones de caliza', 'gavilla y cetro'],
    light: 'Sol bajo detrás del campo; sombras largas de las plantas.',
    focus: { desktop: 0.6, mobile: 0.68 },
    effect: {
      kind: 'wheat',
      purpose: 'Las espigas oscilan y sus sombras se desplazan: el campo respira con el viento.',
      staticVersion: 'Espigas erguidas y sombras quietas.',
    },
    surface: 'dark',
    caption: 'gavilla de trigo y cetro en un campo de cosecha',
  },
  athena: {
    id: 'athena',
    family: 'arquitectura',
    direction: 'Templo de piedra en geometría contenida; un haz preciso revela una lechuza de bronce.',
    palette: { deep: '#0e1012', mid: '#33383b', light: '#c3beb2', metal: '#8c6b43', glow: '#ece7da', accent: '#9aa08a' },
    materials: ['piedra de templo', 'bronce'],
    motifs: ['columnas estriadas', 'meandro', 'frontón', 'lechuza sobre plinto'],
    light: 'Un haz vertical de bordes nítidos desde el frontón, sin dispersión.',
    focus: { desktop: 0.5, mobile: 0.5 },
    effect: {
      kind: 'precise-light',
      purpose: 'El haz se abre una vez y revela la pieza; después solo respira, sin barridos.',
      staticVersion: 'Haz abierto y fijo sobre la lechuza.',
    },
    surface: 'dark',
    caption: 'lechuza de bronce en un templo de piedra',
  },
  apollo: {
    id: 'apollo',
    family: 'monolito',
    direction: 'Marfil cálido y ámbar: una cítara monumental atravesada por bandas de luz.',
    palette: { deep: '#1a130b', mid: '#6b5233', light: '#efe4cc', metal: '#c79a52', glow: '#ffe2a6', accent: '#c79a52' },
    materials: ['marfil cálido', 'ámbar', 'bronce dorado'],
    motifs: ['bandas de luz', 'gradas', 'cítara de siete cuerdas'],
    light: 'Bandas horizontales que entran por un vano; no es un disco solar.',
    focus: { desktop: 0.45, mobile: 0.7 },
    effect: {
      kind: 'light-bands',
      purpose: 'Las bandas se desplazan con lentitud sobre las cuerdas, como una vibración de luz.',
      staticVersion: 'Bandas fijas a media altura.',
    },
    surface: 'dark',
    caption: 'cítara monumental atravesada por bandas de luz',
  },
  artemis: {
    id: 'artemis',
    family: 'inmersion',
    direction: 'Bosque profundo bajo una luz de plata; el arco tendido entre los troncos.',
    palette: { deep: '#060d0a', mid: '#14281f', light: '#aebdba', metal: '#c8d0d2', glow: '#e1ebec', accent: '#9fb3ad' },
    materials: ['bosque profundo', 'plata'],
    motifs: ['troncos en tres planos', 'luna', 'luz entre el follaje', 'arco y aljaba'],
    light: 'Luz plateada que se filtra entre las copas en manchas.',
    focus: { desktop: 0.55, mobile: 0.85 },
    effect: {
      kind: 'canopy',
      purpose: 'Las manchas de luz se desplazan como bajo hojas movidas por el aire.',
      staticVersion: 'Manchas de luz fijas sobre el suelo del bosque.',
    },
    surface: 'dark',
    caption: 'arco y aljaba de plata en un bosque nocturno',
  },
  ares: {
    id: 'ares',
    family: 'monolito',
    direction: 'Hierro, piedra erosionada y rojo mineral; un casco y una lanza como un bloque frontal.',
    palette: { deep: '#0d0b0b', mid: '#2b2523', light: '#9a918a', metal: '#8f8a84', glow: '#e9ddd0', accent: '#a1452f' },
    materials: ['hierro', 'piedra erosionada', 'rojo mineral'],
    motifs: ['muro agrietado', 'estrato rojo', 'casco y lanza'],
    light: 'Luz lateral dura; un destello breve recorre el metal.',
    focus: { desktop: 0.45, mobile: 0.7 },
    effect: {
      kind: 'glint',
      purpose: 'Un destello metálico breve y espaciado; la escena aparece con una revelación firme.',
      staticVersion: 'Metal sin destello, iluminado de lado.',
    },
    surface: 'dark',
    caption: 'casco y lanza de hierro ante un muro erosionado',
  },
  aphrodite: {
    id: 'aphrodite',
    family: 'organica',
    direction: 'Mármol claro, nácar, cobre rosado y agua; una composición curva y luminosa.',
    palette: { deep: '#cbbcb4', mid: '#e3d6cf', light: '#f8f1ec', metal: '#a8664a', glow: '#fff8f3', accent: '#8a4f3a' },
    materials: ['mármol claro', 'nácar', 'cobre rosado', 'agua'],
    motifs: ['arcos de concha', 'espuma', 'velo que cae en pliegues'],
    light: 'Luz alta y suave; reflejos que vienen del agua.',
    focus: { desktop: 0.62, mobile: 0.62 },
    effect: {
      kind: 'reflections',
      purpose: 'Reflejos de agua ondulan sobre el mármol y el nácar cambia de brillo.',
      staticVersion: 'Reflejos fijos sobre la superficie clara.',
    },
    surface: 'light',
    caption: 'velo de cobre rosado sobre mármol, nácar y agua',
  },
  hephaestus: {
    id: 'hephaestus',
    family: 'monolito',
    direction: 'Basalto, cobre y calor: la fragua como única fuente de luz.',
    palette: { deep: '#0a0909', mid: '#221f1e', light: '#6d625a', metal: '#b06a3b', glow: '#ff9a4a', accent: '#c9783f' },
    materials: ['basalto', 'cobre', 'calor de fragua'],
    motifs: ['bloque de basalto', 'boca de la fragua', 'yunque, martillo y tenazas'],
    light: 'Resplandor localizado desde abajo; el resto queda en penumbra mineral.',
    focus: { desktop: 0.45, mobile: 0.7 },
    effect: {
      kind: 'forge',
      purpose: 'El resplandor de la fragua late de forma irregular y contenida; sin chispas ni partículas.',
      staticVersion: 'Resplandor fijo a media intensidad.',
    },
    surface: 'dark',
    caption: 'yunque, martillo y tenazas de cobre ante la fragua',
  },
  hermes: {
    id: 'hermes',
    family: 'cinetica',
    direction: 'Camino de piedra, aire azul y bronce; todo empuja en diagonal hacia el horizonte.',
    palette: { deep: '#0e1418', mid: '#3c4a54', light: '#a9c3d2', metal: '#a07c4c', glow: '#dce9f0', accent: '#86a7b8' },
    materials: ['piedra de camino', 'aire', 'bronce'],
    motifs: ['camino en perspectiva', 'mojones', 'trazos de viento', 'bastón y pétaso'],
    light: 'Cielo abierto y frío; luz que corre con el viento.',
    focus: { desktop: 0.55, mobile: 0.64 },
    effect: {
      kind: 'wind',
      purpose: 'Trazos de aire cruzan en diagonal: dirección y rapidez sin ruido.',
      staticVersion: 'Trazos de viento detenidos en diagonal.',
    },
    surface: 'dark',
    caption: 'bastón y pétaso de bronce sobre un camino de piedra',
  },
  dionysus: {
    id: 'dionysus',
    family: 'organica',
    direction: 'Vino profundo, hiedra y oro: una bóveda vegetal con luz lenta.',
    palette: { deep: '#11050a', mid: '#3e0f22', light: '#9a3550', metal: '#c49a4a', glow: '#f0cf86', accent: '#b8873f' },
    materials: ['vino profundo', 'hiedra', 'oro'],
    motifs: ['sarmientos y hiedra', 'racimos dorados', 'sombras de hojas'],
    light: 'Luz dorada lenta que se mueve entre las hojas.',
    focus: { desktop: 0.52, mobile: 0.6 },
    effect: {
      kind: 'leaf-shadow',
      purpose: 'Las sombras de hiedra se mecen y la luz se desplaza despacio, como en una pérgola.',
      staticVersion: 'Sombras de hojas quietas y luz fija.',
    },
    surface: 'dark',
    caption: 'sarmientos, hiedra y racimos dorados',
  },
  hestia: {
    id: 'hestia',
    family: 'arquitectura',
    direction: 'Un atrio de mármol en penumbra y, en el centro exacto, un fuego que no se apaga.',
    palette: { deep: '#120c0a', mid: '#4a3226', light: '#e8c9a8', metal: '#c98a4b', glow: '#ffcf9a', accent: '#e39a5c' },
    materials: ['mármol cálido', 'bronce', 'brasa'],
    motifs: ['columnas en penumbra', 'losas concéntricas', 'altar bajo', 'llama del hogar'],
    light: 'Toda la luz nace del fuego central y se apaga hacia las columnas.',
    focus: { desktop: 0.5, mobile: 0.5 },
    effect: {
      kind: 'hearth',
      purpose: 'El resplandor del hogar late despacio: el centro de la casa está vivo.',
      staticVersion: 'Resplandor fijo alrededor de la llama.',
    },
    surface: 'dark',
    caption: 'llama del hogar sobre un altar bajo, en un atrio de mármol',
  },
};

export function deityTheme(id: string): DeityTheme {
  const theme = DEITY_THEMES[id];
  if (theme === undefined) throw new Error(`Sin tema visual para "${id}" (src/config/deity-themes.ts).`);
  return theme;
}

/** Variables CSS de la paleta, para el encabezado y los acentos de la ficha. */
export function themeStyle(theme: DeityTheme): string {
  const { palette, focus } = theme;
  return [
    `--theme-deep: ${palette.deep}`,
    `--theme-mid: ${palette.mid}`,
    `--theme-light: ${palette.light}`,
    `--theme-metal: ${palette.metal}`,
    `--theme-glow: ${palette.glow}`,
    `--theme-accent: ${palette.accent}`,
    `--focus-x: ${focus.desktop}`,
    `--focus-x-mobile: ${focus.mobile}`,
  ].join('; ');
}
