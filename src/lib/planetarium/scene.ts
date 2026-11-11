/**
 * Escena 3D del Planetario de Constelaciones (GR-04). Único módulo del planetario que importa
 * Three.js: la isla (`src/components/planetarium/planetarium.ts`) lo carga con `import()` dinámico, de
 * modo que Three no entra en el bundle inicial (tests/build/verify-dist.ts lo comprueba).
 *
 * - Bóveda: el lector está en el centro; las doce constelaciones ocupan un anillo a su alrededor,
 *   entre un campo de estrellas y nebulosas. En la vista general se mira alrededor arrastrando.
 * - Viaje: al enfocar una constelación la cámara gira y avanza hacia ella (posición y orientación
 *   interpoladas con suavizado); sus líneas se dibujan al llegar.
 * - Tradiciones: las constelaciones inactivas (el otro ocupante del asiento variable) se desvanecen
 *   mientras la activa aparece en el mismo lugar del cielo.
 * - Las etiquetas y los nodos estelares son HTML de la isla: la escena solo informa de su posición
 *   proyectada en cada fotograma (`onFrame`).
 * - Movimiento reducido: sin centelleo ni deriva, viajes instantáneos y dibujo solo por demanda.
 * - Liberación explícita de geometrías, materiales, texturas y contexto (`dispose`, idempotente).
 */
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Matrix4,
  PerspectiveCamera,
  Points,
  Quaternion,
  Scene,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { PlanetariumData, PlanetariumDeity, StarFacet } from './model.ts';

/** Radio del anillo de constelaciones y tamaño de cada figura, en unidades de escena. */
const RADIUS = 60;
const FIGURE = 9.5;
/** Distancia de la cámara a la constelación enfocada. */
const FOCUS_DISTANCE = 31;
const TRAVEL_MS = 1900;
const FADE_MS = 900;
const MAX_DPR = 2;
const UP = new Vector3(0, 1, 0);

export interface ScreenPoint {
  x: number;
  y: number;
  /** Delante de la cámara y dentro del lienzo. */
  visible: boolean;
}

export interface FrameInfo {
  /** Centro de cada constelación activa, bajo su figura. */
  labels: Map<string, ScreenPoint>;
  /** Estrellas principales de la constelación enfocada. */
  nodes: Map<StarFacet, ScreenPoint>;
}

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  data: PlanetariumData;
  reducedMotion: boolean;
  /** Constelación elegida con el puntero. */
  onSelect: (id: string) => void;
  onFrame: (info: FrameInfo) => void;
  /** El contexto WebGL se perdió: la isla vuelve a la lista. */
  onLost: () => void;
}

export interface PlanetariumScene {
  setActive(ids: readonly string[], immediate?: boolean): void;
  setFocus(id: string | null, immediate?: boolean): void;
  /** Desplaza el encuadre para dejar sitio al panel (fracción del ancho; positivo: panel a la derecha). */
  setPanelOffset(fractionX: number, fractionY: number): void;
  setReducedMotion(value: boolean): void;
  setRunning(value: boolean): void;
  resize(): void;
  dispose(): void;
}

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uScale;
  uniform float uAlpha;
  uniform float uBoost;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.84 + 0.16 * sin(uTime * 1.7 + aPhase);
    gl_PointSize = aSize * uScale * twinkle * (1.0 + uBoost * 0.45) / -mv.z;
    vColor = aColor;
    vAlpha = uAlpha * twinkle;
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    if (d > 0.5) discard;
    float core = 1.0 - smoothstep(0.0, 0.13, d);
    float halo = pow(1.0 - d * 2.0, 1.9);
    float glint = max(0.0, 1.0 - abs(p.x) * 20.0) * max(0.0, 1.0 - abs(p.y) * 2.3)
                + max(0.0, 1.0 - abs(p.y) * 20.0) * max(0.0, 1.0 - abs(p.x) * 2.3);
    vec3 colour = mix(vColor, vec3(1.0), core * 0.85);
    float alpha = min(1.0, halo * 0.6 + core + glint * 0.35) * vAlpha;
    gl_FragColor = vec4(colour * alpha, alpha);
  }
