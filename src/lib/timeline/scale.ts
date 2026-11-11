/**
 * Escala del modo histórico del atlas. Trabaja con ordinales (`toScaleOrdinal`): 1 a. C. y 1 d. C.
 * son contiguos y no existe el año 0. Las marcas caen en los siglos (…, 200 a. C., 100 a. C.), en
 * 1 d. C. para el cambio de era y en 100 d. C., 200 d. C.…; ninguna etiqueta muestra «0».
 * Módulo puro (pruebas de Node).
 */
import { formatHistoricalYear, toScaleOrdinal } from '../content/dates.ts';

export interface Interval {
  start: number;
  end: number;
}

export interface Tick {
  year: number;
  ordinal: number;
  label: string;
}

export interface HistoricalScale {
  /** Ordinales de los extremos. */
  min: number;
  max: number;
  ticks: Tick[];
}

/** Año de marca siguiente: los siglos a. C., luego 1 d. C. y los siglos d. C. */
function nextTick(year: number, step: number): number {
  if (year < 0) return year + step >= 0 ? 1 : year + step;
  return year === 1 ? step : year + step;
}

function previousTick(year: number, step: number): number {
  if (year > step) return year - step;
  if (year > 1) return 1;
  return year === 1 ? -step : year - step;
}

/** Marca más alta que no supera `year`. */
function floorTick(year: number, step: number): number {
  if (year >= 1 && year < step) return 1;
  if (year > 0) return Math.floor(year / step) * step;
  return -Math.ceil(-year / step) * step;
}

export function centuryScale(intervals: readonly Interval[], step = 100): HistoricalScale | undefined {
  if (intervals.length === 0) return undefined;
  for (const { start, end } of intervals) {
    if (toScaleOrdinal(start) > toScaleOrdinal(end)) throw new RangeError(`Intervalo invertido: ${start} > ${end}.`);
  }
  const earliest = Math.min(...intervals.map((interval) => toScaleOrdinal(interval.start)));
  const latest = Math.max(...intervals.map((interval) => toScaleOrdinal(interval.end)));
  const yearOf = (ordinal: number) => (ordinal <= 0 ? ordinal - 1 : ordinal);

  let lower = floorTick(yearOf(earliest), step);
  let upper = lower;
  while (toScaleOrdinal(upper) < latest) upper = nextTick(upper, step);
  if (lower === upper) {
    lower = previousTick(lower, step);
  }

  const ticks: Tick[] = [];
  for (let year = lower; toScaleOrdinal(year) <= toScaleOrdinal(upper); year = nextTick(year, step)) {
    ticks.push({ year, ordinal: toScaleOrdinal(year), label: formatHistoricalYear(year) });
  }
  return { min: toScaleOrdinal(lower), max: toScaleOrdinal(upper), ticks };
}

/** Posición (0–`width`) de un año histórico en la escala. */
export function positionOf(year: number, scale: HistoricalScale, width: number): number {
  return ((toScaleOrdinal(year) - scale.min) / (scale.max - scale.min)) * width;
}
