/**
 * Modelo del Planetario de Constelaciones (src/lib/planetarium/model.ts): datos que viajan a la isla,
 * asientos y tradiciones (Dioniso ↔ Hestia), coherencia del estado, recorrido anterior/siguiente,
 * estado en el fragmento (lectura, escritura e ida y vuelta) y figura SVG de respaldo.
 *
 * Los datos son sintéticos: tres asientos, el tercero variable. Una última prueba usa la selección
 * real del Dodekatheon para comprobar los doce asientos con su único asiento variable.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DODEKATHEON, type ChapterSelection } from '../../src/config/chapters.ts';
import {
  activeSeats,
  ALT_TRADITION_PARAM,
  constellationSvg,
  DEFAULT_STATE,
  parseState,
  planetariumData,
  reconcile,
  seatOf,
  serializeState,
  STAR_FACETS,
  step,
  switchTradition,
  traditionOf,
  type PlanetariumData,
  type PlanetariumState,
  type StarFacet,
} from '../../src/lib/planetarium/model.ts';
import type { ArchiveData, ConstellationConfig } from '../../src/types/content.ts';

/** Constelación mínima válida: cuatro estrellas, una por faceta, en las esquinas. */
const constellation = (position: [number, number, number], color = '#fde047'): ConstellationConfig => ({
  position,
  color,
  shape: 'Figura de prueba',
  stars: [
    { x: -0.8, y: 0.8, z: 0, magnitude: 0.9, facet: 'origin' },
    { x: 0.8, y: 0.8, z: 0, magnitude: 0.7, facet: 'tales' },
    { x: 0.8, y: -0.8, z: 0, magnitude: 0.6, facet: 'domains' },
    { x: -0.8, y: -0.8, z: 0, magnitude: 0.5, facet: 'names' },
    { x: 0, y: 0, z: 0, magnitude: 0.3 },
  ],
  links: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ],
});

/**
 * Archivo visible mínimo: el modelo solo lee `deities` (nombre y constelación), así que el resto de
 * colecciones van vacías y la conversión de tipo se limita a esta función.
 */
function archive(deities: Record<string, ConstellationConfig | undefined>): ArchiveData {
  return {
    deities: Object.entries(deities).map(([id, constellationConfig]) => ({ id, data: { name: `Nombre de ${id}`, constellationConfig } })),
    myths: [],
    sources: [],
    artifacts: [],
    relationships: [],
    'timeline-events': [],
  } as unknown as ArchiveData;
}

const emblem = { symbol: 'Símbolo', depicts: 'símbolo' };

/** Tres asientos (el roster va desordenado a propósito); el tercero alterna con «hogar». */
const SELECTION: ChapterSelection = {
  chapterId: 'prueba',
  roster: [
    { id: 'vino', order: 3, emblem },
    { id: 'rayo', order: 1, emblem },
    { id: 'mar', order: 2, emblem },
  ],
  contextual: [],
  alternatives: [
    {
      id: 'relieve',
      label: 'Selección con hogar',
      without: 'vino',
      with: 'hogar',
      emblem,
      traditions: { without: 'Tradición del vino', with: 'Tradición del hogar' },
      evidenceArtifactId: 'relieve',
      note: 'Nota.',
    },
  ],
  defaultVariants: {},
  variantLabels: {},
};

const FULL = archive({
  rayo: constellation([0, 0, -2]),
  mar: constellation([3, 4, 0]),
  vino: constellation([0, 0, 5]),
  hogar: constellation([0, 0, 5], '#f97316'),
});
const DATA: PlanetariumData = planetariumData(FULL, SELECTION);

const state = (focus: string | null, facet: StarFacet | null = null, tradition: PlanetariumState['tradition'] = 'main'): PlanetariumState => ({
  focus,
  facet,
  tradition,
});

