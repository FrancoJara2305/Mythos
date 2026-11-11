/**
 * `getDeityArchive` (docs/content_model.md §8): reúne para una ficha sus relaciones, variantes,
 * relatos, objetos y pasajes. Puro, sobre el archivo visible del ambiente.
 */
import type { ChapterSelection } from '../../config/chapters.ts';
import type { ArchiveData, ArchiveEntry, ArtifactData, DeityData, Evidence, MythData, Passage, SourceData } from '../../types/content.ts';
import {
  consortsOf,
  deityMap,
  edgeVisible,
  parentsOf,
  variantGroupsFor,
  variantOptions,
  type RelatedEntity,
} from './queries.ts';

export interface VariantOptionView {
  option: string;
  label: string;
  isDefault: boolean;
  parents: RelatedEntity[];
}

export interface VariantGroupView {
  group: string;
  label: string;
  options: VariantOptionView[];
}

export interface ChildView extends RelatedEntity {
  /** Rótulo de la tradición si el vínculo solo existe en una opción de variante. */
  variantLabel: string | undefined;
  /** El vínculo pertenece a la opción por defecto (o no varía). */
  inDefault: boolean;
}

export interface ArtifactLink {
  entry: ArchiveEntry<ArtifactData>;
  identification: ArtifactData['identifications'][number];
}

export interface SourceGroup {
  source: ArchiveEntry<SourceData>;
  passages: Passage[];
}

export interface DeityArchive {
  id: string;
  data: DeityData;
  parents: RelatedEntity[];
  consorts: RelatedEntity[];
  children: ChildView[];
  variants: VariantGroupView[];
  myths: ArchiveEntry<MythData>[];
  artifacts: ArtifactLink[];
  sources: SourceGroup[];
  /** Entidades con perfil `context` que la ficha menciona: se explican en notas, no en páginas propias. */
  contextEntities: { id: string; data: DeityData }[];
}

function labelFor(selection: ChapterSelection, group: string, option: string): string {
  return selection.variantLabels[group]?.options[option] ?? option;
}

const CERTAINTY_ORDER = ['explicit', 'probable', 'possible', 'disputed', 'unknown'];

export function getDeityArchive(archive: ArchiveData, id: string, selection: ChapterSelection): DeityArchive {
  const deities = deityMap(archive);
  const data = deities.get(id);
  if (data === undefined) throw new Error(`Deidad no visible: ${id}`);
  const choice = selection.defaultVariants;

  const parents = parentsOf(archive, id, choice);
  const consorts = consortsOf(archive, id, choice);

  // Descendencia en todas las opciones de variante: cada arista se rotula y se marca si está en la opción por defecto.
  const children: ChildView[] = archive.relationships
    .filter((entry) => entry.data.kind === 'parent-of' && entry.data.subject.id === id)
    .map((entry) => {
      const other = deities.get(entry.data.object.id);
      const { variantGroup, variantOption } = entry.data;
      return {
        relationshipId: entry.id,
        id: entry.data.object.id,
        name: other?.name ?? entry.data.object.id,
        hasProfile: other?.profile === 'full',
        relationship: entry.data,
        variantLabel: variantGroup !== undefined && variantOption !== undefined ? labelFor(selection, variantGroup, variantOption) : undefined,
        inDefault: edgeVisible(entry.data, choice),
      };
    });

  const variants: VariantGroupView[] = variantGroupsFor(archive, id).map((group) => ({
    group,
    label: selection.variantLabels[group]?.label ?? group,
    options: variantOptions(archive, group).map((option) => ({
      option,
      label: labelFor(selection, group, option),
      isDefault: choice[group] === option,
      parents: parentsOf(archive, id, { ...choice, [group]: option }),
    })),
  }));

  const myths = archive.myths.filter(
    (entry) => entry.data.chapterIds.includes(selection.chapterId) && entry.data.participants.some((participant) => participant.id === id),
  );

  const artifacts = archive.artifacts
    .flatMap((entry) =>
      entry.data.identifications.filter((identification) => identification.entity.id === id).map((identification) => ({ entry, identification })),
    )
    .sort(
      (a, b) =>
        CERTAINTY_ORDER.indexOf(a.identification.certainty) - CERTAINTY_ORDER.indexOf(b.identification.certainty) ||
        a.entry.id.localeCompare(b.entry.id),
    );

  // Pasajes: los citados por la ficha, sus relatos y sus relaciones, y los que la mencionan.
  const cited = new Set<string>();
  const addEvidence = (items: readonly Evidence[]) => items.forEach((item) => cited.add(`${item.source.id}#${item.passageId}`));
  data.epithets.forEach((epithet) => addEvidence(epithet.evidence));
  for (const attribute of [...data.domains, ...data.symbols]) {
    attribute.evidence.forEach((item) => {
      if (item.kind === 'passage') addEvidence([item.evidence]);
    });
  }
  myths.forEach((myth) => addEvidence(myth.data.evidence));
  [...parents, ...consorts, ...children, ...variants.flatMap((group) => group.options.flatMap((option) => option.parents))].forEach((relation) =>
    addEvidence(relation.relationship.evidence),
  );
  const sources = archive.sources
    .map((source) => ({
      source,
      passages: source.data.passages.filter(
        (passage) => cited.has(`${source.id}#${passage.id}`) || passage.relatedEntities.some((entity) => entity.id === id),
      ),
    }))
    .filter((group) => group.passages.length > 0);

  const mentioned = new Set<string>([
    ...parents.map((item) => item.id),
    ...consorts.map((item) => item.id),
    ...children.map((item) => item.id),
    ...variants.flatMap((group) => group.options.flatMap((option) => option.parents.map((parent) => parent.id))),
    ...myths.flatMap((myth) => myth.data.participants.map((participant) => participant.id)),
  ]);
  mentioned.delete(id);
  const contextEntities = [...mentioned]
    .flatMap((other) => {
      const entity = deities.get(other);
      return entity !== undefined && entity.profile === 'context' ? [{ id: other, data: entity }] : [];
    })
    .sort((a, b) => a.data.name.localeCompare(b.data.name, 'es'));

  return { id, data, parents, consorts, children, variants, myths, artifacts, sources, contextEntities };
}

/** Ancla de la nota contextual de una entidad dentro de una ficha. */
export function contextAnchor(id: string): string {
  return `contexto-${id}`;
}
