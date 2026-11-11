/**
 * Marcado del Genealogy Explorer como cadena HTML/SVG. Una sola fuente para el primer render del
 * build (sin JS: `interactive: false`) y para la isla del cliente (`interactive: true`), de modo que
 * el diagrama y su lista equivalente no divergen. Todo texto pasa por `escape`; los fragmentos
 * griegos se marcan con `lang="grc"`.
 *
 * El SVG es una vista de la lista (`aria-hidden`): toda su información está en HTML.
 */
import { splitGreek } from '../text/greek.ts';
import { entityMap, type GenealogyCitation, type GenealogyData, type GenealogyEdge, type GenealogyState } from './model.ts';
import { layoutNeighbourhood, NODE_HEIGHT, NODE_WIDTH } from './layout.ts';
import { neighbourhood, type Neighbourhood, type NodeRole } from './neighbourhood.ts';
import { FAMILY_ANCHOR_PREFIX } from './state.ts';

export interface RenderOptions {
  /** Controles con botones (cliente). Sin JS: enlaces a la lista completa y sin selector de variantes. */
  interactive: boolean;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escape(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

/** Texto escapado con los fragmentos griegos envueltos (`span` en HTML, `tspan` en SVG). */
export function mixed(text: string, element: 'span' | 'tspan' = 'span'): string {
  return splitGreek(text)
    .map((segment) => (segment.greek ? `<${element} lang="grc">${escape(segment.text)}</${element}>` : escape(segment.text)))
    .join('');
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`;
}

const ROLE_LABELS: Record<Exclude<NodeRole, 'parent'>, string> = {
  focus: 'figura elegida',
  consort: 'unión',
  child: 'descendencia',
  'co-parent': 'descendencia común',
};

class ViewRenderer {
  readonly #data: GenealogyData;
  readonly #names: Map<string, string>;
  readonly #entities: ReturnType<typeof entityMap>;
  readonly #roster: Set<string>;
  readonly #interactive: boolean;

  constructor(data: GenealogyData, options: RenderOptions) {
    this.#data = data;
    this.#entities = entityMap(data);
    this.#names = new Map(data.entities.map((entity) => [entity.id, entity.name]));
    this.#roster = new Set(data.roster);
    this.#interactive = options.interactive;
  }

  name(id: string): string {
    return this.#names.get(id) ?? id;
  }

  optionLabel(group: string, option: string): string {
    return this.#data.groups.find((item) => item.id === group)?.options.find((item) => item.id === option)?.label ?? option;
  }

  entityName(id: string): string {
    const entity = this.#entities.get(id);
    const name = escape(this.name(id));
    if (entity?.href !== undefined) return `<a class="gv-name" href="${escape(entity.href)}">${name}</a>`;
    return `<span class="gv-name">${name}</span> <span class="gv-muted">(sin ficha propia)</span>`;
  }

  refocus(id: string): string {
    const label = `Ver su familia<span class="visually-hidden">: ${escape(this.name(id))}</span>`;
    if (this.#interactive) return `<button type="button" class="gv-refocus" data-deity="${escape(id)}">${label}</button>`;
    return this.#roster.has(id) ? `<a class="gv-refocus" href="#${FAMILY_ANCHOR_PREFIX}${escape(id)}">${label}</a>` : '';
  }

  citations(citations: readonly GenealogyCitation[]): string {
    if (citations.length === 0) return '';
    const items = citations.map((citation) => `<li><a href="${escape(citation.href)}">${escape(citation.label)}</a></li>`).join('');
    // Las referencias no se ven por defecto: quien quiera saber de dónde sale el dato abre el cajón.
    return (
      '<details class="gv-source"><summary>¿Cómo sabemos esto? <span class="gv-muted">(Ver fuente antigua)</span></summary>' +
      `<ul class="gv-cites" role="list" aria-label="Fuentes">${items}</ul></details>`
    );
  }

  meta(edge: GenealogyEdge, showVariant: boolean): string {
    const parts = [`Lo cuenta ${mixed(edge.tradition)}`];
    if (edge.certainty !== 'explícita') parts.push(`certeza ${escape(edge.certainty)}`);
    if (showVariant && edge.variant !== undefined) {
      parts.push(`<span class="gv-variant-tag">solo en la versión: ${escape(this.optionLabel(edge.variant.group, edge.variant.option))}</span>`);
    }
    const note = edge.note === undefined ? '' : `<p class="gv-note">${mixed(edge.note)}</p>`;
    return `<p class="gv-meta">${parts.join(' · ')}</p>${note}${this.citations(edge.citations)}`;
  }

  item(id: string, relation: string, edges: readonly GenealogyEdge[], showVariant: boolean, withRefocus = true): string {
    const meta = edges.map((edge) => this.meta(edge, showVariant)).join('');
    return `<li class="gv-relation"><p class="gv-relation__head">${this.entityName(id)}${relation === '' ? '' : ` — ${relation}`}</p>${meta}${withRefocus ? this.refocus(id) : ''}</li>`;
  }

  group(title: string, items: readonly string[], empty: string, level: 3 | 4 = 3): string {
    const body = items.length === 0 ? `<p class="gv-empty">${escape(empty)}</p>` : `<ul class="gv-relations" role="list">${items.join('')}</ul>`;
    return `<section class="gv-group"><h${level} class="gv-group__title">${escape(title)}</h${level}>${body}</section>`;
  }

  /** Listas de la vista: misma información que el diagrama, con fuentes. */
  lists(view: Neighbourhood): string {
    const { focus } = view;
    const edgesWith = (predicate: (edge: GenealogyEdge) => boolean) => view.edges.filter(predicate);
    const parents = view.parents.map((id) => {
      const edges = edgesWith((edge) => edge.kind === 'parent-of' && edge.subject === id && edge.object === focus);
      return this.item(id, mixed(edges[0]?.label ?? ''), edges, true);
    });
    const consorts = view.consorts.map((id) => {
      const edges = edgesWith((edge) => edge.kind === 'consort-of' && [edge.subject, edge.object].includes(id));
      return this.item(id, mixed(edges[0]?.label ?? ''), edges, true);
    });
    const children = view.children.map((id) => {
      const edges = edgesWith((edge) => edge.kind === 'parent-of' && edge.subject === focus && edge.object === id);
      const others = view.edges
        .filter((edge) => edge.kind === 'parent-of' && edge.object === id && edge.subject !== focus)
        .map((edge) => this.name(edge.subject));
      const relation = others.length === 0 ? '' : escape(`con ${joinNames(others)}`);
      return this.item(id, relation, edges, true);
    });
    const coParents = view.coParents.map((id) => {
      const edges = edgesWith((edge) => edge.kind === 'parent-of' && edge.subject === id);
      const label = edges[0]?.label ?? '';
      const of = joinNames(edges.map((edge) => this.name(edge.object)));
      return this.item(id, mixed(`${label} de ${of}`), [], false);
    });
    const name = this.name(focus);
    const omitted =
      view.omitted.length === 0
        ? ''
        : `<p class="gv-omitted">No caben en el diagrama (límite de figuras): ${escape(joinNames(view.omitted.map((id) => this.name(id))))}. Elige otra figura para verlas.</p>`;
    return [
      this.group('Filiación', parents, `Ninguna filiación de ${name} registrada en esta versión.`),
      this.group('Uniones', consorts, `Ninguna unión de ${name} registrada.`),
      this.group('Descendencia', children, `Ninguna descendencia de ${name} registrada en esta versión.`),
      coParents.length > 0 ? this.group('Otros progenitores de su descendencia', coParents, '') : '',
      omitted,
    ].join('');
  }

  variants(view: Neighbourhood, state: GenealogyState): string {
    if (view.groups.length === 0) return '';
    if (!this.#interactive) {
      const shown = view.groups.map((group) => `${escape(group.label)}: ${escape(this.optionLabel(group.id, state.choice[group.id] ?? group.defaultOption))}`);
      return `<p class="gv-variants-note">Versión mostrada — ${shown.join(' · ')}. Las demás versiones figuran en «Todas las relaciones del capítulo».</p>`;
    }
    const fieldsets = view.groups.map((group) => {
      const options = group.options.map((option) => {
        const checked = (state.choice[group.id] ?? group.defaultOption) === option.id ? ' checked' : '';
        const evidence = this.#data.edges
          .filter((edge) => edge.variant?.group === group.id && edge.variant.option === option.id)
          .map(
            (edge) =>
              `<li>${escape(this.name(edge.subject))} → ${escape(this.name(edge.object))}: ${mixed(edge.label)}${this.citations(edge.citations)}</li>`,
          )
          .join('');
        const defaultMark = option.id === group.defaultOption ? ' <span class="gv-muted">(por defecto)</span>' : '';
        return `<div class="gv-option"><label class="gv-option__label"><input type="radio" name="gv-${escape(group.id)}" value="${escape(option.id)}" data-group="${escape(group.id)}"${checked}> <span class="gv-option__teller">Según ${escape(option.label)}</span>${defaultMark}</label><ul class="gv-option__evidence" role="list">${evidence}</ul></div>`;
      });
      return `<fieldset class="gv-variant"><legend>${escape(group.label)}</legend>${options.join('')}</fieldset>`;
    });
    return `<div class="gv-variants"><p class="gv-variants-eyebrow">Dos tradiciones contadas por los antiguos bardos</p><p class="gv-variants-intro">No todos los poetas contaban lo mismo. Elige a quién quieres escuchar: el mapa dibuja solo esa tradición, sin mezclarla con la otra.</p>${fieldsets.join('')}</div>`;
  }

  svg(view: Neighbourhood): string {
    const layout = layoutNeighbourhood(view, this.#data);
    const edges = layout.edges
      .map((edge) => {
        const classes = ['gv-edge', `gv-edge--${edge.kind === 'parent-of' ? 'parent' : 'consort'}`, edge.variant ? 'gv-edge--variant' : ''].join(' ').trim();
        const marker = edge.kind === 'parent-of' ? ' marker-end="url(#gv-arrow)"' : '';
        return `<path class="${classes}" d="${edge.d}"${marker}/>`;
      })
      .join('');
    const nodes = layout.nodes
      .map((node) => {
        const parentEdge = view.edges.find((edge) => edge.kind === 'parent-of' && edge.subject === node.id && edge.object === view.focus);
        const role = node.role === 'parent' ? (parentEdge?.label ?? 'progenitor') : ROLE_LABELS[node.role];
        const selectable = this.#interactive && node.role !== 'focus' ? ` data-deity="${escape(node.id)}"` : '';
        const x = node.x - NODE_WIDTH / 2;
        const y = node.y - NODE_HEIGHT / 2;
        return (
          `<g class="gv-node gv-node--${node.role}"${selectable}>` +
          `<rect x="${x}" y="${y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="${NODE_HEIGHT / 2}"/>` +
          `<circle class="gv-node__star" cx="${x + 16}" cy="${node.y}" r="4"/>` +
          // El texto se centra en el hueco que deja el punto estelar, no en la píldora entera.
          `<text class="gv-node__name" x="${node.x + 5}" y="${node.y - 3}">${escape(this.name(node.id))}</text>` +
          `<text class="gv-node__role" x="${node.x + 5}" y="${node.y + 17}">${mixed(role, 'tspan')}</text>` +
          '</g>'
        );
      })
      .join('');
    const defs =
      '<defs><marker id="gv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0L10 5L0 10z"/></marker></defs>';
    return (
      `<svg class="gv-svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}" ` +
      `style="--natural-width: ${layout.width}" aria-hidden="true" focusable="false">${defs}<g class="gv-edges">${edges}</g><g class="gv-nodes">${nodes}</g></svg>`
    );
  }

  view(state: GenealogyState): string {
    const view = neighbourhood(this.#data, state);
    const name = escape(this.name(state.focus));
    const legend =
      '<figcaption class="gv-legend"><ul role="list">' +
      '<li><svg viewBox="0 0 40 12" aria-hidden="true"><path class="gv-edge gv-edge--parent" d="M2 6H32" marker-end="url(#gv-arrow)"/></svg> Filiación: la flecha va del progenitor a su descendencia; no indica jerarquía.</li>' +
      '<li><svg viewBox="0 0 40 12" aria-hidden="true"><path class="gv-edge gv-edge--consort" d="M2 6H38"/></svg> Unión registrada en las fuentes.</li>' +
      '<li><svg viewBox="0 0 40 12" aria-hidden="true"><path class="gv-edge gv-edge--parent gv-edge--variant" d="M2 6H38"/></svg> Relación que solo existe en la versión elegida.</li>' +
      '</ul></figcaption>';
    return (
      `<div class="gv" data-focus="${escape(state.focus)}">` +
      `<h2 class="gv__title" id="genealogia-vista" tabindex="-1">Linaje de ${name}</h2>` +
      `<p class="gv__summary">${escape(describe(view, this.#data))}</p>` +
      // Primero el diagrama (foco de la pantalla); después, el panel de detalle: versiones y listas.
      '<figure class="gv__figure">' +
      `<div class="gv__scroll" role="region" tabindex="0" aria-label="Diagrama de la familia de ${name}; el panel siguiente contiene la misma información">${this.svg(view)}</div>` +
      legend +
      '</figure>' +
      '<div class="gv__panel">' +
      this.variants(view, state) +
      `<div class="gv__lists">${this.lists(view)}</div>` +
      '</div>' +
      '</div>'
    );
  }

  /** Sección de la lista completa (sin JS): todas las relaciones de una figura, con sus versiones rotuladas. */
  family(id: string): string {
    const edges = this.#data.edges;
    const parents = edges.filter((edge) => edge.kind === 'parent-of' && edge.object === id);
    const consorts = edges.filter((edge) => edge.kind === 'consort-of' && (edge.subject === id || edge.object === id));
    const children = edges.filter((edge) => edge.kind === 'parent-of' && edge.subject === id);
    const group = (title: string, list: readonly GenealogyEdge[], other: (edge: GenealogyEdge) => string, relation: (edge: GenealogyEdge) => string, empty: string) =>
      this.group(
        title,
        list.map((edge) => this.item(other(edge), relation(edge), [edge], true, false)),
        empty,
        4,
      );
    return (
      `<section class="gv-family" id="${FAMILY_ANCHOR_PREFIX}${escape(id)}" aria-labelledby="${FAMILY_ANCHOR_PREFIX}${escape(id)}-titulo">` +
      `<h3 class="gv-family__title" id="${FAMILY_ANCHOR_PREFIX}${escape(id)}-titulo">${this.entityName(id)}</h3>` +
      '<div class="gv-family__groups">' +
      group('Filiación', parents, (edge) => edge.subject, (edge) => mixed(edge.label), 'Sin filiación registrada.') +
      group('Uniones', consorts, (edge) => (edge.subject === id ? edge.object : edge.subject), (edge) => mixed(edge.label), 'Sin uniones registradas.') +
      group('Descendencia', children, (edge) => edge.object, () => '', 'Sin descendencia registrada.') +
      '</div></section>'
    );
  }
}

export function describe(view: Neighbourhood, data: GenealogyData): string {
  const name = data.entities.find((entity) => entity.id === view.focus)?.name ?? view.focus;
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return (
    `${name}: ${count(view.parents.length, 'progenitor', 'progenitores')}, ${count(view.consorts.length, 'unión', 'uniones')} ` +
    `y ${count(view.children.length, 'descendiente', 'descendientes')} en las versiones elegidas.`
  );
}

export function renderView(data: GenealogyData, state: GenealogyState, options: RenderOptions): string {
  return new ViewRenderer(data, options).view(state);
}

export function renderFamily(data: GenealogyData, id: string): string {
  return new ViewRenderer(data, { interactive: false }).family(id);
}
