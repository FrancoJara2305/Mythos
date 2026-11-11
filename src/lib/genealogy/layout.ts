/**
 * Disposición determinista por generación editorial (sin simulación de fuerzas): fila 0, progenitores;
 * fila 1, la figura en el centro con sus uniones a los lados y los otros progenitores más afuera;
 * fila 2, descendencia agrupada bajo su otro progenitor. Mismos datos → mismas coordenadas.
 * La flecha indica la dirección de la filiación, no una jerarquía.
 */
import type { GenealogyData } from './model.ts';
import type { Neighbourhood, NodeRole } from './neighbourhood.ts';

export const SLOT = 196;
export const NODE_WIDTH = 176;
export const NODE_HEIGHT = 56;
const ROW_GAP = 128;
const PADDING_X = 24;
const PADDING_TOP = 56;
const PADDING_BOTTOM = 24;

export interface NodePlacement {
  id: string;
  role: NodeRole;
  row: number;
  /** Centro del nodo. */
  x: number;
  y: number;
}

export interface EdgePlacement {
  id: string;
  kind: 'parent-of' | 'consort-of';
  variant: boolean;
  d: string;
}

export interface GenealogyLayout {
  width: number;
  height: number;
  nodes: NodePlacement[];
  edges: EdgePlacement[];
}

const round = (value: number) => Math.round(value * 10) / 10;

/** Figura en el centro; los demás alternan derecha e izquierda en su orden. */
function aroundCentre(centre: string, others: readonly string[]): string[] {
  const left: string[] = [];
  const right: string[] = [];
  others.forEach((id, index) => (index % 2 === 0 ? right.push(id) : left.unshift(id)));
  return [...left, centre, ...right];
}

export function layoutNeighbourhood(view: Neighbourhood, data: GenealogyData): GenealogyLayout {
  const names = new Map(data.entities.map((entity) => [entity.id, entity.name]));
  const collator = new Intl.Collator('es');

  const row0 = view.parents;
  const row1 = aroundCentre(view.focus, [...view.consorts, ...view.coParents]);
  const row1Index = new Map(row1.map((id, index) => [id, index]));
  const focusIndex = row1Index.get(view.focus) ?? 0;
  // La figura ocupa siempre el centro: su fila reserva tantos huecos a un lado como al otro.
  const halfRow1 = Math.max(focusIndex, row1.length - 1 - focusIndex);
  // Descendencia bajo su otro progenitor (o bajo la figura si no lo tiene), luego por nombre.
  const anchorOf = (child: string) => {
    const other = view.edges.find((edge) => edge.kind === 'parent-of' && edge.object === child && edge.subject !== view.focus);
    return other === undefined ? focusIndex : (row1Index.get(other.subject) ?? focusIndex);
  };
  const row2 = [...view.children].sort(
    (a, b) => anchorOf(a) - anchorOf(b) || collator.compare(names.get(a) ?? a, names.get(b) ?? b),
  );

  const rows = [row0, row1, row2].filter((row, index) => index === 1 || row.length > 0);
  const widest = Math.max(row0.length, 2 * halfRow1 + 1, row2.length);
  const width = widest * SLOT + 2 * PADDING_X;
  const height = PADDING_TOP + rows.length * NODE_HEIGHT + (rows.length - 1) * ROW_GAP + PADDING_BOTTOM;
  const centre = width / 2;

  const nodes: NodePlacement[] = [];
  rows.forEach((row, rowIndex) => {
    const y = PADDING_TOP + NODE_HEIGHT / 2 + rowIndex * (NODE_HEIGHT + ROW_GAP);
    const isFocusRow = row === row1;
    const start = centre - ((row.length - 1) * SLOT) / 2;
    row.forEach((id, index) => {
      const x = isFocusRow ? centre + (index - focusIndex) * SLOT : start + index * SLOT;
      nodes.push({ id, role: view.roles.get(id) ?? 'co-parent', row: rowIndex, x: round(x), y: round(y) });
    });
  });
  const at = new Map(nodes.map((node) => [node.id, node]));

  const edges: EdgePlacement[] = view.edges.flatMap((edge): EdgePlacement[] => {
    const a = at.get(edge.subject);
    const b = at.get(edge.object);
    if (a === undefined || b === undefined) return [];
    const variant = edge.variant !== undefined;
    if (edge.kind === 'parent-of') {
      const y1 = a.y + NODE_HEIGHT / 2;
      const y2 = b.y - NODE_HEIGHT / 2 - 4;
      const mid = (y1 + y2) / 2;
      return [{ id: edge.id, kind: edge.kind, variant, d: `M${a.x} ${round(y1)}C${a.x} ${round(mid)} ${b.x} ${round(mid)} ${b.x} ${round(y2)}` }];
    }
    // Unión: línea recta entre nodos contiguos; arco por encima de la fila si hay otros en medio.
    const [left, right] = a.x <= b.x ? [a, b] : [b, a];
    if (Math.abs((row1Index.get(a.id) ?? 0) - (row1Index.get(b.id) ?? 0)) === 1 && a.row === b.row) {
      return [{ id: edge.id, kind: edge.kind, variant, d: `M${round(left.x + NODE_WIDTH / 2)} ${left.y}H${round(right.x - NODE_WIDTH / 2)}` }];
    }
    const top = Math.min(left.y, right.y) - NODE_HEIGHT / 2;
    const lift = round(top - 36);
    return [{ id: edge.id, kind: edge.kind, variant, d: `M${left.x} ${round(top)}C${left.x} ${lift} ${right.x} ${lift} ${right.x} ${round(top)}` }];
  });

  return { width: round(width), height: round(height), nodes, edges };
}
