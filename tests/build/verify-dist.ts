/**
 * Verificación del build estático (`dist/`). Uso:
 *   node tests/build/verify-dist.ts --app-env staging|production|development [--dist dist]
 *
 * Comprueba: páginas requeridas; ausencia de salida de servidor; enlaces internos y fragmentos que
 * resuelven; estructura semántica mínima; que cada página cargue sus estilos (un build lanzado desde
 * Git Bash en Windows los omitía sin fallar); <script> solo en las páginas autorizadas (más el módulo de
 * navegación compartido, idéntico en todas, pequeño y sin imports); robots/canonical
 * coherentes con el ambiente; y ausencia de patrones típicos de secretos en cualquier archivo de texto.
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { APP_ENVS, isLocalHost, isReservedExampleHost, type AppEnv } from '../../src/lib/env.ts';

const { values } = parseArgs({
  options: {
    'app-env': { type: 'string' },
    dist: { type: 'string', default: 'dist' },
  },
});

const appEnv = values['app-env'];
if (appEnv === undefined || !(APP_ENVS as readonly string[]).includes(appEnv)) {
  console.error(`Uso: node tests/build/verify-dist.ts --app-env ${APP_ENVS.join('|')} [--dist dist]`);
  process.exit(2);
}
const expectedEnv = appEnv as AppEnv;
const DIST = path.resolve(values.dist ?? 'dist');

/** Páginas que el build debe generar (en producción, la bóveda exige además los doce perfiles publicados). */
const ROSTER = ['zeus', 'hera', 'poseidon', 'demeter', 'athena', 'apollo', 'artemis', 'ares', 'aphrodite', 'hephaestus', 'hermes', 'dionysus'];
const REQUIRED_FILES = [
  'index.html',
  '404.html',
  'robots.txt',
  'chapters/dodekatheon/index.html',
  'chapters/dodekatheon/genealogy/index.html',
  'chapters/dodekatheon/atlas/index.html',
  'sources/index.html',
  'credits/index.html',
  ...ROSTER.map((id) => `deities/${id}/index.html`),
  // Laboratorio del inspector 3D (Phase 6): fixture técnico, solo fuera de producción.
  ...(expectedEnv === 'production' ? [] : ['lab/inspector/index.html', 'lab/models/fixture-plinth.glb', 'lab/models/fixture-needs-decoder.glb']),
];
/** Páginas técnicas: nunca en producción, siempre noindex y sin canonical. */
const isLabPage = (page: string) => page.startsWith('lab/');
/**
 * Páginas autorizadas a incluir <script> propios: la Torre y la bóveda (Narratorio), las islas de Phase 5
 * (genealogía y atlas) y los visores de Phase 6. El resto navega sin JavaScript: su único módulo es la navegación compartida
 * (src/scripts/site-nav.ts: scrollspy, panel móvil, apertura de `<details>` por ancla y pausa de la
 * animación ambiental), que es mejora progresiva y se verifica aparte.
 */
const SCRIPT_PAGES = [
  // La Torre (descenso, portal y altímetro) y el Planetario de Constelaciones (GR-04, escena 3D bajo demanda).
  /^index\.html$/,
  /^chapters\/dodekatheon\/index\.html$/,
  /^chapters\/[^/]+\/(?:genealogy|atlas)\/index\.html$/,
  /^artifacts\/[^/]+\/index\.html$/,
  ...(expectedEnv === 'production' ? [] : [/^lab\/inspector\/index\.html$/]),
];
const mayShipScripts = (page: string) => SCRIPT_PAGES.some((pattern) => pattern.test(page));
/** Presupuesto del módulo de navegación compartido, en línea en cada página. */
const SHARED_NAV_MAX_BYTES = 4 * 1024;
/** El módulo de navegación compartido se reconoce por el panel que controla (`#site-panel`). */
const isSharedNav = (attributes: string, code: string) =>
  /type=["']?module/i.test(attributes) && !/\bsrc=/i.test(attributes) && code.includes('site-panel');
/** Salidas que indicarían funciones de servidor o un adaptador SSR. */
const SERVER_ARTIFACTS = ['server', '_worker.js', '_functions', '.vercel', 'entry.mjs'];
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.txt', '.xml', '.svg', '.webmanifest']);
const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ['clave privada PEM', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['token de GitHub', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['clave de AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['token de Slack', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ['clave de API tipo sk-', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['nombre de variable sensible', /\b(?:VERCEL_TOKEN|[A-Z0-9_]*SECRET[A-Z0-9_]*|[A-Z0-9_]*API_KEY)\b/],
];

const errors: string[] = [];
const warnings: string[] = [];

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath, entry.name));
}

