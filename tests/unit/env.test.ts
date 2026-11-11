import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  isLocalHost,
  isReservedExampleHost,
  parsePublicEnv,
  PublicEnvError,
  readAstroCli,
  type RawPublicEnv,
} from '../../src/lib/env.ts';

const DEV: RawPublicEnv = {
  PUBLIC_APP_ENV: 'development',
  PUBLIC_SITE_URL: 'http://localhost:4321',
  PUBLIC_ENABLE_EXPERIMENTAL_3D: 'false',
};
const APPROVED_URL = 'https://mythos.org.ar'; // dominio hipotético no reservado, solo para pruebas

function issuesOf(fn: () => unknown): readonly string[] {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof PublicEnvError, 'debe lanzar PublicEnvError');
    return error.issues;
  }
  assert.fail('se esperaba PublicEnvError');
}

describe('parsePublicEnv — local', () => {
  test('desarrollo válido: tipado, normalizado y no indexable', () => {
    const { env, warnings } = parsePublicEnv(DEV);
    assert.deepEqual(env, {
      appEnv: 'development',
      siteUrl: 'http://localhost:4321/',
      enableExperimental3d: false,
      indexable: false,
    });
    assert.deepEqual(warnings, []);
  });

  test('solo production es indexable', () => {
    for (const appEnv of ['development', 'staging'] as const) {
      assert.equal(parsePublicEnv({ ...DEV, PUBLIC_APP_ENV: appEnv }).env.indexable, false);
    }
    assert.equal(parsePublicEnv({ PUBLIC_APP_ENV: 'production', PUBLIC_SITE_URL: APPROVED_URL }).env.indexable, true);
  });

  test('sin variables obligatorias informa de ambas a la vez', () => {
    const issues = issuesOf(() => parsePublicEnv({}));
    assert.equal(issues.length, 2);
    assert.match(issues[0] ?? '', /PUBLIC_APP_ENV es obligatoria/);
    assert.match(issues[1] ?? '', /PUBLIC_SITE_URL es obligatoria/);
  });

  test('cadenas vacías equivalen a variables ausentes', () => {
    const issues = issuesOf(() => parsePublicEnv({ PUBLIC_APP_ENV: ' ', PUBLIC_SITE_URL: '' }));
    assert.equal(issues.length, 2);
  });

  test('PUBLIC_APP_ENV fuera del enum cerrado falla (mode ≠ ambiente lógico)', () => {
    for (const value of ['qa', 'Production', 'prod', 'preview']) {
      const issues = issuesOf(() => parsePublicEnv({ ...DEV, PUBLIC_APP_ENV: value }));
      assert.match(issues[0] ?? '', /PUBLIC_APP_ENV debe ser exactamente/);
    }
  });

  test('booleano literal: "false" es false, ausente o vacío es false, "true" es true', () => {
    assert.equal(parsePublicEnv({ ...DEV, PUBLIC_ENABLE_EXPERIMENTAL_3D: 'false' }).env.enableExperimental3d, false);
    assert.equal(parsePublicEnv({ ...DEV, PUBLIC_ENABLE_EXPERIMENTAL_3D: undefined }).env.enableExperimental3d, false);
    assert.equal(parsePublicEnv({ ...DEV, PUBLIC_ENABLE_EXPERIMENTAL_3D: '' }).env.enableExperimental3d, false);
    assert.equal(parsePublicEnv({ ...DEV, PUBLIC_ENABLE_EXPERIMENTAL_3D: 'true' }).env.enableExperimental3d, true);
  });

  test('booleano: valores no literales fallan en lugar de interpretarse', () => {
    for (const value of ['1', '0', 'yes', 'TRUE', 'False', 'on']) {
      const issues = issuesOf(() => parsePublicEnv({ ...DEV, PUBLIC_ENABLE_EXPERIMENTAL_3D: value }));
      assert.match(issues[0] ?? '', /exactamente "true" o "false"/);
    }
  });

  test('URL: se normaliza al origen con barra final', () => {
    assert.equal(parsePublicEnv({ ...DEV, PUBLIC_SITE_URL: 'https://Mythos.org.ar/' }).env.siteUrl, 'https://mythos.org.ar/');
  });

  test('URL: rechaza valores no absolutos, otros protocolos, rutas, parámetros, fragmentos y credenciales', () => {
    const invalid: Record<string, RegExp> = {
      'mythos.org.ar': /no es una URL absoluta|debe usar http o https/,
      'localhost:4321': /debe usar http o https/,
      'ftp://mythos.org.ar': /debe usar http o https/,
      'https://mythos.org.ar/archivo/': /solo un origen/,
      'https://mythos.org.ar/?a=1': /solo un origen/,
      'https://mythos.org.ar/#x': /solo un origen/,
      'https://user:pass@mythos.org.ar': /credenciales/,
    };
    for (const [value, expected] of Object.entries(invalid)) {
      const issues = issuesOf(() => parsePublicEnv({ ...DEV, PUBLIC_SITE_URL: value }));
      assert.match(issues.join('\n'), expected, value);
    }
  });

  test('staging o production con host reservado/local se aceptan en local con advertencia', () => {
    const staging = parsePublicEnv({ PUBLIC_APP_ENV: 'staging', PUBLIC_SITE_URL: 'https://mythos-staging.example.invalid' });
    assert.equal(staging.env.appEnv, 'staging');
    assert.equal(staging.warnings.length, 1);
    const production = parsePublicEnv({ PUBLIC_APP_ENV: 'production', PUBLIC_SITE_URL: 'http://localhost:4321' });
    assert.equal(production.warnings.length, 1);
  });

  test('development con localhost no advierte', () => {
    assert.deepEqual(parsePublicEnv(DEV).warnings, []);
  });
});