describe('planetariumData', () => {
  test('asientos en el orden editorial, con el asiento variable y los rótulos del interruptor', () => {
    assert.deepEqual(DATA.seats, [{ main: 'rayo' }, { main: 'mar' }, { main: 'vino', alt: 'hogar' }]);
    assert.deepEqual(DATA.traditions, { main: 'Tradición del vino', alt: 'Tradición del hogar' });
    assert.deepEqual(Object.keys(DATA.deities).sort(), ['hogar', 'mar', 'rayo', 'vino']);
  });

  test('la dirección se normaliza a un vector unitario y la figura conserva estrellas, enlaces y color', () => {
    const mar = DATA.deities.mar;
    assert.ok(mar !== undefined);
    assert.deepEqual(mar.direction, [0.6, 0.8, 0]);
    assert.deepEqual(DATA.deities.rayo?.direction, [0, 0, -1]);
    assert.equal(mar.name, 'Nombre de mar');
    assert.equal(mar.stars.length, 5);
    assert.deepEqual(
      mar.stars.filter((star) => star.facet !== undefined).map((star) => star.facet),
      [...STAR_FACETS],
    );
    assert.deepEqual(mar.links, [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ]);
    assert.equal(DATA.deities.hogar?.color, '#f97316');
  });

  test('una deidad del roster sin constelación detiene el build', () => {
    assert.throws(() => planetariumData(archive({ rayo: constellation([0, 0, 1]), mar: undefined, vino: constellation([0, 0, 1]) }), SELECTION), /"mar" no tiene constelación/);
  });

  test('si la otra tradición no es visible en el ambiente, el asiento es fijo y no hay interruptor', () => {
    const data = planetariumData(archive({ rayo: constellation([0, 0, 1]), mar: constellation([1, 0, 0]), vino: constellation([0, 1, 0]) }), SELECTION);
    assert.deepEqual(data.seats, [{ main: 'rayo' }, { main: 'mar' }, { main: 'vino' }]);
    assert.equal(data.traditions, undefined);
    assert.equal(data.deities.hogar, undefined);
  });

  test('con la selección real del Dodekatheon: doce asientos y solo Dioniso ↔ Hestia varía', () => {
    const ids = [...DODEKATHEON.roster.map((item) => item.id), ...DODEKATHEON.alternatives.map((item) => item.with)];
    const data = planetariumData(archive(Object.fromEntries(ids.map((id, index) => [id, constellation([Math.cos(index), 0, Math.sin(index)])]))), DODEKATHEON);
    assert.equal(data.seats.length, 12);
    assert.deepEqual(
      data.seats.filter((seat) => seat.alt !== undefined),
      [{ main: 'dionysus', alt: 'hestia' }],
    );
    assert.equal(data.seats[0]?.main, 'zeus');
    assert.deepEqual(data.traditions, { main: 'Tradición Dionisíaca: Dioniso', alt: 'Tradición del Hogar Sagrado: Hestia' });
  });
});

describe('asientos y tradiciones', () => {
  test('activeSeats: cada tradición muestra a un solo ocupante del asiento variable', () => {
    assert.deepEqual(activeSeats(DATA, 'main'), ['rayo', 'mar', 'vino']);
    assert.deepEqual(activeSeats(DATA, 'alt'), ['rayo', 'mar', 'hogar']);
  });

  test('seatOf encuentra el asiento de ambos ocupantes; -1 si la deidad no está en la bóveda', () => {
    assert.equal(seatOf(DATA, 'rayo'), 0);
    assert.equal(seatOf(DATA, 'vino'), 2);
    assert.equal(seatOf(DATA, 'hogar'), 2);
    assert.equal(seatOf(DATA, 'cronus'), -1);
  });

  test('traditionOf: solo los ocupantes del asiento variable exigen una tradición', () => {
    assert.equal(traditionOf(DATA, 'vino'), 'main');
    assert.equal(traditionOf(DATA, 'hogar'), 'alt');
    assert.equal(traditionOf(DATA, 'rayo'), undefined);
    assert.equal(traditionOf(DATA, 'cronus'), undefined);
  });
});

