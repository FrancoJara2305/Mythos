/**
 * Genealogy Explorer (Phase 5): estado en el fragmento, vecindario sin mezclar variantes y con
 * límite de figuras, disposición determinista y marcado escapado con el griego marcado.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { layoutNeighbourhood, NODE_WIDTH, SLOT } from '../../src/lib/genealogy/layout.ts';
import type { GenealogyData, GenealogyEdge } from '../../src/lib/genealogy/model.ts';
import { NODE_LIMIT, neighbourhood } from '../../src/lib/genealogy/neighbourhood.ts';
import { escape, mixed, renderFamily, renderView } from '../../src/lib/genealogy/render.ts';
import { defaultState, parseState, sameState, serializeState } from '../../src/lib/genealogy/state.ts';

const edge = (id: string, subject: string, object: string, extra: Partial<GenealogyEdge> = {}): GenealogyEdge => ({
  id,
  kind: 'parent-of',
  subject,
  object,
  label: 'progenitor',
  tradition: 'Hesíodo, Teogonía',
  certainty: 'explícita',
  citations: [{ label: 'Teogonía 453–458', href: '/sources/theogony/#p' }],
  ...extra,
});

function sample(): GenealogyData {
  const people = ['zeus', 'hera', 'aphrodite', 'ares', 'cronus', 'rhea', 'uranus', 'dione'];
  return {
    roster: ['zeus', 'hera', 'aphrodite', 'ares'],
    defaultFocus: 'zeus',
    entities: people.map((id) => ({
      id,
      name: id === 'zeus' ? 'Zeus' : id.charAt(0).toUpperCase() + id.slice(1),
      profile: ['zeus', 'hera', 'aphrodite', 'ares'].includes(id) ? 'full' : 'context',
      href: ['zeus', 'hera', 'aphrodite', 'ares'].includes(id) ? `/deities/${id}/` : undefined,
    })),
    edges: [
      edge('cronus-zeus', 'cronus', 'zeus', { label: 'padre' }),
      edge('rhea-zeus', 'rhea', 'zeus', { label: 'madre' }),
      edge('hera-zeus', 'hera', 'zeus', { kind: 'consort-of', label: 'esposa (ἄκοιτις)' }),
      edge('zeus-ares', 'zeus', 'ares'),
      edge('hera-ares', 'hera', 'ares'),
      edge('uranus-aphrodite', 'uranus', 'aphrodite', { label: 'origen (sin madre)', variant: { group: 'aphrodite-origin', option: 'hesiodic' } }),
      edge('zeus-aphrodite', 'zeus', 'aphrodite', { label: 'padre', variant: { group: 'aphrodite-origin', option: 'iliadic' } }),
      edge('dione-aphrodite', 'dione', 'aphrodite', { label: 'madre', variant: { group: 'aphrodite-origin', option: 'iliadic' } }),
    ],
    groups: [
      {
        id: 'aphrodite-origin',
        label: 'Origen de Afrodita',
        options: [
          { id: 'hesiodic', label: 'Teogonía' },
          { id: 'iliadic', label: 'Ilíada' },
        ],
        defaultOption: 'hesiodic',
      },
    ],
  };
}

describe('estado en el fragmento', () => {
  const data = sample();

  test('por defecto: primera figura y opción por defecto de cada grupo', () => {
    assert.deepEqual(defaultState(data), { focus: 'zeus', choice: { 'aphrodite-origin': 'hesiodic' } });
    assert.deepEqual(parseState('', data), defaultState(data));
  });

  test('lee figura y variante; ignora valores desconocidos', () => {
    assert.deepEqual(parseState('#deity=aphrodite&aphrodite-origin=iliadic', data), {
      focus: 'aphrodite',
      choice: { 'aphrodite-origin': 'iliadic' },
    });
    assert.deepEqual(parseState('#deity=nadie&aphrodite-origin=inventada&otro=1', data), defaultState(data));
  });

  test('el ancla de la lista completa también selecciona la figura', () => {
    assert.equal(parseState('#familia-hera', data).focus, 'hera');
    assert.equal(parseState('#familia-nadie', data).focus, 'zeus');
  });

  test('serializa solo lo que difiere del valor por defecto y es reversible', () => {
    assert.equal(serializeState(defaultState(data), data), '#deity=zeus');
    const state = { focus: 'aphrodite', choice: { 'aphrodite-origin': 'iliadic' } };
    const hash = serializeState(state, data);
    assert.equal(hash, '#deity=aphrodite&aphrodite-origin=iliadic');
    assert.ok(sameState(parseState(hash, data), state, data));
  });
});

describe('vecindario', () => {
  const data = sample();

  test('cada opción de variante da una filiación completa y nunca se mezclan', () => {
    const hesiodic = neighbourhood(data, { focus: 'aphrodite', choice: { 'aphrodite-origin': 'hesiodic' } });
    assert.deepEqual(hesiodic.parents, ['uranus']);
    const iliadic = neighbourhood(data, { focus: 'aphrodite', choice: { 'aphrodite-origin': 'iliadic' } });
    assert.deepEqual(iliadic.parents, ['zeus', 'dione']);
    for (const view of [hesiodic, iliadic]) {
      assert.ok(!(view.nodes.includes('uranus') && view.nodes.includes('dione')));
    }
    assert.deepEqual(
      iliadic.groups.map((group) => group.id),
      ['aphrodite-origin'],
    );
  });

  test('progenitores, uniones, descendencia y otros progenitores', () => {
    const zeus = neighbourhood(data, defaultState(data));
    assert.deepEqual(zeus.parents, ['cronus', 'rhea']);
    assert.deepEqual(zeus.consorts, ['hera']);
    assert.deepEqual(zeus.children, ['ares']);
    assert.deepEqual(zeus.coParents, []);
    assert.equal(zeus.roles.get('zeus'), 'focus');
    assert.ok(zeus.edges.every((item) => zeus.nodes.includes(item.subject) && zeus.nodes.includes(item.object)));
    // Zeus participa en una variante (padre en la versión ilíada): el grupo se ofrece aunque no esté activo.
    assert.deepEqual(
      zeus.groups.map((group) => group.id),
      ['aphrodite-origin'],
    );
  });

  test(`nunca dibuja más de ${NODE_LIMIT} figuras y nombra las omitidas`, () => {
    const big = sample();
    for (let index = 0; index < 40; index += 1) {
      big.entities.push({ id: `child-${index}`, name: `Hijo ${index}`, profile: 'context' });
      big.edges.push(edge(`zeus-child-${index}`, 'zeus', `child-${index}`));
    }
    const view = neighbourhood(big, defaultState(big));
    assert.equal(view.nodes.length, NODE_LIMIT);
    assert.equal(view.nodes.length + view.omitted.length, 1 + 2 + 1 + 41);
    assert.ok(view.nodes.includes('cronus') && view.nodes.includes('hera'), 'progenitores y uniones tienen prioridad');
    const layout = layoutNeighbourhood(view, big);
    assert.equal(layout.nodes.length, NODE_LIMIT);
  });
});

describe('disposición', () => {
  const data = sample();

  test('determinista, por generaciones y sin solapamientos', () => {
    const view = neighbourhood(data, defaultState(data));
    const first = layoutNeighbourhood(view, data);
    const second = layoutNeighbourhood(neighbourhood(data, defaultState(data)), data);
    assert.deepEqual(first, second);
    const rowOf = (id: string) => first.nodes.find((node) => node.id === id)?.row;
    assert.equal(rowOf('cronus'), 0);
    assert.equal(rowOf('zeus'), 1);
    assert.equal(rowOf('hera'), 1);
    assert.equal(rowOf('ares'), 2);
    for (const row of [0, 1, 2]) {
      const xs = first.nodes.filter((node) => node.row === row).map((node) => node.x).sort((a, b) => a - b);
      xs.slice(1).forEach((x, index) => assert.ok(x - (xs[index] ?? 0) >= SLOT - 0.1));
    }
    for (const node of first.nodes) {
      assert.ok(node.x - NODE_WIDTH / 2 >= 0 && node.x + NODE_WIDTH / 2 <= first.width, node.id);
    }
  });

  test('la figura queda en el centro de su fila', () => {
    const view = neighbourhood(data, { focus: 'hera', choice: { 'aphrodite-origin': 'hesiodic' } });
    const layout = layoutNeighbourhood(view, data);
    const focus = layout.nodes.find((node) => node.id === 'hera');
    assert.equal(focus?.x, layout.width / 2);
  });
});

describe('marcado', () => {
  const data = sample();

  test('escapa el texto y marca el griego', () => {
    assert.equal(escape('<b>"Zeus" & \'Hera\'</b>'), '&lt;b&gt;&quot;Zeus&quot; &amp; &#39;Hera&#39;&lt;/b&gt;');
    assert.equal(mixed('esposa (ἄκοιτις)'), 'esposa (<span lang="grc">ἄκοιτις</span>)');
    assert.equal(mixed('x ἄκοιτις', 'tspan'), 'x <tspan lang="grc">ἄκοιτις</tspan>');
    const hostile = sample();
    const zeus = hostile.entities.find((entity) => entity.id === 'zeus');
    if (zeus !== undefined) zeus.name = '<img src=x onerror=alert(1)>';
    const html = renderView(hostile, defaultState(hostile), { interactive: true });
    assert.ok(!html.includes('<img'), 'ningún nombre se inyecta como HTML');
  });

  test('sin JS: enlaces a la lista completa y sin selector de variantes', () => {
    const html = renderView(data, defaultState(data), { interactive: false });
    assert.match(html, /href="#familia-hera"/);
    assert.doesNotMatch(html, /type="radio"/);
    assert.doesNotMatch(html, /<button/);
    assert.doesNotMatch(html, /href="#familia-cronus"/, 'las figuras sin sección en la lista no reciben enlace roto');
    assert.match(html, /<svg[^>]*aria-hidden="true"/);
    assert.match(html, /Versión mostrada — Origen de Afrodita: Teogonía/);
  });

  test('con JS: botones y una opción marcada por grupo, con su evidencia', () => {
    const html = renderView(data, { focus: 'aphrodite', choice: { 'aphrodite-origin': 'iliadic' } }, { interactive: true });
    assert.match(html, /<button type="button" class="gv-refocus" data-deity="zeus">/);
    assert.equal((html.match(/ checked/g) ?? []).length, 1);
    assert.match(html, /value="iliadic" data-group="aphrodite-origin" checked/);
    assert.match(html, /Dione → Aphrodite: madre/);
    assert.match(html, /esposa \(<span lang="grc">|Zeus — padre|<a class="gv-name" href="\/deities\/zeus\/">Zeus<\/a> — padre/);
  });

  test('la lista completa de una figura rotula las versiones', () => {
    const html = renderFamily(data, 'aphrodite');
    assert.match(html, /id="familia-aphrodite"/);
    assert.match(html, /solo en la versión: Teogonía/);
    assert.match(html, /solo en la versión: Ilíada/);
  });
});
