/**
 * Sesión Three.js del inspector (Phase 6). Se importa dinámicamente al activar «Explorar en 3D»: es el
 * único módulo que trae Three.js y sus addons, y nunca entra en el bundle inicial de una página.
 *
 * Contrato (docs/architecture_decisions.md, «Contrato de ciclo de vida 3D»):
 * - dibuja por demanda (cámara, tamaño, selección o modelo): sin bucle continuo ni autorrotación;
 * - normaliza el modelo centrando su caja, sin alterar proporciones; cámara ~35°, zoom 0,75–2,5×, sin pan;
 * - suspendido no dibuja; la pérdida de contexto se notifica sin intentar restaurarlo;
 * - `dispose()` es idempotente y libera geometrías, materiales, texturas, controles, observadores y el
 *   contexto, y retira el lienzo.
 */
import { Box3, DirectionalLight, HemisphereLight, NeutralToneMapping, PerspectiveCamera, Raycaster, Scene, Sphere, Vector3, WebGLRenderer, type Object3D } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { dolly, faceTowards, frame, rotate, toOrbit, type Framing, type Limits, type Orbit, type Vec3 } from './camera.ts';
import { disposeObject, type DisposalReport } from './dispose.ts';
import type { Decoder } from './glb.ts';

export const MAX_PIXEL_RATIO = 1.5;

export interface HotspotProjection {
  id: string;
  /** Posición en píxeles CSS dentro del lienzo. */
  x: number;
  y: number;
  /** Dentro del encuadre. */
  inView: boolean;
  /** La propia pieza tapa el punto desde la cámara actual. */
  occluded: boolean;
}

export interface ViewerOptions {
  canvas: HTMLCanvasElement;
  context: WebGL2RenderingContext;
  /** Elemento cuyo tamaño sigue el lienzo. */
  host: HTMLElement;
  hotspots: ReadonlyArray<{ id: string; position: Vec3 }>;
  camera?: { position: Vec3; target: Vec3; fov: number } | undefined;
  onFrame(projections: HotspotProjection[]): void;
  onContextLost(): void;
}

export interface ViewerStats {
  frames: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  pixelRatio: number;
  orbit: Orbit;
  initialDistance: number;
  limits: Limits;
}

const toVec3 = (vector: Vector3): Vec3 => [vector.x, vector.y, vector.z];

export class Viewer {
  readonly #options: ViewerOptions;
  readonly #renderer: WebGLRenderer;
  readonly #scene = new Scene();
  readonly #camera = new PerspectiveCamera(35, 1, 0.01, 100);
  readonly #controls: OrbitControls;
  readonly #resize: ResizeObserver;
  readonly #listeners = new AbortController();
  readonly #raycaster = new Raycaster();
  readonly #scratch = new Vector3();
  #model: Object3D | undefined;
  #radius = 1;
  #framing: Framing | undefined;
  #hotspots: Array<{ id: string; point: Vector3 }> = [];
  #occluded = new Map<string, boolean>();
  #occlusionDirty = true;
  #dragging = false;
  #width = 0;
  #height = 0;
  #frame = 0;
  #frames = 0;
  #suspended = false;
  #lost = false;
  #disposed = false;
  #report: DisposalReport | undefined;

