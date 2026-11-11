/**
 * Narratorio sobre el build estático: la Torre del Conocimiento (portal, descenso y altitud cósmica),
 * la bóveda de los Doce como lista completa sin JavaScript, las fichas narrativas (relato, cápsulas,
 * nombres secretos, poderes, relatos, linaje y huellas, con la evidencia plegada en «¿Cómo sabemos
 * esto?»), las páginas de relato y de capítulo, y el Códice de las Fuentes. Anchos de 320 a 1440 px,
 * foco y objetivos de 44 px, sin descargas 3D sin JavaScript y griego marcado con lang="grc".
 */
import { expect, test, type Page } from '@playwright/test';

const ROSTER = [
  ['zeus', 'Zeus'],
  ['hera', 'Hera'],
  ['poseidon', 'Poseidón'],
  ['demeter', 'Deméter'],
  ['athena', 'Atenea'],
  ['apollo', 'Apolo'],
  ['artemis', 'Ártemis'],
  ['ares', 'Ares'],
  ['aphrodite', 'Afrodita'],
  ['hephaestus', 'Hefesto'],
  ['hermes', 'Hermes'],
  ['dionysus', 'Dioniso'],
] as const;
/** Las doce del roster y la de la otra tradición: todas tienen ficha. */
const PROFILES = [...ROSTER, ['hestia', 'Hestia']] as const;

const VAULT = '/chapters/dodekatheon/';
const SAGA_CHAPTERS = ['before-the-gods', 'reign-of-the-titans', 'war-for-the-cosmos', 'dodekatheon', 'divine-families', 'love-and-metamorphosis'];
const PAGES = [
  '/',
  VAULT,
  '/chapters/reign-of-the-titans/',
  '/deities/athena/',
  '/deities/aphrodite/',
  '/deities/hestia/',
  '/myths/birth-of-aphrodite/',
  '/artifacts/walters-23-40/',
  '/sources/',
  '/sources/homer-iliad/',
  '/credits/',
];
/** Secciones de toda ficha; «sabias», «huellas» y «contexto» solo existen si hay contenido. */
const SECTIONS = ['relato', 'nombres', 'poderes', 'relatos', 'linaje'];
/** Figuras cuya propia filiación tiene versiones incompatibles. */
const WITH_VARIANTS = new Set(['aphrodite', 'hephaestus']);

/** Textos con letras griegas que no estén dentro de un elemento con lang="grc". */
async function unmarkedGreek(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const greek = /[Ͱ-Ͽἀ-῿]/u;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const found: string[] = [];
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if (node.parentElement?.closest('script, style') !== null) continue;
      const text = node.textContent ?? '';
      if (!greek.test(text)) continue;
      const owner = node.parentElement?.closest('[lang]');
      if (owner?.getAttribute('lang') !== 'grc') found.push(text.trim().slice(0, 60));
    }
    return found;
  });
}

const openAllDetails = (page: Page) =>
  page.locator('details').evaluateAll((items) => items.forEach((item) => ((item as HTMLDetailsElement).open = true)));

