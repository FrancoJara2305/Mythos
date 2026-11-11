/**
 * Datos mínimos del Genealogy Explorer (Phase 5). Se serializan en la página como JSON y los usan
 * tanto el build (primer render, sin JS) como la isla del cliente: solo IDs, nombres, aristas con
 * su rótulo y las citas ya resueltas a enlaces. Nada de cuerpos de texto ni del corpus completo.
 */

export interface GenealogyEntity {
  id: string;
  name: string;
  /** `full`: tiene ficha propia; `context`: figura explicada en notas. */
  profile: 'full' | 'context';
  /** Ficha de la entidad, si existe. */
  href?: string | undefined;
}

export interface GenealogyCitation {
  /** Localizador legible, p. ej. «Teogonía 453–458». */
  label: string;
  href: string;
}

export interface GenealogyEdge {
  id: string;
  kind: 'parent-of' | 'consort-of';
  /** `parent-of`: progenitor → descendiente. `consort-of`: guardado una sola vez. */
  subject: string;
  object: string;
  /** Rótulo de la fuente: «padre», «madre», «esposa»… */
  label: string;
  tradition: string;
  /** Certeza ya traducida («explícita», «probable»…). */
  certainty: string;
  variant?: { group: string; option: string } | undefined;
  note?: string | undefined;
  citations: GenealogyCitation[];
}

export interface GenealogyOption {
  id: string;
  label: string;
}

export interface GenealogyGroup {
  id: string;
  label: string;
  options: GenealogyOption[];
  defaultOption: string;
}

export interface GenealogyData {
  /** Divinidades del capítulo, en el orden de la sala. */
  roster: string[];
  defaultFocus: string;
  entities: GenealogyEntity[];
  edges: GenealogyEdge[];
  groups: GenealogyGroup[];
}

/** Opción elegida por grupo de variantes. */
export type VariantChoice = Readonly<Record<string, string>>;

export interface GenealogyState {
  focus: string;
  choice: VariantChoice;
}

/** Una arista sin grupo se ve siempre; con grupo, solo en la opción elegida. */
export function edgeVisible(edge: GenealogyEdge, choice: VariantChoice): boolean {
  return edge.variant === undefined || choice[edge.variant.group] === edge.variant.option;
}

export function entityMap(data: GenealogyData): Map<string, GenealogyEntity> {
  return new Map(data.entities.map((entity) => [entity.id, entity]));
}
