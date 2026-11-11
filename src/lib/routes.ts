/**
 * Rutas cerradas del MVP (docs/architecture_decisions.md, «Rutas cerradas»).
 *
 * Con `trailingSlash: 'always'`, toda ruta de página termina en «/». Los IDs son estables, en ASCII
 * kebab-case, e independientes de los títulos traducidos. Que una ruta tenga constructor aquí no
 * significa que esté publicada: la navegación solo enlaza las que existen (src/config/navigation.ts).
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

function slug(value: string, kind: string): string {
  if (!isValidSlug(value)) {
    throw new Error(`ID de ${kind} inválido: "${value}". Usa ASCII kebab-case estable (p. ej. "athena").`);
  }
  return value;
}

export const paths = {
  home: () => '/',
  chapter: (chapterId: string) => `/chapters/${slug(chapterId, 'capítulo')}/`,
  genealogy: (chapterId: string) => `/chapters/${slug(chapterId, 'capítulo')}/genealogy/`,
  atlas: (chapterId: string) => `/chapters/${slug(chapterId, 'capítulo')}/atlas/`,
  deity: (deityId: string) => `/deities/${slug(deityId, 'deidad')}/`,
  /** Relato mítico con página propia (Narratorio). */
  myth: (mythId: string) => `/myths/${slug(mythId, 'relato')}/`,
  artifact: (artifactId: string) => `/artifacts/${slug(artifactId, 'artefacto')}/`,
  sources: () => '/sources/',
  source: (sourceId: string) => `/sources/${slug(sourceId, 'fuente')}/`,
  /** Ancla de un pasaje dentro de la página de su obra. */
  passage: (sourceId: string, passageId: string) => `/sources/${slug(sourceId, 'fuente')}/#${slug(passageId, 'pasaje')}`,
  credits: () => '/credits/',
} as const;

/**
 * Valor de `aria-current` para un enlace de navegación: `page` en la ruta exacta y `true` dentro de
 * su sección (excepto la portada, que no contiene a las demás). Si otro enlace del mismo menú
 * (`siblings`) coincide de forma más específica, solo ese se marca: en el Atlas
 * (`/chapters/x/atlas/`) se marca «Hilo del destino», no también «Los Doce» (`/chapters/x/`).
 */
export function ariaCurrent(pathname: string, href: string, siblings: readonly string[] = []): 'page' | 'true' | undefined {
  const current = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (current === href) return 'page';
  if (href === '/' || !current.startsWith(href)) return undefined;
  const moreSpecific = siblings.some((other) => other !== href && other.length > href.length && current.startsWith(other));
  return moreSpecific ? undefined : 'true';
}
