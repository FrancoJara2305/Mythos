/**
 * Imágenes del archivo procesadas por `astro:assets`. Los registros de contenido guardan la ruta del
 * maestro (`media[].localPath`, p. ej. `src/assets/images/artifacts/x.jpg`); aquí se resuelve a los
 * metadatos que necesitan `<Image>`/`<Picture>`. Solo para código de build.
 */
import type { ImageMetadata } from 'astro';

const images = import.meta.glob<{ default: ImageMetadata }>('/src/assets/images/**/*.{jpg,jpeg,png,webp}', { eager: true });

export function imageAt(localPath: string): ImageMetadata {
  const module = images[`/${localPath.replace(/^\/+/, '')}`];
  if (module === undefined) throw new Error(`Imagen no encontrada en src/assets/images: ${localPath}`);
  return module.default;
}
