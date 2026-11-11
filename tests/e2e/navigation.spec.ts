/**
 * Navegación del Narratorio (src/components/ui/SiteNav.astro y src/scripts/site-nav.ts): barra
 * superior translúcida en todos los anchos, con las cuatro paradas de la travesía en línea desde 64rem,
 * «En esta página» (índice contextual) y «Explorar» (por debajo de 64rem) que abren el panel `popover`.
 * El Códice de las Fuentes y los créditos viven en el pie. Seguimiento de sección y anclas dentro de
 * `<details>` plegados.
 */
import { expect, test, type Page } from '@playwright/test';

const POSEIDON = '/deities/poseidon/';
const STOPS = ['La Torre', 'Los Doce', 'Linajes estelares', 'Hilo del destino'];

const panel = (page: Page) => page.locator('#site-panel');
/** Índice de la página; por CSS, porque con el panel cerrado queda fuera del árbol accesible. */
const panelToc = (page: Page) => panel(page).locator('[data-toc]');

test.describe('escritorio', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('la barra muestra las cuatro paradas en línea; «Los Doce» es la sala actual de una ficha', async ({ page }) => {
    await page.goto(POSEIDON);
    const stops = page.getByRole('banner').getByRole('navigation', { name: 'Travesía' });
    await expect(stops).toBeVisible();
    await expect(stops.getByRole('link')).toHaveText(STOPS);
    await expect(stops.getByRole('link', { name: 'Los Doce' })).toHaveAttribute('aria-current', 'true');
    await expect(page.getByRole('button', { name: 'Explorar' })).toBeHidden();
    await expect(panel(page)).toBeHidden();
  });

  test('«En esta página» abre el índice con el foco dentro; cada enlace apunta a una sección real', async ({ page }) => {
    await page.goto(POSEIDON);
    await page.getByRole('button', { name: /En esta página/ }).click();
    await expect(panel(page)).toBeVisible();
    await expect(panelToc(page).locator(':focus')).toHaveCount(1);
    for (const href of await panelToc(page).locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))) {
      await expect(page.locator(href), href).toHaveCount(1);
    }
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
  });

  test('el seguimiento de sección marca la sección que se está leyendo, sin tocar el historial', async ({ page }) => {
    await page.goto(POSEIDON);
    await page.evaluate(() => document.getElementById('linaje')?.scrollIntoView({ block: 'start' }));
    await expect(panelToc(page).locator('a[href="#linaje"]')).toHaveAttribute('aria-current', 'location');
    await expect(panelToc(page).locator('[aria-current="location"]')).toHaveCount(1);
    await expect(page.locator('[data-nav-current]')).toHaveText('Su linaje');
    expect(new URL(page.url()).hash).toBe('');
  });

  test('un enlace a un destino plegado abre su desplegable', async ({ page }) => {
    await page.goto('/chapters/dodekatheon/genealogy/');
    const catalogue = page.locator('#todas-las-relaciones');
    await expect(catalogue).not.toHaveAttribute('open');
    await page.goto('/chapters/dodekatheon/genealogy/#familia-aphrodite');
    await expect(catalogue).toHaveAttribute('open', '');
    await expect(page.locator('#familia-aphrodite')).toBeInViewport();
  });

  test('el pie lleva al Códice de las Fuentes y a los créditos', async ({ page }) => {
    await page.goto(POSEIDON);
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: 'El Códice de las Fuentes' })).toHaveAttribute('href', '/sources/');
    await expect(footer.getByRole('link', { name: 'Créditos' })).toHaveAttribute('href', '/credits/');
    // El aviso de contenido sin revisar ya no es un banner: solo un indicador de depuración en el pie, y
    // únicamente en desarrollo (este build no lo lleva).
    await expect(page.locator('[data-debug]')).toHaveCount(0);
  });
});

test.describe('móvil', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('«Explorar» abre el panel con el foco en la travesía; Escape lo cierra y devuelve el foco', async ({ page }) => {
    await page.goto(POSEIDON);
    const explore = page.getByRole('button', { name: 'Explorar' });
    await expect(page.getByRole('banner').locator('.topbar__links')).toBeHidden();
    await expect(panel(page)).toBeHidden();
    await explore.click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).getByRole('navigation', { name: 'Travesía' }).locator(':focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await expect(explore).toBeFocused();
  });

  test('la ficha ofrece el selector de constelaciones dentro de «Los Doce»', async ({ page }) => {
    await page.goto(POSEIDON);
    await page.getByRole('button', { name: 'Explorar' }).click();
    const switcher = panel(page).locator('.deity-switch');
    await expect(switcher).toContainText('Poseidón');
    await expect(switcher.locator('a[rel="prev"]')).toHaveAttribute('href', /^\/deities\/[a-z]+\/$/);
    await expect(switcher.locator('a[rel="next"]')).toHaveAttribute('href', /^\/deities\/[a-z]+\/$/);
  });

  test('la ubicación compacta abre el índice de la página y elegir un destino cierra el panel', async ({ page }) => {
    await page.goto(POSEIDON);
    await page.getByRole('button', { name: /En esta página/ }).click();
    await expect(panelToc(page).locator(':focus')).toHaveCount(1);
    await panelToc(page).getByRole('link', { name: 'Grandes relatos' }).click();
    await expect(panel(page)).toBeHidden();
    await expect(page).toHaveURL(/#relatos$/);
    await expect(page.locator('#relatos h2')).toBeInViewport();
  });
});

test.describe('sin JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

  test('el panel sigue abriéndose con el popover nativo', async ({ page }) => {
    await page.goto(POSEIDON);
    await page.getByRole('button', { name: 'Explorar' }).click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).getByRole('navigation', { name: 'Travesía' }).getByRole('link', { name: /Hilo del destino/ })).toBeVisible();
  });
});
