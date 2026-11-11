/**
 * Encuadre y movimientos de cámara del inspector, como matemática pura (sin Three.js): la isla y
 * OrbitControls comparten estos límites y las pruebas los comprueban en Node.
 *
 * Contrato (docs/architecture_decisions.md): cámara perspectiva de ~35°, objeto centrado en su caja,
 * zoom entre 0,75 y 2,5 veces la distancia inicial, sin desplazamiento lateral y con límites de órbita
 * que no dejan pasar por debajo de la base.
 */

export type Vec3 = readonly [number, number, number];

export const DEFAULT_FOV = 35;
export const ZOOM_RANGE = { min: 0.75, max: 2.5 } as const;
/** Ángulo polar (desde el eje +Y): ni cenital exacto ni por debajo del plano de la base. */
export const POLAR_RANGE = { min: Math.PI * 0.08, max: Math.PI * 0.55 } as const;
/** Dirección de la vista inicial por defecto: de frente (+Z) y algo por encima. */
const DEFAULT_DIRECTION: Vec3 = [0, 0.12, 1];
const MARGIN = 1.08;

export interface Limits {
  minDistance: number;
  maxDistance: number;
  minPolar: number;
  maxPolar: number;
}

export interface Framing extends Limits {
  fov: number;
  position: Vec3;
  target: Vec3;
  distance: number;
  near: number;
  far: number;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const degrees = (radians: number) => (radians * 180) / Math.PI;
const radians = (deg: number) => (deg * Math.PI) / 180;

/**
 * Distancia a la que una esfera de radio `radius` cabe entera en el campo de visión (vertical u
 * horizontal, el más estrecho), con un margen.
 */
export function fitDistance(radius: number, fov: number, aspect: number): number {
  const vertical = radians(fov) / 2;
  const horizontal = Math.atan(Math.tan(vertical) * aspect);
  return (radius / Math.sin(Math.min(vertical, horizontal))) * MARGIN;
}

/**
 * Encuadre de un objeto ya centrado en el origen. `stored` es la cámara guardada para el artefacto
 * (en el mismo espacio normalizado) cuando existe; si no, vista frontal por defecto.
 */
export function frame(radius: number, aspect = 1, stored?: { position: Vec3; target: Vec3; fov: number }): Framing {
  if (!(radius > 0)) throw new RangeError('El radio del objeto debe ser positivo.');
  const fov = stored?.fov ?? DEFAULT_FOV;
  const target: Vec3 = stored?.target ?? [0, 0, 0];
  let position: Vec3;
  if (stored !== undefined) {
    position = stored.position;
  } else {
    const direction = DEFAULT_DIRECTION;
    position = add(target, scale(direction, fitDistance(radius, fov, Math.max(aspect, 0.5)) / length(direction)));
  }
  const distance = length(sub(position, target));
  const minDistance = distance * ZOOM_RANGE.min;
  const maxDistance = distance * ZOOM_RANGE.max;
  // Con zoom máximo, la superficie más cercana está a `minDistance - radius` (> 0 por el encuadre).
  const near = Math.max((minDistance - radius) * 0.5, radius * 0.001);
  const far = maxDistance + radius * 2;
  return { fov, position, target, distance, near, far, minDistance, maxDistance, minPolar: POLAR_RANGE.min, maxPolar: POLAR_RANGE.max };
}

export interface Orbit {
  /** Ángulo en el plano horizontal, en grados; 0 = de frente (+Z). */
  azimuth: number;
  /** Ángulo desde el eje vertical, en grados. */
  polar: number;
  distance: number;
}

export function toOrbit(position: Vec3, target: Vec3): Orbit {
  const offset = sub(position, target);
  const distance = length(offset);
  return {
    azimuth: degrees(Math.atan2(offset[0], offset[2])),
    polar: degrees(Math.acos(clamp(offset[1] / distance, -1, 1))),
    distance,
  };
}

export function fromOrbit(orbit: Orbit, target: Vec3): Vec3 {
  const theta = radians(orbit.azimuth);
  const phi = radians(orbit.polar);
  const sinPhi = Math.sin(phi);
  return add(target, [orbit.distance * sinPhi * Math.sin(theta), orbit.distance * Math.cos(phi), orbit.distance * sinPhi * Math.cos(theta)]);
}

/** Gira alrededor del objetivo (grados), respetando los límites polares. */
export function rotate(position: Vec3, target: Vec3, deltaAzimuth: number, deltaPolar: number, limits: Limits): Vec3 {
  const orbit = toOrbit(position, target);
  const polar = clamp(orbit.polar + deltaPolar, degrees(limits.minPolar), degrees(limits.maxPolar));
  return fromOrbit({ azimuth: orbit.azimuth + deltaAzimuth, polar, distance: orbit.distance }, target);
}

/** Acerca (`factor` < 1) o aleja (`factor` > 1) dentro del rango de distancias. */
export function dolly(position: Vec3, target: Vec3, factor: number, limits: Limits): Vec3 {
  const offset = sub(position, target);
  const distance = clamp(length(offset) * factor, limits.minDistance, limits.maxDistance);
  return add(target, scale(offset, distance / length(offset)));
}

/**
 * Orienta la cámara para mirar un punto anotado de frente, conservando la distancia actual y dentro
 * de los límites polares. Si el punto coincide con el objetivo, no cambia nada.
 */
export function faceTowards(position: Vec3, target: Vec3, point: Vec3, limits: Limits): Vec3 {
  const direction = sub(point, target);
  if (length(direction) < 1e-9) return position;
  const wanted = toOrbit(add(target, direction), target);
  const polar = clamp(wanted.polar, degrees(limits.minPolar), degrees(limits.maxPolar));
  return fromOrbit({ azimuth: wanted.azimuth, polar, distance: length(sub(position, target)) }, target);
}

export { add as addVec3, sub as subVec3 };
