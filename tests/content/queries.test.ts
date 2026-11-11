/**
 * Consultas de build de Phase 3–4 sobre el archivo de prueba: variantes que nunca se mezclan,
 * agregado de la ficha (`getDeityArchive`) y retroenlaces de pasajes.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { profileIds } from '../../src/config/chapters.ts';
import { passageBacklinks } from '../../src/lib/content/backlinks.ts';
import { PassageIndex } from '../../src/lib/content/citations.ts';
import { getDeityArchive } from '../../src/lib/content/deity-archive.ts';
import { childrenOf, consortsOf, edgeVisible, parentsOf, variantGroupsFor, variantOptions } from '../../src/lib/content/queries.ts';
import { parseArchive, rawArchive, selection } from './fixtures.ts';

const archive = parseArchive(rawArchive());
const chapter = selection();
const ids = (items: readonly { id: string }[]) => items.map((item) => item.id);

describe('variantes', () => {
  test('una arista sin grupo se ve siempre; con grupo, solo en su opción', () => {
    const plain = archive.relationships.find((entry) => entry.id === 'cronus-parent-of-zeus')?.data;
    const varied = archive.relationships.find((entry) => entry.id === 'zeus-parent-of-aphrodite-iliadic')?.data;
    assert.ok(plain !== undefined && varied !== undefined);
    assert.equal(edgeVisible(plain, {}), true);
    assert.equal(edgeVisible(varied, {}), false);
    assert.equal(edgeVisible(varied, { 'aphrodite-origin': 'hesiodic' }), false);
    assert.equal(edgeVisible(varied, { 'aphrodite-origin': 'iliadic' }), true);
  });

  test('cada opción da su propia filiación de Afrodita, sin mezclar tradiciones', () => {
    assert.deepEqual(ids(parentsOf(archive, 'aphrodite', { 'aphrodite-origin': 'hesiodic' })), ['uranus']);
    assert.deepEqual(ids(parentsOf(archive, 'aphrodite', { 'aphrodite-origin': 'iliadic' })), ['zeus', 'dione']);
    assert.deepEqual(ids(parentsOf(archive, 'aphrodite', {})), []);
    assert.deepEqual(variantGroupsFor(archive, 'aphrodite'), ['aphrodite-origin']);
    assert.deepEqual(variantOptions(archive, 'aphrodite-origin'), ['hesiodic', 'iliadic']);
  });

  test('la descendencia también respeta la opción', () => {
    assert.deepEqual(ids(childrenOf(archive, 'zeus', chapter.defaultVariants)), []);
    assert.deepEqual(ids(childrenOf(archive, 'zeus', { 'aphrodite-origin': 'iliadic' })), ['aphrodite']);
  });

  test('las uniones se encuentran desde ambos extremos', () => {
    assert.deepEqual(ids(consortsOf(archive, 'zeus', {})), ['hera']);
    assert.deepEqual(ids(consortsOf(archive, 'hera', {})), ['zeus']);
  });
});

describe('getDeityArchive', () => {
  test('Afrodita: filiación por defecto y dos opciones separadas', () => {
    const aphrodite = getDeityArchive(archive, 'aphrodite', chapter);
    assert.deepEqual(ids(aphrodite.parents), ['uranus']);
    assert.equal(aphrodite.variants.length, 1);
    const [group] = aphrodite.variants;
    assert.equal(group?.label, 'Origen de Afrodita');
    assert.deepEqual(
      group?.options.map((option) => [option.label, option.isDefault, ids(option.parents)]),
      [
        ['Teogonía', true, ['uranus']],
        ['Ilíada', false, ['zeus', 'dione']],
      ],
    );
    for (const option of group?.options ?? []) {
      const parents = ids(option.parents);
      assert.ok(!(parents.includes('uranus') && parents.includes('dione')), 'no se mezclan progenitores de dos tradiciones');
    }
  });

  test('las figuras de contexto se explican en notas, ordenadas por nombre', () => {
    const aphrodite = getDeityArchive(archive, 'aphrodite', chapter);
    assert.deepEqual(
      aphrodite.contextEntities.map((entity) => entity.data.name),
      ['Dione', 'Urano'],
    );
    assert.ok(aphrodite.contextEntities.every((entity) => entity.data.profile === 'context'));
  });

  test('Zeus: descendencia rotulada por variante, objetos y pasajes citados', () => {
    const zeus = getDeityArchive(archive, 'zeus', chapter);
    assert.deepEqual(
      zeus.children.map((child) => [child.id, child.variantLabel, child.inDefault]),
      [['aphrodite', 'Ilíada', false]],
    );
    assert.deepEqual(
      zeus.artifacts.map((link) => [link.entry.id, link.identification.certainty]),
      [['relief', 'explicit']],
    );
    assert.deepEqual(
      zeus.sources.map((group) => [group.source.id, group.passages.map((passage) => passage.id)]),
      [['theogony', ['p-genealogy', 'p-epithets']]],
    );
    assert.deepEqual(ids(zeus.myths), ['assembly-of-gods']);
  });

  test('una deidad que no es visible lanza un error', () => {
    assert.throws(() => getDeityArchive(archive, 'apolonio', chapter), /no visible/);
  });
});

describe('citas y retroenlaces', () => {
  test('una cita resuelve obra, localizador y ancla del pasaje', () => {
    const index = new PassageIndex(archive);
    const [citation] = index.citeAll([{ source: { collection: 'sources', id: 'theogony' }, passageId: 'p-epithets', claim: 'Cita.', role: 'supports' }]);
    assert.equal(citation?.href, '/sources/theogony/#p-epithets');
    assert.equal(citation?.passage.locator.display, 'Teog. 900');
    assert.equal(index.cite({ source: { collection: 'sources', id: 'theogony' }, passageId: 'falta', claim: 'x', role: 'supports' }), undefined);
  });

  test('cada pasaje sabe qué fichas lo citan, sin enlaces duplicados', () => {
    const backlinks = passageBacklinks(archive, chapter);
    const epithets = backlinks.get('theogony#p-epithets') ?? [];
    // Las fichas con retroenlace son el roster más las tradiciones alternativas (Hestia).
    assert.equal(epithets.length, profileIds(chapter).length);
    assert.ok(epithets.some((link) => link.href === '/deities/zeus/#nombres'));
    const genealogy = backlinks.get('theogony#p-genealogy') ?? [];
    const hrefs = genealogy.map((link) => link.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
    assert.ok(hrefs.includes('/deities/zeus/#linaje'));
    assert.ok(hrefs.some((href) => href.includes('#relato-assembly-of-gods')));
  });
});
