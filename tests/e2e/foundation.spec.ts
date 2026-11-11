/**
 * Criterios de aceptación de Phase 1 — Foundation en navegador real:
 * navegación sin JavaScript, foco visible, estructura semántica y adaptación a 320 px.
 */
import { expect, test, type Page } from '@playwright/test';

/** `modules`: scripts de módulo en línea (la navegación compartida y, en la Torre, su travesía). */
const PAGES = [
  { name: 'inicio', path: '/', status: 200, modules: 2 },
  { name: '404', path: '/ruta-que-no-existe/', status: 404, modules: 1 },
] as const;

/** Color del anillo de foco: --focus-ring = oro estelar (#fde047). */
const FOCUS_RING = 'rgb(253, 224, 71)';

const VIEWPORT_WIDTHS = [320, 390, 768, 1440] as const;

async function focusRing(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement) || element === document.body) return null;
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      text: element.textContent?.trim() ?? '',
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      outlineColor: style.outlineColor,
      inViewport: box.width > 0 && box.height > 0 && box.top >= 0 && box.bottom <= window.innerHeight,
      height: box.height,
    };
  });
}

test.describe('sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const { name, path, status, modules } of PAGES) {
    test(`${name}: documento semántico y sin más script que la mejora progresiva propia`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(status);
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      // Solo módulos en línea de mejora progresiva: ningún bundle externo ni isla.
      await expect(page.locator('script')).toHaveCount(modules);
      await expect(page.locator('script[type="module"]:not([src])')).toHaveCount(modules);
      // Sin JavaScript, la travesía sigue siendo HTML con enlaces normales.
      await expect(page.locator('#site-panel a[href="/chapters/dodekatheon/"]')).toHaveCount(1);
    });
  }

  test('los títulos en inglés de la saga van marcados con lang="en"', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.floor__title a[lang="en"]')).toHaveText(['The Dodekatheon']);
  });

  test('la 404 permite volver al inicio con un enlace normal', async ({ page }) => {
    await page.goto('/ruta-que-no-existe/');
    await expect(page.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeVisible();
    await page.getByRole('link', { name: 'Volver al inicio' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1, name: 'MYTHOS' })).toBeVisible();
  });

  test('la marca de la cabecera enlaza al inicio y lo señala como página actual', async ({ page }) => {
    await page.goto('/ruta-que-no-existe/');
    const brand = page.getByRole('banner').getByRole('link', { name: 'MYTHOS' });
    await expect(brand).not.toHaveAttribute('aria-current');
    await brand.click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('banner').getByRole('link', { name: 'MYTHOS' })).toHaveAttribute('aria-current', 'page');
  });

  test('no hay landmark de navegación vacío mientras ninguna sala está publicada', async ({ page }) => {
    await page.goto('/');
    for (const nav of await page.getByRole('navigation').all()) {
      await expect(nav.getByRole('link')).not.toHaveCount(0);
    }
  });
});

test.describe('teclado y foco', () => {
  test('el enlace de salto es el primer foco, visible, y lleva a main', async ({ page }) => {
    await page.goto('/ruta-que-no-existe/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.screenshot({ path: test.info().outputPath('foco-enlace-de-salto.png') });
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#contenido$/);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeFocused();
    await page.screenshot({ path: test.info().outputPath('foco-accion-principal.png') });
  });

  for (const { name, path } of PAGES) {
    test(`${name}: cada elemento enfocable muestra un anillo de ≥2 px y un objetivo ≥44 px`, async ({ page }) => {
      await page.goto(path);
      // Solo lo que se renderiza en este ancho entra en el orden de tabulación (en escritorio, «Explorar»
      // se oculta porque las paradas de la travesía ya están en la barra).
      const focusable = await page
        .locator('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
        .evaluateAll((elements) => elements.filter((element) => element.checkVisibility()).length);
      expect(focusable).toBeGreaterThan(0);
      for (let index = 0; index < focusable; index += 1) {
        await page.keyboard.press('Tab');
        const ring = await focusRing(page);
        expect(ring, `foco ${index + 1}`).not.toBeNull();
        expect(ring?.outlineStyle, ring?.text).not.toBe('none');
        expect(ring?.outlineWidth, ring?.text).toBeGreaterThanOrEqual(2);
        expect(ring?.outlineColor, ring?.text).toBe(FOCUS_RING);
        expect(ring?.inViewport, ring?.text).toBe(true);
        expect(ring?.height, ring?.text).toBeGreaterThanOrEqual(44);
      }
    });
  }
});

test.describe('adaptación', () => {
  for (const width of VIEWPORT_WIDTHS) {
    test(`${width} px: sin desplazamiento horizontal y con capturas de revisión`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const { name, path } of PAGES) {
        await page.goto(path);
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(overflow.scrollWidth, `${name} a ${width} px`).toBeLessThanOrEqual(overflow.clientWidth);
        await page.screenshot({ path: test.info().outputPath(`${name}-${width}.png`), fullPage: true });
      }
    });
  }

  test('movimiento reducido anula las transiciones, también al cambiar la preferencia en sesión', async ({ page }) => {
    const brandTransition = () =>
      page
        .getByRole('banner')
        .getByRole('link', { name: 'MYTHOS' })
        .evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration));

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    expect(await brandTransition()).toBeCloseTo(0.15, 5);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await brandTransition()).toBeLessThanOrEqual(0.00001);
  });
});