describe('reconcile', () => {
  test('una deidad desconocida vuelve a la vista general y sin foco no hay faceta', () => {
    assert.deepEqual(reconcile(DATA, state('cronus', 'tales')), DEFAULT_STATE);
    assert.deepEqual(reconcile(DATA, state(null, 'tales')), DEFAULT_STATE);
  });

  test('enfocar a un ocupante del asiento variable activa su tradición', () => {
    assert.deepEqual(reconcile(DATA, state('hogar', 'names', 'main')), state('hogar', 'names', 'alt'));
    assert.deepEqual(reconcile(DATA, state('vino', null, 'alt')), state('vino', null, 'main'));
  });

  test('una deidad de asiento fijo conserva la tradición pedida', () => {
    assert.deepEqual(reconcile(DATA, state('rayo', 'origin', 'alt')), state('rayo', 'origin', 'alt'));
    assert.deepEqual(reconcile(DATA, state(null, null, 'alt')), state(null, null, 'alt'));
  });

  test('sin otra tradición visible, la tradición alternativa no puede activarse', () => {
    const fixed = planetariumData(archive({ rayo: constellation([0, 0, 1]), mar: constellation([1, 0, 0]), vino: constellation([0, 1, 0]) }), SELECTION);
    assert.deepEqual(reconcile(fixed, state(null, null, 'alt')), DEFAULT_STATE);
    assert.deepEqual(reconcile(fixed, state('rayo', null, 'alt')), state('rayo'));
  });
});

describe('switchTradition', () => {
  test('en la vista general solo cambia la tradición', () => {
    assert.deepEqual(switchTradition(DATA, DEFAULT_STATE, 'alt'), state(null, null, 'alt'));
  });

  test('con el asiento variable enfocado, el foco pasa a su otro ocupante y conserva la faceta', () => {
    assert.deepEqual(switchTradition(DATA, state('vino', 'tales'), 'alt'), state('hogar', 'tales', 'alt'));
    assert.deepEqual(switchTradition(DATA, state('hogar', 'names', 'alt'), 'main'), state('vino', 'names', 'main'));
  });

  test('con un asiento fijo enfocado, el foco se queda donde está', () => {
    assert.deepEqual(switchTradition(DATA, state('mar', 'domains'), 'alt'), state('mar', 'domains', 'alt'));
  });

  test('sin otra tradición visible, siempre queda la principal', () => {
    const fixed = planetariumData(archive({ rayo: constellation([0, 0, 1]), mar: constellation([1, 0, 0]), vino: constellation([0, 1, 0]) }), SELECTION);
    assert.deepEqual(switchTradition(fixed, state('vino'), 'alt'), state('vino'));
  });
});

describe('step (anterior / siguiente)', () => {
  test('desde la vista general: «siguiente» lleva a la primera y «anterior» a la última', () => {
    assert.equal(step(DATA, DEFAULT_STATE, 1), 'rayo');
    assert.equal(step(DATA, DEFAULT_STATE, -1), 'vino');
    assert.equal(step(DATA, state(null, null, 'alt'), -1), 'hogar');
  });

  test('recorre los asientos en orden y de forma circular, en la tradición activa', () => {
    assert.equal(step(DATA, state('rayo'), 1), 'mar');
    assert.equal(step(DATA, state('mar'), 1), 'vino');
    assert.equal(step(DATA, state('vino'), 1), 'rayo');
    assert.equal(step(DATA, state('rayo'), -1), 'vino');
    assert.equal(step(DATA, state('mar', null, 'alt'), 1), 'hogar');
    assert.equal(step(DATA, state('hogar', null, 'alt'), 1), 'rayo');
  });
});

