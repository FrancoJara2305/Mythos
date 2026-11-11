/**
 * Mejora progresiva de la Torre (src/pages/index.astro). Sin este módulo la página es un documento
 * normal: el botón del umbral es un enlace a la primera planta y todos los pisos están a la vista.
 *
 * 1. Travesía del portal: «Adentrarse en el mito» lanza el zoom por la geometría y el destello (CSS,
 *    `data-portal="entering"`); en el punto más brillante se salta a la cúspide y, al terminar, el foco
 *    queda en el título del nivel. Con movimiento reducido no se intercepta el enlace.
 * 2. Pisos: cada planta aparece al entrar en pantalla (`.is-visible`).
 * 3. Altitud cósmica: marca con `aria-current` la parada del nivel que cruza el centro de la ventana.
 */

// Módulo aislado: sus constantes no comparten ámbito con otros scripts de la página.
export {};

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
const hall = document.querySelector<HTMLElement>('[data-hall]');
const portal = document.querySelector<HTMLElement>('[data-portal]');

/* ——— 1. Travesía del portal ——— */

function portalDuration(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--duration-portal').trim();
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return 0;
  return raw.endsWith('ms') ? value : value * 1000;
}

let travelling = false;

function enter(link: HTMLAnchorElement, event: MouseEvent): void {
  const id = decodeURIComponent(link.hash.slice(1));
  const target = id === '' ? null : document.getElementById(id);
  const duration = portalDuration();
  if (portal === null || target === null || REDUCED.matches || duration === 0 || travelling) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  travelling = true;
  portal.dataset.portal = 'entering';

  // En el punto más brillante del destello, la cúspide ya está bajo la luz.
  window.setTimeout(() => {
    history.pushState(null, '', link.hash);
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, duration * 0.72);

  window.setTimeout(() => {
    portal.dataset.portal = '';
    travelling = false;
    target.querySelector<HTMLElement>('[tabindex="-1"]')?.focus({ preventScroll: true });
  }, duration);
}

document.querySelector<HTMLAnchorElement>('a[data-hook="enter"]')?.addEventListener('click', function (event) {
  enter(this, event);
});

if ('IntersectionObserver' in window && hall !== null) {
  /* ——— 2. Pisos ——— */
  const floors = [...hall.querySelectorAll<HTMLElement>('[data-floor]')];
  const reveal = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  );
  hall.dataset.reveal = 'armed';
  for (const floor of floors) reveal.observe(floor);

  /* ——— 3. Altitud cósmica ——— */
  const links = [...hall.querySelectorAll<HTMLAnchorElement>('[data-altitude-link]')];
  const levels = [...hall.querySelectorAll<HTMLElement>('[data-altitude]')];
  const inView = new Set<HTMLElement>();

  const setAltitude = (id: string | undefined) => {
    if (id === undefined) return;
    for (const link of links) {
      if (link.dataset.altitudeLink === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    hall.dataset.altitude = id;
  };

  const altitude = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const level = entry.target as HTMLElement;
        if (entry.isIntersecting) inView.add(level);
        else inView.delete(level);
      }
      // El nivel más bajo de los que cruzan el centro manda; fuera de la torre se conserva el último.
      setAltitude(levels.filter((level) => inView.has(level)).at(-1)?.dataset.altitude);
    },
    { rootMargin: '-48% 0px -48% 0px' },
  );
  for (const level of levels) altitude.observe(level);
}
