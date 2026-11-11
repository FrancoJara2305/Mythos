/**
 * Criterios de aceptación de Phase 6 sobre el laboratorio (fixture técnico, fuera de producción):
 * carga bajo acción, controles de puntero y teclado, anotaciones, ampliación/Escape/foco, 404,
 * fallo de descodificador, navegación durante la descarga, WebGL2 ausente, pérdida de contexto,
 * suspensión fuera de pantalla y diez ciclos de montaje/desmontaje sin acumulación.
 */
import { expect, test, type Page } from '@playwright/test';

const LAB = '/lab/inspector/';
const GLB = '**/lab/models/fixture-plinth.glb';

interface Stats {
  state: string;
  failure?: string;
  sessions: number;
  disposals: number;
  live: boolean;
  canvases: number;
  activationMs?: number;
  viewer?: {
    frames: number;
    drawCalls: number;
    triangles: number;
    pixelRatio: number;
    initialDistance: number;
    orbit: { azimuth: number; polar: number; distance: number };
    limits: { minDistance: number; maxDistance: number; minPolar: number; maxPolar: number };
  };
}

const inspector = (page: Page) => page.locator('mythos-inspector');
const stats = (page: Page) => inspector(page).evaluate((element) => (element as unknown as { inspectorStats: Stats }).inspectorStats);
const state = (page: Page, value: string) => expect(inspector(page)).toHaveAttribute('data-state', value);

async function open(page: Page) {
  await page.goto(LAB);
  await expect(inspector(page)).toHaveAttribute('data-enhanced', 'true');
}

async function activate(page: Page) {
  await page.getByRole('button', { name: 'Explorar en 3D' }).click();
  await state(page, 'ready');
}

/** Peticiones 3D: el GLB y el chunk que contiene Three.js. */
function track3d(page: Page): string[] {
  const requests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (/\.glb$|\/viewer\.[\w-]+\.js$|three|meshopt/i.test(url)) requests.push(new URL(url).pathname);
  });
  return requests;
}

test.describe('sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('póster, peso, requisitos y anotaciones; ningún control ni descarga', async ({ page }) => {
    const requests = track3d(page);
    await page.goto(LAB);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Laboratorio del inspector 3D');
    await expect(page.getByRole('note')).toContainText('Esto no es un objeto del archivo');
    await expect(page.getByRole('img', { name: /Póster del fixture técnico/ })).toBeVisible();
    await expect(page.getByText(/Modelo 3D: descarga de \d+ kB · 1356 triángulos/)).toBeVisible();
    await expect(page.getByText('El visor 3D necesita JavaScript y WebGL2')).toBeVisible();
    await expect(page.locator('.hotspot')).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'Explorar en 3D' })).toBeHidden();
    await expect(page.locator('.hotspot__show')).toHaveCount(4);
    for (const button of await page.locator('.hotspot__show').all()) await expect(button).toBeHidden();
    expect(requests).toEqual([]);
  });
});

