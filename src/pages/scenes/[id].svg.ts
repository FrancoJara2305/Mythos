/**
 * Escenas originales de MYTHOS (src/lib/scenes/scenes.ts) como archivos SVG estáticos generados en
 * el build: base de la primera vista de cada ficha. Un solo archivo por deidad, cacheable.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { SCENE_IDS, sceneFor } from '../../lib/scenes/scenes.ts';

export const getStaticPaths = (() => SCENE_IDS.map((id) => ({ params: { id } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const { id } = params;
  if (id === undefined || !SCENE_IDS.includes(id)) return new Response(null, { status: 404 });
  return new Response(sceneFor(id).base, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
};