describe('parsePublicEnv — Vercel', () => {
  const stagingRemote: RawPublicEnv = { PUBLIC_APP_ENV: 'staging', PUBLIC_SITE_URL: APPROVED_URL };
  const productionRemote: RawPublicEnv = { PUBLIC_APP_ENV: 'production', PUBLIC_SITE_URL: APPROVED_URL };

  test('Preview exige PUBLIC_APP_ENV=staging', () => {
    assert.equal(parsePublicEnv(stagingRemote, { vercelEnv: 'preview' }).env.appEnv, 'staging');
    const issues = issuesOf(() => parsePublicEnv(productionRemote, { vercelEnv: 'preview' }));
    assert.match(issues[0] ?? '', /debe ser "staging" cuando VERCEL_ENV="preview"/);
  });

  test('Production exige PUBLIC_APP_ENV=production', () => {
    assert.equal(parsePublicEnv(productionRemote, { vercelEnv: 'production' }).env.indexable, true);
    const issues = issuesOf(() => parsePublicEnv(stagingRemote, { vercelEnv: 'production' }));
    assert.match(issues[0] ?? '', /debe ser "production" cuando VERCEL_ENV="production"/);
  });

  test('VERCEL_ENV desconocido (p. ej. Custom Environment sin mapeo) detiene el build', () => {
    const issues = issuesOf(() => parsePublicEnv(stagingRemote, { vercelEnv: 'staging' }));
    assert.match(issues[0] ?? '', /no tiene correspondencia definida/);
  });

  test('builds remotos rechazan http, hosts locales y placeholders', () => {
    const cases: Record<string, RegExp> = {
      'http://mythos.org.ar': /HTTPS/,
      'https://localhost': /host local/,
      'https://127.0.0.1': /host local/,
      'https://mythos-staging.example.invalid': /dominio reservado/,
      'https://www.example.com': /dominio reservado/,
    };
    for (const [url, expected] of Object.entries(cases)) {
      const issues = issuesOf(() =>
        parsePublicEnv({ PUBLIC_APP_ENV: 'staging', PUBLIC_SITE_URL: url }, { vercelEnv: 'preview' }),
      );
      assert.match(issues.join('\n'), expected, url);
    }
  });

  test('`vercel dev` (VERCEL_ENV=development) se trata como local', () => {
    assert.equal(parsePublicEnv(DEV, { vercelEnv: 'development' }).env.siteUrl, 'http://localhost:4321/');
  });
});

describe('clasificación de hosts', () => {
  test('locales', () => {
    for (const host of ['localhost', 'app.localhost', 'mythos.local', '127.0.0.1', '127.1.2.3', '[::1]', '0.0.0.0']) {
      assert.equal(isLocalHost(host), true, host);
    }
    assert.equal(isLocalHost('mythos.org.ar'), false);
  });

  test('reservados de ejemplo', () => {
    for (const host of ['example.com', 'www.example.org', 'a.example', 'x.invalid', 'site.test', 'staging.example.invalid.']) {
      assert.equal(isReservedExampleHost(host), true, host);
    }
    for (const host of ['mythos.org.ar', 'examples.com', 'testing.dev']) {
      assert.equal(isReservedExampleHost(host), false, host);
    }
  });
});

describe('readAstroCli', () => {
  const cli = (...args: string[]) => readAstroCli(['node', 'astro.mjs', ...args]);

  test('por defecto: dev → development; build, preview y check → production', () => {
    assert.deepEqual(cli('dev', '--background'), { command: 'dev', mode: 'development' });
    assert.deepEqual(cli('dev', '--json'), { command: 'dev', mode: 'development' }); // proceso hijo de --background
    assert.deepEqual(cli('build'), { command: 'build', mode: 'production' });
    assert.deepEqual(cli('preview', '--port', '4399'), { command: 'preview', mode: 'production' });
    assert.deepEqual(cli('check'), { command: 'check', mode: 'production' });
  });

  test('respeta --mode con espacio o con igual', () => {
    assert.deepEqual(cli('build', '--mode', 'staging'), { command: 'build', mode: 'staging' });
    assert.deepEqual(cli('build', '--mode=staging'), { command: 'build', mode: 'staging' });
  });

  test('ignora --mode sin valor', () => {
    assert.equal(cli('build', '--mode').mode, 'production');
    assert.equal(cli('dev', '--mode', '--port', '4000').mode, 'development');
  });

  test('comando no reconocido: undefined y modo production', () => {
    assert.deepEqual(readAstroCli(['node', 'script.mjs']), { command: undefined, mode: 'production' });
  });
});
