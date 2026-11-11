/**
 * Mapa de Linajes Estelares (explorador genealógico) e Hilo del Destino (cronología mítica y
 * testigos del tiempo): cambio de tradición de Afrodita sin mezclar progenitores, selección por
 * teclado, atrás/adelante, funcionamiento sin JS, escala que cruza a. C./d. C., lista equivalente al
 * SVG, límite de nodos, filtro por divinidad y modo móvil.
 */
import { expect, test, type Page } from '@playwright/test';

const GENEALOGY = '/chapters/dodekatheon/genealogy/';
const ATLAS = '/chapters/dodekatheon/atlas/';
/** Episodios con relato en el hilo (uno por mito publicado) y testimonios fechados. */
const EPISODES = 15;
const TESTIMONIES = 11;

const parents = (page: Page) => page.locator('.gv__lists .gv-group').filter({ has: page.getByRole('heading', { name: 'Filiación' }) });
const picker = (page: Page) => page.getByRole('navigation', { name: 'Elige una estrella' });

test.describe('Mapa de Linajes Estelares sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('vista inicial y lista completa con todas las relaciones', async ({ page }) => {
    await page.goto(GENEALOGY);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mapa de Linajes Estelares');
    await expect(page.locator('.gv__title')).toHaveText('Linaje de Zeus');
    await expect(page.locator('.gv-family')).toHaveCount(12);
    await expect(page.locator('.gv input[type="radio"], .gv button')).toHaveCount(0);
    await expect(page.locator('.gv-variants-note')).toContainText('Versión mostrada');
    // El selector lleva a la sección de la lista: funciona sin scripts.
    await picker(page).getByRole('link', { name: 'Afrodita' }).click();
    await expect(page).toHaveURL(/#familia-aphrodite$/);
    const aphrodite = page.locator('#familia-aphrodite');
    await expect(aphrodite).toBeInViewport();
    await expect(aphrodite).toContainText('solo en la versión: Teogonía de Hesíodo');
    await expect(aphrodite).toContainText('solo en la versión: Ilíada');
  });

  test('cada relación de la lista completa guarda su fuente en «¿Cómo sabemos esto?»', async ({ page }) => {
    await page.goto(GENEALOGY);
    for (const relation of await page.locator('.gv-family .gv-relation').all()) {
      await expect(relation.locator('details.gv-source summary')).toContainText('¿Cómo sabemos esto?');
      await expect(relation.locator('.gv-cites a').first()).toHaveAttribute('href', /^\/sources\/[a-z-]+\/#[a-z0-9-]+$/);
    }
  });
});