function toPosix(file: string): string {
  return path.relative(DIST, file).replaceAll(path.sep, '/');
}

function attributeValues(html: string, attribute: string): string[] {
  const pattern = new RegExp(`\\s${attribute}=(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'gi');
  return [...html.matchAll(pattern)].map((match) => match[1] ?? match[2] ?? match[3] ?? '');
}

function metaContent(html: string, name: string): string | undefined {
  const tag = html.match(new RegExp(`<meta[^>]+name=["']?${name}["']?[^>]*>`, 'i'))?.[0];
  return tag?.match(/content=["']([^"']*)["']/i)?.[1];
}

/** Resuelve una ruta interna del sitio a un archivo de dist (formato de build «directory»). */
function resolveInternal(urlPath: string): string | undefined {
  const decoded = decodeURIComponent(urlPath);
  const candidate = decoded.endsWith('/') ? path.join(DIST, decoded, 'index.html') : path.join(DIST, decoded);
  return existsSync(candidate) ? candidate : undefined;
}

if (!existsSync(DIST)) {
  console.error(`No existe ${DIST}. Ejecuta antes el build.`);
  process.exit(2);
}

const files = await listFiles(DIST);
const relativeFiles = new Set(files.map(toPosix));

for (const required of REQUIRED_FILES) {
  if (!relativeFiles.has(required)) errors.push(`Falta ${required}`);
}
if (expectedEnv === 'production') {
  for (const file of relativeFiles) if (file.startsWith('lab/')) errors.push(`Página o fixture de laboratorio en producción: ${file}`);
}
for (const artifact of SERVER_ARTIFACTS) {
  if (existsSync(path.join(DIST, artifact))) errors.push(`Salida de servidor inesperada: ${artifact}`);
}

const htmlFiles = files.filter((file) => file.endsWith('.html'));
const canonicalOrigins = new Set<string>();
const localCanonicalHosts = new Set<string>();
let checkedLinks = 0;
let scriptCount = 0;
let stylesheetCount = 0;
const sharedNavVariants = new Set<string>();
let threeFreeEntries = 0;

/** Módulos que una página ejecuta al cargar: `<script type="module" src>` y módulos en línea. */
function moduleEntries(html: string): Array<{ file?: string; code?: string }> {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].flatMap((match): Array<{ file?: string; code?: string }> => {
    const attributes = match[1] ?? '';
    if (!/type=["']?module/i.test(attributes)) return [];
    const src = attributes.match(/src=["']?([^"'\s>]+)/i)?.[1];
    if (src === undefined) return [{ code: match[2] ?? '' }];
    return src.startsWith('/') ? [{ file: path.join(DIST, src) }] : [];
  });
}

/** Busca `needle` en el módulo y en lo que importa estáticamente (los `import()` dinámicos no cuentan). */
async function staticImportWith(entry: { file?: string; code?: string }, needle: string, seen = new Set<string>()): Promise<string | undefined> {
  const code = entry.code ?? (entry.file !== undefined && existsSync(entry.file) ? await readFile(entry.file, 'utf8') : '');
  if (code.includes(needle)) return entry.file === undefined ? 'módulo en línea' : toPosix(entry.file);
  const base = entry.file === undefined ? DIST : path.dirname(entry.file);
  for (const match of code.matchAll(/\b(?:import|export)\s*(?:[^'"()]*?\bfrom\s*)?["']([^"']+\.js)["']/g)) {
    const specifier = match[1] ?? '';
    const file = specifier.startsWith('/') ? path.join(DIST, specifier) : path.resolve(base, specifier);
    if (seen.has(file)) continue;
    seen.add(file);
    const found = await staticImportWith({ file }, needle, seen);
    if (found !== undefined) return found;
  }
  return undefined;
}

for (const file of htmlFiles) {
  const page = toPosix(file);
  const html = await readFile(file, 'utf8');
  const isNotFound = page === '404.html';

  if (!/<html[^>]*\slang=["']?es["']?/i.test(html)) errors.push(`${page}: falta <html lang="es">`);
  const h1Count = html.match(/<h1[\s>]/gi)?.length ?? 0;
  if (h1Count !== 1) errors.push(`${page}: ${h1Count} elementos <h1> (se espera 1)`);
  for (const landmark of ['header', 'main', 'footer']) {
    if (!new RegExp(`<${landmark}[\\s>]`, 'i').test(html)) errors.push(`${page}: falta <${landmark}>`);
  }

  // Estilos: una hoja enlazada o en línea. El destino de cada <link> se comprueba con los enlaces internos.
  const stylesheets = (html.match(/<link\b[^>]*\brel=["']?stylesheet\b[^>]*>/gi)?.length ?? 0) + (html.match(/<style[\s>]/gi)?.length ?? 0);
  stylesheetCount += stylesheets;
  if (stylesheets === 0) errors.push(`${page}: no carga ninguna hoja de estilos (¿build lanzado desde Git Bash?)`);

  const allScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const sharedNav = allScripts.filter((match) => isSharedNav(match[1] ?? '', match[2] ?? ''));
  const scripts = allScripts.length - sharedNav.length;
  scriptCount += allScripts.length;
  if (sharedNav.length !== 1) errors.push(`${page}: ${sharedNav.length} módulos de navegación compartida (se espera 1)`);
  for (const match of sharedNav) {
    const code = match[2] ?? '';
    sharedNavVariants.add(code);
    const bytes = Buffer.byteLength(code);
    if (bytes > SHARED_NAV_MAX_BYTES) errors.push(`${page}: navegación compartida de ${bytes} B (> ${SHARED_NAV_MAX_BYTES} B)`);
    if (/\bimport\s*[("'{*\w]/.test(code)) errors.push(`${page}: la navegación compartida importa otros módulos`);
  }
  if (scripts > 0 && !mayShipScripts(page)) {
    errors.push(`${page}: ${scripts} <script> además de la navegación compartida (esta página debe funcionar sin JavaScript)`);
  }

  // Indexación por ambiente
  const robots = metaContent(html, 'robots') ?? '';
  const hasNoindex = /noindex/i.test(robots);
  const mustBeNoindex = expectedEnv !== 'production' || isNotFound || isLabPage(page);
  if (mustBeNoindex && !hasNoindex) errors.push(`${page}: falta meta robots noindex (${expectedEnv})`);
  if (!mustBeNoindex && hasNoindex) errors.push(`${page}: noindex en producción`);

  const canonicals = [...html.matchAll(/<link[^>]+rel=["']?canonical["']?[^>]*>/gi)].map(
    (match) => match[0].match(/href=["']?([^"'\s>]+)/i)?.[1] ?? '',
  );
  if ((isNotFound || isLabPage(page)) && canonicals.length > 0) errors.push(`${page}: una página noindex fija no debe declarar canonical`);
  if (!isNotFound && !isLabPage(page) && canonicals.length !== 1) errors.push(`${page}: ${canonicals.length} canonical (se espera 1)`);
  for (const canonical of canonicals) {
    try {
      const url = new URL(canonical);
      canonicalOrigins.add(url.origin);
      const expectedPath = `/${page.replace(/index\.html$/, '')}`;
      if (url.pathname !== expectedPath) errors.push(`${page}: canonical ${url.pathname} ≠ ${expectedPath}`);
      if (isLocalHost(url.hostname) || isReservedExampleHost(url.hostname)) localCanonicalHosts.add(url.hostname);
    } catch {
      errors.push(`${page}: canonical no es una URL absoluta (${canonical})`);
    }
  }

  // Three.js nunca en el bundle inicial: ni en los módulos de entrada ni en sus imports estáticos.
  // Zod tampoco en ningún módulo del navegador: los esquemas son del build (un import de `schema.ts`
  // desde una isla lo arrastraba entero).
  for (const entry of moduleEntries(html)) {
    const offender = await staticImportWith(entry, 'WebGLRenderer');
    threeFreeEntries += 1;
    if (offender !== undefined) errors.push(`${page}: Three.js en el bundle inicial (${offender})`);
    const zod = await staticImportWith(entry, 'ZodError');
    if (zod !== undefined) errors.push(`${page}: Zod en un módulo del navegador (${zod})`);
  }

  // Enlaces internos y fragmentos
  const ids = new Set(attributeValues(html, 'id'));
  for (const reference of [...attributeValues(html, 'href'), ...attributeValues(html, 'src')]) {
    if (reference.startsWith('#')) {
      checkedLinks += 1;
      if (reference.length > 1 && !ids.has(reference.slice(1))) errors.push(`${page}: fragmento roto ${reference}`);
      continue;
    }
    if (!reference.startsWith('/') || reference.startsWith('//')) continue; // externos o protocolo relativo
    checkedLinks += 1;
    const [pathname = '', fragment] = reference.split('#');
    const target = resolveInternal(pathname.split('?')[0] ?? '');
    if (target === undefined) {
      errors.push(`${page}: enlace interno roto ${reference}`);
    } else if (fragment && target.endsWith('.html')) {
      const targetIds = new Set(attributeValues(await readFile(target, 'utf8'), 'id'));
      if (!targetIds.has(fragment)) errors.push(`${page}: fragmento roto ${reference}`);
    }
  }
}

if (localCanonicalHosts.size > 0) {
  warnings.push(`canonical con host local/de ejemplo (${[...localCanonicalHosts].join(', ')}); aceptable solo en simulación local`);
}
if (canonicalOrigins.size > 1) errors.push(`Canonical con orígenes distintos: ${[...canonicalOrigins].join(', ')}`);

// robots.txt
if (relativeFiles.has('robots.txt')) {
  const robotsTxt = await readFile(path.join(DIST, 'robots.txt'), 'utf8');
  const blocksAll = /^Disallow:\s*\/\s*$/m.test(robotsTxt);
  if (expectedEnv !== 'production' && !blocksAll) errors.push(`robots.txt debe bloquear todo en ${expectedEnv}`);
  if (expectedEnv === 'production' && blocksAll) errors.push('robots.txt bloquea el rastreo en producción');
}

// Secretos en cualquier archivo de texto
for (const file of files) {
  if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
  const content = await readFile(file, 'utf8');
  for (const [label, pattern] of SECRET_PATTERNS) {
    if (pattern.test(content)) errors.push(`${toPosix(file)}: posible secreto (${label})`);
  }
}

if (sharedNavVariants.size > 1) errors.push(`la navegación compartida difiere entre páginas (${sharedNavVariants.size} variantes)`);

for (const warning of warnings) console.warn(`AVISO  ${warning}`);
if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR  ${error}`);
  console.error(`\nverify-dist: ${errors.length} error(es) en ${DIST} (ambiente esperado: ${expectedEnv}).`);
  process.exit(1);
}
console.log(
  `verify-dist OK — ambiente ${expectedEnv}: ${htmlFiles.length} páginas HTML, ${files.length} archivos, ` +
    `${checkedLinks} enlaces/fragmentos internos verificados, ${stylesheetCount} hojas de estilo, ${scriptCount} <script>, ` +
    `${threeFreeEntries} módulos de entrada sin Three.js ni Zod, sin salida de servidor.`,
);
