/**
 * Adaptadores de build de Phase 5 sobre el archivo de prueba: datos mínimos del explorador
 * genealógico y entradas del atlas (dos temporalidades separadas).
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { genealogyData, serializeForScript } from '../../src/lib/genealogy/build-data.ts';
import { historicalEntries, narrativeSequences } from '../../src/lib/timeline/entries.ts';
import { parseArchive, rawArchive, ROSTER, selection } from './fixtures.ts';

const archive = parseArchive(rawArchive());
const chapter = selection();

describe('genealogyData', () => {
  const data = genealogyData(archive, chapter);

  test('solo parentescos y uniones, con citas resueltas a pasajes', () => {
    assert.equal(data.edges.length, 6);
    assert.ok(data.edges.every((edge) => edge.kind === 'parent-of' || edge.kind === 'consort-of'));
    const edge = data.edges.find((item) => item.id === 'cronus-parent-of-zeus');
    assert.deepEqual(edge?.citations, [{ label: 'Teog. 453–458', href: '/sources/theogony/#p-genealogy' }]);
    assert.equal(edge?.certainty, 'explícita');
  });

  test('roster en orden, figura inicial y grupos de variantes con su opción por defecto', () => {
    assert.deepEqual(data.roster, ROSTER);
    assert.equal(data.defaultFocus, 'zeus');
    assert.deepEqual(data.groups, [
      {
        id: 'aphrodite-origin',
        label: 'Origen de Afrodita',
        options: [
          { id: 'hesiodic', label: 'Teogonía' },
          { id: 'iliadic', label: 'Ilíada' },
        ],
        defaultOption: 'hesiodic',
      },
    ]);
  });

  test('entidades: las del roster y las de alguna relación; ficha solo para perfiles completos', () => {
    const uranus = data.entities.find((entity) => entity.id === 'uranus');
    assert.deepEqual(uranus, { id: 'uranus', name: 'Urano', profile: 'context', href: undefined });
    assert.equal(data.entities.find((entity) => entity.id === 'zeus')?.href, '/deities/zeus/');
    assert.equal(data.entities.some((entity) => entity.id === 'hestia'), false, 'Hestia no tiene relaciones en los fixtures');
  });

  test('el JSON incrustado no puede cerrar su etiqueta', () => {
    const json = serializeForScript({ text: '</script><script>alert(1)</script>' });
    assert.ok(!json.includes('<'));
    assert.deepEqual(JSON.parse(json), { text: '</script><script>alert(1)</script>' });
  });
});

describe('atlas', () => {
  test('relatos: secuencia en orden editorial y «después» solo con evidencia', () => {
    const [sequence, ...rest] = narrativeSequences(archive, ROSTER);
    assert.equal(rest.length, 0);
    assert.equal(sequence?.id, 'succession');
    assert.deepEqual(
      sequence?.events.map((event) => event.id),
      ['first', 'second'],
    );
    assert.deepEqual(sequence?.connectors, [{ from: 'first', to: 'second' }]);
    assert.equal(sequence?.events[0]?.myth?.href, '/deities/zeus/#relato-assembly-of-gods');
    assert.equal(sequence?.events[1]?.after[0]?.citations[0]?.href, '/sources/theogony/#p-genealogy');
  });

  test('testimonios: el intervalo se lee del objeto y el filtro usa sus identificaciones', () => {
    const [entry, ...rest] = historicalEntries(archive);
    assert.equal(rest.length, 0);
    assert.equal(entry?.facet, 'object-production');
    assert.deepEqual(entry?.date.kind === 'range' ? [entry.date.start, entry.date.end] : [], [-100, 100]);
    assert.deepEqual(entry?.entities, ['hestia', 'zeus']);
    assert.equal(entry?.subject.href, '/artifacts/relief/');
  });

  test('las dos temporalidades no comparten entradas', () => {
    const narrative = narrativeSequences(archive, ROSTER).flatMap((sequence) => sequence.events.map((event) => event.id));
    const historical = historicalEntries(archive).map((entry) => entry.id);
    assert.equal(
      narrative.filter((id) => historical.includes(id)).length,
      0,
    );
  });
});
