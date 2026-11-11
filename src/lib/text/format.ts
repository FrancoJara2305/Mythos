/** Utilidades de redacción para cartelas generadas a partir de datos. */

/**
 * Convierte un dato en frase: mayúscula inicial y punto final, salvo que ya termine en puntuación
 * terminal, aunque vaya seguida de comillas o paréntesis de cierre («ca. 530 a. C.», «Aphrodite?»).
 * Un paréntesis sin punto, como «(helenístico)», sí recibe punto.
 */
export function sentence(text: string): string {
  const trimmed = text.trim();
  if (trimmed === '') return '';
  const capitalised = trimmed.charAt(0).toLocaleUpperCase('es') + trimmed.slice(1);
  return /[.!?…][»”"')]*$/u.test(capitalised) ? capitalised : `${capitalised}.`;
}
