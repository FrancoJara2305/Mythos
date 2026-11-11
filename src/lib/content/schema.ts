/**
 * Esquemas de las seis Content Collections (docs/content_model.md §3–4).
 *
 * Se definen con una fábrica que recibe `reference()`: `src/content.config.ts` le pasa la de
 * `astro:content` y las pruebas de Node una equivalente, de modo que ambos validan con **los mismos
 * esquemas**. Los tipos del contenido se infieren de aquí (`src/types/content.ts`), no se duplican.
 *
 * Los esquemas validan forma, tipos y reglas locales de cada registro. Lo que exige mirar varias
 * colecciones (referencias existentes, `passageId`, variantes, ciclos, borradores) vive en
 * `integrity.ts`, porque `reference()` no comprueba que el destino exista.
 */
import { z } from 'astro/zod';
import { isValidSlug } from '../routes.ts';
import { createHistoricalDateSchema } from './dates.ts';
import { STAR_FACETS, type StarFacet } from './facets.ts';

export const CONTENT_COLLECTIONS = ['deities', 'myths', 'sources', 'artifacts', 'relationships', 'timeline-events'] as const;
export type ContentCollection = (typeof CONTENT_COLLECTIONS)[number];

/** Forma de una referencia ya resuelta por el esquema (igual que la de `reference()` de Astro). */
export interface EntryRef<C extends ContentCollection = ContentCollection> {
  collection: C;
  id: string;
}

export type ReferenceFactory = <C extends ContentCollection>(collection: C) => z.ZodType<EntryRef<C>, string>;

export const STATUSES = ['draft', 'reviewed', 'published'] as const;
export const CERTAINTIES = ['explicit', 'probable', 'possible', 'disputed', 'unknown'] as const;
export const EVIDENCE_ROLES = ['supports', 'contrasts', 'context'] as const;
export const ENTITY_KINDS = ['deity', 'titan', 'primordial', 'hero', 'mortal'] as const;
export const RIGHTS_STATUSES = ['unverified', 'verified', 'restricted'] as const;
export const RELATIONSHIP_KINDS = ['parent-of', 'consort-of', 'associated-with'] as const;
export const LANGUAGES = ['grc', 'en', 'es', 'la'] as const;

/**
 * Capa narrativa (Narratorio, 2026-11-09). Los bloques de relato y las cápsulas didácticas son texto
 * editorial de MYTHOS: cuentan lo que las evidencias respaldan, pero no sustituyen a `evidence`, que
 * sigue alimentando el Códice de las Fuentes.
 */
export const STORY_KINDS = ['origin', 'character', 'deeds', 'symbolism'] as const;
export const NOTE_KINDS = ['curiosity', 'question', 'concept', 'name'] as const;
/** Facetas de una deidad en el planetario (definidas sin dependencias para la isla del navegador). */
export { STAR_FACETS, type StarFacet };

/** Griego (básico y politónico); los nombres griegos no se aceptan transliterados. */
const GREEK_LETTER = /[Ͱ-Ͽἀ-῿]/u;
const LATIN_LETTER = /[A-Za-z]/;

const text = z.string().trim().min(1);
const slug = z.string().refine(isValidSlug, { message: 'ID inválido: usa ASCII kebab-case estable.' });
const isoDate = z.iso.date();
const httpsUrl = z.url({ protocol: /^https$/ });
const positiveInt = z.number().int().positive();
const vector3 = z.tuple([z.number(), z.number(), z.number()]);
const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, 'Color en hexadecimal de seis cifras, p. ej. "#fde047".');
const unit = z.number().min(-1).max(1);

