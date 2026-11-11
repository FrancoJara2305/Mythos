import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  formatHistoricalYear,
  fromScaleOrdinal,
  historicalYearSchema,
  scaleSpan,
  toScaleOrdinal,
} from '../../src/lib/content/dates.ts';
import { schemas } from './fixtures.ts';

const catalogueBasis = [{ kind: 'catalogue', url: 'https://example.org/o', title: 'Objeto', authorOrInstitution: 'Museo', checkedAt: '2026-11-08' }];
const range = (start: number, end: number) => ({
  kind: 'range', start, end, label: 'rango de prueba', precision: 'century', basis: 'Ficha.', evidence: catalogueBasis,
});
const sourceWith = (compositionDate: unknown) => ({
  title: 'Obra',
  attribution: { name: 'Anónimo', status: 'anonymous', note: 'Nota.' },
  compositionDate,
  editions: [{ id: 'grc', editor: 'E', language: 'grc', title: 'T', publisher: 'P', year: 1914, url: 'https://example.org/tei',
    rights: { status: 'unverified', licenseName: 'L', creator: 'C', sourceUrl: 'https://example.org/tei', creditLine: 'C', modifications: [] } }],
  passages: [{ id: 'p', editionId: 'grc', locator: { lineStart: 1, display: '1', scheme: 'line' }, canonicalUrl: 'https://example.org/p', summary: 'S' }],
  review: { status: 'draft' },
});

describe('años históricos', () => {
  test('el año 0 no existe', () => {
    assert.equal(historicalYearSchema.safeParse(0).success, false);
    assert.throws(() => toScaleOrdinal(0), RangeError);
    assert.throws(() => formatHistoricalYear(0), RangeError);
  });

  test('solo enteros', () => {
    assert.equal(historicalYearSchema.safeParse(-530.5).success, false);
    assert.equal(historicalYearSchema.safeParse(-530).success, true);
  });

  test('1 a. C. y 1 d. C. son contiguos en la escala', () => {
    assert.equal(toScaleOrdinal(-1), 0);
    assert.equal(toScaleOrdinal(1), 1);
    assert.equal(scaleSpan(-1, 1), 1);
    assert.equal(scaleSpan(-100, 100), 199);
  });

  test('la conversión es reversible y nunca produce un año 0', () => {
    for (const year of [-753, -101, -100, -1, 1, 2, 100, 1914]) {
      assert.equal(fromScaleOrdinal(toScaleOrdinal(year)), year);
    }
    for (let ordinal = -5; ordinal <= 5; ordinal += 1) assert.notEqual(fromScaleOrdinal(ordinal), 0);
  });

  test('formato sin «0»', () => {
    assert.equal(formatHistoricalYear(-530), '530 a. C.');
    assert.equal(formatHistoricalYear(-1), '1 a. C.');
    assert.equal(formatHistoricalYear(1), '1 d. C.');
  });
});

describe('HistoricalDate en registros', () => {
  test('rango válido, incluso cruzando el cambio de era', () => {
    assert.equal(schemas.sources.safeParse(sourceWith(range(-100, 100))).success, true);
    assert.equal(schemas.sources.safeParse(sourceWith(range(-530, -530))).success, true);
  });

  test('rango invertido falla', () => {
    const result = schemas.sources.safeParse(sourceWith(range(-200, -300)));
    assert.equal(result.success, false);
    assert.match(JSON.stringify(result.error?.issues), /Rango invertido/);
  });

  test('año 0 en start o end falla', () => {
    assert.equal(schemas.sources.safeParse(sourceWith(range(0, 100))).success, false);
    assert.equal(schemas.sources.safeParse(sourceWith(range(-100, 0))).success, false);
  });

  test('un rango exige precisión, base y evidencia', () => {
    const { precision: _precision, ...withoutPrecision } = range(-100, 100);
    assert.equal(schemas.sources.safeParse(sourceWith(withoutPrecision)).success, false);
    assert.equal(schemas.sources.safeParse(sourceWith({ ...range(-100, 100), evidence: [] })).success, false);
  });

  test('desconocido no se transforma en año 0 ni admite años', () => {
    const parsed = schemas.sources.parse(sourceWith({ kind: 'unknown', label: 'Datación en revisión.' }));
    assert.deepEqual(parsed.compositionDate, { kind: 'unknown', label: 'Datación en revisión.' });
    assert.equal(schemas.sources.safeParse(sourceWith({ kind: 'unknown', label: 'x', start: 0 })).success, false);
  });
});
