/**
 * Isla del Planetario de Constelaciones (`<mythos-planetarium>`, GR-04). Este módulo no importa
 * Three.js: la escena (`src/lib/planetarium/scene.ts`) se carga con `import()` dinámico solo si el
 * navegador ofrece WebGL. Sin JavaScript o sin WebGL, la página es la lista completa de constelaciones
 * (HTML del build), con sus cuatro facetas legibles.
 *
 * Con la bóveda activa (`data-state="live"`):
 * - selector orbital, «anterior/siguiente» y clic en una constelación llevan la cámara hasta ella;
 * - cada estrella principal (o su pestaña en el panel) abre una faceta de la deidad en un panel
 *   narrativo, sin salir del cielo;
 * - el interruptor de tradición transforma el duodécimo asiento (Dioniso ↔ Hestia) en tiempo real;
 * - el estado vive en el fragmento (`#dios=zeus&faceta=origin&tradicion=hogar`), con atrás/adelante;
 * - un `role="status"` anuncia cada viaje; Escape vuelve a la vista general; flechas ← → cambian de
 *   constelación cuando el foco está en los controles de la bóveda.
 *
 * Las etiquetas del cielo y los nodos estelares son atajos de puntero (`aria-hidden`): el selector
 * orbital y las pestañas del panel son sus equivalentes accesibles.
 */
import {
  activeSeats,
  DEFAULT_STATE,
  FACET_LABELS,
  parseState,
  reconcile,
  serializeState,
  STAR_FACETS,
  step,
  switchTradition,
  type PlanetariumData,
  type PlanetariumState,
  type StarFacet,
  type Tradition,
} from '../../lib/planetarium/model.ts';
import type { FrameInfo, PlanetariumScene } from '../../lib/planetarium/scene.ts';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
const WIDE = window.matchMedia('(min-width: 64rem)');

function supportsWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    return probe.getContext('webgl2') !== null || probe.getContext('webgl') !== null;
  } catch {
    return false;
  }
}

class Planetarium extends HTMLElement {
  #data: PlanetariumData | undefined;
  #state: PlanetariumState = DEFAULT_STATE;
  #scene: PlanetariumScene | undefined;
  #abort: AbortController | undefined;
  #observers: { disconnect(): void }[] = [];
  #labels = new Map<string, HTMLElement>();
  #nodes = new Map<StarFacet, HTMLElement>();
  #visible = true;

  connectedCallback(): void {
    const raw = this.querySelector('script[data-planetarium]')?.textContent;
    if (raw === undefined || raw === null) return;
    this.#data = JSON.parse(raw) as PlanetariumData;
    if (!supportsWebGL()) return;
    void this.#start(this.#data);
  }

  disconnectedCallback(): void {
    this.#teardown();
  }

  async #start(data: PlanetariumData): Promise<void> {
    const canvas = this.querySelector<HTMLCanvasElement>('[data-canvas]');
    if (canvas === null) return;
    this.dataset.state = 'loading';
    let scene: PlanetariumScene;
    try {
      const { createPlanetariumScene } = await import('../../lib/planetarium/scene.ts');
      if (!this.isConnected) return;
      // El lienzo debe medir antes de crear la escena: la bóveda se muestra ya (sin viaje inicial).
      this.dataset.state = 'live';
      scene = createPlanetariumScene({
        canvas,
        data,
        reducedMotion: REDUCED.matches,
        onSelect: (id) => this.#navigate({ ...this.#state, focus: id, facet: null }),
        onFrame: (info) => this.#place(info),
        onLost: () => this.#teardown(),
      });
    } catch {
      this.dataset.state = 'static';
      return;
    }
    this.#scene = scene;
    this.#abort = new AbortController();
    const { signal } = this.#abort;

    this.#buildOverlays(data);
    this.querySelector<HTMLElement>('[data-controls]')?.removeAttribute('hidden');
    const why = this.querySelector<HTMLElement>('[data-why]');
    if (why !== null && typeof why.showPopover === 'function') why.setAttribute('popover', 'auto');

