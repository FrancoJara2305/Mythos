/**
 * Navegación del Narratorio (docs/design_guidelines.md, «Navegación»).
 *
 * La travesía principal tiene cuatro paradas: la Torre del Conocimiento, la bóveda de los Doce, el Mapa de
 * Linajes Estelares y el Hilo del Destino. El repositorio documental («El Códice de las Fuentes») y
 * los créditos se enlazan con discreción desde el pie: el rigor sigue ahí, en una capa secundaria.
 * Una entrada solo se muestra con `available: true`; `npm run test:dist` falla si un enlace publicado
 * no resuelve a un archivo del build.
 */
import { ACTIVE_CHAPTER } from './chapters.ts';
import { paths } from '../lib/routes.ts';

export interface NavItem {
  label: string;
  href: string;
  available: boolean;
  /** Línea breve bajo el rótulo cuando la entrada es la sala actual. */
  hint?: string;
  /** Rótulo en otro idioma (p. ej. inglés), para marcar `lang`. */
  lang?: string;
}

/** Paradas de la travesía, en el orden del recorrido. */
export const archiveNavigation: readonly NavItem[] = [
  { label: 'La Torre', href: paths.home(), available: true, hint: 'Descenso por el cosmos' },
  { label: 'Los Doce', href: paths.chapter(ACTIVE_CHAPTER.id), available: true, hint: 'Bóveda de constelaciones' },
  { label: 'Linajes estelares', href: paths.genealogy(ACTIVE_CHAPTER.id), available: true, hint: 'Familias y tradiciones' },
  { label: 'Hilo del destino', href: paths.atlas(ACTIVE_CHAPTER.id), available: true, hint: 'La saga, episodio a episodio' },
];

/** Capa documental: discreta, en el pie. */
export const footerNavigation: readonly NavItem[] = [
  { label: 'El Códice de las Fuentes', href: paths.sources(), available: true },
  { label: 'Créditos', href: paths.credits(), available: true },
];

export function availableItems(items: readonly NavItem[]): NavItem[] {
  return items.filter((item) => item.available);
}

/** La ruta ya está publicada según la navegación (para acciones que enlazan a otras salas). */
export function isPublished(href: string): boolean {
  return [...archiveNavigation, ...footerNavigation].some((item) => item.href === href && item.available);
}

/** Entrada del índice contextual «En esta página»: un ancla de la página actual. */
export interface PageSection {
  id: string;
  label: string;
}

/** Navegación entre fichas: posición en la bóveda, anterior/siguiente y selector de divinidades. */
export interface DeityNavigation {
  current: { id: string; name: string; position: number; total: number };
  previous: { name: string; href: string };
  next: { name: string; href: string };
  roster: readonly { id: string; name: string; href: string }[];
}