test.describe('Mapa de Linajes Estelares con JavaScript', () => {
  test('Afrodita: elegir a otro bardo cambia la filiación completa y el fragmento', async ({ page }) => {
    await page.goto(`${GENEALOGY}#deity=aphrodite`);
    await expect(page.locator('mythos-genealogy')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('.gv__title')).toHaveText('Linaje de Afrodita');
    await expect(page.locator('.gv-variants-eyebrow')).toHaveText('Dos tradiciones contadas por los antiguos bardos');
    await expect(parents(page)).toContainText('Urano');
    await expect(parents(page)).not.toContainText('Dione');

    const iliad = page.getByRole('radio', { name: /Según Ilíada/ });
    await iliad.check();
    await expect(page).toHaveURL(/#deity=aphrodite&aphrodite-origin=iliadic$/);
    await expect(parents(page)).toContainText('Dione');
    await expect(parents(page)).toContainText('Zeus');
    await expect(parents(page)).not.toContainText('Urano');
    await expect(page.locator('.gv-node__name')).not.toContainText(['Urano']);
    await expect(page.getByRole('radio', { name: /Según Ilíada/ })).toBeFocused();

    await page.goBack();
    await expect(parents(page)).toContainText('Urano');
    await expect(parents(page)).not.toContainText('Dione');
    await page.goForward();
    await expect(parents(page)).toContainText('Dione');
  });

  test('selector por teclado: el foco se queda en el selector y el cambio se anuncia', async ({ page }) => {
    await page.goto(GENEALOGY);
    await expect(page.locator('mythos-genealogy')).toHaveAttribute('data-ready', 'true');
    const hera = picker(page).getByRole('link', { name: 'Hera' });
    await hera.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#deity=hera$/);
    await expect(page.locator('.gv__title')).toHaveText('Linaje de Hera');
    await expect(hera).toBeFocused();
    await expect(hera).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('[data-status]')).toContainText('Hera:');
  });

  test('«Ver su familia» lleva el foco al título de la nueva vista', async ({ page }) => {
    await page.goto(GENEALOGY);
    await expect(page.locator('mythos-genealogy')).toHaveAttribute('data-ready', 'true');
    const button = page.getByRole('button', { name: /^Ver su familia ?: Ares$/ });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.gv__title')).toHaveText('Linaje de Ares');
    await expect(page.locator('.gv__title')).toBeFocused();
    await page.goBack();
    await expect(page.locator('.gv__title')).toHaveText('Linaje de Zeus');
  });

  test('el enlace de la ficha abre el mapa en esa figura', async ({ page }) => {
    await page.goto('/deities/hephaestus/');
    await page.getByRole('link', { name: /Ver su familia en el Mapa de Linajes Estelares/ }).click();
    await expect(page).toHaveURL(/genealogy\/#familia-hephaestus$/);
    await expect(page.locator('.gv__title')).toHaveText('Linaje de Hefesto');
  });

  test('cada figura del capítulo: ≤24 nodos y cada nodo figura en la lista', async ({ page }) => {
    await page.goto(GENEALOGY);
    await expect(page.locator('mythos-genealogy')).toHaveAttribute('data-ready', 'true');
    const links = picker(page).getByRole('link');
    for (let index = 0; index < (await links.count()); index += 1) {
      await links.nth(index).click();
      const nodes = await page.locator('.gv-node__name').allTextContents();
      expect(nodes.length).toBeLessThanOrEqual(24);
      const listed = await page.locator('.gv__title, .gv-relation__head').allTextContents();
      const text = listed.join(' ');
      for (const name of nodes) expect(text, `${name} en la lista`).toContain(name);
    }
  });

  test('un nodo del diagrama también selecciona (puntero)', async ({ page }) => {
    await page.goto(GENEALOGY);
    await expect(page.locator('mythos-genealogy')).toHaveAttribute('data-ready', 'true');
    await page.locator('.gv-node[data-deity="cronus"]').click();
    await expect(page.locator('.gv__title')).toHaveText('Linaje de Crono');
    await expect(page).toHaveURL(/#deity=cronus$/);
  });
});

test.describe('Hilo del Destino sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('el hilo de los relatos y los testigos del tiempo, rotulados y completos', async ({ page }) => {
    await page.goto(ATLAS);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hilo del Destino');
    await expect(page.locator('[data-controls]')).toBeHidden();
    await expect(page.locator('#relatos')).toBeVisible();
    await expect(page.locator('#testimonios')).toBeVisible();
    // Seis actos, uno por capítulo de la saga; cada episodio con relato enlaza su página.
    await expect(page.locator('#relatos .act')).toHaveCount(6);
    await expect(page.locator('#relatos .knot--ready')).toHaveCount(EPISODES);
    for (const link of await page.locator('#relatos .knot--ready .knot__title a').all()) {
      await expect(link).toHaveAttribute('href', /^\/myths\/[a-z-]+\/$/);
    }
    await expect(page.locator('#testimonios .atlas-card')).toHaveCount(TESTIMONIES);
    // Sin años en el hilo de los relatos.
    await expect(page.locator('#relatos')).not.toContainText(/a\. C\.|d\. C\./);
  });

  test('la escala cruza a. C./d. C. sin año 0 y las obras sin datación no se dibujan', async ({ page }) => {
    await page.goto(ATLAS);
    const ticks = await page.locator('.ta-tick text').allTextContents();
    expect(ticks).toEqual(['600 a. C.', '500 a. C.', '400 a. C.', '300 a. C.', '200 a. C.', '100 a. C.', '1 d. C.', '100 d. C.']);
    await expect(page.locator('.ta-mark__bar')).toHaveCount(7);
    await expect(page.locator('.ta-band__empty')).toContainText('ninguna obra tiene aún una datación');
    const walters = page.locator('#evento-production-walters-23-40');
    await expect(walters).toContainText('100 a. C. – 100 d. C.');
  });
});

