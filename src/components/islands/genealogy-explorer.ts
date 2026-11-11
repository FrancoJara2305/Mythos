/**
 * Isla del Genealogy Explorer (custom element `<mythos-genealogy>`). Mejora progresiva: sin JS la
 * página ya muestra una vista por defecto y la lista completa. Con JS:
 *
 * - lee los datos mínimos del `<script type="application/json">` de la propia isla;
 * - el estado (figura y variantes) vive en el fragmento (`#deity=…`), con historial: atrás/adelante
 *   restauran la vista;
 * - re-renderiza con el mismo marcado que el build (`renderView`) y gestiona el foco: el selector
 *   conserva el foco, un botón «Ver su familia» lo lleva al título de la nueva vista y un cambio de
 *   variante lo devuelve a la opción elegida; un `role="status"` anuncia el cambio;
 * - si el diagrama es más ancho que su escenario (móvil), lo desplaza para centrar la figura elegida;
 * - libera sus listeners en `disconnectedCallback`.
 */
import type { GenealogyData, GenealogyState } from '../../lib/genealogy/model.ts';
import { neighbourhood } from '../../lib/genealogy/neighbourhood.ts';
import { describe, renderView } from '../../lib/genealogy/render.ts';
import { parseState, sameState, serializeState } from '../../lib/genealogy/state.ts';

type FocusTarget = { kind: 'none' } | { kind: 'title'; scroll: boolean } | { kind: 'radio'; group: string; value: string };

class GenealogyExplorer extends HTMLElement {
  #data: GenealogyData | undefined;
  #state: GenealogyState | undefined;
  #view: HTMLElement | undefined;
  #status: HTMLElement | undefined;

  readonly #onClick = (event: MouseEvent) => {
    if (this.#data === undefined || this.#state === undefined) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement | SVGElement>('[data-deity]') : null;
    if (target === null || !this.contains(target)) return;
    const focus = target.dataset['deity'];
    if (focus === undefined) return;
    event.preventDefault();
    const fromPicker = target.closest('[data-picker]') !== null;
    const fromDiagram = target.closest('svg') !== null;
    this.#navigate({ ...this.#state, focus }, fromPicker ? { kind: 'none' } : { kind: 'title', scroll: !fromDiagram });
  };

  readonly #onChange = (event: Event) => {
    if (this.#state === undefined) return;
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;
    const group = input.dataset['group'];
    if (group === undefined) return;
    this.#navigate({ ...this.#state, choice: { ...this.#state.choice, [group]: input.value } }, { kind: 'radio', group, value: input.value });
  };

  readonly #onHistory = () => {
    if (this.#data === undefined) return;
    const next = parseState(window.location.hash, this.#data);
    if (this.#state !== undefined && sameState(next, this.#state, this.#data)) return;
    this.#apply(next, { kind: 'none' }, true);
  };

  connectedCallback(): void {
    const source = this.querySelector('script[data-genealogy]');
    const view = this.querySelector<HTMLElement>('[data-view]');
    if (source?.textContent == null || view === null) return;
    this.#data = JSON.parse(source.textContent) as GenealogyData;
    this.#view = view;
    this.#status = this.querySelector<HTMLElement>('[data-status]') ?? undefined;
    this.addEventListener('click', this.#onClick);
    this.addEventListener('change', this.#onChange);
    window.addEventListener('popstate', this.#onHistory);
    window.addEventListener('hashchange', this.#onHistory);
    this.#apply(parseState(window.location.hash, this.#data), { kind: 'none' }, false);
    this.dataset['ready'] = 'true';
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('change', this.#onChange);
    window.removeEventListener('popstate', this.#onHistory);
    window.removeEventListener('hashchange', this.#onHistory);
    delete this.dataset['ready'];
  }

  #navigate(state: GenealogyState, focus: FocusTarget): void {
    if (this.#data === undefined || (this.#state !== undefined && sameState(state, this.#state, this.#data))) return;
    window.history.pushState(null, '', serializeState(state, this.#data));
    this.#apply(state, focus, true);
  }

  #apply(state: GenealogyState, focus: FocusTarget, announce: boolean): void {
    if (this.#data === undefined || this.#view === undefined) return;
    this.#state = state;
    this.#view.innerHTML = renderView(this.#data, state, { interactive: true });
    for (const link of this.querySelectorAll<HTMLElement>('[data-picker] [data-deity]')) {
      if (link.dataset['deity'] === state.focus) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    this.#centerFocus();
    if (announce && this.#status !== undefined) {
      this.#status.textContent = describe(neighbourhood(this.#data, state), this.#data);
    }
    if (focus.kind === 'title') {
      this.#view.querySelector<HTMLElement>('.gv__title')?.focus({ preventScroll: !focus.scroll });
    } else if (focus.kind === 'radio') {
      this.#view.querySelector<HTMLInputElement>(`input[data-group="${CSS.escape(focus.group)}"][value="${CSS.escape(focus.value)}"]`)?.focus();
    }
  }

  /** Centra la figura elegida en el escenario desplazable; instantáneo, sin animación. */
  #centerFocus(): void {
    const stage = this.#view?.querySelector<HTMLElement>('.gv__scroll');
    const node = stage?.querySelector('.gv-node--focus');
    if (stage == null || node == null || stage.scrollWidth <= stage.clientWidth) return;
    const stageBox = stage.getBoundingClientRect();
    const nodeBox = node.getBoundingClientRect();
    stage.scrollLeft += nodeBox.left + nodeBox.width / 2 - (stageBox.left + stageBox.width / 2);
  }
}

if (customElements.get('mythos-genealogy') === undefined) {
  customElements.define('mythos-genealogy', GenealogyExplorer);
}
