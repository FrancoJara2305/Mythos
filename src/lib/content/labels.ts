/** Rótulos visibles de valores controlados del modelo de contenido. */
import type { CERTAINTIES, RIGHTS_STATUSES, STATUSES } from './schema.ts';

type Certainty = (typeof CERTAINTIES)[number];
type RightsStatus = (typeof RIGHTS_STATUSES)[number];
type Status = (typeof STATUSES)[number];

export const CERTAINTY_LABELS: Readonly<Record<Certainty, string>> = {
  explicit: 'explícita',
  probable: 'probable',
  possible: 'posible',
  disputed: 'discutida',
  unknown: 'desconocida',
};

export const RIGHTS_LABELS: Readonly<Record<RightsStatus, string>> = {
  verified: 'derechos verificados',
  unverified: 'derechos sin verificar',
  restricted: 'uso restringido',
};

export const STATUS_LABELS: Readonly<Record<Status, string>> = {
  draft: 'borrador',
  reviewed: 'revisado',
  published: 'publicado',
};

export const ROLE_LABELS = {
  supports: 'respalda',
  contrasts: 'contrasta',
  context: 'contexto',
} as const;
