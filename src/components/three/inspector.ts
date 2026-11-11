/**
 * `<mythos-inspector>`: arranque mínimo del inspector 3D (Phase 6). No importa Three.js: comprueba
 * WebGL2, descarga el GLB (cancelable, con progreso) y solo entonces importa `lib/three/viewer.ts`.
 *
 * Sin JavaScript o sin WebGL2, el póster, los créditos y las anotaciones del HTML siguen completos.
 * Estados y reglas: `lib/three/lifecycle.ts` y docs/architecture_decisions.md («Contrato de ciclo de vida 3D»).
 */
import { formatBytes, parseInspectorConfig, type InspectorConfig } from '../../lib/three/config.ts';
import { GlbError, inspectGlb } from '../../lib/three/glb.ts';
import { FAILURE_MESSAGES, InspectorLifecycle, isRetryable, type InspectorFailure } from '../../lib/three/lifecycle.ts';
import type { HotspotProjection, Viewer, ViewerStats } from '../../lib/three/viewer.ts';

const ROTATE_STEP = 15;
const TILT_STEP = 8;
const ZOOM_STEP = 0.85;
export const MARK_ACTIVATION = 'mythos-inspector:activation';
export const MEASURE_INTERACTIVE = 'mythos-inspector:activation-to-interactive';

class LoadError extends Error {
  readonly failure: InspectorFailure;

  constructor(failure: InspectorFailure) {
    super(failure);
    this.failure = failure;
  }
}

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

function loseContext(context: WebGL2RenderingContext | null): void {
  context?.getExtension('WEBGL_lose_context')?.loseContext();
}

/** Un solo visor activo por página: activar otro cierra el anterior. */
let active: MythosInspector | undefined;

export interface InspectorStats {
  state: string;
  failure: InspectorFailure | undefined;
  sessions: number;
  disposals: number;
  live: boolean;
  canvases: number;
  activationMs: number | undefined;
  viewer: ViewerStats | undefined;
}

class MythosInspector extends HTMLElement {
  #config: InspectorConfig | undefined;
  #lifecycle = new InspectorLifecycle();
  #viewer: Viewer | undefined;
  #download: AbortController | undefined;
  #connection: AbortController | undefined;
  #observer: IntersectionObserver | undefined;
  #intersecting = true;
  #selected: string | undefined;
  #home: Comment | undefined;
  #sessions = 0;
  #disposals = 0;
  #measured = false;
  #activationMs: number | undefined;

