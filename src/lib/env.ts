/**
 * Configuración pública por ambiente (variables `PUBLIC_*`).
 *
 * Todas las variables `PUBLIC_*` quedan integradas en el HTML generado: son públicas y nunca deben
 * contener secretos. Contrato completo en docs/deployment_strategy.md §3–4.
 *
 * - `parsePublicEnv()` es pura: recibe valores crudos y el contexto de la plataforma, y devuelve una
 *   configuración tipada o lanza `PublicEnvError` con todos los problemas encontrados.
 * - `getPublicEnv()` lee `import.meta.env` y solo debe usarse en código que se ejecuta durante el build
 *   (frontmatter de `.astro`, endpoints). No importar este módulo desde scripts de cliente.
 */

export const APP_ENVS = ['development', 'staging', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

/** Valores tal como llegan de los archivos `.env*` o de la plataforma. */
export interface RawPublicEnv {
  PUBLIC_APP_ENV?: string | undefined;
  PUBLIC_SITE_URL?: string | undefined;
  PUBLIC_ENABLE_EXPERIMENTAL_3D?: string | undefined;
}

export interface EnvContext {
  /** `VERCEL_ENV` inyectada por Vercel; ausente en ejecuciones locales. */
  vercelEnv?: string | undefined;
}

export interface PublicEnv {
  appEnv: AppEnv;
  /** Origen público normalizado con barra final, p. ej. `https://dominio.org/`. */
  siteUrl: string;
  /** Solo habilita experimentos adicionales; los dos visores 3D del MVP no dependen de ella. */
  enableExperimental3d: boolean;
  /** Únicamente `production` es indexable; el resto emite `noindex`. */
  indexable: boolean;
}

export interface PublicEnvResult {
  env: PublicEnv;
  warnings: string[];
}

export class PublicEnvError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Configuración pública inválida:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'PublicEnvError';
    this.issues = issues;
  }
}

/**
 * Correspondencia obligatoria entre el target de Vercel y el ambiente lógico.
 * Un Custom Environment necesitará su propio mapeo probado antes de usarse.
 */
const VERCEL_ENV_TO_APP_ENV: Readonly<Record<string, AppEnv>> = {
  production: 'production',
  preview: 'staging',
  development: 'development',
};

/** Targets que generan un despliegue público (`vercel dev` se considera local). */
const REMOTE_VERCEL_ENVS = new Set(['production', 'preview']);

/** TLD reservados para ejemplos o pruebas (RFC 2606 / RFC 6761). */
const RESERVED_TLDS = new Set(['invalid', 'example', 'test']);
const EXAMPLE_DOMAINS = ['example.com', 'example.net', 'example.org'];

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, '');
}

/** Host de la propia máquina o de la red local; nunca válido como URL pública. */
export function isLocalHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '[::1]' ||
    host === '0.0.0.0' ||
    /^127(?:\.\d{1,3}){3}$/.test(host)
  );
}

/** Dominio reservado de ejemplo (placeholder), p. ej. `staging.example.invalid` o `example.com`. */
export function isReservedExampleHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  const tld = host.split('.').at(-1) ?? '';
  return (
    RESERVED_TLDS.has(tld) || EXAMPLE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))
  );
}

function isAppEnv(value: string): value is AppEnv {
  return (APP_ENVS as readonly string[]).includes(value);
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
}

function parseAppEnv(value: string | undefined, issues: string[]): AppEnv | undefined {
  const raw = blankToUndefined(value);
  if (raw === undefined) {
    issues.push(`PUBLIC_APP_ENV es obligatoria (${APP_ENVS.join(' | ')}).`);
    return undefined;
  }
  if (!isAppEnv(raw)) {
    issues.push(`PUBLIC_APP_ENV debe ser exactamente ${APP_ENVS.join(' | ')}.`);
    return undefined;
  }
  return raw;
}

function parseSiteUrl(value: string | undefined, issues: string[]): URL | undefined {
  const raw = blankToUndefined(value);
  if (raw === undefined) {
    issues.push('PUBLIC_SITE_URL es obligatoria (URL absoluta, p. ej. https://dominio.org).');
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    issues.push('PUBLIC_SITE_URL no es una URL absoluta válida.');
    return undefined;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    issues.push('PUBLIC_SITE_URL debe usar http o https.');
    return undefined;
  }
  if (url.username !== '' || url.password !== '') {
    issues.push('PUBLIC_SITE_URL no debe incluir credenciales.');
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    issues.push('PUBLIC_SITE_URL debe ser solo un origen, sin ruta, parámetros ni fragmento (el sitio no usa base path).');
  }
  return url;
}

/** Parseo literal: `Boolean('false')` sería `true`, por eso solo se aceptan las cadenas exactas. */
function parseLiteralBoolean(name: string, value: string | undefined, fallback: boolean, issues: string[]): boolean {
  const raw = blankToUndefined(value);
  if (raw === undefined) return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  issues.push(`${name} debe ser exactamente "true" o "false".`);
  return fallback;
}

