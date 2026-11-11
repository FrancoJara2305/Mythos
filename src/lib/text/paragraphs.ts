/** Párrafos de un bloque de relato: se separan con una línea en blanco (`body` de `storySections`). */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter((paragraph) => paragraph !== '');
}
