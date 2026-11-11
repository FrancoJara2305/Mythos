// @ts-check
import { defineConfig } from 'astro/config';
// `vite` llega como dependencia de Astro; su `loadEnv` es el mismo mecanismo que usa Astro.
import { loadEnv } from 'vite';
import { parsePublicEnv, readAstroCli } from './src/lib/env.ts';

/**
 * Configuración pública del modo actual (docs/deployment_strategy.md §3–4).
 *
 * `loadEnv` lee `.env`, `.env.local`, `.env.[modo]` y `.env.[modo].local`; las variables ya presentes
 * en el proceso (las que inyecta Vercel) tienen prioridad. En `build` y `dev` una configuración
 * inválida detiene el proceso; `check`/`sync` y `preview` no renderizan páginas y solo omiten `site`.
 *
 * Se valida al evaluar este módulo y no dentro de un hook: en Windows (Astro 7.4.7 + Node 24.14), un
 * error lanzado desde `astro:config:setup` termina a veces con una aserción de libuv en lugar de un
 * código de salida 1; el error al cargar la configuración sale limpio.
 */
const { command, mode } = readAstroCli(process.argv);
const strict = command === 'build' || command === 'dev';

/** @type {import('./src/lib/env.ts').PublicEnvResult | undefined} */
let publicEnv;
try {
  publicEnv = parsePublicEnv(loadEnv(mode, process.cwd(), 'PUBLIC_'), { vercelEnv: process.env.VERCEL_ENV });
} catch (error) {
  if (strict) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${message}\n\nModo "${mode}": se leen .env.${mode}[.local], .env[.local] y las variables del proceso. ` +
        'Consulta .env.example. Para una simulación local con noindex usa `npm run build:staging`.',
      { cause: error },
    );
  }
}

/**
 * Informa del ambiente resuelto con el logger de Astro (no valida: eso ocurre arriba).
 * @returns {import('astro').AstroIntegration}
 */
function publicEnvReport() {
  return {
    name: 'mythos:public-env',
    hooks: {
      'astro:config:setup': ({ logger }) => {
        if (publicEnv === undefined) {
          logger.debug(`configuración pública no disponible para "${command}" (modo "${mode}"); se omite site.`);
          return;
        }
        for (const warning of publicEnv.warnings) logger.warn(warning);
        logger.info(`modo "${mode}" → PUBLIC_APP_ENV=${publicEnv.env.appEnv}, site=${publicEnv.env.siteUrl}`);
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  site: publicEnv?.env.siteUrl,
  integrations: [publicEnvReport()],
  vite: {
    build: {
      // El único chunk grande es el visor 3D (Three.js), que se importa solo al pulsar «Explorar en 3D».
      // Su presupuesto real (≤250 KiB comprimidos) está en docs/performance_strategy.md §1 y §8.
      chunkSizeWarningLimit: 700,
    },
  },
});
