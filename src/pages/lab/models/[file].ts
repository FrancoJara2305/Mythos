/**
 * GLB del fixture técnico del inspector 3D, generados en el build (`lib/three/fixture-model.ts`).
 * Solo existen fuera de producción: con `PUBLIC_APP_ENV=production` no se emite ningún archivo
 * (y `tests/build/verify-dist.ts` lo comprueba).
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublicEnv } from '../../../lib/env.ts';
import { buildFixtureGlb, type FixtureOptions } from '../../../lib/three/fixture-model.ts';

const FILES: Readonly<Record<string, FixtureOptions>> = {
  'fixture-plinth.glb': {},
  // Declara Draco como obligatorio sin datos Draco: prueba el fallo de descodificador.
  'fixture-needs-decoder.glb': { requireDraco: true },
};

export const getStaticPaths = (() =>
  getPublicEnv().appEnv === 'production' ? [] : Object.keys(FILES).map((file) => ({ params: { file } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const options = params.file === undefined ? undefined : FILES[params.file];
  if (options === undefined) return new Response(null, { status: 404 });
  return new Response(buildFixtureGlb(options), { headers: { 'Content-Type': 'model/gltf-binary' } });
};