test.describe('La Torre del Conocimiento', () => {
  test('portal: título, acceso inmediato y sin esperar animaciones', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'MYTHOS' })).toBeVisible();
    const enter = page.getByRole('link', { name: 'Adentrarse en el mito' });
    await expect(enter).toBeVisible();
    await expect(enter).toHaveAttribute('href', '#cosmos');
    expect(await enter.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  });

  test('atravesar el portal deja al lector en la cúspide, con el foco en su título', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Adentrarse en el mito' }).click();
    await expect(page).toHaveURL(/#cosmos$/);
    await expect(page.locator('#cosmos-titulo')).toBeInViewport();
    await expect(page.locator('#cosmos-titulo')).toBeFocused();
  });

  test('movimiento reducido: el enlace salta directo, sin travesía', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('link', { name: 'Adentrarse en el mito' }).click();
    await expect(page).toHaveURL(/#cosmos$/);
    await expect(page.locator('[data-portal]')).not.toHaveAttribute('data-portal', 'entering');
    await expect(page.locator('#cosmos-titulo')).toBeInViewport();
  });

  test('descenso: seis plantas de la saga en orden, con The Dodekatheon como capítulo principal', async ({ page }) => {
    await page.goto('/');
    const floors = page.locator('.floor');
    await expect(floors).toHaveCount(6);
    for (const [index, id] of SAGA_CHAPTERS.entries()) {
      await expect(floors.nth(index).locator('.floor__title a')).toHaveAttribute('href', `/chapters/${id}/`);
    }
    const featured = page.locator('.floor--featured');
    await expect(featured).toHaveCount(1);
    await expect(featured).toContainText('GR-04');
    await expect(featured.getByRole('link', { name: 'Entrar en la bóveda de los Doce' })).toHaveAttribute('href', VAULT);
    // Los niveles hacia la Tierra se anuncian sin rutas.
    await expect(page.locator('#tierra .horizon__item a')).toHaveCount(0);
  });

  test('la altitud cósmica acompaña el descenso', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const altimeter = page.getByRole('navigation', { name: 'Altitud cósmica' });
    await expect(altimeter.getByRole('link')).toHaveCount(3);
    await page.locator('#olimpo').evaluate((level) => level.scrollIntoView({ block: 'center' }));
    await expect(altimeter.locator('a[href="#olimpo"]')).toHaveAttribute('aria-current', 'true');
    await expect(altimeter.locator('[aria-current]')).toHaveCount(1);
    await page.locator('#tierra').evaluate((level) => level.scrollIntoView({ block: 'center' }));
    await expect(altimeter.locator('a[href="#tierra"]')).toHaveAttribute('aria-current', 'true');
  });
});

test.describe('La bóveda de los Doce sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('cada constelación es una ficha legible con sus cuatro facetas, en el orden del roster', async ({ page }) => {
    await page.goto(VAULT);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Dodekatheon');
    await expect(page.locator('[data-controls]')).toBeHidden();
    const cards = page.locator('.sky-card');
    await expect(cards).toHaveCount(13);
    for (const [index, [id, name]] of ROSTER.entries()) {
      const card = cards.nth(index);
      await expect(card).toHaveAttribute('id', `constelacion-${id}`);
      await expect(card.locator('.sky-card__name a')).toHaveText(name);
      await expect(card.locator('.sky-card__name a')).toHaveAttribute('href', `/deities/${id}/`);
      await expect(card.locator('.sky-card__figure svg')).toHaveCount(1);
      await expect(card.locator('.facet')).toHaveCount(4);
      for (const facet of await card.locator('.facet').all()) await expect(facet).toBeVisible();
    }
    await expect(page.locator('#constelacion-hestia')).toContainText('Tradición del Hogar Sagrado');
    expect(await unmarkedGreek(page)).toEqual([]);
  });

  test('las dos tradiciones se explican con el relieve Walters 23.40', async ({ page }) => {
    await page.goto(VAULT);
    const why = page.locator('#dos-tradiciones');
    await expect(why).toBeVisible();
    await expect(why.locator('h2')).toHaveText('¿Doce dioses… o trece?');
    const image = why.locator('img');
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute('alt', /Hestia/);
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(why.locator('.why__caption').getByRole('link', { name: 'Hestia' })).toHaveAttribute('href', '/deities/hestia/');
    await expect(why.locator('.why__caption').getByRole('link', { name: 'Dioniso' })).toHaveCount(0);
    await expect(why.getByRole('link', { name: /Tradición del Hogar Sagrado/ })).toHaveAttribute('href', '/deities/hestia/');
    await expect(why.getByRole('link', { name: /Tradición Dionisíaca/ })).toHaveAttribute('href', '/deities/dionysus/');
  });

  test('las salas funcionan sin scripts propios y no solicitan recursos 3D', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    for (const path of PAGES) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      // Siempre el módulo en línea de la navegación; la Torre suma el suyo y la bóveda, su isla.
      await expect(page.locator('script[type="module"]:not([src])'), path).toHaveCount(path === '/' ? 2 : 1);
      await expect(page.locator('script[type="module"][src]'), path).toHaveCount(path === VAULT ? 1 : 0);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    }
    expect(requests.filter((url) => /\.glb|three|draco|ktx2|meshopt/i.test(url))).toEqual([]);
  });
});

