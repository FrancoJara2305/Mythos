/** Tesela del cielo estrellado de fondo (src/lib/sky/starfield.ts), como archivo estático cacheable. */
import type { APIRoute } from 'astro';
import { starfieldSvg } from '../lib/sky/starfield.ts';

export const GET: APIRoute = () => new Response(starfieldSvg(), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
