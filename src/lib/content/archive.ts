/**
 * Adaptador de Astro para el archivo curatorial: lee las seis colecciones con `getCollection()`,
 * valida su integridad y expone la vista visible según el ambiente.
 *
 * Solo debe usarse en código que se ejecuta durante el build (frontmatter de `.astro`, endpoints).
 * `BaseLayout` llama a `loadArchive()` en cada página: un contenido inconsistente detiene el build.
 */
import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { getCollection } from 'astro:content';
import { CHAPTERS, CHAPTER_SELECTIONS } from '../../config/chapters.ts';
import type { ArchiveData } from '../../types/content.ts';
import { getPublicEnv } from '../env.ts';
import { assertArchiveIntegrity, visibleArchive } from './integrity.ts';

/**
 * Raíz del proyecto, para comprobar rutas de evidencia (`references/...`) y de medios. Astro ejecuta
 * `dev` y `build` desde la raíz; `import.meta.url` no sirve porque el módulo se empaqueta en `dist/`.
 */
const ROOT = process.cwd();

/** Una ruta fuera del proyecto o absoluta cuenta como inexistente. */
function fileExists(repoRelativePath: string): boolean {
  const absolute = resolve(ROOT, repoRelativePath);
  const inside = relative(ROOT, absolute);
  if (isAbsolute(repoRelativePath) || inside.startsWith('..') || isAbsolute(inside)) return false;
  return existsSync(absolute);
}

async function readArchive(): Promise<ArchiveData> {
  const [deities, myths, sources, artifacts, relationships, timelineEvents] = await Promise.all([
    getCollection('deities'),
    getCollection('myths'),
    getCollection('sources'),
    getCollection('artifacts'),
    getCollection('relationships'),
    getCollection('timeline-events'),
  ]);
  return { deities, myths, sources, artifacts, relationships, 'timeline-events': timelineEvents };
}

export interface LoadedArchive {
  /** Todos los registros, ya validados. */
  all: ArchiveData;
  /** Registros visibles en el ambiente actual (solo `published` en producción). */
  visible: ArchiveData;
}

let cached: Promise<LoadedArchive> | undefined;

/**
 * Archivo validado. En build se memoriza (una sola validación por proceso); en desarrollo se vuelve a
 * leer en cada petición para reflejar los cambios de contenido.
 */
export function loadArchive(): Promise<LoadedArchive> {
  if (import.meta.env.DEV || cached === undefined) {
    const loading = readArchive().then((all) => {
      assertArchiveIntegrity(all, {
        chapterIds: CHAPTERS.map((chapter) => chapter.id),
        selections: CHAPTER_SELECTIONS,
        fileExists,
      });
      return { all, visible: visibleArchive(all, getPublicEnv().appEnv) };
    });
    if (import.meta.env.DEV) return loading;
    cached = loading;
  }
  return cached;
}
