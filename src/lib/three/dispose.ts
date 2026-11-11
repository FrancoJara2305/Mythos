/**
 * Liberación explícita de los recursos GPU de una escena (eliminar una malla no basta:
 * https://threejs.org/manual/#en/how-to-dispose-of-objects). Recorre geometrías, materiales y
 * texturas con conjuntos, de modo que un recurso compartido se libera una sola vez, y cierra los
 * ImageBitmap que GLTFLoader crea en los navegadores que lo admiten.
 *
 * Solo importa tipos de Three: se prueba en Node con objetos reales de Three.
 */
import type { BufferGeometry, Material, Object3D, Texture } from 'three';

export interface DisposalReport {
  geometries: number;
  materials: number;
  textures: number;
  bitmaps: number;
}

const isTexture = (value: unknown): value is Texture => typeof value === 'object' && value !== null && (value as { isTexture?: unknown }).isTexture === true;

export function disposeObject(root: Object3D): DisposalReport {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse((object) => {
    const candidate = object as Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };
    if (candidate.geometry !== undefined) geometries.add(candidate.geometry);
    const list = candidate.material === undefined ? [] : Array.isArray(candidate.material) ? candidate.material : [candidate.material];
    for (const material of list) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (isTexture(value)) textures.add(value);
  }

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  const images = new Set<unknown>();
  textures.forEach((texture) => {
    texture.dispose();
    images.add(texture.image);
  });
  let bitmaps = 0;
  if (typeof ImageBitmap !== 'undefined') {
    for (const image of images) {
      if (image instanceof ImageBitmap) {
        image.close();
        bitmaps += 1;
      }
    }
  }
  root.removeFromParent();
  return { geometries: geometries.size, materials: materials.size, textures: textures.size, bitmaps };
}
