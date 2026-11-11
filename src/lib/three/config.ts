/**
 * Datos que el build entrega a la isla del inspector (`<script type="application/json">`): solo lo
 * necesario para dibujar — URL del GLB, cámara guardada y posiciones de las anotaciones. Los textos de
 * las anotaciones, créditos y derechos viajan en el HTML, visibles sin JavaScript.
 *
 * Módulo puro, compartido por el build y el navegador.
 */
import type { Vec3 } from './camera.ts';

export interface InspectorConfig {
  /** URL pública del GLB (bajo `/assets/models/` para modelos del archivo). */
  src: string;
  /** Bytes del GLB servido, para el aviso de descarga. */
  bytes: number;
  /** Versión del sistema de coordenadas de las anotaciones y la cámara. */
  coordinateVersion: number;
  camera?: { position: Vec3; target: Vec3; fov: number };
  hotspots: Array<{ id: string; position: Vec3 }>;
}

/** Anotación tal como se muestra en la lista (HTML, visible sin JavaScript). */
export interface InspectorHotspotView {
  id: string;
  label: string;
  description: string;
  /** Tipo de anotación tal como se rotula: rasgo observado, interpretación o restauración. */
  kindLabel?: string;
  evidence?: { label: string; href: string; external?: boolean };
}

const MODEL_PATH =/^public\/assets\/models\/[a-z0-9][a-z0-9-]*\.glb$/;

/** Ruta del repositorio (`public/assets/models/x.glb`) → URL pública (`/assets/models/x.glb`). */
export function modelUrl(glbPath: string): string {
  if (!MODEL_PATH.test(glbPath)) {
    throw new Error(`glbPath debe ser public/assets/models/{nombre}.glb (minúsculas, cifras y guiones): ${glbPath}`);
  }
  return `/${glbPath.slice('public/'.length)}`;
}

export function isModelPath(glbPath: string): boolean {
  return MODEL_PATH.test(glbPath);
}

const decimal = (value: number) => value.toLocaleString('es', { maximumFractionDigits: 1, minimumFractionDigits: 0 });

/** Peso de descarga para el visitante, en unidades decimales («1,2 MB», «340 kB»). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new RangeError(`Bytes inválidos: ${bytes}`);
  if (bytes >= 1_000_000) return `${decimal(bytes / 1_000_000)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} kB`;
  return `${bytes} B`;
}

export function formatCount(count: number): string {
  return count.toLocaleString('es');
}

/** Lectura defensiva del JSON incrustado: la isla no confía en una forma que no ha comprobado. */
export function parseInspectorConfig(value: unknown): InspectorConfig | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const isVec3 = (item: unknown): item is Vec3 => Array.isArray(item) && item.length === 3 && item.every((n) => typeof n === 'number' && Number.isFinite(n));
  if (typeof record.src !== 'string' || typeof record.bytes !== 'number' || typeof record.coordinateVersion !== 'number') return undefined;
  if (!Array.isArray(record.hotspots)) return undefined;
  const hotspots = record.hotspots.flatMap((item: unknown) => {
    const hotspot = item as Record<string, unknown> | null;
    return hotspot !== null && typeof hotspot?.id === 'string' && isVec3(hotspot.position) ? [{ id: hotspot.id, position: hotspot.position }] : [];
  });
  const camera = record.camera as Record<string, unknown> | undefined;
  const validCamera = camera !== undefined && isVec3(camera.position) && isVec3(camera.target) && typeof camera.fov === 'number' && camera.fov > 0;
  return {
    src: record.src,
    bytes: record.bytes,
    coordinateVersion: record.coordinateVersion,
    ...(validCamera ? { camera: { position: camera.position as Vec3, target: camera.target as Vec3, fov: camera.fov as number } } : {}),
    hotspots,
  };
}