describe('estado en el fragmento', () => {
  test('lee deidad, faceta y tradición', () => {
    assert.deepEqual(parseState(DATA, '#dios=mar&faceta=tales'), state('mar', 'tales'));
    assert.deepEqual(parseState(DATA, `#tradicion=${ALT_TRADITION_PARAM}`), state(null, null, 'alt'));
    assert.deepEqual(parseState(DATA, 'dios=rayo'), state('rayo'), 'también sin almohadilla');
  });

  test('un enlace a la otra tradición la activa aunque el fragmento no la nombre', () => {
    assert.deepEqual(parseState(DATA, '#dios=hogar&faceta=names'), state('hogar', 'names', 'alt'));
  });

  test('acepta el ancla de la lista estática (`#constelacion-…`)', () => {
    assert.deepEqual(parseState(DATA, '#constelacion-mar'), state('mar'));
    assert.deepEqual(parseState(DATA, '#constelacion-hogar'), state('hogar', null, 'alt'));
  });

  test('lo desconocido se ignora y deja la vista general', () => {
    assert.deepEqual(parseState(DATA, ''), DEFAULT_STATE);
    assert.deepEqual(parseState(DATA, '#'), DEFAULT_STATE);
    assert.deepEqual(parseState(DATA, '#dos-tradiciones'), DEFAULT_STATE, 'un ancla ajena a la bóveda');
    assert.deepEqual(parseState(DATA, '#constelacion-cronus'), DEFAULT_STATE);
    assert.deepEqual(parseState(DATA, '#dios=cronus&faceta=nada'), DEFAULT_STATE);
    assert.deepEqual(parseState(DATA, '#dios=mar&faceta=nada'), state('mar'), 'faceta inválida');
    assert.deepEqual(parseState(DATA, '#faceta=tales'), DEFAULT_STATE, 'faceta sin deidad');
    assert.deepEqual(parseState(DATA, '#tradicion=vino'), DEFAULT_STATE, 'valor de tradición desconocido');
  });

  test('un fragmento con codificación inválida se ignora en lugar de lanzar un error', () => {
    assert.deepEqual(parseState(DATA, '#dios=%E0'), DEFAULT_STATE);
    assert.deepEqual(parseState(DATA, '#%'), DEFAULT_STATE);
  });

  test('acepta un fragmento codificado por el navegador', () => {
    assert.deepEqual(parseState(DATA, '#dios%3Dmar%26faceta%3Ddomains'), state('mar', 'domains'));
  });

  test('escribe solo lo que difiere del estado por defecto', () => {
    assert.equal(serializeState(DATA, DEFAULT_STATE), '');
    assert.equal(serializeState(DATA, state('mar')), '#dios=mar');
    assert.equal(serializeState(DATA, state('mar', 'tales')), '#dios=mar&faceta=tales');
    assert.equal(serializeState(DATA, state(null, 'tales')), '', 'sin foco, la faceta no se escribe');
    assert.equal(serializeState(DATA, state(null, null, 'alt')), `#tradicion=${ALT_TRADITION_PARAM}`);
    assert.equal(serializeState(DATA, state('rayo', null, 'alt')), `#dios=rayo&tradicion=${ALT_TRADITION_PARAM}`);
  });

  test('la tradición no se escribe cuando la deidad enfocada ya la implica', () => {
    assert.equal(serializeState(DATA, state('hogar', 'names', 'alt')), '#dios=hogar&faceta=names');
  });

  test('ida y vuelta: leer lo escrito devuelve el mismo estado coherente', () => {
    const foci = [null, 'rayo', 'mar', 'vino', 'hogar'];
    const facets: (StarFacet | null)[] = [null, ...STAR_FACETS];
    for (const focus of foci) {
      for (const facet of facets) {
        for (const tradition of ['main', 'alt'] as const) {
          const coherent = reconcile(DATA, state(focus, facet, tradition));
          assert.deepEqual(parseState(DATA, serializeState(DATA, coherent)), coherent, JSON.stringify(coherent));
        }
      }
    }
  });
});

describe('constellationSvg', () => {
  const svg = constellationSvg(DATA.deities.mar as NonNullable<(typeof DATA.deities)['mar']>);

  test('un trazo por enlace, en coordenadas de pantalla (y hacia abajo)', () => {
    const path = /<path d="([^"]*)"/.exec(svg)?.[1] ?? '';
    assert.equal(path.split('M').filter(Boolean).length, 4);
    assert.ok(path.startsWith('M-80 -80L80 -80'), path);
  });

  test('cada estrella con su halo y un punto blanco solo en las cuatro de faceta', () => {
    assert.equal((svg.match(/opacity="0.16"/g) ?? []).length, 5);
    assert.equal((svg.match(/fill="#fff"/g) ?? []).length, 4);
  });

  test('decorativa, con el color de la figura y la clase pedida', () => {
    assert.match(svg, /^<svg class="constellation-figure" viewBox="-125 -125 250 250" aria-hidden="true" focusable="false">/);
    assert.match(svg, /stroke="#fde047"/);
    assert.match(constellationSvg(DATA.deities.mar as NonNullable<(typeof DATA.deities)['mar']>, 'mini'), /^<svg class="mini"/);
  });

  test('un enlace a una estrella inexistente se omite en lugar de dibujar NaN', () => {
    const broken = constellationSvg({ color: '#fff', stars: [{ x: 0, y: 0, z: 0, magnitude: 0.5 }], links: [[0, 3]] });
    assert.doesNotMatch(broken, /NaN|undefined/);
    assert.match(broken, /<path d=""/);
  });
});
