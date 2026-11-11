/**
 * Consultas de build sobre el archivo ya validado (docs/content_model.md §8: funciones simples, sin
 * repositorio abstracto). Son puras: reciben `ArchiveData` y las prueba Node con los fixtures.
 *
 * Variantes: una arista con `variantGroup` solo se muestra si coincide con la opción elegida para su
 * grupo. Nunca se mezclan progenitores de dos tradiciones (docs/content_model.md §4).
 */
import type { ArchiveData, ArchiveEntry, DeityData, RelationshipData } from '../../types/content.ts';

/** Opción elegida por grupo de variantes, p. ej. `{ 'aphrodite-origin': 'hesiodic' }`. */
export type VariantChoice = Readonly<Record<string, string>>;

export interface RelatedEntity {
  /** ID de la arista en `relationships`. */
  relationshipId: string;
  /** La otra entidad de la relación. */
  id: string;
  name: string;
  /** El registro de la otra entidad tiene perfil `full` (y por tanto página propia). */
  hasProfile: boolean;
  relationship: RelationshipData;
}

export function deityMap(archive: ArchiveData): Map<string, DeityData> {
  return new Map(archive.deities.map((entry) => [entry.id, entry.data]));
}

/** Una arista sin grupo se ve siempre; una con grupo, solo en su opción elegida. */
export function edgeVisible(edge: RelationshipData, choice: VariantChoice): boolean {
  if (edge.variantGroup === undefined) return true;
  return Object.hasOwn(choice, edge.variantGroup) && choice[edge.variantGroup] === edge.variantOption;
}

function related(entry: ArchiveEntry<RelationshipData>, otherId: string, deities: Map<string, DeityData>): RelatedEntity {
  const other = deities.get(otherId);
  return {
    relationshipId: entry.id,
    id: otherId,
    name: other?.name ?? otherId,
    hasProfile: other?.profile === 'full',
    relationship: entry.data,
  };
}

/** Progenitores de `id` en la combinación de variantes elegida, en el orden de los datos. */
export function parentsOf(archive: ArchiveData, id: string, choice: VariantChoice): RelatedEntity[] {
  const deities = deityMap(archive);
  return archive.relationships
    .filter((entry) => entry.data.kind === 'parent-of' && entry.data.object.id === id && edgeVisible(entry.data, choice))
    .map((entry) => related(entry, entry.data.subject.id, deities));
}

/** Descendientes de `id` en la combinación de variantes elegida. */
export function childrenOf(archive: ArchiveData, id: string, choice: VariantChoice): RelatedEntity[] {
  const deities = deityMap(archive);
  return archive.relationships
    .filter((entry) => entry.data.kind === 'parent-of' && entry.data.subject.id === id && edgeVisible(entry.data, choice))
    .map((entry) => related(entry, entry.data.object.id, deities));
}

/** Uniones (`consort-of` se guarda una sola vez: se busca en ambos extremos). */
export function consortsOf(archive: ArchiveData, id: string, choice: VariantChoice): RelatedEntity[] {
  const deities = deityMap(archive);
  return archive.relationships
    .filter(
      (entry) =>
        entry.data.kind === 'consort-of' &&
        (entry.data.subject.id === id || entry.data.object.id === id) &&
        edgeVisible(entry.data, choice),
    )
    .map((entry) => related(entry, entry.data.subject.id === id ? entry.data.object.id : entry.data.subject.id, deities));
}

/** Grupos de variantes en los que `id` es el descendiente que varía. */
export function variantGroupsFor(archive: ArchiveData, id: string): string[] {
  const groups = archive.relationships.flatMap((entry) =>
    entry.data.kind === 'parent-of' && entry.data.object.id === id && entry.data.variantGroup !== undefined ? [entry.data.variantGroup] : [],
  );
  return [...new Set(groups)];
}

/** Opciones de un grupo, en el orden en que aparecen en los datos. */
export function variantOptions(archive: ArchiveData, group: string): string[] {
  const options = archive.relationships.flatMap((entry) =>
    entry.data.variantGroup === group && entry.data.variantOption !== undefined ? [entry.data.variantOption] : [],
  );
  return [...new Set(options)];
}

/** «A, B y C». */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`;
}

