/**
 * Planetario de Constelaciones (GR-04) con JavaScript y WebGL: la lista estática se convierte en una
 * bóveda 3D navegable. Viaje a una constelación desde el selector orbital, «anterior/siguiente»,
 * facetas (las cuatro estrellas principales), interruptor de tradición Hestia ↔ Dioniso, explicación
 * de las dos tradiciones, estado en el fragmento con atrás/adelante, Escape, sin errores de consola y
 * sin desbordamiento en móvil. Sin JavaScript, la bóveda se prueba en archive.spec.ts.
 */
import { expect, test, type Page } from '@playwright/test';

const VAULT = '/chapters/dodekatheon/';
const HOME_TRADITION = 'Tradición del Hogar Sagrado: Hestia';
const WINE_TRADITION = 'Tradición Dionisíaca: Dioniso';

const vault = (page: Page) => page.locator('mythos-planetarium');
const orbit = (page: Page) => page.getByRole('navigation', { name: 'Selector orbital de constelaciones' });
const card = (page: Page, id: string) => page.locator(`#constelacion-${id}`);

async function open(page: Page, fragment = ''): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${VAULT}${fragment}`);
  await expect(vault(page)).toHaveAttribute('data-state', 'live');
  await expect(vault(page)).toHaveAttribute('data-ready', 'true');
  return errors;
}

test.describe('bóveda en vivo', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('vista general: lienzo, doce asientos en el selector y ninguna ficha abierta', async ({ page }) => {
    const errors = await open(page);
    await expect(page.locator('[data-canvas]')).toBeVisible();
    await expect(page.locator('[data-controls]')).toBeVisible();
    await expect(orbit(page).getByRole('button')).toHaveCount(12);
    await expect(orbit(page).getByRole('button', { name: 'Dioniso' })).toBeVisible();
    await expect(orbit(page).getByRole('button', { name: 'Hestia' })).toHaveCount(0);
    await expect(page.locator('.sky-card:visible')).toHaveCount(0);
    await expect(page.locator('[data-current]')).toHaveText('Vista general');
    await expect(page.locator('[data-overview]')).toBeDisabled();
    expect(errors).toEqual([]);
  });

  test('viajar a una constelación abre su panel; una estrella abre su faceta', async ({ page }) => {
    const errors = await open(page);
    await orbit(page).getByRole('button', { name: 'Atenea' }).click();
    await expect(page).toHaveURL(/#dios=athena$/);
    await expect(orbit(page).getByRole('button', { name: 'Atenea' })).toHaveAttribute('aria-pressed', 'true');
    await expect(card(page, 'athena')).toBeVisible();
    await expect(page.locator('.sky-card:visible')).toHaveCount(1);
    await expect(page.locator('[data-current]')).toContainText('Atenea');
    await expect(page.locator('[data-status]')).toContainText('Constelación de Atenea');

    const tales = card(page, 'athena').getByRole('button', { name: 'Sus grandes relatos' });
    await tales.click();
    await expect(page).toHaveURL(/#dios=athena&faceta=tales$/);
    await expect(tales).toHaveAttribute('aria-pressed', 'true');
    await expect(card(page, 'athena').locator('[data-facet="tales"]')).toBeVisible();
    await expect(card(page, 'athena').locator('[data-facet]:visible')).toHaveCount(1);
    await expect(page.locator('[data-status]')).toContainText('Sus grandes relatos');

    // Escape: primero cierra la faceta, después vuelve a la vista general.
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#dios=athena$/);
    await page.keyboard.press('Escape');
    await expect(page.locator('.sky-card:visible')).toHaveCount(0);
    await expect(page.locator('[data-current]')).toHaveText('Vista general');
    expect(errors).toEqual([]);
  });

  test('«Siguiente constelación» recorre los asientos en orden y el historial lo deshace', async ({ page }) => {
    await open(page, '#dios=zeus');
    await expect(card(page, 'zeus')).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente constelación' }).click();
    await expect(page).toHaveURL(/#dios=hera$/);
    await expect(card(page, 'hera')).toBeVisible();
    await page.getByRole('button', { name: 'Constelación anterior' }).click();
    await expect(page).toHaveURL(/#dios=zeus$/);
    await page.goBack();
    await expect(card(page, 'hera')).toBeVisible();
    await page.goBack();
    await expect(card(page, 'zeus')).toBeVisible();
  });

  test('el interruptor de tradición cambia el duodécimo asiento sin recargar', async ({ page }) => {
    const errors = await open(page);
    const home = page.getByRole('button', { name: HOME_TRADITION });
    const wine = page.getByRole('button', { name: WINE_TRADITION });
    await expect(wine).toHaveAttribute('aria-pressed', 'true');
    await home.click();
    await expect(home).toHaveAttribute('aria-pressed', 'true');
    await expect(wine).toHaveAttribute('aria-pressed', 'false');
    await expect(page).toHaveURL(/#tradicion=hogar$/);
    await expect(orbit(page).getByRole('button', { name: 'Hestia' })).toBeVisible();
    await expect(orbit(page).getByRole('button', { name: 'Dioniso' })).toHaveCount(0);
    await expect(orbit(page).getByRole('button')).toHaveCount(12);
    await expect(page.locator('[data-status]')).toContainText(HOME_TRADITION);
    await page.goBack();
    await expect(orbit(page).getByRole('button', { name: 'Dioniso' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('un enlace directo a Hestia activa su tradición y abre la faceta pedida', async ({ page }) => {
    await open(page, '#dios=hestia&faceta=names');
    await expect(page.getByRole('button', { name: HOME_TRADITION })).toHaveAttribute('aria-pressed', 'true');
    await expect(card(page, 'hestia')).toBeVisible();
    await expect(card(page, 'hestia').locator('[data-facet="names"]')).toBeVisible();
  });

  test('«¿Por qué cambia la lista?» explica las dos tradiciones con el relieve', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: '¿Por qué cambia la lista?' }).click();
    const why = page.locator('#dos-tradiciones');
    await expect(why).toBeVisible();
    await expect(why.getByRole('heading', { name: '¿Doce dioses… o trece?' })).toBeVisible();
    await expect(why.locator('img')).toHaveAttribute('alt', /Hestia/);
    await why.getByRole('button', { name: 'Volver a la bóveda' }).click();
    await expect(why).toBeHidden();
  });

  test('un fragmento desconocido se ignora y deja la vista general', async ({ page }) => {
    const errors = await open(page, '#dios=cronus&faceta=nada');
    await expect(page.locator('.sky-card:visible')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe('móvil', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('la bóveda y su panel caben en la pantalla', async ({ page }) => {
    const errors = await open(page);
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await orbit(page).getByRole('button', { name: 'Ártemis' }).tap();
    await expect(card(page, 'artemis')).toBeVisible();
    await card(page, 'artemis').getByRole('button', { name: 'Quién es y su origen' }).tap();
    await expect(card(page, 'artemis').locator('[data-facet="origin"]')).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.screenshot({ path: test.info().outputPath('boveda-movil.png') });
    expect(errors).toEqual([]);
  });
});