  constructor(options: ViewerOptions) {
    this.#options = options;
    const { canvas, context } = options;
    this.#renderer = new WebGLRenderer({ canvas, context, antialias: true, alpha: true, powerPreference: 'default' });
    this.#renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    this.#renderer.setClearColor(0x000000, 0);
    this.#renderer.toneMapping = NeutralToneMapping;

    // Luz de estudio simple, sin sombras en tiempo real (ADR-03): hemisférica cálida, una luz principal
    // que acompaña a la cámara (arriba a la izquierda del visitante, para leer cualquier cara del objeto)
    // y un relleno frío fijo. La luz principal apunta al origen, donde queda centrado el modelo.
    const key = new DirectionalLight(0xfff1dc, 2.4);
    key.position.set(-1.2, 1.6, 0.6);
    this.#camera.add(key);
    const fill = new DirectionalLight(0xdfe6ff, 0.5);
    fill.position.set(2, 1, -1.5);
    this.#scene.add(new HemisphereLight(0xfff4e0, 0x2a2622, 1.4), fill, this.#camera);

    this.#controls = new OrbitControls(this.#camera, canvas);
    this.#controls.enablePan = false;
    this.#controls.enableDamping = false;
    this.#controls.rotateSpeed = 0.9;
    this.#controls.zoomSpeed = 0.9;
    this.#controls.addEventListener('change', this.#onControlsChange);
    this.#controls.addEventListener('start', this.#onControlsStart);
    this.#controls.addEventListener('end', this.#onControlsEnd);

    // Sin preventDefault: el navegador no restaurará el contexto y no entramos en un bucle de restauración.
    canvas.addEventListener('webglcontextlost', this.#onContextLost, { signal: this.#listeners.signal });

    this.#resize = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box !== undefined) this.resize(box.width, box.height);
    });
    this.#resize.observe(options.host);
    this.resize(options.host.clientWidth, options.host.clientHeight);
  }

  /** Interpreta el GLB ya descargado y validado; devuelve `false` si la sesión se liberó entretanto. */
  async load(buffer: ArrayBuffer, decoders: readonly Decoder[]): Promise<boolean> {
    const loader = new GLTFLoader();
    if (decoders.includes('meshopt')) {
      const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
      if (this.#disposed) return false;
      loader.setMeshoptDecoder(MeshoptDecoder);
    }
    const gltf = await loader.parseAsync(buffer, '');
    if (this.#disposed) {
      disposeObject(gltf.scene);
      return false;
    }
    const model = gltf.scene;
    const box = new Box3().setFromObject(model);
    if (box.isEmpty()) {
      disposeObject(model);
      throw new Error('El modelo no contiene geometría visible.');
    }
    const centre = box.getCenter(new Vector3());
    this.#radius = box.getBoundingSphere(new Sphere()).radius;
    model.position.sub(centre);
    this.#hotspots = this.#options.hotspots.map((hotspot) => ({ id: hotspot.id, point: new Vector3(...hotspot.position).sub(centre) }));
    const stored = this.#options.camera;
    this.#framing = frame(
      this.#radius,
      this.#height > 0 ? this.#width / this.#height : 1,
      stored === undefined
        ? undefined
        : { position: toVec3(new Vector3(...stored.position).sub(centre)), target: toVec3(new Vector3(...stored.target).sub(centre)), fov: stored.fov },
    );
    this.#model = model;
    this.#scene.add(model);
    this.#applyFraming(this.#framing);
    return true;
  }

  #applyFraming(framing: Framing): void {
    this.#camera.fov = framing.fov;
    this.#camera.near = framing.near;
    this.#camera.far = framing.far;
    this.#camera.updateProjectionMatrix();
    this.#controls.minDistance = framing.minDistance;
    this.#controls.maxDistance = framing.maxDistance;
    this.#controls.minPolarAngle = framing.minPolar;
    this.#controls.maxPolarAngle = framing.maxPolar;
    this.#setView(framing.position, framing.target);
  }

  #setView(position: Vec3, target: Vec3 = toVec3(this.#controls.target)): void {
    this.#camera.position.set(...position);
    this.#controls.target.set(...target);
    this.#controls.update();
    this.#occlusionDirty = true;
    this.requestRender();
  }

  #limits(): Limits {
    const framing = this.#framing;
    if (framing === undefined) throw new Error('Modelo sin cargar.');
    return framing;
  }

  rotateBy(deltaAzimuth: number, deltaPolar: number): void {
    if (this.#model === undefined) return;
    this.#setView(rotate(toVec3(this.#camera.position), toVec3(this.#controls.target), deltaAzimuth, deltaPolar, this.#limits()));
  }

  zoomBy(factor: number): void {
    if (this.#model === undefined) return;
    this.#setView(dolly(toVec3(this.#camera.position), toVec3(this.#controls.target), factor, this.#limits()));
  }

  reset(): void {
    if (this.#framing !== undefined) this.#setView(this.#framing.position, this.#framing.target);
  }

  /** Gira la vista para mirar de frente una anotación, conservando la distancia. */
  focusHotspot(id: string): void {
    const hotspot = this.#hotspots.find((item) => item.id === id);
    if (hotspot === undefined || this.#model === undefined) return;
    this.#setView(faceTowards(toVec3(this.#camera.position), toVec3(this.#controls.target), toVec3(hotspot.point), this.#limits()));
  }

  resize(width: number, height: number): void {
    if (this.#disposed) return;
    const w = Math.round(width);
    const h = Math.round(height);
    // Un tamaño nulo (elemento oculto o en transición) no es un tamaño válido para dibujar.
    if (w < 2 || h < 2 || (w === this.#width && h === this.#height)) return;
    this.#width = w;
    this.#height = h;
    this.#renderer.setSize(w, h, false);
    this.#camera.aspect = w / h;
    this.#camera.updateProjectionMatrix();
    this.requestRender();
  }

  setSuspended(suspended: boolean): void {
    if (this.#disposed || this.#suspended === suspended) return;
    this.#suspended = suspended;
    if (suspended) this.#cancelFrame();
    // Al volver, un único dibujo restaura la imagen.
    else this.requestRender();
  }

  requestRender = (): void => {
    if (this.#disposed || this.#suspended || this.#lost || this.#frame !== 0 || this.#model === undefined) return;
    this.#frame = requestAnimationFrame(this.#draw);
  };

  #draw = (): void => {
    this.#frame = 0;
    if (this.#disposed || this.#suspended || this.#lost || this.#width < 2 || this.#height < 2) return;
    this.#renderer.render(this.#scene, this.#camera);
    this.#frames += 1;
    if (this.#occlusionDirty && !this.#dragging) this.#updateOcclusion();
    this.#options.onFrame(this.#project());
  };

  #project(): HotspotProjection[] {
    return this.#hotspots.map((hotspot) => {
      const point = this.#scratch.copy(hotspot.point).project(this.#camera);
      return {
        id: hotspot.id,
        x: ((point.x + 1) / 2) * this.#width,
        y: ((1 - point.y) / 2) * this.#height,
        inView: point.z > -1 && point.z < 1 && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1,
        occluded: this.#occluded.get(hotspot.id) ?? false,
      };
    });
  }

  /** Raycast desde la cámara: se recalcula al terminar cada gesto, no durante el arrastre. */
  #updateOcclusion(): void {
    const model = this.#model;
    if (model === undefined) return;
    const origin = this.#camera.position;
    for (const hotspot of this.#hotspots) {
      const direction = this.#scratch.copy(hotspot.point).sub(origin);
      const distance = direction.length();
      this.#raycaster.set(origin, direction.normalize());
      this.#raycaster.far = distance;
      const hit = this.#raycaster.intersectObject(model, true)[0];
      this.#occluded.set(hotspot.id, hit !== undefined && hit.distance < distance - this.#radius * 0.02);
    }
    this.#occlusionDirty = false;
  }

  #cancelFrame(): void {
    if (this.#frame !== 0) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }

  #onControlsChange = (): void => {
    this.#occlusionDirty = true;
    this.requestRender();
  };

  #onControlsStart = (): void => {
    this.#dragging = true;
  };

  #onControlsEnd = (): void => {
    this.#dragging = false;
    this.#occlusionDirty = true;
    this.requestRender();
  };

  #onContextLost = (): void => {
    this.#lost = true;
    this.#cancelFrame();
    this.#options.onContextLost();
  };

  stats(): ViewerStats {
    const info = this.#renderer.info;
    return {
      frames: this.#frames,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      pixelRatio: this.#renderer.getPixelRatio(),
      orbit: toOrbit(toVec3(this.#camera.position), toVec3(this.#controls.target)),
      initialDistance: this.#framing?.distance ?? 0,
      limits: this.#limits(),
    };
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  /** Idempotente: la segunda llamada devuelve el mismo informe sin tocar nada. */
  dispose(): DisposalReport {
    if (this.#report !== undefined) return this.#report;
    this.#disposed = true;
    this.#cancelFrame();
    this.#resize.disconnect();
    this.#listeners.abort();
    this.#controls.removeEventListener('change', this.#onControlsChange);
    this.#controls.removeEventListener('start', this.#onControlsStart);
    this.#controls.removeEventListener('end', this.#onControlsEnd);
    this.#controls.dispose();
    const report = this.#model === undefined ? { geometries: 0, materials: 0, textures: 0, bitmaps: 0 } : disposeObject(this.#model);
    this.#model = undefined;
    this.#scene.clear();
    this.#renderer.renderLists.dispose();
    this.#renderer.dispose();
    // Libera el contexto ya (los navegadores limitan los contextos vivos); su evento ya no tiene oyente.
    if (!this.#lost) this.#renderer.forceContextLoss();
    this.#options.canvas.remove();
    this.#report = report;
    return report;
  }
}
