/**
 * robots.txt estático dependiente del ambiente lógico (docs/deployment_strategy.md §6):
 * fuera de producción se bloquea todo el rastreo. La línea `Sitemap:` se añadirá cuando exista
 * sitemap.xml con rutas publicadas.
 */
import type { APIRoute } from 'astro';
import { getPublicEnv } from '../lib/env.ts';

export const GET: APIRoute = () => {
  const { indexable } = getPublicEnv();
  const body = indexable ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