export function parsePublicEnv(raw: RawPublicEnv, context: EnvContext = {}): PublicEnvResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  const appEnv = parseAppEnv(raw.PUBLIC_APP_ENV, issues);
  const site = parseSiteUrl(raw.PUBLIC_SITE_URL, issues);
  const enableExperimental3d = parseLiteralBoolean(
    'PUBLIC_ENABLE_EXPERIMENTAL_3D',
    raw.PUBLIC_ENABLE_EXPERIMENTAL_3D,
    false,
    issues,
  );

  const vercelEnv = blankToUndefined(context.vercelEnv);
  if (vercelEnv !== undefined) {
    const expected = Object.hasOwn(VERCEL_ENV_TO_APP_ENV, vercelEnv) ? VERCEL_ENV_TO_APP_ENV[vercelEnv] : undefined;
    if (expected === undefined) {
      issues.push(
        `VERCEL_ENV="${vercelEnv}" no tiene correspondencia definida; añade un mapeo probado antes de usar ese entorno.`,
      );
    } else if (appEnv !== undefined && appEnv !== expected) {
      issues.push(`PUBLIC_APP_ENV debe ser "${expected}" cuando VERCEL_ENV="${vercelEnv}".`);
    }
  }

  const remote = vercelEnv !== undefined && REMOTE_VERCEL_ENVS.has(vercelEnv);
  if (site !== undefined) {
    const local = isLocalHost(site.hostname);
    const placeholder = isReservedExampleHost(site.hostname);
    if (remote) {
      if (site.protocol !== 'https:') issues.push('PUBLIC_SITE_URL debe usar HTTPS en builds remotos.');
      if (local) issues.push('PUBLIC_SITE_URL no puede apuntar a un host local en builds remotos.');
      if (placeholder) {
        issues.push('PUBLIC_SITE_URL usa un dominio reservado de ejemplo; configura la URL aprobada en la plataforma.');
      }
    } else if (appEnv !== undefined && appEnv !== 'development' && (local || placeholder)) {
      warnings.push(
        `PUBLIC_SITE_URL (${site.hostname}) es un host local o de ejemplo: válido solo para simulación local; un build remoto lo rechazará.`,
      );
    }
  }

  if (issues.length > 0 || appEnv === undefined || site === undefined) {
    throw new PublicEnvError(issues);
  }

  return {
    env: {
      appEnv,
      siteUrl: `${site.origin}/`,
      enableExperimental3d,
      indexable: appEnv === 'production',
    },
    warnings,
  };
}

const ASTRO_COMMANDS = new Set([
  'dev',
  'build',
  'preview',
  'check',
  'sync',
  'add',
  'info',
  'docs',
  'telemetry',
  'preferences',
  'create-key',
]);

export interface AstroCli {
  /** Subcomando de Astro (`dev`, `build`, `check`…) o `undefined` si no se reconoce. */
  command: string | undefined;
  /** Modo de Vite que usará ese comando. */
  mode: string;
}

/**
 * Comando y modo de la invocación actual de Astro, leídos de `process.argv`. `astro.config.mjs` los
 * necesita porque se evalúa antes de que Astro exponga el modo. Reproduce la regla de Astro 7.4.7:
 * `--mode` explícito; si no, `dev` usa `development` y el resto (`build`, `preview`, `check`/`sync`)
 * `production`. Si la detección fallara, `getPublicEnv()` vuelve a validar al renderizar.
 */
export function readAstroCli(argv: readonly string[]): AstroCli {
  const command = argv.slice(2).find((arg) => ASTRO_COMMANDS.has(arg));
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--mode') {
      const next = argv[index + 1];
      if (next !== undefined && next !== '' && !next.startsWith('-')) return { command, mode: next };
    } else if (arg !== undefined && arg.startsWith('--mode=')) {
      const value = arg.slice('--mode='.length);
      if (value !== '') return { command, mode: value };
    }
  }
  return { command, mode: command === 'dev' ? 'development' : 'production' };
}

let cachedEnv: PublicEnv | undefined;

/**
 * Configuración pública del build en curso, leída de `import.meta.env` (los valores que Vite integra
 * según el modo). Comprueba además que coincide con el `site` fijado en `astro.config.mjs`, para
 * detectar cualquier divergencia entre el modo deducido allí y el modo real.
 */
export function getPublicEnv(): PublicEnv {
  if (cachedEnv !== undefined) return cachedEnv;

  const { env } = parsePublicEnv(
    {
      PUBLIC_APP_ENV: import.meta.env.PUBLIC_APP_ENV,
      PUBLIC_SITE_URL: import.meta.env.PUBLIC_SITE_URL,
      PUBLIC_ENABLE_EXPERIMENTAL_3D: import.meta.env.PUBLIC_ENABLE_EXPERIMENTAL_3D,
    },
    { vercelEnv: import.meta.env.VERCEL_ENV },
  );

  const configuredSite: unknown = import.meta.env.SITE;
  if (typeof configuredSite !== 'string' || new URL(configuredSite).href !== env.siteUrl) {
    throw new Error(
      'El `site` de astro.config.mjs no coincide con PUBLIC_SITE_URL del modo actual. Revisa el modo (--mode) y los archivos .env*.',
    );
  }

  cachedEnv = env;
  return env;
}
