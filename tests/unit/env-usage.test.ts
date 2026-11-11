/**
 * Guardia estática: el código fuente solo lee variables públicas o integradas de Astro/Vite.
 * Complementa `strictImportMetaEnv` (src/env.d.ts), que convierte en error de tipos las no declaradas.
 */
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SOURCE_DIR = path.join(ROOT, 'src');
const SOURCE_EXTENSIONS = new Set(['.astro', '.ts', '.mts', '.js', '.mjs']);
const BUILT_INS = new Set(['SITE', 'BASE_URL', 'MODE', 'DEV', 'PROD', 'SSR', 'ASSETS_PREFIX']);
/** Variables privadas permitidas y el único archivo que puede leerlas (solo durante el build). */
const PRIVATE_ALLOWED: Record<string, string> = { VERCEL_ENV: 'src/lib/env.ts' };

async function sourceFiles(): Promise<string[]> {
  const entries = await readdir(SOURCE_DIR, { recursive: true, withFileTypes: true });
  return entries
    // Los .d.ts solo declaran tipos: no se ejecutan ni integran valores.
    .filter((entry) => entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name)) && !entry.name.endsWith('.d.ts'))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

test('src/ solo usa import.meta.env con PUBLIC_*, integradas o privadas autorizadas', async () => {
  const violations: string[] = [];
  for (const file of await sourceFiles()) {
    const relative = path.relative(ROOT, file).replaceAll(path.sep, '/');
    const content = await readFile(file, 'utf8');

    if (/import\.meta\.env\s*\[/.test(content)) violations.push(`${relative}: acceso dinámico a import.meta.env`);
    if (/\bprocess\.env\b/.test(content)) violations.push(`${relative}: process.env en código de la aplicación`);

    for (const match of content.matchAll(/import\.meta\.env\.([A-Za-z_$][\w$]*)/g)) {
      const name = match[1] ?? '';
      if (name.startsWith('PUBLIC_') || BUILT_INS.has(name)) continue;
      if (PRIVATE_ALLOWED[name] === relative) continue;
      violations.push(`${relative}: import.meta.env.${name}`);
    }
  }
  assert.deepEqual(violations, []);
});
