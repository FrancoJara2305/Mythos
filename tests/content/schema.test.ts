import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { rawArchive, schemas } from './fixtures.ts';

const clone = <T>(value: T): T => structuredClone(value);
const raw = rawArchive();

function failsWith(result: { success: boolean; error?: { issues: unknown[] } | undefined }, pattern: RegExp) {
  assert.equal(result.success, false, 'se esperaba un error de esquema');
  assert.match(JSON.stringify(result.error?.issues), pattern);
}

describe('esquemas: forma de los registros', () => {
  test('el archivo de prueba es válido', () => {
    for (const [collection, entries] of Object.entries(raw)) {
      for (const [id, data] of Object.entries(entries)) {
        const result = schemas[collection as keyof typeof schemas].safeParse(data);
        assert.equal(result.success, true, `${collection}/${id}: ${JSON.stringify(result.error?.issues)}`);
      }
    }
  });

  test('reference() devuelve { collection, id }', () => {
    const parsed = schemas.relationships.parse(raw.relationships['cronus-parent-of-zeus']);
    assert.deepEqual(parsed.subject, { collection: 'deities', id: 'cronus' });
    assert.deepEqual(parsed.evidence[0]?.source, { collection: 'sources', id: 'theogony' });
  });

  test('published y reviewed exigen reviewer y reviewedAt (no se inventan revisiones)', () => {
    const deity = clone(raw.deities.zeus);
    deity.review = { status: 'published' };
    failsWith(schemas.deities.safeParse(deity), /reviewer es obligatorio/);
    deity.review = { status: 'reviewed', reviewer: 'Revisora' };
    failsWith(schemas.deities.safeParse(deity), /reviewedAt es obligatorio/);
  });

  test('perfil full: campos obligatorios, al menos un epíteto y un dominio o símbolo', () => {
    const deity = clone(raw.deities.zeus);
    delete deity.greekName;
    failsWith(schemas.deities.safeParse(deity), /greekName es obligatorio/);
    const bare = { ...clone(raw.deities.zeus), epithets: [], symbols: [] };
    failsWith(schemas.deities.safeParse(bare), /al menos un epíteto/);
    failsWith(schemas.deities.safeParse(bare), /dominio o símbolo/);
  });

  test('perfil context no exige ficha completa', () => {
    assert.equal(schemas.deities.safeParse(raw.deities.hestia).success, true);
  });

  test('greekName debe estar en griego', () => {
    failsWith(schemas.deities.safeParse({ ...clone(raw.deities.zeus), greekName: 'Zeus' }), /en griego/);
  });

  test('las listas de evidencia exigidas no pueden estar vacías', () => {
    failsWith(schemas.relationships.safeParse({ ...clone(raw.relationships['cronus-parent-of-zeus']), evidence: [] }), /evidence/);
    failsWith(schemas.myths.safeParse({ ...clone(raw.myths['assembly-of-gods']), evidence: [] }), /evidence/);
  });

  test('campos desconocidos se rechazan (objetos estrictos)', () => {
    failsWith(schemas.deities.safeParse({ ...clone(raw.deities.zeus), parents: ['cronus'] }), /parents/);
  });

  test('un evento mítico no admite fechas', () => {
    failsWith(schemas['timeline-events'].safeParse({ ...clone(raw['timeline-events'].first), start: -700 }), /start/);
  });

  test('evento histórico: la faceta corresponde a la colección', () => {
    const event = { ...clone(raw['timeline-events']['relief-production']), facet: 'composition' };
    failsWith(schemas['timeline-events'].safeParse(event), /composition corresponde a sources/);
  });

  test('variantGroup y variantOption van juntos', () => {
    const edge = clone(raw.relationships['zeus-parent-of-aphrodite-iliadic']);
    delete edge.variantOption;
    failsWith(schemas.relationships.safeParse(edge), /deben indicarse juntos/);
  });

  test('localizador: rango invertido y esquema incoherente fallan', () => {
    const source = clone(raw.sources.theogony);
    const passages = source.passages as Record<string, unknown>[];
    passages[0] = { ...passages[0], locator: { lineStart: 458, lineEnd: 453, display: 'x', scheme: 'line' } };
    failsWith(schemas.sources.safeParse(source), /Rango de versos invertido/);
    passages[0] = { ...passages[0], locator: { lineStart: 1, display: 'x', scheme: 'book.line' } };
    failsWith(schemas.sources.safeParse(source), /book es obligatorio/);
  });

  test('derechos verified exigen licencia, fecha y evidencia', () => {
    const source = clone(raw.sources.theogony);
    const editions = source.editions as Record<string, Record<string, unknown>>[];
    editions[0] = { ...editions[0], rights: { ...editions[0]?.rights, status: 'verified' } };
    failsWith(schemas.sources.safeParse(source), /evidencePath es obligatorio/);
  });

  test('IDs internos en kebab-case ASCII', () => {
    const source = clone(raw.sources.theogony);
    (source.passages as Record<string, unknown>[])[0]!.id = 'Pasaje 1';
    failsWith(schemas.sources.safeParse(source), /ID inválido/);
  });

  test('solo URLs https', () => {
    failsWith(schemas.artifacts.safeParse({ ...clone(raw.artifacts.relief), catalogueUrl: 'http://example.org/relief' }), /catalogueUrl/);
  });
});