    this.addEventListener('click', (event) => this.#onClick(event), { signal });
    this.addEventListener('keydown', (event) => this.#onKey(event), { signal });
    window.addEventListener('popstate', () => this.#fromLocation(true), { signal });
    window.addEventListener('hashchange', () => this.#fromLocation(true), { signal });
    window.addEventListener('pagehide', () => this.#teardown(), { signal });
    document.addEventListener('visibilitychange', () => this.#run(), { signal });
    REDUCED.addEventListener('change', () => scene.setReducedMotion(REDUCED.matches), { signal });
    WIDE.addEventListener('change', () => this.#frameForPanel(), { signal });

    const resize = new ResizeObserver(() => {
      scene.resize();
      this.#frameForPanel();
    });
    resize.observe(canvas);
    const visibility = new IntersectionObserver((entries) => {
      this.#visible = entries.some((entry) => entry.isIntersecting);
      this.#run();
    });
    visibility.observe(canvas);
    this.#observers = [resize, visibility];

    this.#apply(parseState(data, window.location.hash), { immediate: true, announce: false });
    this.dataset.ready = 'true';
  }

  #teardown(): void {
    this.#abort?.abort();
    this.#abort = undefined;
    for (const observer of this.#observers) observer.disconnect();
    this.#observers = [];
    this.#scene?.dispose();
    this.#scene = undefined;
    for (const element of [...this.#labels.values(), ...this.#nodes.values()]) element.remove();
    this.#labels.clear();
    this.#nodes.clear();
    // De vuelta a la lista completa: nada queda oculto.
    for (const hidden of this.querySelectorAll<HTMLElement>('[data-card], [data-facet], [data-seat-button]')) hidden.hidden = false;
    this.querySelector<HTMLElement>('[data-controls]')?.setAttribute('hidden', '');
    this.querySelector<HTMLElement>('[data-why]')?.removeAttribute('popover');
    this.dataset.state = 'static';
    delete this.dataset.ready;
    delete this.dataset.focus;
  }

  #run(): void {
    this.#scene?.setRunning(this.#visible && document.visibilityState === 'visible');
  }

  /* ——— Atajos de puntero sobre el cielo ——— */

  #buildOverlays(data: PlanetariumData): void {
    const labels = this.querySelector<HTMLElement>('[data-labels]');
    const nodes = this.querySelector<HTMLElement>('[data-nodes]');
    if (labels === null || nodes === null) return;
    for (const deity of Object.values(data.deities)) {
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'sky-label';
      label.tabIndex = -1;
      label.dataset.select = deity.id;
      label.style.setProperty('--star', deity.color);
      const name = document.createElement('span');
      name.className = 'sky-label__name';
      name.textContent = deity.name;
      const shape = document.createElement('span');
      shape.className = 'sky-label__shape';
      shape.textContent = deity.shape;
      label.append(name, shape);
      labels.append(label);
      this.#labels.set(deity.id, label);
    }
    STAR_FACETS.forEach((facet, index) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'star-node';
      node.tabIndex = -1;
      node.dataset.node = facet;
      const number = document.createElement('span');
      number.className = 'star-node__number';
      number.textContent = String(index + 1);
      const text = document.createElement('span');
      text.className = 'star-node__label';
      text.textContent = FACET_LABELS[facet];
      node.append(number, text);
      nodes.append(node);
      this.#nodes.set(facet, node);
    });
  }

  #place(info: FrameInfo): void {
    for (const [id, element] of this.#labels) {
      const point = info.labels.get(id);
      const shown = point !== undefined && point.visible && id !== this.#state.focus;
      element.hidden = !shown;
      if (shown) element.style.transform = `translate(${Math.round(point.x)}px, ${Math.round(point.y)}px) translate(-50%, 0)`;
    }
    for (const [facet, element] of this.#nodes) {
      const point = info.nodes.get(facet);
      const shown = point !== undefined && point.visible;
      element.hidden = !shown;
      if (shown) element.style.transform = `translate(${Math.round(point.x)}px, ${Math.round(point.y)}px)`;
    }
  }

  /**
   * Hueco del panel: a la derecha en pantallas anchas. En las estrechas el panel ocupa la parte baja y
   * su altura depende del contenido y de la pantalla, así que la figura se centra en la franja libre
   * real, entre la cabecera y el borde superior del panel (medidos, no supuestos).
   */
  #frameForPanel(): void {
    const scene = this.#scene;
    const focus = this.#state.focus;
    if (scene === undefined) return;
    if (focus === null) return scene.setPanelOffset(0, 0);
    if (WIDE.matches) return scene.setPanelOffset(0.17, 0);
    const canvas = this.querySelector<HTMLElement>('[data-canvas]')?.getBoundingClientRect();
    const head = this.querySelector<HTMLElement>('.planetarium__head')?.getBoundingClientRect();
    const card = this.querySelector<HTMLElement>(`[data-card="${focus}"]`)?.getBoundingClientRect();
    if (canvas === undefined || head === undefined || card === undefined || canvas.height === 0 || card.height === 0) {
      return scene.setPanelOffset(0, 0.2);
    }
    const centre = (head.bottom + card.top) / 2 - canvas.top;
    scene.setPanelOffset(0, Math.min(0.35, Math.max(0, (canvas.height / 2 - centre) / canvas.height)));
  }

  /* ——— Estado ——— */

  #fromLocation(announce: boolean): void {
    if (this.#data === undefined) return;
    const next = parseState(this.#data, window.location.hash);
    const current = this.#state;
    if (next.focus !== current.focus || next.facet !== current.facet || next.tradition !== current.tradition) this.#apply(next, { immediate: false, announce });
  }

  #navigate(requested: PlanetariumState): void {
    if (this.#data === undefined) return;
    const next = reconcile(this.#data, requested);
    const current = this.#state;
    if (next.focus === current.focus && next.facet === current.facet && next.tradition === current.tradition) return;
    const fragment = serializeState(this.#data, next);
    window.history.pushState(null, '', fragment === '' ? `${window.location.pathname}${window.location.search}` : fragment);
    this.#apply(next, { immediate: false, announce: true });
  }

  #apply(state: PlanetariumState, { immediate, announce }: { immediate: boolean; announce: boolean }): void {
    const data = this.#data;
    const scene = this.#scene;
    if (data === undefined || scene === undefined) return;
    const previous = this.#state;
    this.#state = state;
    const seats = activeSeats(data, state.tradition);

    scene.setActive(seats, immediate);
    scene.setFocus(state.focus, immediate);
    if (state.focus === null) delete this.dataset.focus;
    else this.dataset.focus = state.focus;
    this.dataset.tradition = state.tradition;

    // Selector orbital: un botón por asiento; el ocupante inactivo del asiento variable se oculta.
    for (const button of this.querySelectorAll<HTMLButtonElement>('[data-seat-button]')) {
      const id = button.dataset.seatButton ?? '';
      button.hidden = !seats.includes(id);
      button.setAttribute('aria-pressed', String(id === state.focus));
    }
    for (const button of this.querySelectorAll<HTMLButtonElement>('[data-tradition]')) {
      button.setAttribute('aria-pressed', String(button.dataset.tradition === state.tradition));
    }
    for (const note of this.querySelectorAll<HTMLElement>('[data-tradition-note]')) note.hidden = note.dataset.traditionNote !== state.tradition;

    // Panel narrativo: solo la constelación enfocada y, dentro, la faceta elegida (o su presentación).
    for (const card of this.querySelectorAll<HTMLElement>('[data-card]')) {
      const own = card.dataset.card === state.focus;
      card.hidden = !own;
      if (!own) continue;
      card.dataset.view = state.facet ?? 'intro';
      for (const section of card.querySelectorAll<HTMLElement>('[data-facet]')) section.hidden = section.dataset.facet !== state.facet;
      for (const tab of card.querySelectorAll<HTMLButtonElement>('[data-facet-tab]')) tab.setAttribute('aria-pressed', String(tab.dataset.facetTab === state.facet));
      if (previous.focus !== state.focus || previous.facet !== state.facet) card.scrollTop = 0;
    }
    for (const [facet, node] of this.#nodes) node.classList.toggle('is-active', facet === state.facet);
    // Con el panel ya visible: el encuadre mide su altura real.
    this.#frameForPanel();

    const deity = state.focus === null ? undefined : data.deities[state.focus];
    const current = this.querySelector<HTMLElement>('[data-current]');
    if (current !== null) current.textContent = deity === undefined ? 'Vista general' : `${deity.name} · ${deity.shape}`;
    const overview = this.querySelector<HTMLButtonElement>('[data-overview]');
    if (overview !== null) overview.disabled = state.focus === null;

    if (announce) {
      const status = this.querySelector<HTMLElement>('[data-status]');
      if (status !== null) status.textContent = this.#describe(data, previous, state);
    }
  }

  #describe(data: PlanetariumData, previous: PlanetariumState, state: PlanetariumState): string {
    const deity = state.focus === null ? undefined : data.deities[state.focus];
    const parts: string[] = [];
    if (previous.tradition !== state.tradition && data.traditions !== undefined) parts.push(`${data.traditions[state.tradition]}.`);
    if (deity === undefined) parts.push('Vista general de la bóveda: doce constelaciones.');
    else if (previous.focus !== state.focus) parts.push(`Constelación de ${deity.name}: ${deity.shape}.`);
    if (deity !== undefined && state.facet !== null && (previous.facet !== state.facet || previous.focus !== state.focus)) parts.push(`${FACET_LABELS[state.facet]}.`);
    return parts.join(' ');
  }

  /* ——— Entrada ——— */

  #onClick(event: MouseEvent): void {
    const data = this.#data;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-select], [data-seat-button], [data-node], [data-facet-tab], [data-prev], [data-next], [data-overview], [data-close], [data-tradition], [data-why-open], [data-why-close]') : null;
    if (data === undefined || target === null || !this.contains(target)) return;
    const state = this.#state;
    const { dataset } = target;

    if (dataset.select !== undefined) this.#navigate({ ...state, focus: dataset.select, facet: null });
    else if (dataset.seatButton !== undefined) this.#navigate({ ...state, focus: dataset.seatButton, facet: null });
    else if (dataset.node !== undefined) this.#navigate({ ...state, facet: state.facet === dataset.node ? null : (dataset.node as StarFacet) });
    else if (dataset.facetTab !== undefined) this.#navigate({ ...state, facet: state.facet === dataset.facetTab ? null : (dataset.facetTab as StarFacet) });
    else if ('prev' in dataset) this.#navigate({ ...state, focus: step(data, state, -1), facet: null });
    else if ('next' in dataset) this.#navigate({ ...state, focus: step(data, state, 1), facet: null });
    else if ('overview' in dataset || 'close' in dataset) this.#navigate({ ...state, focus: null, facet: null });
    else if (dataset.tradition !== undefined) this.#navigate(switchTradition(data, state, dataset.tradition as Tradition));
    else if ('whyOpen' in dataset) this.#toggleWhy(true);
    else if ('whyClose' in dataset) this.#toggleWhy(false);
    else return;
    // Un enlace de la lista que la isla resuelve en la bóveda no navega al ancla.
    if (target instanceof HTMLAnchorElement) event.preventDefault();
  }

  #toggleWhy(open: boolean): void {
    const why = this.querySelector<HTMLElement>('[data-why]');
    if (why === null) return;
    if (why.hasAttribute('popover') && typeof why.showPopover === 'function') {
      if (open && !why.matches(':popover-open')) why.showPopover();
      if (!open && why.matches(':popover-open')) why.hidePopover();
    } else if (open) {
      why.scrollIntoView({ behavior: REDUCED.matches ? 'auto' : 'smooth' });
    }
  }

  #onKey(event: KeyboardEvent): void {
    const data = this.#data;
    if (data === undefined || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const state = this.#state;
    if (event.key === 'Escape' && state.focus !== null && this.querySelector('[data-why]:popover-open') === null) {
      this.#navigate(state.facet !== null ? { ...state, facet: null } : { ...state, focus: null });
      return;
    }
    // Flechas: solo desde los controles de la bóveda, para no interferir con la lectura del panel.
    const inControls = event.target instanceof Element && event.target.closest('[data-controls]') !== null;
    if (!inControls || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    this.#navigate({ ...state, focus: step(data, state, event.key === 'ArrowRight' ? 1 : -1), facet: null });
  }
}

if (customElements.get('mythos-planetarium') === undefined) {
  customElements.define('mythos-planetarium', Planetarium);
}
