/**
 * Ciclo de vida del inspector 3D (docs/architecture_decisions.md, «Contrato de ciclo de vida 3D»):
 * `poster → loading → ready ↔ suspended`; los fallos llevan a `error` (con el póster visible) y
 * desmontar lleva a `disposed`, que es terminal. Cada activación abre una sesión con un token nuevo:
 * un resultado que llega con un token viejo se descarta y se libera.
 *
 * Módulo puro, sin Three.js ni DOM: lo usan la isla y las pruebas unitarias.
 */

export const INSPECTOR_STATES = ['poster', 'loading', 'ready', 'suspended', 'error', 'disposed'] as const;
export type InspectorState = (typeof INSPECTOR_STATES)[number];

export const INSPECTOR_FAILURES = ['no-webgl2', 'not-found', 'network', 'invalid-file', 'decoder', 'context-lost', 'render'] as const;
export type InspectorFailure = (typeof INSPECTOR_FAILURES)[number];

const TRANSITIONS: Readonly<Record<InspectorState, readonly InspectorState[]>> = {
  poster: ['loading', 'error', 'disposed'],
  // `poster` desde una carga: el visitante cancela o la página se oculta durante la descarga.
  loading: ['ready', 'error', 'poster', 'disposed'],
  ready: ['suspended', 'error', 'poster', 'disposed'],
  suspended: ['ready', 'error', 'poster', 'disposed'],
  // Reintentar abre una sesión nueva; nunca reutiliza un renderer liberado.
  error: ['loading', 'poster', 'disposed'],
  disposed: [],
};

export function canTransition(from: InspectorState, to: InspectorState): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Mensajes para el visitante. Todos dejan claro que el póster y las anotaciones siguen disponibles. */
export const FAILURE_MESSAGES: Readonly<Record<InspectorFailure, string>> = {
  'no-webgl2': 'Este navegador o dispositivo no ofrece WebGL2, necesario para el visor 3D. La imagen y las anotaciones siguen disponibles.',
  'not-found': 'No se encontró el archivo del modelo 3D. La imagen y las anotaciones siguen disponibles.',
  network: 'No se pudo descargar el modelo 3D. Comprueba la conexión y vuelve a intentarlo.',
  'invalid-file': 'El archivo descargado no es un modelo glTF binario válido.',
  decoder: 'El modelo usa una compresión que este visor no puede descodificar.',
  'context-lost': 'El navegador liberó el contexto gráfico del visor. Puedes volver a abrirlo.',
  render: 'El visor 3D falló al preparar la escena.',
};

/** Sin WebGL2 reintentar no cambia nada; el resto de fallos admite una sesión nueva. */
export function isRetryable(failure: InspectorFailure): boolean {
  return failure !== 'no-webgl2';
}

export class InspectorLifecycle {
  #state: InspectorState = 'poster';
  #token = 0;
  #failure: InspectorFailure | undefined;

  get state(): InspectorState {
    return this.#state;
  }

  get failure(): InspectorFailure | undefined {
    return this.#failure;
  }

  get token(): number {
    return this.#token;
  }

  /** Aplica la transición si es válida; devuelve `false` (sin cambiar nada) si no lo es. */
  transition(to: Exclude<InspectorState, 'loading' | 'error'>): boolean {
    if (!canTransition(this.#state, to)) return false;
    this.#state = to;
    this.#failure = undefined;
    // Salir de una sesión (póster o desmontaje) invalida los resultados pendientes.
    if (to === 'poster' || to === 'disposed') this.#token += 1;
    return true;
  }

  /** Abre una sesión de carga y devuelve su token, o `undefined` si el estado no lo permite. */
  begin(): number | undefined {
    if (!canTransition(this.#state, 'loading')) return undefined;
    this.#state = 'loading';
    this.#failure = undefined;
    this.#token += 1;
    return this.#token;
  }

  fail(failure: InspectorFailure): boolean {
    if (!canTransition(this.#state, 'error')) return false;
    this.#state = 'error';
    this.#failure = failure;
    this.#token += 1;
    return true;
  }

  /** ¿Sigue vigente la sesión que emitió este token? */
  isCurrent(token: number): boolean {
    return token === this.#token && (this.#state === 'loading' || this.#state === 'ready' || this.#state === 'suspended');
  }
}