test.describe('Hilo del Destino con JavaScript', () => {
  test('vista, filtro por divinidad, fragmento e historial', async ({ page }) => {
    await page.goto(ATLAS);
    await expect(page.locator('mythos-atlas')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('#relatos')).toBeVisible();
    await expect(page.locator('#testimonios')).toBeHidden();

    const witnesses = page.getByRole('button', { name: 'Los testigos del tiempo' });
    await witnesses.click();
    await expect(witnesses).toHaveAttribute('aria-pressed', 'true');
    await expect(witnesses).toBeFocused();
    await expect(page).toHaveURL(/#vista=testimonios$/);
    await expect(page.locator('#testimonios')).toBeVisible();
    await expect(page.locator('#relatos')).toBeHidden();

    await page.getByLabel('Seguir a').selectOption('dionysus');
    await expect(page).toHaveURL(/#vista=testimonios&deidad=dionysus$/);
    const visibleObjects = page.locator('#testimonios .atlas-card:visible');
    await expect(visibleObjects.filter({ hasText: 'Met 56.171.14' })).toHaveCount(1);
    await expect(visibleObjects.filter({ hasText: 'Walters 23.40' })).toHaveCount(0);
    // La escala no cambia al filtrar: las marcas se atenúan, no desaparecen.
    await expect(page.locator('.ta-mark__bar')).toHaveCount(7);
    expect(await page.locator('#testimonios .ta-mark.is-muted').count()).toBeGreaterThan(0);
    await expect(page.locator('[data-status]')).toContainText('Dioniso');

    await page.goBack();
    await expect(page.getByLabel('Seguir a')).toHaveValue('');
    await expect(page.locator('#testimonios .atlas-card:visible').filter({ hasText: 'Walters 23.40' })).toHaveCount(1);
    await page.goBack();
    await expect(page.locator('#relatos')).toBeVisible();
    await expect(page.locator('#testimonios')).toBeHidden();
  });

  test('un ancla a una tarjeta abre la vista que la contiene', async ({ page }) => {
    await page.goto(`${ATLAS}#evento-production-walters-23-40`);
    await expect(page.locator('mythos-atlas')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('#testimonios')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Los testigos del tiempo' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('seguir a una divinidad: cada acto sin sus episodios lo dice', async ({ page }) => {
    await page.goto(`${ATLAS}#vista=relatos&deidad=apollo`);
    await expect(page.locator('mythos-atlas')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('#relatos .knot:visible')).toHaveCount(1);
    for (const act of await page.locator('#relatos .act').all()) {
      const shown = await act.locator('.knot:visible').count();
      await expect(act.locator('[data-empty]')).toBeVisible({ visible: shown === 0 });
    }
  });
});

test.describe('móvil y foco', () => {
  for (const width of [320, 390, 768]) {
    test(`${width} px: sin desplazamiento horizontal de la página`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const path of [GENEALOGY, `${GENEALOGY}#deity=zeus&aphrodite-origin=iliadic`, `${GENEALOGY}#deity=aphrodite`, ATLAS, `${ATLAS}#vista=testimonios`]) {
        await page.goto(path);
        await page.waitForTimeout(50);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${path} a ${width} px`).toBeLessThanOrEqual(0);
      }
    });
  }

  for (const path of [GENEALOGY, ATLAS]) {
    test(`${path}: objetivos ≥44 px con anillo de foco, sin griego sin marcar`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('[data-ready="true"]')).toHaveCount(1);
      // Metodología, catálogo completo y fuentes de cada tarjeta están plegados: se abren para medirlos.
      await page.locator('details').evaluateAll((items) => items.forEach((item) => ((item as HTMLDetailsElement).open = true)));
      const results = await page.locator('a[href]:not([tabindex="-1"]), button, select, input').evaluateAll((elements) =>
        elements
          .filter((element) => element.checkVisibility())
          .map((element) => {
            (element as HTMLElement).focus();
            const target = element instanceof HTMLInputElement ? (element.closest('label') ?? element) : element;
            return {
              text: (element.textContent ?? element.getAttribute('aria-label') ?? element.tagName).trim().slice(0, 40),
              height: target.getBoundingClientRect().height,
              outline: getComputedStyle(element).outlineStyle,
            };
          }),
      );
      for (const result of results) {
        expect(result.height, result.text).toBeGreaterThanOrEqual(44);
        expect(result.outline, result.text).not.toBe('none');
      }
      const unmarked = await page.evaluate(() => {
        const greek = /[Ͱ-Ͽἀ-῿]/u;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const found: string[] = [];
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          if (node.parentElement?.closest('script, style') !== null) continue;
          if (greek.test(node.textContent ?? '') && node.parentElement?.closest('[lang]')?.getAttribute('lang') !== 'grc') {
            found.push((node.textContent ?? '').trim());
          }
        }
        return found;
      });
      expect(unmarked).toEqual([]);
    });
  }

  test('las salas no descargan recursos 3D', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto(GENEALOGY);
    await page.goto(ATLAS);
    expect(requests.filter((url) => /\.glb|three|draco|ktx2|meshopt/i.test(url))).toEqual([]);
  });
});