export function createContentSchemas(ref: ReferenceFactory) {
  const status = z.enum(STATUSES);
  const certainty = z.enum(CERTAINTIES);

  /** `reviewer`/`reviewedAt` son obligatorios fuera de draft. No se inventan revisiones humanas. */
  const review = z
    .strictObject({ status, reviewer: text.optional(), reviewedAt: isoDate.optional() })
    .superRefine((value, ctx) => {
      if (value.status === 'draft') return;
      if (value.reviewer === undefined) {
        ctx.addIssue({ code: 'custom', path: ['reviewer'], message: `reviewer es obligatorio con status "${value.status}".` });
      }
      if (value.reviewedAt === undefined) {
        ctx.addIssue({ code: 'custom', path: ['reviewedAt'], message: `reviewedAt es obligatorio con status "${value.status}".` });
      }
    });

  /** Evidencia literaria: obra + clave de pasaje dentro de esa obra. */
  const evidence = z.strictObject({
    source: ref('sources'),
    passageId: slug,
    claim: text,
    role: z.enum(EVIDENCE_ROLES),
  });

  /** Evidencia admitida donde vale una observación visual catalogada (símbolos, hotspots). */
  const visualEvidence = z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('passage'), evidence }),
    z.strictObject({ kind: z.literal('artifact'), artifactId: ref('artifacts'), catalogueUrl: httpsUrl, claim: text }),
  ]);

  const rights = z
    .strictObject({
      status: z.enum(RIGHTS_STATUSES),
      licenseName: text,
      licenseUrl: httpsUrl.optional(),
      creator: text,
      institution: text.optional(),
      sourceUrl: httpsUrl,
      creditLine: text,
      modifications: z.array(text),
      checkedAt: isoDate.optional(),
      /** Ruta del repositorio con la evidencia de la licencia (p. ej. `references/sources/...`). */
      evidencePath: text.optional(),
    })
    .superRefine((value, ctx) => {
      if (value.status !== 'verified') return;
      for (const key of ['licenseUrl', 'checkedAt', 'evidencePath'] as const) {
        if (value[key] === undefined) {
          ctx.addIssue({ code: 'custom', path: [key], message: `${key} es obligatorio con derechos "verified".` });
        }
      }
    });

  const historicalDate = createHistoricalDateSchema(evidence);

  // ---------------------------------------------------------------- deities

  const epithet = z.strictObject({
    term: text,
    language: z.enum(LANGUAGES),
    explanation: text,
    evidence: z.array(evidence).min(1),
  });

  const attribute = z.strictObject({
    label: text,
    context: text,
    evidence: z.array(visualEvidence).min(1),
  });

  // ---------------------------------------------------------------- narratorio

  /** Bloque de relato. `body`: párrafos separados por una línea en blanco. */
  const storySection = z.strictObject({
    kind: z.enum(STORY_KINDS).optional(),
    heading: text,
    body: text,
  });

  /**
   * Cápsula didáctica: curiosidad, pregunta para pensar, concepto griego explicado o «nombre secreto».
   * Una cápsula `name` con `term` acompaña al epíteto del mismo término (que conserva su evidencia).
   */
  const didacticNote = z
    .strictObject({
      kind: z.enum(NOTE_KINDS),
      title: text,
      body: text,
      term: text.optional(),
    })
    .superRefine((value, ctx) => {
      if (value.kind === 'name' && value.term === undefined) {
        ctx.addIssue({ code: 'custom', path: ['term'], message: 'Una cápsula "name" necesita el término (epíteto o nombre) que explica.' });
      }
    });

  /**
   * Constelación de una deidad en la bóveda 3D. `position` es el centro en la bóveda (dirección; el
   * planetario la normaliza). Las estrellas usan coordenadas locales −1…1 (x a la derecha, y arriba, z
   * profundidad); `links` une índices de `stars` para dibujar la figura. Cuatro estrellas llevan
   * `facet`: son los nodos interactivos (origen, relatos, dominios y nombres).
   */
  const MIN_FACET_GAP = 0.4;
  const constellationConfig = z
    .strictObject({
      position: vector3,
      color: hexColor,
      /** Nombre de la figura que dibujan las estrellas, p. ej. «El Rayo». */
      shape: text,
      stars: z
        .array(
          z.strictObject({
            x: unit,
            y: unit,
            z: unit.default(0),
            magnitude: z.number().min(0.2).max(1).default(0.55),
            facet: z.enum(STAR_FACETS).optional(),
          }),
        )
        .min(4)
        .max(24),
      links: z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])).min(3),
    })
    .superRefine((value, ctx) => {
      value.links.forEach(([from, to], index) => {
        if (from === to || from >= value.stars.length || to >= value.stars.length) {
          ctx.addIssue({ code: 'custom', path: ['links', index], message: 'Cada enlace une dos estrellas distintas y existentes.' });
        }
      });
      for (const facet of STAR_FACETS) {
        const count = value.stars.filter((star) => star.facet === facet).length;
        if (count !== 1) {
          ctx.addIssue({ code: 'custom', path: ['stars'], message: `La constelación necesita exactamente una estrella con facet "${facet}" (tiene ${count}).` });
        }
      }
      // Los nodos táctiles se dibujan sobre estas estrellas: en un móvil de 390 × 844 una unidad de
      // figura mide unos 112 px (src/lib/planetarium/scene.ts), y 0,4 unidades son 45 px, lo justo para
      // que dos marcadores de 44 px no se pisen.
      const nodes = value.stars.filter((star) => star.facet !== undefined);
      nodes.forEach((a, i) => {
        for (const b of nodes.slice(i + 1)) {
          if (Math.hypot(a.x - b.x, a.y - b.y) < MIN_FACET_GAP) {
            ctx.addIssue({ code: 'custom', path: ['stars'], message: `Las estrellas "${a.facet}" y "${b.facet}" están a menos de ${MIN_FACET_GAP} unidades: sus nodos se superpondrían.` });
          }
        }
      });
      if (value.position.every((component) => component === 0)) {
        ctx.addIssue({ code: 'custom', path: ['position'], message: 'position no puede ser el origen.' });
      }
    });

  const deities = z
    .strictObject({
      name: text,
      greekName: text.optional(),
      transliteration: text.optional(),
      summary: text.optional(),
      /** Frase evocadora corta (cabecera de la ficha y rótulo de la constelación). */
      tagline: text.optional(),
      /** Entrada del relato: dos o tres frases que invitan a leer, para cualquier edad. */
      narrativeHook: text.optional(),
      storySections: z.array(storySection).default([]),
      didacticNotes: z.array(didacticNote).default([]),
      constellationConfig: constellationConfig.optional(),
      entityKind: z.enum(ENTITY_KINDS),
      /** Solo `full` genera `/deities/{id}/`; `context` existe para que los parentescos no rompan enlaces. */
      profile: z.enum(['full', 'context']),
      epithets: z.array(epithet).default([]),
      domains: z.array(attribute).default([]),
      symbols: z.array(attribute).default([]),
      review,
    })
    .superRefine((value, ctx) => {
      if (value.greekName !== undefined && (!GREEK_LETTER.test(value.greekName) || LATIN_LETTER.test(value.greekName))) {
        ctx.addIssue({ code: 'custom', path: ['greekName'], message: 'greekName debe escribirse en griego, no transliterado.' });
      }
      if (value.profile !== 'full') return;
      for (const key of ['greekName', 'transliteration', 'summary'] as const) {
        if (value[key] === undefined) {
          ctx.addIssue({ code: 'custom', path: [key], message: `${key} es obligatorio en un perfil full.` });
        }
      }
      if (value.epithets.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['epithets'], message: 'Un perfil full necesita al menos un epíteto con evidencia.' });
      }
      if (value.domains.length + value.symbols.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['domains'], message: 'Un perfil full necesita al menos un dominio o símbolo con evidencia.' });
      }
    });

  // ---------------------------------------------------------------- variantes

  /** `variantGroup` y `variantOption` van juntos o no van. */
  function requireVariantPair(value: { variantGroup?: string | undefined; variantOption?: string | undefined }, ctx: z.RefinementCtx) {
    if ((value.variantGroup === undefined) !== (value.variantOption === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['variantOption'], message: 'variantGroup y variantOption deben indicarse juntos.' });
    }
  }

  // ---------------------------------------------------------------- myths

  const myths = z
    .strictObject({
      title: text,
      summary: text,
      /** Capa narrativa del relato (ver «narratorio»): opcional para no romper registros anteriores. */
      tagline: text.optional(),
      narrativeHook: text.optional(),
      storySections: z.array(storySection).default([]),
      didacticNotes: z.array(didacticNote).default([]),
      participants: z.array(ref('deities')).min(1),
      chapterIds: z.array(slug).min(1),
      traditionLabel: text,
      evidence: z.array(evidence).min(1),
      variantGroup: slug.optional(),
      variantOption: slug.optional(),
      review,
    })
    .superRefine(requireVariantPair);

  // ---------------------------------------------------------------- sources

  const locator = z
    .strictObject({
      book: positiveInt.optional(),
      hymn: positiveInt.optional(),
      section: text.optional(),
      lineStart: positiveInt.optional(),
      lineEnd: positiveInt.optional(),
      display: text,
      /** `book.line` (Ilíada, Odisea), `line` (Teogonía), `hymn.line` (cada himno homérico). */
      scheme: z.enum(['book.line', 'line', 'hymn.line']),
    })
    .superRefine((value, ctx) => {
      if (value.lineEnd !== undefined && value.lineStart === undefined) {
        ctx.addIssue({ code: 'custom', path: ['lineStart'], message: 'lineEnd requiere lineStart.' });
      }
      if (value.lineStart !== undefined && value.lineEnd !== undefined && value.lineStart > value.lineEnd) {
        ctx.addIssue({ code: 'custom', path: ['lineEnd'], message: 'Rango de versos invertido.' });
      }
      if (value.lineStart === undefined) {
        ctx.addIssue({ code: 'custom', path: ['lineStart'], message: 'El localizador necesita al menos lineStart.' });
      }
      const needsBook = value.scheme === 'book.line';
      const needsHymn = value.scheme === 'hymn.line';
      if (needsBook !== (value.book !== undefined)) {
        ctx.addIssue({ code: 'custom', path: ['book'], message: `book ${needsBook ? 'es obligatorio' : 'no corresponde'} con scheme "${value.scheme}".` });
      }
      if (needsHymn !== (value.hymn !== undefined)) {
        ctx.addIssue({ code: 'custom', path: ['hymn'], message: `hymn ${needsHymn ? 'es obligatorio' : 'no corresponde'} con scheme "${value.scheme}".` });
      }
    });

  const excerpt = z.strictObject({
    text,
    language: z.enum(LANGUAGES),
    kind: z.enum(['verbatim', 'own-translation']),
    rights,
    translator: text,
  });

  const passage = z.strictObject({
    id: slug,
    editionId: slug,
    locator,
    canonicalUrl: httpsUrl,
    backupUrl: httpsUrl.optional(),
    summary: text,
    relatedEntities: z.array(ref('deities')).default([]),
    /** Fecha de cotejo del localizador contra el TEI fijado. No es una revisión humana. */
    verifiedAt: isoDate.optional(),
    reviewer: text.optional(),
    excerpt: excerpt.optional(),
  });

  const edition = z
    .strictObject({
      id: slug,
      editor: text.optional(),
      translator: text.optional(),
      language: z.enum(LANGUAGES),
      title: text,
      publisher: text,
      /** Año de publicación; si la edición abarca varios años, el último, y `yearLabel` conserva el rango. */
      year: positiveInt,
      yearLabel: text.optional(),
      /** URL estable de la copia digital consultada (TEI fijado a un commit, no `master`). */
      url: httpsUrl,
      urn: text.optional(),
      rights,
    })
    .refine((value) => value.editor !== undefined || value.translator !== undefined, {
      message: 'Una edición necesita editor o translator.',
      path: ['editor'],
    });

  const sources = z.strictObject({
    title: text,
    workUrn: z.string().regex(/^urn:cts:greekLit:tlg\d{4}\.tlg\d{3}$/, 'workUrn debe ser un URN CTS de obra.').optional(),
    corpus: z.enum(['homeric-hymns']).optional(),
    attribution: z.strictObject({
      name: text,
      status: z.enum(['named', 'traditional', 'anonymous', 'disputed']),
      note: text,
    }),
    compositionDate: historicalDate,
    editions: z.array(edition).min(1),
    passages: z.array(passage).min(1),
    review,
  });

  // ---------------------------------------------------------------- artifacts

  const identification = z.strictObject({
    entity: ref('deities'),
    certainty,
    /** Rótulo tal como lo da la institución, sin convertir una duda en certeza. */
    attributionLabel: text,
    basisUrl: httpsUrl,
    note: text,
  });

  const hotspot = z.strictObject({
    id: slug,
    position: vector3,
    label: text,
    description: text,
    evidence: visualEvidence,
    kind: z.enum(['observed-feature', 'interpretation', 'restoration']),
  });

  const media = z.discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('image'),
      assetId: slug,
      localPath: text,
      width: positiveInt,
      height: positiveInt,
      alt: text,
      rights,
    }),
    z.strictObject({
      type: z.literal('model'),
      assetId: slug,
      glbPath: text,
      posterAssetId: slug,
      rights,
      sourceFormat: text,
      originalBytes: positiveInt,
      optimizedBytes: positiveInt,
      triangles: positiveInt,
      textureSummary: text,
      sha256: z.string().regex(/^[0-9a-f]{64}$/, 'sha256 debe tener 64 caracteres hexadecimales.'),
      optimizationLog: text,
      coordinateVersion: positiveInt,
      camera: z.strictObject({ position: vector3, target: vector3, fov: z.number().positive() }),
      hotspots: z.array(hotspot).default([]),
    }),
  ]);

  const artifacts = z.strictObject({
    title: text,
    institution: text,
    /** ID del registro en el sistema de la institución (p. ej. objectID del Met). */
    externalId: text,
    /** Número de inventario tal como figura en la ficha. */
    accessionNumber: text,
    catalogueUrl: httpsUrl,
    date: historicalDate,
    material: text,
    /** Cultura y lugar de hallazgo, separados del historial de propiedad. */
    culture: text.optional(),
    findspot: text.optional(),
    provenance: z.strictObject({ summary: text, catalogueUrl: httpsUrl, certainty }),
    creditLine: text,
    identifications: z.array(identification),
    media: z.array(media).default([]),
    /** Discrepancias o pendientes de la ficha que no deben resolverse por apariencia. */
    catalogueNotes: z.array(text).default([]),
    review,
  });

  // ---------------------------------------------------------------- relationships

  const relationships = z
    .strictObject({
      subject: ref('deities'),
      object: ref('deities'),
      /** `parent-of`: progenitor → descendiente. `consort-of`: una sola arista con subject < object. */
      kind: z.enum(RELATIONSHIP_KINDS),
      label: text,
      traditionLabel: text,
      certainty,
      evidence: z.array(evidence).min(1),
      variantGroup: slug.optional(),
      variantOption: slug.optional(),
      note: text.optional(),
      review,
    })
    .superRefine(requireVariantPair);

  // ---------------------------------------------------------------- timeline-events

  const historicalSubject = z.discriminatedUnion('collection', [
    z.strictObject({ collection: z.literal('sources'), id: slug }),
    z.strictObject({ collection: z.literal('artifacts'), id: slug }),
  ]);

  const timelineEvents = z.discriminatedUnion('kind', [
    /** Objeto estricto: un evento mítico no admite ningún campo de fecha. */
    z.strictObject({
      kind: z.literal('mythic'),
      title: text,
      myth: ref('myths'),
      traditionLabel: text,
      sequenceGroup: slug,
      /** Orden editorial de exposición; no es una prueba cronológica. */
      displayOrder: z.number().int().nonnegative(),
      after: z.array(z.strictObject({ eventId: ref('timeline-events'), evidence: z.array(evidence).min(1) })).default([]),
      entities: z.array(ref('deities')).default([]),
      evidence: z.array(evidence).min(1),
      review,
    }),
    /** El intervalo se lee del registro de la obra o del objeto; aquí no se duplica. */
    z
      .strictObject({
        kind: z.literal('historical'),
        title: text,
        subject: historicalSubject,
        facet: z.enum(['composition', 'object-production']),
        entities: z.array(ref('deities')).default([]),
        review,
      })
      .refine(
        (value) => (value.facet === 'composition') === (value.subject.collection === 'sources'),
        { message: 'composition corresponde a sources y object-production a artifacts.', path: ['facet'] },
      ),
  ]);

  return {
    deities,
    myths,
    sources,
    artifacts,
    relationships,
    'timeline-events': timelineEvents,
  } satisfies Record<ContentCollection, z.ZodType>;
}

export type ContentSchemas = ReturnType<typeof createContentSchemas>;
