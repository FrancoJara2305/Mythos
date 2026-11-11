/**
 * Vecindario de una figura (docs/design_guidelines.md, «Genealogy Explorer»): sus progenitores,
 * uniones y descendientes en la combinación de variantes elegida, más los otros progenitores de esa
 * descendencia (para que cada filiación se lea completa). Nunca se mezclan dos opciones de un mismo
 * grupo de variantes. Máximo `NODE_LIMIT` figuras dibujadas; el resto se nombra como omitido.
 */
import { edgeVisible, type GenealogyData, type GenealogyEdge, type GenealogyGroup, type GenealogyState } from './model.ts';

export const NODE_LIMIT = 24;

export type NodeRole = 'focus' | 'parent' | 'consort' | 'child' | 'co-parent';

export interface Neighbourhood {
  focus: string;
  parents: string[];
  consorts: string[];
  children: string[];
  /** Otros progenitores de la descendencia que no son uniones registradas de la figura. */
  coParents: string[];
  /** Figuras dibujadas, por prioridad: figura, progenitores, uniones, descendencia, otros progenitores. */
  nodes: string[];
  roles: Map<string, NodeRole>;
  /** Aristas visibles entre figuras dibujadas. */
  edges: GenealogyEdge[];
  /** Figuras relacionadas que no caben en el límite (siguen en la lista completa). */
  omitted: string[];
  /** Grupos de variantes con alguna arista (de cualquier opción) que toque a la figura. */
  groups: GenealogyGroup[];
}

const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];

export function neighbourhood(data: GenealogyData, state: GenealogyState, limit = NODE_LIMIT): Neighbourhood {
  if (limit < 1) throw new RangeError('El límite de nodos debe ser al menos 1.');
  const { focus, choice } = state;
  const visible = data.edges.filter((edge) => edgeVisible(edge, choice));

  const parentEdges = visible.filter((edge) => edge.kind === 'parent-of' && edge.object === focus);
  const consortEdges = visible.filter((edge) => edge.kind === 'consort-of' && (edge.subject === focus || edge.object === focus));
  const childEdges = visible.filter((edge) => edge.kind === 'parent-of' && edge.subject === focus);

  const parents = unique(parentEdges.map((edge) => edge.subject));
  const consorts = unique(consortEdges.map((edge) => (edge.subject === focus ? edge.object : edge.subject)));
  const children = unique(childEdges.map((edge) => edge.object));
  const coParentEdges = visible.filter((edge) => edge.kind === 'parent-of' && children.includes(edge.object) && edge.subject !== focus);
  const coParents = unique(coParentEdges.map((edge) => edge.subject)).filter((id) => !consorts.includes(id) && !parents.includes(id));

  const ordered = unique([focus, ...parents, ...consorts, ...children, ...coParents]);
  const nodes = ordered.slice(0, limit);
  const drawn = new Set(nodes);
  const omitted = ordered.slice(limit);

  const roles = new Map<string, NodeRole>();
  roles.set(focus, 'focus');
  for (const [ids, role] of [
    [parents, 'parent'],
    [consorts, 'consort'],
    [children, 'child'],
    [coParents, 'co-parent'],
  ] as const) {
    for (const id of ids) if (drawn.has(id) && !roles.has(id)) roles.set(id, role);
  }

  const edges = unique([...parentEdges, ...consortEdges, ...childEdges, ...coParentEdges]).filter(
    (edge) => drawn.has(edge.subject) && drawn.has(edge.object),
  );

  const touching = new Set(
    data.edges.flatMap((edge) => (edge.variant !== undefined && (edge.subject === focus || edge.object === focus) ? [edge.variant.group] : [])),
  );
  const groups = data.groups.filter((group) => touching.has(group.id));

  return {
    focus,
    parents: parents.filter((id) => drawn.has(id)),
    consorts: consorts.filter((id) => drawn.has(id)),
    children: children.filter((id) => drawn.has(id)),
    coParents: coParents.filter((id) => drawn.has(id)),
    nodes,
    roles,
    edges,
    omitted,
    groups,
  };
}
