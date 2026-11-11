/**
 * Tipos del contenido, inferidos de los esquemas (`src/lib/content/schema.ts`): no se escriben a mano.
 *
 * `ArchiveData` es la vista plana de las seis colecciones que usa el validador de integridad. Es
 * estructuralmente compatible con lo que devuelve `getCollection()` (`CollectionEntry` tiene, además,
 * `collection`, `body` y otros campos), y las pruebas de Node la construyen con fixtures.
 */
import type { z } from 'astro/zod';
import type { ContentSchemas } from '../lib/content/schema.ts';

export type DeityData = z.output<ContentSchemas['deities']>;
export type MythData = z.output<ContentSchemas['myths']>;
export type SourceData = z.output<ContentSchemas['sources']>;
export type ArtifactData = z.output<ContentSchemas['artifacts']>;
export type RelationshipData = z.output<ContentSchemas['relationships']>;
export type TimelineEventData = z.output<ContentSchemas['timeline-events']>;

export type Status = DeityData['review']['status'];
export type Evidence = MythData['evidence'][number];
export type HistoricalDate = SourceData['compositionDate'];
export type Rights = SourceData['editions'][number]['rights'];
export type Passage = SourceData['passages'][number];
export type ArtifactMedia = ArtifactData['media'][number];
export type StorySection = DeityData['storySections'][number];
export type DidacticNote = DeityData['didacticNotes'][number];
export type ConstellationConfig = NonNullable<DeityData['constellationConfig']>;

export interface ArchiveEntry<T> {
  id: string;
  data: T;
  filePath?: string | undefined;
}

export interface ArchiveData {
  deities: readonly ArchiveEntry<DeityData>[];
  myths: readonly ArchiveEntry<MythData>[];
  sources: readonly ArchiveEntry<SourceData>[];
  artifacts: readonly ArchiveEntry<ArtifactData>[];
  relationships: readonly ArchiveEntry<RelationshipData>[];
  'timeline-events': readonly ArchiveEntry<TimelineEventData>[];
}
