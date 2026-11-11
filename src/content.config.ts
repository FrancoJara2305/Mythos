/**
 * Content Collections de MYTHOS (docs/content_model.md §2).
 *
 * `deities` y `myths`: Markdown con frontmatter. `sources`, `artifacts`, `relationships` y
 * `timeline-events`: un JSON por registro. El ID estable es el nombre de archivo (ASCII kebab-case).
 * Los esquemas se definen en `src/lib/content/schema.ts`; la integridad entre colecciones se valida
 * en cada build desde `src/lib/content/archive.ts`.
 */
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import type { z } from 'astro/zod';
import { createContentSchemas, type ContentCollection, type EntryRef } from './lib/content/schema.ts';

/**
 * `reference()` de Astro tipa su salida con el mapa de colecciones generado por `astro sync`; aquí se
 * fija la forma `{ collection, id }` que Astro produce en tiempo de ejecución para compartir los
 * esquemas con las pruebas de Node.
 */
const ref = <C extends ContentCollection>(collection: C) =>
  reference(collection) as unknown as z.ZodType<EntryRef<C>, string>;

const schemas = createContentSchemas(ref);

const markdown = (directory: string) => glob({ pattern: '**/*.md', base: `./src/content/${directory}` });
const json = (directory: string) => glob({ pattern: '**/*.json', base: `./src/content/${directory}` });

export const collections = {
  deities: defineCollection({ loader: markdown('deities'), schema: schemas.deities }),
  myths: defineCollection({ loader: markdown('myths'), schema: schemas.myths }),
  sources: defineCollection({ loader: json('sources'), schema: schemas.sources }),
  artifacts: defineCollection({ loader: json('artifacts'), schema: schemas.artifacts }),
  relationships: defineCollection({ loader: json('relationships'), schema: schemas.relationships }),
  'timeline-events': defineCollection({ loader: json('timeline-events'), schema: schemas['timeline-events'] }),
};
