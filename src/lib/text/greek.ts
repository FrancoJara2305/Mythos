/**
 * Detección de fragmentos en griego dentro de un texto mixto, para marcarlos con `lang="grc"`
 * (docs/design_guidelines.md: cada fragmento griego lleva su idioma). Una racha empieza y termina en
 * una letra griega y puede incluir espacios, puntuación, apóstrofos y elisiones entre palabras griegas.
 */

export interface ScriptSegment {
  text: string;
  greek: boolean;
}

const LETTER = '\\u0370-\\u03FF\\u1F00-\\u1FFF';
const MARKS = '\\u0300-\\u036F';
const INNER = `${LETTER}${MARKS}\\s’ʼ'·,;.…\\-`;
// Las marcas combinantes finales (texto sin normalizar a NFC) pertenecen a la última letra.
const GREEK_RUN = new RegExp(`[${LETTER}](?:[${INNER}]*[${LETTER}ʼ’])?[${MARKS}]*`, 'gu');

export function splitGreek(text: string): ScriptSegment[] {
  const segments: ScriptSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(GREEK_RUN)) {
    const start = match.index;
    if (start > cursor) segments.push({ text: text.slice(cursor, start), greek: false });
    segments.push({ text: match[0], greek: true });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), greek: false });
  return segments;
}

export function hasGreek(text: string): boolean {
  return splitGreek(text).some((segment) => segment.greek);
}