`;

/** PRNG mulberry32: el cielo de fondo es el mismo en cada visita. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Constellation {
  id: string;
  group: Group;
  centre: Vector3;
  stars: ShaderMaterial;
  lines: LineSegments;
  lineMaterial: LineBasicMaterial;
  segments: number;
  /** Posición local de cada estrella principal. */
  facets: Map<StarFacet, Vector3>;
  /** Presencia (0…1): tradición activa. */
  presence: number;
  presenceTarget: number;
  /** Realce (0…1): constelación enfocada. */
  boost: number;
  boostTarget: number;
}

export function createPlanetariumScene(options: SceneOptions): PlanetariumScene {
  const { canvas, data } = options;
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(58, 1, 0.1, 1200);
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const starMaterial = (alpha: number) =>
    track(
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uAlpha: { value: alpha }, uBoost: { value: 0 } },
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    );

  /* ——— Cielo de fondo ——— */
  const random = rng(4004);
  const backdropMaterial = starMaterial(0.9);
  {
    const count = 2600;
    const positions = new Float32Array(count * 3);
    const colours = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const tints = ['#f3ecdf', '#f3ecdf', '#dbeafe', '#fde047', '#38bdf8', '#c4b5fd'].map((hex) => new Color(hex));
    for (let index = 0; index < count; index += 1) {
      // Distribución uniforme sobre la esfera.
      const u = random() * 2 - 1;
      const phi = random() * Math.PI * 2;
      const r = 420 + random() * 260;
      const s = Math.sqrt(1 - u * u);
      positions.set([r * s * Math.cos(phi), r * u, r * s * Math.sin(phi)], index * 3);
      const tint = tints[Math.floor(random() * tints.length)] as Color;
      colours.set([tint.r, tint.g, tint.b], index * 3);
      sizes[index] = random() > 0.95 ? 4200 + random() * 3000 : 1300 + random() * 1700;
      phases[index] = random() * Math.PI * 2;
    }
    const geometry = track(new BufferGeometry());
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new Float32BufferAttribute(colours, 3));
    geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
    const points = new Points(geometry, backdropMaterial);
    points.frustumCulled = false;
    scene.add(points);
  }

  /* ——— Nebulosas ——— */
  const nebulaTexture = (() => {
    const size = 256;
    const element = document.createElement('canvas');
    element.width = size;
    element.height = size;
    const context = element.getContext('2d');
    if (context !== null) {
      const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
      gradient.addColorStop(0.35, 'rgba(255,255,255,0.18)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    }
    return track(new CanvasTexture(element));
  })();
  for (const [hex, x, y, z, scale, opacity] of [
    ['#4c1d95', -260, 90, -300, 620, 0.5],
    ['#1e3a8a', 320, -60, -220, 560, 0.5],
    ['#0e7490', 120, 160, 340, 520, 0.32],
    ['#7c2d12', -300, -120, 260, 480, 0.26],
    ['#312e81', 0, -260, -60, 700, 0.4],
  ] as const) {
    const material = track(new SpriteMaterial({ map: nebulaTexture, color: new Color(hex), transparent: true, opacity, depthWrite: false, depthTest: false, blending: AdditiveBlending }));
    const sprite = new Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(scale);
    scene.add(sprite);
  }

  /* ——— Constelaciones ——— */
  const constellations = new Map<string, Constellation>();
  const build = (deity: PlanetariumDeity): Constellation => {
    const colour = new Color(deity.color);
    const centre = new Vector3(...deity.direction).multiplyScalar(RADIUS);
    const group = new Group();
    group.position.copy(centre);
    group.lookAt(0, 0, 0);

    const count = deity.stars.length;
    const positions = new Float32Array(count * 3);
    const colours = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const facets = new Map<StarFacet, Vector3>();
    deity.stars.forEach((star, index) => {
      const local = new Vector3(star.x * FIGURE, star.y * FIGURE, star.z * FIGURE * 0.35);
      positions.set([local.x, local.y, local.z], index * 3);
      const tint = colour.clone().lerp(new Color('#ffffff'), star.facet === undefined ? 0.15 : 0.35);
      colours.set([tint.r, tint.g, tint.b], index * 3);
      sizes[index] = (star.facet === undefined ? 900 : 1500) * (0.6 + star.magnitude);
      phases[index] = (index * 2.399) % (Math.PI * 2);
      if (star.facet !== undefined) facets.set(star.facet, local);
    });
    const geometry = track(new BufferGeometry());
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new Float32BufferAttribute(colours, 3));
    geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
    const stars = starMaterial(0);
    const points = new Points(geometry, stars);
    points.frustumCulled = false;
    group.add(points);

    const linePositions = new Float32Array(deity.links.length * 6);
    deity.links.forEach(([from, to], index) => {
      linePositions.set([positions[from * 3] ?? 0, positions[from * 3 + 1] ?? 0, positions[from * 3 + 2] ?? 0], index * 6);
      linePositions.set([positions[to * 3] ?? 0, positions[to * 3 + 1] ?? 0, positions[to * 3 + 2] ?? 0], index * 6 + 3);
    });
    const lineGeometry = track(new BufferGeometry());
    lineGeometry.setAttribute('position', new Float32BufferAttribute(linePositions, 3));
    const lineMaterial = track(new LineBasicMaterial({ color: colour, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: AdditiveBlending }));
    const lines = new LineSegments(lineGeometry, lineMaterial);
    lines.frustumCulled = false;
    group.add(lines);
    scene.add(group);

    return { id: deity.id, group, centre, stars, lines, lineMaterial, segments: deity.links.length, facets, presence: 0, presenceTarget: 0, boost: 0, boostTarget: 0 };
  };
  for (const deity of Object.values(data.deities)) constellations.set(deity.id, build(deity));

  /* ——— Cámara ——— */
  const position = new Vector3();
  const orientation = new Quaternion();
  const travel = { active: false, start: 0, fromPosition: new Vector3(), toPosition: new Vector3(), fromOrientation: new Quaternion(), toOrientation: new Quaternion() };
  /** Mirada libre en la vista general. */
  const look = { yaw: 0, pitch: 0.08 };
  const offset = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let focus: string | null = null;
  let reducedMotion = options.reducedMotion;
  let running = true;
  let disposed = false;
  let frame = 0;
  let last = performance.now();
  let drawStart = 0;
  let width = 1;
  let height = 1;

  const lookMatrix = new Matrix4();
  const orientationTowards = (from: Vector3, to: Vector3, out: Quaternion) => out.setFromRotationMatrix(lookMatrix.lookAt(from, to, UP));
  const overviewOrientation = (out: Quaternion) => {
    const direction = new Vector3(Math.sin(look.yaw) * Math.cos(look.pitch), Math.sin(look.pitch), -Math.cos(look.yaw) * Math.cos(look.pitch));
    return orientationTowards(new Vector3(), direction, out);
  };

  const request = () => {
    if (frame === 0 && !disposed) frame = requestAnimationFrame(tick);
  };

  const travelTo = (toPosition: Vector3, toOrientation: Quaternion, immediate: boolean) => {
    if (immediate || reducedMotion) {
      position.copy(toPosition);
      orientation.copy(toOrientation);
      travel.active = false;
    } else {
      travel.active = true;
      travel.start = performance.now();
      travel.fromPosition.copy(position);
      travel.fromOrientation.copy(orientation);
      travel.toPosition.copy(toPosition);
      travel.toOrientation.copy(toOrientation);
    }
    request();
  };

  const project = (world: Vector3): ScreenPoint => {
    const projected = world.clone().project(camera);
    const x = (projected.x * 0.5 + 0.5) * width;
    const y = (-projected.y * 0.5 + 0.5) * height;
    return { x, y, visible: projected.z < 1 && projected.z > -1 && x > -40 && x < width + 40 && y > -40 && y < height + 40 };
  };

  const scratch = new Vector3();
  function tick(now: number): void {
    frame = 0;
    if (disposed) return;
    const delta = Math.min(64, now - last);
    last = now;
    let moving = false;

    if (travel.active) {
      const t = Math.min(1, (now - travel.start) / TRAVEL_MS);
      const k = ease(t);
      position.lerpVectors(travel.fromPosition, travel.toPosition, k);
      orientation.slerpQuaternions(travel.fromOrientation, travel.toOrientation, k);
      travel.active = t < 1;
      moving = true;
    } else if (focus === null) {
      if (!reducedMotion && !dragging) {
        look.yaw += delta * 0.000018;
        moving = true;
      }
      position.set(0, 0, 0);
      overviewOrientation(orientation);
    }

    // Desplazamiento del encuadre (hueco del panel), suavizado.
    const offsetStep = reducedMotion ? 1 : Math.min(1, delta / 260);
    if (Math.abs(offset.targetX - offset.x) > 0.0005 || Math.abs(offset.targetY - offset.y) > 0.0005) {
      offset.x += (offset.targetX - offset.x) * offsetStep;
      offset.y += (offset.targetY - offset.y) * offsetStep;
      moving = true;
    } else {
      offset.x = offset.targetX;
      offset.y = offset.targetY;
    }
    camera.setViewOffset(width, height, offset.x * width, offset.y * height, width, height);
    camera.position.copy(position);
    camera.quaternion.copy(orientation);
    camera.updateMatrixWorld();

    const fade = reducedMotion ? 1 : Math.min(1, delta / FADE_MS);
    const time = reducedMotion ? 0 : now / 1000;
    backdropMaterial.uniforms.uTime!.value = time;
    for (const item of constellations.values()) {
      if (item.presence !== item.presenceTarget) {
        item.presence = Math.abs(item.presenceTarget - item.presence) < 0.01 ? item.presenceTarget : item.presence + Math.sign(item.presenceTarget - item.presence) * fade;
        item.presence = MathUtils.clamp(item.presence, 0, 1);
        moving = true;
      }
      if (item.boost !== item.boostTarget) {
        item.boost = Math.abs(item.boostTarget - item.boost) < 0.01 ? item.boostTarget : item.boost + Math.sign(item.boostTarget - item.boost) * fade;
        item.boost = MathUtils.clamp(item.boost, 0, 1);
        moving = true;
      }
      const dimmed = focus !== null && item.id !== focus ? 0.45 : 1;
      item.group.visible = item.presence > 0.001;
      item.group.scale.setScalar(0.82 + item.presence * 0.18);
      item.stars.uniforms.uTime!.value = time;
      item.stars.uniforms.uAlpha!.value = item.presence * dimmed;
      item.stars.uniforms.uBoost!.value = item.boost;
      item.lineMaterial.opacity = item.presence * dimmed * (0.3 + item.boost * 0.55);
      // Al llegar, las líneas de la figura enfocada se dibujan tramo a tramo.
      if (item.id === focus && !reducedMotion) {
        const progress = Math.min(1, (now - drawStart) / (TRAVEL_MS * 0.9));
        item.lines.geometry.setDrawRange(0, Math.max(2, Math.ceil(progress * item.segments) * 2));
        if (progress < 1) moving = true;
      } else {
        item.lines.geometry.setDrawRange(0, item.segments * 2);
      }
    }

    renderer.render(scene, camera);

    const labels = new Map<string, ScreenPoint>();
    for (const item of constellations.values()) {
      if (item.presenceTarget === 0) continue;
      scratch.set(0, -FIGURE * 1.28, 0).applyMatrix4(item.group.matrixWorld);
      labels.set(item.id, project(scratch));
    }
    const nodes = new Map<StarFacet, ScreenPoint>();
    const focused = focus === null ? undefined : constellations.get(focus);
    if (focused !== undefined && !travel.active) {
      for (const [name, local] of focused.facets) nodes.set(name, project(scratch.copy(local).applyMatrix4(focused.group.matrixWorld)));
    }
    options.onFrame({ labels, nodes });

    // Con movimiento permitido el cielo centellea: bucle continuo mientras la escena está a la vista.
    if (running && (moving || !reducedMotion)) frame = requestAnimationFrame(tick);
  }

  /* ——— Puntero: mirar alrededor (vista general) y elegir constelación ——— */
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  const controller = new AbortController();
  const signal = controller.signal;

  canvas.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0) return;
      dragging = true;
      moved = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    },
    { signal },
  );
  canvas.addEventListener(
    'pointermove',
    (event) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (focus === null && !travel.active) {
        look.yaw -= dx * 0.0032;
        look.pitch = MathUtils.clamp(look.pitch + dy * 0.0026, -0.55, 0.55);
        request();
      }
    },
    { signal },
  );
  const release = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (moved > 6 || event.type === 'pointercancel') return;
    // Clic: la constelación activa cuyo centro proyectado queda más cerca del puntero.
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    let best: { id: string; distance: number } | undefined;
    for (const item of constellations.values()) {
      if (item.presenceTarget === 0 || item.id === focus) continue;
      const centre = project(scratch.copy(item.centre));
      if (!centre.visible) continue;
      const edge = project(scratch.set(FIGURE, 0, 0).applyMatrix4(item.group.matrixWorld));
      const reach = Math.max(56, Math.hypot(edge.x - centre.x, edge.y - centre.y) * 1.25);
      const distance = Math.hypot(centre.x - x, centre.y - y);
      if (distance <= reach && (best === undefined || distance < best.distance)) best = { id: item.id, distance };
    }
    if (best !== undefined) options.onSelect(best.id);
  };
  canvas.addEventListener('pointerup', release, { signal });
  canvas.addEventListener('pointercancel', release, { signal });
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      options.onLost();
    },
    { signal },
  );

  const api: PlanetariumScene = {
    setActive(ids, immediate = false) {
      const active = new Set(ids);
      for (const item of constellations.values()) {
        item.presenceTarget = active.has(item.id) ? 1 : 0;
        if (immediate || reducedMotion) item.presence = item.presenceTarget;
      }
      request();
    },
    setFocus(id, immediate = false) {
      const target = id === null ? undefined : constellations.get(id);
      const previous = focus;
      focus = target?.id ?? null;
      for (const item of constellations.values()) {
        item.boostTarget = item.id === focus ? 1 : 0;
        if (immediate || reducedMotion) item.boost = item.boostTarget;
      }
      if (target === undefined) {
        // De vuelta al centro, mirando hacia donde estaba la constelación que se deja.
        const from = previous === null ? undefined : constellations.get(previous);
        if (from !== undefined) {
          look.yaw = Math.atan2(from.centre.x, -from.centre.z);
          look.pitch = Math.asin(MathUtils.clamp(from.centre.y / RADIUS, -1, 1));
        }
        travelTo(new Vector3(), overviewOrientation(new Quaternion()), immediate);
        return;
      }
      if (previous !== focus) drawStart = performance.now() + (immediate || reducedMotion ? -TRAVEL_MS : TRAVEL_MS * 0.45);
      const eye = target.centre.clone().multiplyScalar((RADIUS - FOCUS_DISTANCE) / RADIUS);
      travelTo(eye, orientationTowards(eye, target.centre, new Quaternion()), immediate);
    },
    setPanelOffset(fractionX, fractionY) {
      offset.targetX = fractionX;
      offset.targetY = fractionY;
      request();
    },
    setReducedMotion(value) {
      reducedMotion = value;
      request();
    },
    setRunning(value) {
      running = value;
      if (value) {
        last = performance.now();
        request();
      } else if (frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    resize() {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // En vertical se abre el campo de visión para que la figura enfocada quepa a lo ancho y, en un
      // móvil, en la franja que deja libre el panel (con 94° la figura mide unos 215 px a 390 × 844).
      camera.fov = width < height ? MathUtils.clamp(58 * (height / width) * 0.82, 58, 94) : 58;
      camera.updateProjectionMatrix();
      const scale = (height * dpr) / 1000;
      backdropMaterial.uniforms.uScale!.value = scale;
      for (const item of constellations.values()) item.stars.uniforms.uScale!.value = scale;
      request();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;
      controller.abort();
      for (const item of disposables) item.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };

  overviewOrientation(orientation);
  api.resize();
  return api;
}