test.describe('capítulos y relatos', () => {
  test('cada capítulo de la saga tiene su página; los que no son la bóveda abren con su preludio', async ({ page }) => {
    for (const id of SAGA_CHAPTERS.filter((chapter) => chapter !== 'dodekatheon')) {
      const response = await page.goto(`/chapters/${id}/`);
      expect(response?.status(), id).toBe(200);
      await expect(page.locator('.prelude__title')).toBeVisible();
      await expect(page.getByRole('heading', { level: 2, name: 'Las historias de este capítulo' })).toBeVisible();
      expect(await unmarkedGreek(page), id).toEqual([]);
    }
  });

  test('un relato se lee como historia y guarda su fuente en «¿Cómo sabemos esto?»', async ({ page }) => {
    await page.goto('/myths/birth-of-aphrodite/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Afrodita/);
    expect(await page.locator('.tale__part').count()).toBeGreaterThanOrEqual(1);
    const hint = page.locator('.source-hint').first();
    await expect(hint).not.toHaveAttribute('open');
    await expect(hint.locator('summary')).toContainText('¿Cómo sabemos esto?');
    await hint.locator('summary').click();
    await expect(hint.getByRole('link').first()).toHaveAttribute('href', /^\/sources\/[a-z-]+\/#[a-z0-9-]+$/);
    // Dos tradiciones: el relato enlaza la otra versión.
    await expect(page.locator('#otra-tradicion')).toBeVisible();
    expect(await unmarkedGreek(page)).toEqual([]);
  });
});

test.describe('fichas narrativas', () => {
  for (const [id, name] of PROFILES) {
    test(`${name}: ficha completa`, async ({ page }) => {
      const response = await page.goto(`/deities/${id}/`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
      await expect(page.locator('.deity__greek [lang="grc"]')).not.toBeEmpty();
      await expect(page.locator('.hero__tagline')).not.toBeEmpty();
      const toc = page.locator('#site-panel [data-toc]');
      for (const section of SECTIONS) {
        await expect(page.locator(`#${section} h2`), section).toBeVisible();
        await expect(toc.locator(`a[href="#${section}"]`)).toHaveCount(1);
      }
      expect(await page.locator('#relato .story__part').count()).toBeGreaterThanOrEqual(1);
      // Las versiones incompatibles se presentan como dos tradiciones de los bardos, nunca mezcladas.
      await expect(page.locator('#linaje .bards')).toHaveCount(WITH_VARIANTS.has(id) ? 1 : 0);
      if (id !== 'hestia') expect(await page.locator('#relatos .tale-card').count()).toBeGreaterThanOrEqual(1);
      // Cada epíteto y cada dominio o símbolo guarda su evidencia, plegada.
      for (const entry of await page.locator('#nombres .capsules > li, #poderes .power').all()) {
        await expect(entry.locator('details.source-hint')).toHaveCount(1);
        await expect(entry.locator('details.source-hint')).not.toHaveAttribute('open');
      }
      await expect(page.getByRole('link', { name: 'Están en el Códice de las Fuentes' })).toHaveAttribute('href', `/sources/#figura-${id}`);
      await expect(page.locator('.powers__sky a')).toHaveAttribute('href', `${VAULT}#constelacion-${id}`);
      expect(await unmarkedGreek(page)).toEqual([]);
    });
  }

  test('Afrodita: dos tradiciones de su origen, sin mezclar progenitores', async ({ page }) => {
    await page.goto('/deities/aphrodite/');
    const options = page.locator('#linaje .bards__option');
    await expect(options).toHaveCount(2);
    const hesiod = options.filter({ hasText: 'Según Teogonía de Hesíodo' });
    const iliad = options.filter({ hasText: 'Según Ilíada' });
    await expect(hesiod).toContainText('Urano');
    await expect(hesiod).not.toContainText('Dione');
    await expect(iliad).toContainText('Dione');
    await expect(iliad).toContainText('Zeus');
    // Con versiones, la filiación solo se cuenta dentro de cada tradición.
    await expect(page.locator('#linaje .family__label', { hasText: 'Nace de' })).toHaveCount(0);
  });

  test('Zeus: la descendencia de cada tradición se conserva, rotulada con su bardo', async ({ page }) => {
    await page.goto('/deities/zeus/');
    const children = page.locator('#linaje .kin__item[data-child]');
    await expect(children.filter({ has: page.locator('a[href="/deities/athena/"]') })).not.toContainText('solo según');
    await expect(children.filter({ has: page.locator('a[href="/deities/aphrodite/"]') })).toContainText('solo según Ilíada');
    await expect(children.filter({ has: page.locator('a[href="/deities/hephaestus/"]') })).toContainText('solo según Ilíada y Odisea');
    // Cada figura aparece una sola vez.
    const ids = await children.evaluateAll((items) => items.map((item) => item.getAttribute('data-child')));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('Hera: si todas las tradiciones coinciden, el hijo va sin rótulo', async ({ page }) => {
    await page.goto('/deities/hera/');
    const hephaestus = page.locator('#linaje .kin__item[data-child="hephaestus"]');
    await expect(hephaestus).toHaveCount(1);
    await expect(hephaestus).not.toContainText('solo según');
  });

  test('las figuras de contexto enlazan a una nota de la ficha, no a un perfil', async ({ page }) => {
    await page.goto('/deities/athena/');
    const metis = page.locator('#linaje').getByRole('link', { name: 'Metis' }).first();
    await expect(metis).toHaveAttribute('href', '#contexto-metis');
    await metis.click();
    await expect(page.locator('#contexto-metis')).toBeInViewport();
  });

  test('Dioniso: la fotografía probable lleva su certeza en la cartela', async ({ page }) => {
    await page.goto('/deities/dionysus/');
    const figure = page.locator('.deity__media figure');
    await expect(figure).toContainText('Identificación probable');
    await expect(figure.locator('img')).toHaveAttribute('alt', /Probablemente Dioniso/);
  });

  test('Hestia: ficha de la otra tradición, sin entrada en el mapa de linajes', async ({ page }) => {
    await page.goto('/deities/hestia/');
    await expect(page.locator('.hero__eyebrow')).toContainText('Tradición del Hogar Sagrado');
    await expect(page.getByRole('link', { name: /Mapa de Linajes Estelares/ })).toHaveCount(0);
  });

  test('«¿Cómo sabemos esto?» lleva al pasaje anclado y este a la edición', async ({ page }) => {
    await page.goto('/deities/hephaestus/');
    const hint = page.locator('#poderes details.source-hint').filter({ hasText: 'Ilíada 18.468–477' }).first();
    await hint.locator('summary').click();
    await hint.getByRole('link', { name: 'Ilíada 18.468–477' }).first().click();
    await expect(page).toHaveURL('/sources/homer-iliad/#hephaestus-at-the-forge');
    const passage = page.locator('#hephaestus-at-the-forge');
    await expect(passage).toBeInViewport();
    await expect(passage.getByRole('link', { name: 'Consultar edición' })).toHaveAttribute(
      'href',
      'https://scaife.perseus.org/reader/urn:cts:greekLit:tlg0012.tlg001.perseus-grc2:18.468-18.477/',
    );
    await expect(passage.locator('.passage__cited')).toContainText('Hefesto');
  });
});

test.describe('El Códice de las Fuentes, objetos y créditos', () => {
  test('el Códice lista las obras y el índice por divinidad, sin filtros JS', async ({ page }) => {
    await page.goto('/sources/');
    await expect(page.locator('#por-obra .work')).toHaveCount(9);
    await expect(page.locator('#por-divinidad .deity-index')).toHaveCount(PROFILES.length);
    for (const [id] of PROFILES) await expect(page.locator(`#figura-${id}`), id).toHaveCount(1);
    expect(await unmarkedGreek(page)).toEqual([]);
  });

  test('cada obra muestra edición identificada y localizadores cotejados', async ({ page }) => {
    for (const work of ['hesiod-theogony', 'homer-iliad', 'homer-odyssey', 'hymn-demeter']) {
      await page.goto(`/sources/${work}/`);
      await expect(page.locator('.edition').first()).toContainText(/Edición|Traducción/);
      const passages = page.locator('.passage');
      expect(await passages.count()).toBeGreaterThan(0);
      for (const passage of await passages.all()) {
        await expect(passage).toContainText('Localizador cotejado el');
        await expect(passage.getByRole('link', { name: 'Consultar edición' })).toHaveAttribute('href', /^https:\/\/scaife\.perseus\.org\//);
      }
      expect(await unmarkedGreek(page)).toEqual([]);
    }
  });

  test('la ficha de objeto separa catálogo, identificación y derechos', async ({ page }) => {
    await page.goto('/artifacts/met-251515/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Marble head of Aphrodite?');
    await expect(page.locator('.identification')).toContainText('certeza posible');
    await expect(page.locator('img').first()).toHaveAttribute('alt', /posiblemente Afrodita/);
    await expect(page.locator('#derechos-titulo')).toBeVisible();
    await expect(page.getByText('derechos sin verificar').first()).toBeVisible();
  });

  test('créditos: cada fotografía y cada edición con su licencia y estado', async ({ page }) => {
    await page.goto('/credits/');
    await expect(page.locator('#imagenes-titulo + ul > li')).toHaveCount(7);
    await expect(page.locator('#ediciones-titulo ~ ul > li')).toHaveCount(18);
    expect(await unmarkedGreek(page)).toEqual([]);
  });
});

test.describe('adaptación de las salas', () => {
  for (const width of [320, 390, 768, 1440] as const) {
    test(`${width} px: sin desplazamiento horizontal`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of PAGES) {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${path} a ${width} px`).toBeLessThanOrEqual(0);
      }
      await page.goto('/deities/athena/');
      await page.screenshot({ path: test.info().outputPath(`ficha-${width}.png`), fullPage: true });
    });
  }
});

test.describe('foco en las salas', () => {
  const targets = [
    '/',
    ...PROFILES.map(([id]) => `/deities/${id}/`),
    '/myths/birth-of-aphrodite/',
    '/chapters/reign-of-the-titans/',
    '/sources/',
    '/sources/hesiod-theogony/',
    '/artifacts/walters-23-40/',
    '/artifacts/met-254872/',
    '/credits/',
  ];
  for (const path of targets) {
    test(`${path}: cada objetivo enfocable mide ≥44 px y muestra el anillo`, async ({ page }) => {
      await page.goto(path);
      // El contenido plegado («¿Cómo sabemos esto?») también se mide: se abren todos los desplegables.
      await openAllDetails(page);
      const results = await page.locator('a[href], button, summary').evaluateAll((elements) =>
        elements
          .filter((element) => element.checkVisibility())
          .map((element) => {
            (element as HTMLElement).focus();
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return { text: element.textContent?.trim().slice(0, 40), height: box.height, outline: style.outlineStyle };
          }),
      );
      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.height, result.text).toBeGreaterThanOrEqual(44);
        expect(result.outline, result.text).not.toBe('none');
      }
    });
  }
});