test.describe('activación y controles', () => {
  test('nada 3D antes de pulsar; después, GLB y Three; el foco pasa al visor', async ({ page }) => {
    const requests = track3d(page);
    await open(page);
    await page.waitForLoadState('networkidle');
    expect(requests).toEqual([]);
    await expect(page.getByText('El visor 3D necesita JavaScript y WebGL2')).toBeHidden();
    await activate(page);
    expect(requests.some((url) => url.endsWith('/lab/models/fixture-plinth.glb'))).toBe(true);
    expect(requests.some((url) => /\/viewer\.[\w-]+\.js$/.test(url))).toBe(true);
    expect(requests.some((url) => /meshopt/.test(url)), 'el descodificador Meshopt solo se pide si el modelo lo usa').toBe(false);
    await expect(page.locator('[data-stage]')).toBeFocused();
    await expect(page.locator('[data-status]')).toContainText('Modelo 3D listo');
    const current = await stats(page);
    expect(current.canvases).toBe(1);
    expect(current.viewer?.triangles).toBe(1356);
    expect(current.viewer?.drawCalls).toBeLessThanOrEqual(30);
    expect(current.viewer?.pixelRatio).toBeLessThanOrEqual(1.5);
    expect(current.activationMs).toBeGreaterThan(0);
    test.info().annotations.push({ type: 'activación → interactivo (ms, caché fría local)', description: current.activationMs?.toFixed(0) ?? '' });
  });

  test('dibuja por demanda: ningún fotograma en reposo', async ({ page }) => {
    await open(page);
    await activate(page);
    await page.waitForTimeout(300);
    const before = (await stats(page)).viewer?.frames ?? 0;
    await page.waitForTimeout(800);
    expect((await stats(page)).viewer?.frames).toBe(before);
    await page.getByRole('button', { name: 'Girar a la derecha' }).click();
    await expect.poll(async () => (await stats(page)).viewer?.frames).toBeGreaterThan(before);
    const afterClick = (await stats(page)).viewer?.frames ?? 0;
    await page.waitForTimeout(500);
    expect((await stats(page)).viewer?.frames, 'un clic produce un dibujo, no un bucle').toBe(afterClick);
  });

  test('botones y teclado giran, inclinan y acercan dentro de los límites; restablecer vuelve al inicio', async ({ page }) => {
    await open(page);
    await activate(page);
    const orbit = async () => (await stats(page)).viewer!.orbit;
    const initial = await stats(page);
    await page.getByRole('button', { name: 'Girar a la derecha' }).click();
    expect((await orbit()).azimuth).toBeCloseTo(15, 3);
    await page.locator('[data-stage]').focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect((await orbit()).azimuth).toBeCloseTo(-15, 3);
    for (let step = 0; step < 30; step += 1) await page.keyboard.press('ArrowDown');
    expect((await orbit()).polar).toBeCloseTo((initial.viewer!.limits.maxPolar * 180) / Math.PI, 3);
    for (let step = 0; step < 12; step += 1) await page.keyboard.press('+');
    expect((await orbit()).distance).toBeCloseTo(initial.viewer!.limits.minDistance, 6);
    for (let step = 0; step < 12; step += 1) await page.getByRole('button', { name: 'Alejar' }).click();
    expect((await orbit()).distance).toBeCloseTo(initial.viewer!.limits.maxDistance, 6);
    await page.getByRole('button', { name: 'Restablecer vista' }).click();
    expect(await orbit()).toEqual(initial.viewer!.orbit);
    await page.locator('[data-stage]').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('0');
    expect((await orbit()).azimuth).toBeCloseTo(0, 6);
  });

  test('anotaciones: la lista orienta la vista; el marcador del dorso se atenúa cuando la pieza lo tapa', async ({ page }) => {
    await open(page);
    await activate(page);
    const marker = (id: string) => page.locator(`[data-marker="${id}"]`);
    await expect(marker('fuste-frente')).toBeVisible();
    await expect(marker('fuste-dorso')).toHaveClass(/is-occluded/);
    await expect(marker('fuste-frente')).not.toHaveClass(/is-occluded/);
    const back = page.getByRole('button', { name: 'Mostrar en el modelo: Fuste, cara posterior' });
    await back.click();
    await expect(back).toHaveAttribute('aria-pressed', 'true');
    expect(Math.abs((await stats(page)).viewer!.orbit.azimuth)).toBeCloseTo(180, 3);
    // Pulsar en la lista puede dejar el visor fuera de pantalla (suspendido, sin dibujar): se vuelve a él.
    await page.locator('[data-stage]').evaluate((stage) => stage.scrollIntoView({ block: 'center' }));
    await state(page, 'ready');
    await expect(marker('fuste-dorso')).not.toHaveClass(/is-occluded/);
    await expect(marker('fuste-frente')).toHaveClass(/is-occluded/);
    await expect(marker('fuste-dorso')).toHaveClass(/is-selected/);
    await expect(page.locator('[data-status]')).toContainText('Anotación: Fuste, cara posterior');
    // Un marcador también selecciona con el puntero.
    await page.getByRole('button', { name: 'Restablecer vista' }).click();
    await marker('esfera-cima').click();
    await expect(page.getByRole('button', { name: 'Mostrar en el modelo: Cima de la esfera' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('ampliar: el mismo lienzo pasa al diálogo; Escape lo devuelve y el foco vuelve a «Ampliar»', async ({ page }) => {
    await open(page);
    await activate(page);
    await page.getByRole('button', { name: 'Ampliar' }).click();
    const dialog = page.getByRole('dialog', { name: /Visor 3D ampliado/ });
    await expect(dialog).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(dialog.locator('canvas')).toHaveCount(1);
    await expect(dialog.getByRole('button', { name: 'Salir de la ampliación' })).toHaveAttribute('aria-pressed', 'true');
    const box = await dialog.locator('[data-stage]').boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(900);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Ampliar' })).toBeFocused();
    await state(page, 'ready');
    // También se sale con el propio botón.
    await page.getByRole('button', { name: 'Ampliar' }).click();
    await dialog.getByRole('button', { name: 'Salir de la ampliación' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Ampliar' })).toBeFocused();
  });
});

test.describe('ciclos y liberación', () => {
  test('diez ciclos abrir/cerrar: sin lienzos, sesiones ni memoria acumulados', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (/WebGL|context/i.test(message.text())) warnings.push(message.text());
    });
    await open(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('HeapProfiler.enable');
    const heap = async () => {
      await cdp.send('HeapProfiler.collectGarbage');
      return (await cdp.send('Runtime.getHeapUsage')).usedSize;
    };
    let baseline = 0;
    for (let cycle = 1; cycle <= 10; cycle += 1) {
      await activate(page);
      await page.getByRole('button', { name: 'Cerrar el visor 3D' }).click();
      await state(page, 'poster');
      await expect(page.locator('canvas')).toHaveCount(0);
      if (cycle === 2) baseline = await heap();
    }
    const final = await stats(page);
    expect(final).toMatchObject({ sessions: 10, disposals: 10, live: false, canvases: 0 });
    await expect(page.getByRole('button', { name: 'Explorar en 3D' })).toBeFocused();
    const growth = (await heap()) - baseline;
    test.info().annotations.push({ type: 'heap JS retenido, ciclos 2→10 (KiB)', description: (growth / 1024).toFixed(0) });
    expect(growth).toBeLessThan(10 * 1024 * 1024);
    expect(warnings.filter((text) => /too many active/i.test(text))).toEqual([]);
  });

  test('diez montajes/desmontajes del elemento: cada desmontaje libera el visor activo', async ({ page }) => {
    await open(page);
    for (let cycle = 1; cycle <= 10; cycle += 1) {
      await activate(page);
      const detached = await inspector(page).evaluate((element) => {
        const parent = element.parentElement!;
        const next = element.nextSibling;
        element.remove();
        const result = (element as unknown as { inspectorStats: Stats }).inspectorStats;
        parent.insertBefore(element, next);
        return result;
      });
      expect(detached).toMatchObject({ state: 'disposed', live: false, canvases: 0 });
      await state(page, 'poster');
    }
    expect(await stats(page)).toMatchObject({ sessions: 10, disposals: 10, live: false });
    await expect(page.locator('canvas')).toHaveCount(0);
  });
});

test.describe('fallos', () => {
  test('404: aviso legible, póster y anotaciones intactos; reintentar cuando el archivo vuelve', async ({ page }) => {
    await page.route(GLB, (route) => route.fulfill({ status: 404, body: 'no' }));
    await open(page);
    await page.getByRole('button', { name: 'Explorar en 3D' }).click();
    await state(page, 'error');
    await expect(page.locator('[data-status]')).toContainText('No se encontró el archivo del modelo 3D');
    const retry = page.getByRole('button', { name: 'Reintentar' });
    await expect(retry).toBeFocused();
    await expect(page.getByRole('img', { name: /Póster del fixture técnico/ })).toBeVisible();
    await expect(page.locator('.hotspot').first()).toBeVisible();
    expect((await stats(page)).failure).toBe('not-found');
    await page.unroute(GLB);
    await retry.click();
    await state(page, 'ready');
  });

  test('archivo que no es GLB: error de formato', async ({ page }) => {
    await page.route(GLB, (route) => route.fulfill({ status: 200, body: '<!doctype html><title>x</title>', contentType: 'text/html' }));
    await open(page);
    await page.getByRole('button', { name: 'Explorar en 3D' }).click();
    await state(page, 'error');
    expect((await stats(page)).failure).toBe('invalid-file');
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('descodificador ausente: error explícito y póster intacto', async ({ page, request }) => {
    const body = await (await request.get('/lab/models/fixture-needs-decoder.glb')).body();
    await page.route(GLB, (route) => route.fulfill({ status: 200, body, contentType: 'model/gltf-binary' }));
    await open(page);
    await page.getByRole('button', { name: 'Explorar en 3D' }).click();
    await state(page, 'error');
    expect((await stats(page)).failure).toBe('decoder');
    await expect(page.locator('[data-status]')).toContainText('compresión que este visor no puede descodificar');
    await expect(page.getByRole('img', { name: /Póster del fixture técnico/ })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('sin WebGL2 en el navegador: aviso inmediato, sin botón ni descargas', async ({ page }) => {
    await page.addInitScript(() => {
      delete (globalThis as { WebGL2RenderingContext?: unknown }).WebGL2RenderingContext;
    });
    const requests = track3d(page);
    await open(page);
    await state(page, 'error');
    await expect(page.locator('[data-status]')).toContainText('no ofrece WebGL2');
    await expect(page.getByRole('button', { name: 'Explorar en 3D' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeHidden();
    await expect(page.getByRole('img', { name: /Póster del fixture técnico/ })).toBeVisible();
    expect(requests).toEqual([]);
  });

  test('WebGL2 declarado pero sin contexto: fallo al activar, sin descargar el modelo', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === 'webgl2') return null;
        return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof original;
    });
    const requests = track3d(page);
    await open(page);
    await page.getByRole('button', { name: 'Explorar en 3D' }).click();
    await state(page, 'error');
    expect((await stats(page)).failure).toBe('no-webgl2');
    expect(requests.filter((url) => url.endsWith('.glb'))).toEqual([]);
  });

  test.describe('durante la descarga', () => {
    // Sin View Transitions entre documentos: al ir y volver muy rápido, Chromium rechaza a veces la
    // transición automática con un error propio («ViewTransition opt-in disabled») que no es del visor.
    test.use({ reducedMotion: 'reduce' });

    test('cancelar durante la descarga descarta la respuesta tardía; navegar fuera no deja errores', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      await page.route(GLB, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        try {
          await route.fulfill({ response: await route.fetch() });
        } catch {
          // La petición ya se abortó en la página.
        }
      });
      await open(page);
      await page.getByRole('button', { name: 'Explorar en 3D' }).click();
      await state(page, 'loading');
      await expect(page.locator('[data-progress]')).toBeVisible();
      await page.getByRole('button', { name: 'Cancelar la carga' }).click();
      await state(page, 'poster');
      await expect(page.getByRole('button', { name: 'Explorar en 3D' })).toBeFocused();
      await page.waitForTimeout(1600);
      expect(await stats(page)).toMatchObject({ state: 'poster', live: false, canvases: 0 });

      await page.getByRole('button', { name: 'Explorar en 3D' }).click();
      await state(page, 'loading');
      await page.goto('/credits/');
      await page.waitForTimeout(1500);
      await page.goBack();
      await expect(inspector(page)).toHaveAttribute('data-enhanced', 'true');
      expect(['poster', 'ready']).toContain((await stats(page)).state);
      expect(errors).toEqual([]);
    });
  });

  test('pérdida de contexto: póster, aviso y reintento con una sesión nueva', async ({ page }) => {
    await open(page);
    await activate(page);
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    });
    await state(page, 'error');
    expect((await stats(page)).failure).toBe('context-lost');
    await expect(page.locator('[data-status]')).toContainText('liberó el contexto gráfico');
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await state(page, 'ready');
    expect((await stats(page)).sessions).toBe(2);
  });
});

test.describe('visibilidad', () => {
  test.use({ viewport: { width: 1280, height: 520 } });

  test('fuera de pantalla o con la pestaña oculta se suspende; al volver dibuja una vez', async ({ page }) => {
    await open(page);
    await activate(page);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await state(page, 'suspended');
    const frames = (await stats(page)).viewer?.frames ?? 0;
    await inspector(page).evaluate((element) => {
      element.querySelector<HTMLButtonElement>('[data-action="rotate-right"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(300);
    expect((await stats(page)).viewer?.frames, 'suspendido no dibuja').toBe(frames);
    await page.locator('[data-stage]').evaluate((stage) => stage.scrollIntoView({ block: 'center' }));
    await state(page, 'ready');
    await expect.poll(async () => (await stats(page)).viewer?.frames).toBe(frames + 1);

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await state(page, 'suspended');
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await state(page, 'ready');
  });
});

test.describe('móvil y accesibilidad', () => {
  for (const width of [320, 390]) {
    test(`${width} px táctil: tocar activa; sin desplazamiento horizontal`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: true, isMobile: true });
      const page = await context.newPage();
      await open(page);
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(await overflow()).toBeLessThanOrEqual(0);
      await page.getByRole('button', { name: 'Explorar en 3D' }).tap();
      await state(page, 'ready');
      expect(await overflow()).toBeLessThanOrEqual(0);
      const stage = await page.locator('[data-stage]').boundingBox();
      expect(stage?.height ?? 0, 'el lienzo deja página visible para desplazarse').toBeLessThan(800 * 0.85);
      await context.close();
    });
  }

  test('controles visibles: objetivos ≥44 px con anillo de foco', async ({ page }) => {
    await open(page);
    // Activación por teclado: tras un clic, Chromium no aplica :focus-visible al foco por script.
    await page.getByRole('button', { name: 'Explorar en 3D' }).focus();
    await page.keyboard.press('Enter');
    await state(page, 'ready');
    await expect(page.locator('[data-stage]')).toBeFocused();
    const results = await page.locator('main a[href], main button').evaluateAll((elements) =>
      elements
        .filter((element) => (element as HTMLElement).offsetParent !== null)
        .map((element) => {
          (element as HTMLElement).focus();
          return {
            text: (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 40),
            height: element.getBoundingClientRect().height,
            width: element.getBoundingClientRect().width,
            outline: getComputedStyle(element).outlineStyle,
          };
        }),
    );
    expect(results.length).toBeGreaterThan(10);
    for (const result of results) {
      expect(result.height, result.text).toBeGreaterThanOrEqual(44);
      expect(result.outline, result.text).not.toBe('none');
    }
    for (const result of results.filter((item) => item.text.length <= 2)) expect(result.width, result.text).toBeGreaterThanOrEqual(44);
  });
});

test('las fichas de objeto sin modelo real no muestran visor ni descargan 3D', async ({ page }) => {
  const requests = track3d(page);
  for (const id of ['met-254872', 'walters-23-40']) {
    await page.goto(`/artifacts/${id}/`);
    await expect(page.locator('mythos-inspector')).toHaveCount(0);
  }
  expect(requests).toEqual([]);
});
