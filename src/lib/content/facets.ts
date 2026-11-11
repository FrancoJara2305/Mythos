/**
 * Facetas de una deidad en el planetario: cada una es una estrella principal de su constelación.
 *
 * Vive en un módulo sin dependencias porque la isla del planetario la importa en el navegador. Si la
 * importara desde `schema.ts`, el bundle de la bóveda arrastraría Zod entero (≈60 KB sin comprimir).
 */
export const STAR_FACETS = ['origin', 'tales', 'domains', 'names'] as const;
export type StarFacet = (typeof STAR_FACETS)[number];
