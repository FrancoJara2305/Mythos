import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { archiveNavigation, footerNavigation } from '../../src/config/navigation.ts';
import { ariaCurrent, isValidSlug, paths } from '../../src/lib/routes.ts';

describe('paths', () => {
  test('construye las rutas cerradas con barra final (trailingSlash: always)', () => {
    assert.equal(paths.home(), '/');
    assert.equal(paths.chapter('dodekatheon'), '/chapters/dodekatheon/');
    assert.equal(paths.genealogy('dodekatheon'), '/chapters/dodekatheon/genealogy/');
    assert.equal(paths.atlas('dodekatheon'), '/chapters/dodekatheon/atlas/');
    assert.equal(paths.deity('athena'), '/deities/athena/');
    assert.equal(paths.artifact('sample-artifact'), '/artifacts/sample-artifact/');
    assert.equal(paths.sources(), '/sources/');
    assert.equal(paths.source('hesiod-theogony'), '/sources/hesiod-theogony/');
    assert.equal(paths.credits(), '/credits/');
  });

  test('rechaza IDs que no son ASCII kebab-case estables', () => {
    for (const bad of ['Athena', 'atenea ', 'poseidón', 'hesiod_theogony', '-zeus', 'zeus-', 'a--b', '', '../x']) {
      assert.equal(isValidSlug(bad), false, JSON.stringify(bad));
      assert.throws(() => paths.deity(bad), /inválido/);
    }
  });
});

describe('ariaCurrent', () => {
  test('page en la ruta exacta, true dentro de la sección', () => {
    assert.equal(ariaCurrent('/sources/', '/sources/'), 'page');
    assert.equal(ariaCurrent('/sources', '/sources/'), 'page');
    assert.equal(ariaCurrent('/sources/hesiod-theogony/', '/sources/'), 'true');
    assert.equal(ariaCurrent('/credits/', '/sources/'), undefined);
  });

  test('solo se marca el enlace más específico del menú', () => {
    const menu = ['/chapters/dodekatheon/', '/chapters/dodekatheon/atlas/', '/sources/'];
    assert.equal(ariaCurrent('/chapters/dodekatheon/atlas/', '/chapters/dodekatheon/', menu), undefined);
    assert.equal(ariaCurrent('/chapters/dodekatheon/atlas/', '/chapters/dodekatheon/atlas/', menu), 'page');
    assert.equal(ariaCurrent('/chapters/dodekatheon/genealogy/', '/chapters/dodekatheon/', menu), 'true');
  });

  test('la portada no contiene a las demás rutas', () => {
    assert.equal(ariaCurrent('/', '/'), 'page');
    assert.equal(ariaCurrent('/sources/', '/'), undefined);
  });
});

describe('navegación', () => {
  test('las entradas planificadas usan rutas cerradas, sin duplicados', () => {
    const hrefs = [...archiveNavigation, ...footerNavigation].map((item) => item.href);
    assert.deepEqual(hrefs, [
      '/',
      '/chapters/dodekatheon/',
      '/chapters/dodekatheon/genealogy/',
      '/chapters/dodekatheon/atlas/',
      '/sources/',
      '/credits/',
    ]);
    assert.equal(new Set(hrefs).size, hrefs.length);
  });
});
