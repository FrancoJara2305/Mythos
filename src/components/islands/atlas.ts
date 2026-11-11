/**
 * Isla del Temporal Atlas (`<mythos-atlas>`). Sin JS se ven las dos temporalidades una tras otra,
 * completas. Con JS:
 *
 * - el control «El hilo de los relatos / Los testigos del tiempo» muestra una de las dos;
 * - el selector de divinidad filtra las dos vistas sin fusionar sus escalas: oculta tarjetas y atenúa
 *   marcas del diagrama (la escala histórica no cambia);
 * - el estado vive en el fragmento (`#vista=testimonios&deidad=zeus`), con atrás/adelante; los
 *   fragmentos `#relatos`, `#testimonios` y `#evento-…` eligen la vista que los contiene;
 * - un `role="status"` resume el resultado; los controles conservan el foco.
 */

type Mode = 'relatos' | 'testimonios';

interface AtlasState {
  mode: Mode;
  deity: string;
}

const DEFAULT: AtlasState = { mode: 'relatos', deity: '' };
const MODES: readonly Mode[] = ['relatos', 'testimonios'];

class TemporalAtlas extends HTMLElement {
  #state: AtlasState = DEFAULT;
  #deities = new Set<string>();

  readonly #onClick = (event: MouseEvent) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-mode-button]') : null;
    if (button === null || !this.contains(button)) return;
    const mode = button.dataset['modeButton'];
    if (mode === 'relatos' || mode === 'testimonios') this.#navigate({ ...this.#state, mode });
  };

  readonly #onChange = (event: Event) => {
    if (event.target instanceof HTMLSelectElement && event.target.matches('[data-deity-filter]')) {
      this.#navigate({ ...this.#state, deity: event.target.value });
    }
  };

  readonly #onHistory = () => {
    const next = this.#parse(window.location.hash);
    if (next.mode !== this.#state.mode || next.deity !== this.#state.deity) this.#apply(next, true);
  };

  connectedCallback(): void {
    const select = this.querySelector<HTMLSelectElement>('[data-deity-filter]');
    this.#deities = new Set([...(select?.options ?? [])].map((option) => option.value).filter((value) => value !== ''));
    this.querySelector<HTMLElement>('[data-controls]')?.removeAttribute('hidden');
    this.addEventListener('click', this.#onClick);
    this.addEventListener('change', this.#onChange);
    window.addEventListener('popstate', this.#onHistory);
    window.addEventListener('hashchange', this.#onHistory);
    this.#apply(this.#parse(window.location.hash), false);
    this.dataset['ready'] = 'true';
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('change', this.#onChange);
    window.removeEventListener('popstate', this.#onHistory);
    window.removeEventListener('hashchange', this.#onHistory);
    delete this.dataset['ready'];
  }

  #parse(hash: string): AtlasState {
    const raw = decodeURIComponent(hash.replace(/^#/, ''));
    if (raw === '') return DEFAULT;
    if (!raw.includes('=')) {
      // Ancla de una sección o de una tarjeta: se abre la vista que la contiene.
      const target = raw === '' ? null : document.getElementById(raw);
      const section = target?.closest<HTMLElement>('[data-mode]');
      const mode = section?.dataset['mode'];
      return { ...DEFAULT, mode: mode === 'testimonios' ? 'testimonios' : 'relatos' };
    }
    const params = new URLSearchParams(raw);
    const mode = params.get('vista');
    const deity = params.get('deidad') ?? '';
    return {
      mode: MODES.includes(mode as Mode) ? (mode as Mode) : DEFAULT.mode,
      deity: this.#deities.has(deity) ? deity : '',
    };
  }

  #serialize(state: AtlasState): string {
    const params = new URLSearchParams();
    if (state.mode !== DEFAULT.mode) params.set('vista', state.mode);
    if (state.deity !== '') params.set('deidad', state.deity);
    const query = params.toString();
    return query === '' ? `${window.location.pathname}${window.location.search}` : `#${query}`;
  }

  #navigate(state: AtlasState): void {
    if (state.mode === this.#state.mode && state.deity === this.#state.deity) return;
    window.history.pushState(null, '', this.#serialize(state));
    this.#apply(state, true);
  }

  #apply(state: AtlasState, announce: boolean): void {
    this.#state = state;
    for (const section of this.querySelectorAll<HTMLElement>('[data-mode]')) {
      section.hidden = section.dataset['mode'] !== state.mode;
    }
    for (const button of this.querySelectorAll<HTMLButtonElement>('button[data-mode-button]')) {
      button.setAttribute('aria-pressed', String(button.dataset['modeButton'] === state.mode));
    }
    const select = this.querySelector<HTMLSelectElement>('[data-deity-filter]');
    if (select !== null) select.value = state.deity;

    const matches = (element: Element) => state.deity === '' || (element.getAttribute('data-entities') ?? '').split(' ').includes(state.deity);
    for (const mark of this.querySelectorAll('.ta-mark[data-entities]')) mark.classList.toggle('is-muted', !matches(mark));

    let visible = 0;
    let total = 0;
    for (const list of this.querySelectorAll<HTMLElement>('[data-filterable]')) {
      let shown = 0;
      for (const item of list.querySelectorAll<HTMLElement>(':scope > [data-entities]')) {
        item.hidden = !matches(item);
        if (!item.hidden) shown += 1;
        if (list.closest('[data-mode]')?.getAttribute('data-mode') === state.mode) {
          total += 1;
          if (!item.hidden) visible += 1;
        }
      }
      const empty = list.parentElement?.querySelector<HTMLElement>(':scope > [data-empty]');
      if (empty !== null && empty !== undefined) empty.hidden = shown > 0;
    }

    if (announce) {
      const status = this.querySelector<HTMLElement>('[data-status]');
      const modeLabel = state.mode === 'relatos' ? 'El hilo de los relatos' : 'Los testigos del tiempo';
      const name = select?.selectedOptions[0]?.textContent?.trim();
      if (status !== null) {
        status.textContent =
          state.deity === '' ? `${modeLabel}: ${total} entradas.` : `${modeLabel}, ${name}: ${visible} de ${total} entradas la mencionan.`;
      }
    }
  }
}

if (customElements.get('mythos-atlas') === undefined) {
  customElements.define('mythos-atlas', TemporalAtlas);
}
