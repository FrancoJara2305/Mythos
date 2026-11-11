/**
 * Identidad visual del rediseño (docs/design_guidelines.md «Temas por deidad»): cada deidad del roster
 * tiene tema y escena original; las familias de composición se reparten; cada efecto declara su
 * función y su versión estática; las escenas son vectoriales, autocontenidas y deterministas; cada
 * obra de la biblioteca tiene familia visual.
 */
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { describe, test } from 'node:test';
import { DODEKATHEON, profileIds } from '../../src/config/chapters.ts';
import { DEITY_THEMES, deityTheme, themeStyle } from '../../src/config/deity-themes.ts';
import { SCENE_HEIGHT, SCENE_IDS, SCENE_WIDTH, sceneFor } from '../../src/lib/scenes/scenes.ts';
import { WORK_FAMILY_LABELS, workFamily } from '../../src/lib/sources/identity.ts';

const ROSTER = DODEKATHEON.roster.map((entry) => entry.id);
/** Divinidades con ficha: el roster y la otra tradición (Hestia). */
const PROFILES = profileIds(DODEKATHEON);

describe('temas por deidad', () => {
  test('cada divinidad con ficha (roster y otra tradición) tiene tema y escena, y no sobra ninguno', () => {
    assert.deepEqual([...Object.keys(DEITY_THEMES)].sort(), [...PROFILES].sort());
    assert.deepEqual([...SCENE_IDS].sort(), [...PROFILES].sort());
  });

  test('al menos cuatro familias de composición, y dos fichas contiguas del roster no comparten familia', () => {
    const families = ROSTER.map((id) => deityTheme(id).family);
    assert.ok(new Set(families).size >= 4, `familias: ${[...new Set(families)].join(', ')}`);
    for (let index = 1; index < ROSTER.length; index += 1) {
      assert.notEqual(families[index], families[index - 1], `${ROSTER[index - 1]} y ${ROSTER[index]}`);
    }
  });

  test('cada efecto tiene función y versión estática; el encuadre está dentro de la escena', () => {
    for (const id of PROFILES) {
      const theme = deityTheme(id);
      assert.ok(theme.effect.purpose.trim().length > 0, `${id}: efecto sin función`);
      assert.ok(theme.effect.staticVersion.trim().length > 0, `${id}: efecto sin versión estática`);
      assert.ok(theme.caption.trim().length > 0, `${id}: escena sin pie`);
      for (const value of [theme.focus.desktop, theme.focus.mobile]) assert.ok(value >= 0 && value <= 1, `${id}: foco ${value}`);
      assert.match(themeStyle(theme), /--focus-x: [\d.]+; --focus-x-mobile: [\d.]+$/);
    }
  });

  test('una deidad sin tema es un error visible', () => {
    assert.throws(() => deityTheme('hades'), /Sin tema visual/);
  });
});

describe('escenas originales', () => {
  for (const id of PROFILES) {
    test(`${id}: SVG vectorial autocontenido, sin rasters ni recursos externos`, () => {
      const scene = sceneFor(id);
      assert.equal(scene.id, id);
      assert.ok(scene.base.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
      assert.ok(scene.base.includes(`viewBox="0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}"`));
      for (const svg of [scene.base, ...scene.fx.map((layer) => layer.svg)]) {
        assert.doesNotMatch(svg, /<image|<script|<foreignObject|\shref="(?!#)|url\((?!#)/i);
        assert.doesNotMatch(svg, /NaN|undefined/);
      }
      assert.ok(scene.fx.length > 0, `${id}: sin capa para el efecto ambiental`);
      for (const layer of scene.fx) {
        assert.match(layer.name, /^[a-z-]+$/);
        assert.ok(layer.svg.includes('aria-hidden="true"'), `${id}/${layer.name}: capa decorativa sin aria-hidden`);
      }
    });
  }

  test('las escenas son deterministas (mismo build, mismo SVG)', async () => {
    const first = SCENE_IDS.map((id) => sceneFor(id).base);
    // Módulo nuevo (sin la caché de la importación anterior): la generación debe repetirse byte a byte.
    const fresh = (await import(`../../src/lib/scenes/scenes.ts?again=${Date.now()}`)) as typeof import('../../src/lib/scenes/scenes.ts');
    assert.deepEqual(
      fresh.SCENE_IDS.map((id) => fresh.sceneFor(id).base),
      first,
    );
  });
});

describe('biblioteca: familia visual de cada obra', () => {
  test('cada obra del contenido tiene familia y rótulo', () => {
    const ids = readdirSync(new URL('../../src/content/sources/', import.meta.url))
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, ''));
    assert.ok(ids.length > 0);
    for (const id of ids) assert.ok(WORK_FAMILY_LABELS[workFamily(id)].length > 0, id);
  });

  test('una obra nueva sin familia falla en el build', () => {
    assert.throws(() => workFamily('pindar-olympian'), /Obra sin familia visual/);
  });
});
