/**
 * Archivo mínimo y válido para las pruebas de contenido. Se construye en crudo (como en los archivos
 * de `src/content/`) y se valida con **los mismos esquemas** que usa Astro, con una `reference()`
 * equivalente a la de `astro:content`.
 */
import { z } from 'astro/zod';
import type { ChapterSelection } from '../../src/config/chapters.ts';
import type { IntegrityOptions } from '../../src/lib/content/integrity.ts';
import { createContentSchemas, type ContentCollection, type ReferenceFactory } from '../../src/lib/content/schema.ts';
import type { ArchiveData } from '../../src/types/content.ts';

export const testRef: ReferenceFactory = (collection) => z.string().transform((id) => ({ collection, id }));
export const schemas = createContentSchemas(testRef);

type RawCollection = Record<string, Record<string, unknown>>;
export type RawArchive = Record<ContentCollection, RawCollection>;

export const ROSTER = ['zeus', 'hera', 'poseidon', 'demeter', 'athena', 'apollo', 'artemis', 'ares', 'aphrodite', 'hephaestus', 'hermes', 'dionysus'];

const DRAFT = { status: 'draft' };
const PUBLISHED = { status: 'published', reviewer: 'Revisora de prueba', reviewedAt: '2026-11-08' };
const URL_BASE = 'https://example.org/test';

export const evidence = (passageId = 'p-genealogy', source = 'theogony') => ({
  source,
  passageId,
  claim: 'Afirmación de prueba.',
  role: 'supports',
});

function fullDeity(name: string) {
  return {
    name,
    greekName: 'Θεός',
    transliteration: 'Theos',
    summary: 'Resumen de prueba.',
    entityKind: 'deity',
    profile: 'full',
    epithets: [{ term: 'ἐπίθετον', language: 'grc', explanation: 'Explicación.', evidence: [evidence('p-epithets')] }],
    symbols: [{ label: 'Símbolo', context: 'Contexto.', evidence: [{ kind: 'artifact', artifactId: 'relief', catalogueUrl: `${URL_BASE}/relief`, claim: 'Atributo.' }] }],
    ...narrative(),
    review: DRAFT,
  };
}

/** Capa narrativa mínima y válida (Narratorio): relato, cápsula y constelación con sus cuatro facetas. */
export function narrative() {
  return {
    tagline: 'Frase de prueba.',
    narrativeHook: 'Entrada de prueba.',
    storySections: [{ kind: 'origin', heading: 'Origen', body: ['Primer párrafo.', 'Segundo párrafo.'].join('\n\n') }],
    didacticNotes: [{ kind: 'name', title: 'Nombre', term: 'ἐπίθετον', body: 'Cápsula.' }],
    constellationConfig: {
      position: [0, 0.2, -1],
      color: '#fde047',
      shape: 'Figura de prueba',
      stars: [
        { x: 0, y: 1, facet: 'origin' },
        { x: 1, y: 0, facet: 'tales' },
        { x: 0, y: -1, facet: 'domains' },
        { x: -1, y: 0, facet: 'names' },
      ],
      links: [[0, 1], [1, 2], [2, 3]],
    },
  };
}

function contextDeity(name: string, entityKind = 'deity') {
  return { name, entityKind, profile: 'context', review: DRAFT };
}

function parentOf(subject: string, object: string, extra: Record<string, unknown> = {}) {
  return { subject, object, kind: 'parent-of', label: 'progenitor', traditionLabel: 'Hesíodo', certainty: 'explicit', evidence: [evidence()], review: DRAFT, ...extra };
}