  #part<T extends HTMLElement>(selector: string): T | null {
    return this.querySelector<T>(selector);
  }

  get #stage(): HTMLElement | null {
    return this.#part('[data-stage]');
  }

  connectedCallback(): void {
    const script = this.querySelector('script[data-inspector-config]');
    let raw: unknown;
    try {
      raw = JSON.parse(script?.textContent ?? 'null');
    } catch {
      raw = undefined;
    }
    this.#config = parseInspectorConfig(raw);
    if (this.#config === undefined) return;
    if (this.#lifecycle.state === 'disposed') this.#lifecycle = new InspectorLifecycle();

    this.#connection = new AbortController();
    const { signal } = this.#connection;
    this.addEventListener('click', this.#onClick, { signal });
    this.#stage?.addEventListener('keydown', this.#onKeydown, { signal });
    this.#part<HTMLDialogElement>('[data-dialog]')?.addEventListener('close', this.#onDialogClose, { signal });
    document.addEventListener('visibilitychange', this.#updateSuspension, { signal });
    // Navegar fuera libera la GPU; al volver desde la caché del historial se muestra el póster.
    window.addEventListener('pagehide', () => this.close({ announce: false }), { signal });
    window.addEventListener('pageshow', () => this.#render(), { signal });

    const stage = this.#stage;
    if (stage !== null) {
      this.#observer = new IntersectionObserver((entries) => {
        this.#intersecting = entries.at(-1)?.isIntersecting ?? true;
        this.#updateSuspension();
      });
      this.#observer.observe(stage);
    }

    if (typeof WebGL2RenderingContext === 'undefined') this.#lifecycle.fail('no-webgl2');
    this.dataset.enhanced = 'true';
    this.#render();
    if (this.#lifecycle.failure !== undefined) this.#announce(FAILURE_MESSAGES[this.#lifecycle.failure]);
  }

  disconnectedCallback(): void {
    this.#stop();
    this.#lifecycle.transition('disposed');
    this.#connection?.abort();
    this.#connection = undefined;
    this.#observer?.disconnect();
    this.#observer = undefined;
    if (active === this) active = undefined;
    delete this.dataset.state;
  }

  /** Para pruebas y diagnóstico: estado observable sin exponer el visor. */
  get inspectorStats(): InspectorStats {
    return {
      state: this.#lifecycle.state,
      failure: this.#lifecycle.failure,
      sessions: this.#sessions,
      disposals: this.#disposals,
      live: this.#viewer !== undefined,
      canvases: this.querySelectorAll('canvas').length,
      activationMs: this.#activationMs,
      viewer: this.#viewer?.stats(),
    };
  }

  // ------------------------------------------------------------------ activación

  async #activate(): Promise<void> {
    const config = this.#config;
    const stage = this.#stage;
    if (config === undefined || stage === null) return;
    if (active !== undefined && active !== this) active.close({ announce: false });
    const token = this.#lifecycle.begin();
    if (token === undefined) return;
    active = this;
    this.#sessions += 1;
    this.#measured = false;
    this.#activationMs = undefined;
    performance.clearMarks(MARK_ACTIVATION);
    performance.clearMeasures(MEASURE_INTERACTIVE);
    performance.mark(MARK_ACTIVATION);
    this.#render();
    this.#progress(0);
    this.#announce(`Cargando el modelo 3D (${formatBytes(config.bytes)})…`);

    // El contexto se pide en el mismo lienzo que usará el renderer: comprobación real, no supuesta.
    const canvas = document.createElement('canvas');
    canvas.className = 'inspector__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const context = canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'default' });
    if (context === null) {
      this.#fail(token, 'no-webgl2');
      return;
    }

    const controller = new AbortController();
    this.#download = controller;
    // Descarga y módulo en paralelo; el módulo de Three solo se pide tras la acción del visitante.
    const viewerModule = import('../../lib/three/viewer.ts');
    viewerModule.catch(() => undefined);
    let buffer: ArrayBuffer;
    let decoders: ReturnType<typeof inspectGlb>['decoders'];
    let ViewerClass: typeof Viewer;
    try {
      buffer = await this.#fetchModel(config, controller.signal, token);
      ({ decoders } = inspectGlb(buffer));
      ({ Viewer: ViewerClass } = await viewerModule.catch(() => {
        throw new LoadError('network');
      }));
    } catch (error) {
      loseContext(context);
      if (isAbort(error) || !this.#lifecycle.isCurrent(token)) return;
      this.#fail(token, error instanceof LoadError ? error.failure : error instanceof GlbError ? error.problem : 'network');
      return;
    } finally {
      if (this.#download === controller) this.#download = undefined;
    }
    if (!this.#lifecycle.isCurrent(token)) {
      loseContext(context);
      return;
    }

    stage.append(canvas);
    let viewer: Viewer;
    try {
      viewer = new ViewerClass({
        canvas,
        context,
        host: stage,
        hotspots: config.hotspots,
        camera: config.camera,
        onFrame: (projections) => this.#onFrame(projections),
        onContextLost: () => this.#onContextLost(token),
      });
    } catch {
      canvas.remove();
      loseContext(context);
      this.#fail(token, 'render');
      return;
    }
    this.#viewer = viewer;
    try {
      const loaded = await viewer.load(buffer, decoders);
      if (!loaded || !this.#lifecycle.isCurrent(token)) {
        if (this.#viewer === viewer) this.#teardown();
        return;
      }
    } catch {
      if (this.#lifecycle.isCurrent(token)) this.#fail(token, 'invalid-file');
      return;
    }

    const hadFocus = this.#focusWasLost();
    this.#lifecycle.transition('ready');
    this.#render();
    // Las instrucciones de teclado ya describen el visor enfocado (aria-describedby).
    this.#announce('Modelo 3D listo. Arrastra para girar; la rueda o el pellizco acercan y alejan.');
    if (hadFocus) stage.focus({ preventScroll: true });
    if (this.#selected !== undefined) viewer.focusHotspot(this.#selected);
    this.#updateSuspension();
  }

  async #fetchModel(config: InspectorConfig, signal: AbortSignal, token: number): Promise<ArrayBuffer> {
    const response = await fetch(config.src, { signal, credentials: 'same-origin' });
    if (response.status === 404 || response.status === 410) throw new LoadError('not-found');
    if (!response.ok || response.body === null) throw new LoadError('network');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!this.#lifecycle.isCurrent(token)) {
        await reader.cancel();
        throw new DOMException('Sesión reemplazada', 'AbortError');
      }
      chunks.push(value);
      received += value.byteLength;
      this.#progress(received / config.bytes);
    }
    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes.buffer;
  }

  // ------------------------------------------------------------------ cierre y fallos

  /** Libera la sesión y vuelve al póster. Público: lo usa otro inspector al activarse. */
  close({ announce = true }: { announce?: boolean } = {}): void {
    const { state } = this.#lifecycle;
    if (state !== 'loading' && state !== 'ready' && state !== 'suspended') return;
    this.#stop();
    this.#lifecycle.transition('poster');
    this.#render();
    if (announce) this.#announce(state === 'loading' ? 'Carga del modelo 3D cancelada.' : 'Visor 3D cerrado.');
    if (active === this) active = undefined;
  }

  #stop(): void {
    this.#download?.abort();
    this.#download = undefined;
    this.#teardown();
  }

  #teardown(): void {
    const dialog = this.#part<HTMLDialogElement>('[data-dialog]');
    if (dialog?.open === true) dialog.close();
    this.#restoreFromDialog(false);
    if (this.#viewer !== undefined) {
      this.#viewer.dispose();
      this.#viewer = undefined;
      this.#disposals += 1;
    }
    for (const canvas of this.querySelectorAll('canvas')) canvas.remove();
  }

  #fail(token: number, failure: InspectorFailure): void {
    if (!this.#lifecycle.isCurrent(token)) return;
    const hadFocus = this.#focusWasLost() || this.contains(document.activeElement);
    this.#stop();
    this.#lifecycle.fail(failure);
    this.#render();
    this.#announce(FAILURE_MESSAGES[failure]);
    if (active === this) active = undefined;
    if (hadFocus) {
      const retry = this.#part<HTMLButtonElement>('[data-action="retry"]');
      (retry !== null && !retry.hidden ? retry : this.#part<HTMLElement>('[data-status]'))?.focus({ preventScroll: true });
    }
  }

  #onContextLost(token: number): void {
    this.#fail(token, 'context-lost');
  }

  // ------------------------------------------------------------------ interacción

  #onClick = (event: Event): void => {
    const target = event.target as Element;
    const marker = target.closest<HTMLElement>('[data-marker]');
    if (marker !== null) {
      this.#select(marker.dataset.marker);
      return;
    }
    const hotspot = target.closest<HTMLElement>('[data-hotspot-button]');
    if (hotspot !== null) {
      this.#select(hotspot.dataset.hotspotButton === this.#selected ? undefined : hotspot.dataset.hotspotButton);
      return;
    }
    const button = target.closest<HTMLButtonElement>('[data-action]');
    if (button === null || button.disabled) return;
    const viewer = this.#viewer;
    switch (button.dataset.action) {
      case 'activate':
      case 'retry':
        void this.#activate();
        break;
      case 'cancel':
      case 'close':
        this.close();
        this.#part<HTMLButtonElement>('[data-action="activate"]')?.focus();
        break;
      case 'rotate-left':
        viewer?.rotateBy(-ROTATE_STEP, 0);
        break;
      case 'rotate-right':
        viewer?.rotateBy(ROTATE_STEP, 0);
        break;
      case 'tilt-up':
        viewer?.rotateBy(0, -TILT_STEP);
        break;
      case 'tilt-down':
        viewer?.rotateBy(0, TILT_STEP);
        break;
      case 'zoom-in':
        viewer?.zoomBy(ZOOM_STEP);
        break;
      case 'zoom-out':
        viewer?.zoomBy(1 / ZOOM_STEP);
        break;
      case 'reset':
        this.#select(undefined, false);
        viewer?.reset();
        this.#announce('Vista restablecida.');
        break;
      case 'enlarge':
        this.#toggleDialog();
        break;
    }
  };

  #onKeydown = (event: KeyboardEvent): void => {
    const viewer = this.#viewer;
    if (viewer === undefined || event.target !== this.#stage || event.altKey || event.ctrlKey || event.metaKey) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => viewer.rotateBy(-ROTATE_STEP, 0),
      ArrowRight: () => viewer.rotateBy(ROTATE_STEP, 0),
      ArrowUp: () => viewer.rotateBy(0, -TILT_STEP),
      ArrowDown: () => viewer.rotateBy(0, TILT_STEP),
      '+': () => viewer.zoomBy(ZOOM_STEP),
      '=': () => viewer.zoomBy(ZOOM_STEP),
      '-': () => viewer.zoomBy(1 / ZOOM_STEP),
      '0': () => viewer.reset(),
      Home: () => viewer.reset(),
    };
    const action = actions[event.key];
    if (action === undefined) return;
    event.preventDefault();
    action();
  };

  #select(id: string | undefined, orient = true): void {
    this.#selected = id;
    for (const button of this.querySelectorAll<HTMLElement>('[data-hotspot-button]')) {
      button.setAttribute('aria-pressed', String(button.dataset.hotspotButton === id));
    }
    for (const marker of this.querySelectorAll<HTMLElement>('[data-marker]')) {
      marker.classList.toggle('is-selected', marker.dataset.marker === id);
    }
    if (id !== undefined && orient) {
      this.#viewer?.focusHotspot(id);
      const label = this.querySelector(`[data-hotspot="${CSS.escape(id)}"] [data-hotspot-label]`)?.textContent?.trim();
      if (label !== undefined) this.#announce(`Anotación: ${label}.`);
    }
  }

  #onFrame(projections: HotspotProjection[]): void {
    for (const projection of projections) {
      const marker = this.querySelector<HTMLElement>(`[data-marker="${CSS.escape(projection.id)}"]`);
      if (marker === null) continue;
      marker.hidden = !projection.inView;
      marker.classList.toggle('is-occluded', projection.occluded);
      marker.style.transform = `translate(${projection.x.toFixed(1)}px, ${projection.y.toFixed(1)}px)`;
    }
    if (!this.#measured && this.#lifecycle.state === 'ready') {
      this.#measured = true;
      const measure = performance.measure(MEASURE_INTERACTIVE, MARK_ACTIVATION);
      this.#activationMs = measure.duration;
    }
  }

  // ------------------------------------------------------------------ ampliación

  #toggleDialog(): void {
    const dialog = this.#part<HTMLDialogElement>('[data-dialog]');
    const body = this.#part('[data-dialog-body]');
    const viewerBox = this.#part('[data-viewer]');
    if (dialog === null || body === null || viewerBox === null) return;
    if (dialog.open) {
      dialog.close();
      return;
    }
    // El mismo visor (y el mismo lienzo) pasa al diálogo: nunca se duplica el contexto.
    this.#home = document.createComment('inspector');
    viewerBox.before(this.#home);
    body.append(viewerBox);
    dialog.showModal();
    this.#setEnlargeLabel(true);
    this.#stage?.focus({ preventScroll: true });
  }

  #onDialogClose = (): void => {
    this.#restoreFromDialog(true);
  };

  #restoreFromDialog(returnFocus: boolean): void {
    const viewerBox = this.#part('[data-viewer]');
    if (this.#home === undefined || viewerBox === null) return;
    this.#home.replaceWith(viewerBox);
    this.#home = undefined;
    this.#setEnlargeLabel(false);
    if (returnFocus) this.#part<HTMLButtonElement>('[data-action="enlarge"]')?.focus({ preventScroll: true });
    this.#updateSuspension();
  }

  #setEnlargeLabel(open: boolean): void {
    const button = this.#part<HTMLButtonElement>('[data-action="enlarge"]');
    if (button === null) return;
    button.setAttribute('aria-pressed', String(open));
    const label = button.querySelector('[data-label]');
    if (label !== null) label.textContent = open ? 'Salir de la ampliación' : 'Ampliar';
  }

  // ------------------------------------------------------------------ visibilidad

  #updateSuspension = (): void => {
    const viewer = this.#viewer;
    if (viewer === undefined) return;
    const dialogOpen = this.#part<HTMLDialogElement>('[data-dialog]')?.open === true;
    const hidden = document.visibilityState === 'hidden' || (!this.#intersecting && !dialogOpen);
    const { state } = this.#lifecycle;
    if (hidden && state === 'ready') {
      viewer.setSuspended(true);
      this.#lifecycle.transition('suspended');
      this.#render();
    } else if (!hidden && state === 'suspended') {
      this.#lifecycle.transition('ready');
      viewer.setSuspended(false);
      this.#render();
    }
  };

  // ------------------------------------------------------------------ presentación

  /** ¿El foco quedó en el cuerpo o en un control que esta transición va a ocultar? */
  #focusWasLost(): boolean {
    const focused = document.activeElement;
    return focused === null || focused === document.body || (this.contains(focused) && (focused as HTMLElement).closest('[hidden]') !== null) || focused?.matches('[data-action="activate"], [data-action="cancel"], [data-action="retry"]') === true;
  }

  #announce(message: string): void {
    const status = this.#part('[data-status]');
    if (status !== null) status.textContent = message;
  }

  #progress(fraction: number): void {
    const progress = this.#part<HTMLProgressElement>('[data-progress] progress');
    const label = this.#part('[data-progress-label]');
    const percent = Math.min(100, Math.round(fraction * 100));
    if (progress !== null) progress.value = percent;
    if (label !== null) label.textContent = `${percent} %`;
  }

  #render(): void {
    const { state, failure } = this.#lifecycle;
    this.dataset.state = state;
    const live = state === 'ready' || state === 'suspended';
    const show = (selector: string, visible: boolean) => {
      for (const element of this.querySelectorAll<HTMLElement>(selector)) element.hidden = !visible;
    };
    show('[data-action="activate"]', state === 'poster');
    show('[data-weight]', state === 'poster');
    show('[data-action="cancel"]', state === 'loading');
    show('[data-progress]', state === 'loading');
    show('[data-controls]', live);
    show('[data-hotspot-button]', live);
    show('[data-action="retry"]', state === 'error' && failure !== undefined && isRetryable(failure));
    show('[data-requirements]', false);
    if (!live) show('[data-marker]', false);
    const stage = this.#stage;
    if (stage !== null) {
      stage.classList.toggle('is-live', live);
      if (live) stage.tabIndex = 0;
      else stage.removeAttribute('tabindex');
    }
  }
}

if (customElements.get('mythos-inspector') === undefined) customElements.define('mythos-inspector', MythosInspector);
