/**
 * Escala del modo histórico del atlas (Phase 5): siglos que cruzan a. C./d. C. sin año 0.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { centuryScale, positionOf } from '../../src/lib/timeline/scale.ts';

describe('centuryScale', () => {
  test('un intervalo que cruza la era: marcas en 100 a. C., 1 d. C. y 100 d. C.', () => {
    const scale = centuryScale([{ start: -100, end: 100 }]);
    assert.ok(scale !== undefined);
    assert.deepEqual(
      scale.ticks.map((tick) => tick.label),
      ['100 a. C.', '1 d. C.', '100 d. C.'],
    );
    assert.ok(scale.ticks.every((tick) => tick.year !== 0));
    // Ordinales contiguos: de 100 a. C. (−99) a 100 d. C. (100) hay 199 años.
    assert.equal(scale.max - scale.min, 199);
  });

  test('posiciones proporcionales a los años transcurridos', () => {
    const scale = centuryScale([{ start: -100, end: 100 }]);
    assert.ok(scale !== undefined);
    assert.equal(positionOf(-100, scale, 199), 0);
    assert.equal(positionOf(100, scale, 199), 199);
    // 1 a. C. y 1 d. C. son contiguos: un año de distancia.
    assert.ok(Math.abs(positionOf(1, scale, 199) - positionOf(-1, scale, 199) - 1) < 1e-9);
  });

  test('los intervalos de los objetos del capítulo: de 600 a. C. a 100 d. C.', () => {
    const scale = centuryScale([
      { start: -550, end: -526 },
      { start: -530, end: -530 },
      { start: -300, end: -201 },
      { start: -100, end: 100 },
    ]);
    assert.ok(scale !== undefined);
    assert.deepEqual(
      scale.ticks.map((tick) => tick.year),
      [-600, -500, -400, -300, -200, -100, 1, 100],
    );
  });

  test('solo antes de Cristo: termina en el siglo que cubre el intervalo', () => {
    const scale = centuryScale([{ start: -540, end: -520 }]);
    assert.deepEqual(
      scale?.ticks.map((tick) => tick.label),
      ['600 a. C.', '500 a. C.'],
    );
  });

  test('un año exactamente en una marca amplía la escala hacia atrás', () => {
    const scale = centuryScale([{ start: -500, end: -500 }]);
    assert.deepEqual(
      scale?.ticks.map((tick) => tick.year),
      [-600, -500],
    );
  });

  test('vacío o intervalo invertido', () => {
    assert.equal(centuryScale([]), undefined);
    assert.throws(() => centuryScale([{ start: 100, end: -100 }]), /invertido/);
    assert.throws(() => centuryScale([{ start: 0, end: 10 }]), /0/);
  });
});