export function rawArchive(): RawArchive {
  const deities: RawCollection = Object.fromEntries(ROSTER.map((id) => [id, fullDeity(id)]));
  Object.assign(deities, {
    hestia: fullDeity('Hestia'),
    cronus: contextDeity('Crono', 'titan'),
    rhea: contextDeity('Rea', 'titan'),
    uranus: contextDeity('Urano', 'primordial'),
    dione: contextDeity('Dione'),
  });

  return {
    deities,
    myths: {
      'assembly-of-gods': {
        title: 'Relato de prueba',
        summary: 'Todos los perfiles participan.',
        participants: [...ROSTER, 'hestia'],
        chapterIds: ['dodekatheon'],
        traditionLabel: 'Hesíodo',
        evidence: [evidence()],
        review: DRAFT,
      },
    },
    sources: {
      theogony: {
        title: 'Teogonía',
        workUrn: 'urn:cts:greekLit:tlg0020.tlg001',
        attribution: { name: 'Hesíodo', status: 'traditional', note: 'Nota.' },
        compositionDate: { kind: 'unknown', label: 'Datación en revisión.' },
        editions: [
          {
            id: 'grc',
            editor: 'Editor',
            language: 'grc',
            title: 'Edición',
            publisher: 'Editorial',
            year: 1914,
            url: `${URL_BASE}/tei`,
            rights: { status: 'unverified', licenseName: 'CC BY-SA 4.0', creator: 'Perseus', sourceUrl: `${URL_BASE}/tei`, creditLine: 'Crédito.', modifications: [] },
          },
        ],
        passages: [
          { id: 'p-genealogy', editionId: 'grc', locator: { lineStart: 453, lineEnd: 458, display: 'Teog. 453–458', scheme: 'line' }, canonicalUrl: `${URL_BASE}/p1`, summary: 'Resumen.', verifiedAt: '2026-11-08' },
          { id: 'p-epithets', editionId: 'grc', locator: { lineStart: 900, display: 'Teog. 900', scheme: 'line' }, canonicalUrl: `${URL_BASE}/p2`, summary: 'Resumen.' },
        ],
        review: DRAFT,
      },
    },
    artifacts: {
      relief: {
        title: 'Relieve',
        institution: 'Museo',
        externalId: '1',
        accessionNumber: '1',
        catalogueUrl: `${URL_BASE}/relief`,
        date: {
          kind: 'range',
          start: -100,
          end: 100,
          label: 'siglo I a. C. – siglo I d. C.',
          precision: 'century',
          basis: 'Ficha.',
          evidence: [{ kind: 'catalogue', url: `${URL_BASE}/relief`, title: 'Relieve', authorOrInstitution: 'Museo', checkedAt: '2026-11-08' }],
        },
        material: 'Mármol',
        provenance: { summary: 'Desconocida.', catalogueUrl: `${URL_BASE}/relief`, certainty: 'unknown' },
        creditLine: 'Crédito.',
        identifications: ['hestia', 'zeus'].map((entity) => ({ entity, certainty: 'explicit', attributionLabel: entity, basisUrl: `${URL_BASE}/relief`, note: 'Nota.' })),
        review: DRAFT,
      },
    },
    relationships: {
      'cronus-parent-of-zeus': parentOf('cronus', 'zeus'),
      'rhea-parent-of-zeus': parentOf('rhea', 'zeus'),
      'hera-consort-of-zeus': { subject: 'hera', object: 'zeus', kind: 'consort-of', label: 'esposa', traditionLabel: 'Hesíodo', certainty: 'explicit', evidence: [evidence()], review: DRAFT },
      'uranus-parent-of-aphrodite-hesiodic': parentOf('uranus', 'aphrodite', { variantGroup: 'aphrodite-origin', variantOption: 'hesiodic', note: 'Sin madre en este relato.' }),
      'zeus-parent-of-aphrodite-iliadic': parentOf('zeus', 'aphrodite', { variantGroup: 'aphrodite-origin', variantOption: 'iliadic' }),
      'dione-parent-of-aphrodite-iliadic': parentOf('dione', 'aphrodite', { variantGroup: 'aphrodite-origin', variantOption: 'iliadic' }),
    },
    'timeline-events': {
      first: {
        kind: 'mythic', title: 'Primero', myth: 'assembly-of-gods', traditionLabel: 'Hesíodo', sequenceGroup: 'succession', displayOrder: 1,
        evidence: [evidence()], review: DRAFT,
      },
      second: {
        kind: 'mythic', title: 'Segundo', myth: 'assembly-of-gods', traditionLabel: 'Hesíodo', sequenceGroup: 'succession', displayOrder: 2,
        after: [{ eventId: 'first', evidence: [evidence()] }], evidence: [evidence()], review: DRAFT,
      },
      'relief-production': {
        kind: 'historical', title: 'Producción del relieve', subject: { collection: 'artifacts', id: 'relief' }, facet: 'object-production', review: DRAFT,
      },
    },
  };
}

export function parseArchive(raw: RawArchive): ArchiveData {
  const parse = <C extends ContentCollection>(collection: C) =>
    Object.entries(raw[collection]).map(([id, data]) => ({ id, data: schemas[collection].parse(data) }));
  return {
    deities: parse('deities'),
    myths: parse('myths'),
    sources: parse('sources'),
    artifacts: parse('artifacts'),
    relationships: parse('relationships'),
    'timeline-events': parse('timeline-events'),
  } as ArchiveData;
}

export function selection(overrides: Partial<ChapterSelection> = {}): ChapterSelection {
  return {
    chapterId: 'dodekatheon',
    roster: ROSTER.map((id, index) => ({ id, order: index + 1, emblem: { symbol: 'Símbolo', depicts: 'símbolo' } })),
    contextual: [],
    alternatives: [
      {
        id: 'with-hestia',
        label: 'Con Hestia',
        without: 'dionysus',
        with: 'hestia',
        emblem: { symbol: 'Símbolo', depicts: 'símbolo' },
        traditions: { without: 'Tradición con Dioniso', with: 'Tradición con Hestia' },
        evidenceArtifactId: 'relief',
        note: 'Nota.',
      },
    ],
    defaultVariants: { 'aphrodite-origin': 'hesiodic' },
    variantLabels: { 'aphrodite-origin': { label: 'Origen de Afrodita', options: { hesiodic: 'Teogonía', iliadic: 'Ilíada' } } },
    ...overrides,
  };
}

export function options(overrides: Partial<IntegrityOptions> = {}): IntegrityOptions {
  return { chapterIds: ['dodekatheon'], selections: [selection()], ...overrides };
}

/** Marca como published todo el archivo crudo (útil para las reglas de producción). */
export function publishAll(raw: RawArchive): RawArchive {
  for (const collection of Object.values(raw)) {
    for (const entry of Object.values(collection)) entry.review = { ...PUBLISHED };
  }
  for (const source of Object.values(raw.sources)) {
    for (const passage of source.passages as Record<string, unknown>[]) passage.verifiedAt = '2026-11-08';
  }
  return raw;
}

export { DRAFT, PUBLISHED };
