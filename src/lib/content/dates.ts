/**
 * Cronología histórica (docs/content_model.md §3).
 *
 * - Años enteros: negativos a. C., positivos d. C. **El año 0 no existe.**
 * - Para una escala continua se usa un ordinal: año negativo → `year + 1`, positivo igual. Así 1 a. C.
 *   (ordinal 0) y 1 d. C. (ordinal 1) quedan contiguos sin inventar un año cero.
 * - Nunca se usa `Date` de JavaScript para cronología antigua.
 *
 * Módulo puro: lo importan `content.config.ts` (vía `schema.ts`) y las pruebas de Node.
 */
import { z } from 'astro/zod';

export const DATE_PRECISIONS = ['year', 'decade', 'century', 'approximate'] as const;

const text = z.string().trim().min(1);
const isoDate = z.iso.date();
const httpsUrl = z.url({ protocol: /^https$/ });

export const historicalYearSchema = z
  .number()
  .int('El año debe ser un entero.')
  .refine((year) => year !== 0, { message: 'El año 0 no existe: usa -1 (1 a. C.) o 1 (1 d. C.).' });

function assertHistoricalYear(year: number): void {
  if (!Number.isInteger(year) || year === 0) {
    throw new RangeError(`Año histórico inválido: ${year}. Debe ser un entero distinto de 0.`);
  }
}

/** Año histórico → posición continua en la escala gráfica. */
export function toScaleOrdinal(year: number): number {
  assertHistoricalYear(year);
  return year < 0 ? year + 1 : year;
}

/** Inversa de `toScaleOrdinal`: el ordinal 0 corresponde a 1 a. C., nunca a un «año 0». */
export function fromScaleOrdinal(ordinal: number): number {
  if (!Number.isInteger(ordinal)) throw new RangeError(`Ordinal inválido: ${ordinal}.`);
  return ordinal <= 0 ? ordinal - 1 : ordinal;
}

/** Años transcurridos de `start` a `end` en la escala (1 a. C. → 1 d. C. = 1). */
export function scaleSpan(start: number, end: number): number {
  return toScaleOrdinal(end) - toScaleOrdinal(start);
}

export function formatHistoricalYear(year: number): string {
  assertHistoricalYear(year);
  return year < 0 ? `${-year} a. C.` : `${year} d. C.`;
}

/**
 * Esquema `HistoricalDate`. Recibe el esquema de evidencia literaria porque una base de tipo
 * `passage` reutiliza `Evidence` (que depende de `reference('sources')`).
 */
export function createHistoricalDateSchema<E extends z.ZodType>(evidence: E) {
  const bibliographic = {
    url: httpsUrl,
    title: text,
    authorOrInstitution: text,
    /** Localizador bibliográfico o de registro para reproducir la consulta. */
    locator: text.optional(),
    checkedAt: isoDate,
  };

  const dateBasis = z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('passage'), evidence }),
    z.strictObject({ kind: z.literal('catalogue'), ...bibliographic }),
    z.strictObject({ kind: z.literal('scholarship'), ...bibliographic }),
  ]);

  return z.discriminatedUnion('kind', [
    /** Desconocido deliberado: no se transforma nunca en un año. */
    z.strictObject({ kind: z.literal('unknown'), label: text }),
    z
      .strictObject({
        kind: z.literal('range'),
        start: historicalYearSchema,
        end: historicalYearSchema,
        /** Datación textual preservada («ca.», «posiblemente», «tercer cuarto del siglo…»). */
        label: text,
        precision: z.enum(DATE_PRECISIONS),
        /** De dónde sale el intervalo numérico y cómo se derivó de la datación textual. */
        basis: text,
        evidence: z.array(dateBasis).min(1),
      })
      .refine((date) => date.start <= date.end, {
        message: 'Rango invertido: start debe ser menor o igual que end.',
        path: ['end'],
      }),
  ]);
}
