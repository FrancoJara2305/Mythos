/**
 * Mejora progresiva de la navegación (src/components/ui/SiteNav.astro). Sin este módulo, el
 * índice y el panel siguen funcionando: son enlaces normales y un `popover` nativo.
 *
 * 1. Seguimiento de sección: IntersectionObserver marca con `aria-current="location"` el enlace de
 *    «En esta página» cuya sección cruza la franja superior de la ventana, y actualiza la ubicación
 *    visible de la barra compacta. No escribe en el historial ni desplaza la página.
 * 2. Panel compacto: al abrirlo, el foco va al grupo pedido («Explorar» o «En esta página»); al elegir
 *    un destino se cierra. Escape, clic fuera y retorno del foco los da la API `popover`.
 * 3. Anclas dentro de `<details>` cerrados: se abren antes de llegar al destino (enlaces internos,
 *    carga con fragmento y atrás/adelante).
 * 4. Atmósferas (`[data-ambient]`): sus animaciones CSS solo corren mientras la escena es visible, la
 *    pestaña está activa y no se pide movimiento reducido (`data-ambient-state="running"`).
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

const panel = document.getElementById('site-panel');
const isPopover = (element: HTMLElement | null): element is HTMLElement =>
  element !== null && typeof (element as HTMLElement & { showPopover?: unknown }).showPopover === 'function' && element.hasAttribute('popover');

function panelOpen(): boolean {
  return isPopover(panel) && panel.matches(':popover-open');
}

function closePanel(): void {
  if (panelOpen()) panel?.hidePopover();
}

/* ——— 3. Anclas dentro de <details> ——— */

function revealTarget(id: string): HTMLElement | null {
  if (id === '') return null;
  const target = document.getElementById(id);
  if (target === null) return null;
  for (let node: HTMLElement | null = target; node !== null; node = node.parentElement) {
    if (node instanceof HTMLDetailsElement && !node.open) node.open = true;
  }
  return target;
}

function revealFromHash(): void {
  const id = decodeURIComponent(location.hash.slice(1));
  const target = revealTarget(id);
  if (target !== null && target.closest('details') !== null) target.scrollIntoView();
}

/* ——— 2. Panel compacto ——— */

let requestedGroup = 'archive';

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-panel-focus]')) {
  button.addEventListener('click', () => {
    requestedGroup = button.dataset.panelFocus ?? 'archive';
  });
}

panel?.addEventListener('toggle', (event) => {
  if ((event as ToggleEvent).newState !== 'open') return;
  const group = panel.querySelector<HTMLElement>(`[data-panel-group="${requestedGroup}"]`) ?? panel.querySelector('[data-panel-group]');
  if (group === null) return;
  // El destino actual si se ve (no dentro de un `<details>` cerrado); si no, el primer enlace visible.
  const candidates = [
    ...group.querySelectorAll<HTMLElement>('[aria-current="location"], [aria-current="page"], [aria-current="true"]'),
    ...group.querySelectorAll<HTMLElement>('a[href]'),
  ];
  candidates.find((element) => (typeof element.checkVisibility === 'function' ? element.checkVisibility() : true))?.focus();
});

document.addEventListener('click', (event) => {
  // Un componente que ya gestiona el enlace (p. ej. el selector del explorador genealógico) manda.
  if (event.defaultPrevented) return;
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
  if (link === null || link === undefined) return;
  const url = new URL(link.href, location.href);
  const samePage = url.origin === location.origin && url.pathname === location.pathname && url.hash !== '';
  if (samePage) revealTarget(decodeURIComponent(url.hash.slice(1)));
  if (panel?.contains(link) === true) closePanel();
});

// Al volver de la caché bfcache, el panel se cierra.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) closePanel();
});
window.addEventListener('hashchange', revealFromHash);
revealFromHash();

/* ——— 1. Seguimiento de sección ——— */

const toc = document.querySelector<HTMLElement>('[data-toc]');
const currentLabel = document.querySelector<HTMLElement>('[data-nav-current]');

if (toc !== null && 'IntersectionObserver' in window) {
  const links = [...toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const sections = links
    .map((link) => ({ link, target: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
    .filter((entry): entry is { link: HTMLAnchorElement; target: HTMLElement } => entry.target !== null);
  const intersecting = new Set<HTMLElement>();

  const setCurrent = (link: HTMLAnchorElement | undefined) => {
    for (const other of links) {
      if (other === link) other.setAttribute('aria-current', 'location');
      else other.removeAttribute('aria-current');
    }
    if (currentLabel !== null && link !== undefined) currentLabel.textContent = link.textContent?.trim() ?? '';
  };

  const update = () => {
    // La sección activa es la última (en orden del documento) que cruza la franja de lectura; si
    // ninguna la cruza (entre dos secciones), se conserva la anterior.
    const active = sections.filter((entry) => intersecting.has(entry.target)).at(-1);
    if (active !== undefined) setCurrent(active.link);
    else if (window.scrollY < 8) setCurrent(sections[0]?.link);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        if (entry.isIntersecting) intersecting.add(target);
        else intersecting.delete(target);
      }
      update();
    },
    // Franja entre el 20 % y el 45 % superior de la ventana: zona donde se empieza a leer.
    { rootMargin: '-20% 0px -55% 0px' },
  );
  for (const entry of sections) observer.observe(entry.target);
}

/* ——— 4. Atmósferas ——— */

const scenes = [...document.querySelectorAll<HTMLElement>('[data-ambient]')];
if (scenes.length > 0) {
  const visible = new Set<HTMLElement>();
  const apply = () => {
    const allowed = !REDUCED.matches && document.visibilityState === 'visible';
    for (const scene of scenes) scene.dataset.ambientState = allowed && visible.has(scene) ? 'running' : 'paused';
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const scene = entry.target as HTMLElement;
        if (entry.isIntersecting) visible.add(scene);
        else visible.delete(scene);
      }
      apply();
    });
    for (const scene of scenes) observer.observe(scene);
  }
  document.addEventListener('visibilitychange', apply);
  REDUCED.addEventListener('change', apply);
  apply();
}
