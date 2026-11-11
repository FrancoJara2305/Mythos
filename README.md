# MYTHOS — Narratorio Didáctico y Creativo de Mitología

Una travesía narrada por la mitología griega para cualquier edad. Se desciende por la **Torre del Conocimiento**, del cosmos primordial al Olimpo, se viaja entre las constelaciones de los **Doce** en una bóveda 3D y se siguen las familias y los relatos de los dioses. El rigor no desaparece: cada dato documentado conserva su fuente antigua, plegada en un cajón «¿Cómo sabemos esto?», y el repertorio completo vive en **El Códice de las Fuentes**.

Sitio estático en Astro 7, TypeScript estricto, CSS nativo y Three.js 0.187 cargado solo bajo demanda. Sin backend, base de datos, CMS ni frameworks de interfaz.

## Qué hay dentro

| Ruta | Sala |
| --- | --- |
| `/` | La Torre del Conocimiento: portal, tres niveles y los seis capítulos de la «Parte I» |
| `/chapters/dodekatheon/` | GR-04: Planetario de Constelaciones, con el interruptor de tradición Hestia ↔ Dioniso |
| `/chapters/{id}/` | Preludio de los demás capítulos (GR-01–03, GR-05, GR-06) |
| `/deities/{id}/` | Ficha narrativa de cada deidad (los doce más Hestia) |
| `/myths/{id}/` | Relato, numerado como episodio de la saga |
| `/chapters/dodekatheon/genealogy/` | Mapa de Linajes Estelares |
| `/chapters/dodekatheon/atlas/` | Hilo del Destino y «Los testigos del tiempo» |
| `/sources/` | El Códice de las Fuentes (obras, pasajes y objetos) |
| `/artifacts/{id}/`, `/credits/` | Fichas de objeto y créditos de medios |

Todo funciona sin JavaScript. Los scripts solo mejoran la experiencia: la navegación compartida, la Torre, el planetario, el mapa, el hilo y el visor 3D. `npm run test:dist` verifica qué páginas pueden llevarlos.

## Requisitos

- Node ≥ 22.23.4 (desarrollo con 24.14.0) y npm.
- Para las pruebas e2e, Microsoft Edge instalado: Playwright usa el Edge del sistema (`channel: msedge`) y no descarga navegadores.
- **En Windows, ejecuta build, preview y pruebas e2e desde PowerShell o cmd, no desde Git Bash.** Desde Git Bash el build termina «bien», pero ninguna página enlaza su CSS; `npm run test:dist` lo detecta (ver `docs/architecture_decisions.md`, registro del Narratorio).

## Comandos

```sh
npm install
astro dev --background        # servidor de desarrollo en segundo plano (astro dev status | logs | stop)
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en primer plano (`localhost:4321`) |
| `npm run check` | Comprobación de tipos y de plantillas (`astro check`) |
| `npm run test:unit` | Lógica pura: rutas, genealogía, escalas temporales, visor 3D, identidad visual |
| `npm run test:content` | Esquemas e integridad curatorial del contenido real y de los fixtures |
| `npm run build:staging` | Build con `.env.staging` (todo el contenido en borrador, `noindex`) |
| `npm run test:dist -- --app-env staging` | Verifica el `dist/`: enlaces, metadatos, scripts autorizados, Three.js fuera de los módulos de entrada |
| `npm run test:e2e` | Playwright sobre `astro preview` (puerto 4399) |
| `npm run validate` | Todo lo anterior en orden: es la puerta antes de cualquier entrega |

`npm run build` usa el modo `production` y **hoy falla a propósito**: todo el contenido está en `draft` y producción exige doce perfiles publicados con revisión humana (R8). Para simular producción en local, copia `.env.example` a `.env.production.local`.

Solo puede correr un `astro preview` a la vez. Si las pruebas e2e dicen que ya hay otro, detenlo con `npx astro preview stop`.

## Estructura

```text
src/
  config/        saga.ts (Parte I: temáticas, capítulos, historias) · chapters.ts (ids y roster de GR-04)
                 navigation.ts · deity-themes.ts
  content/       deities/ myths/ (Markdown) · sources/ artifacts/ relationships/ timeline-events/ (JSON)
  lib/content/   esquemas Zod, integridad curatorial, consultas de build
  lib/           planetarium/ genealogy/ timeline/ three/ scenes/ sky/ text/
  components/    planetarium/ narrative/ chapter/ deity/ islands/ sources/ three/ ui/
  pages/         rutas de la tabla anterior
  scripts/       site-nav.ts (navegación compartida) · tower.ts (Torre)
  styles/        tokens por nivel de la torre, base, escenas, impresión
tests/           unit/ content/ build/ e2e/
docs/            decisiones, modelo de contenidos, diseño, medios, rendimiento, despliegue
```

## Documentación

- [docs/architecture_decisions.md](docs/architecture_decisions.md): stack, límites de JavaScript, rutas, registros por fase (el último, el Narratorio) y **riesgos abiertos antes de publicar**.
- [docs/content_model.md](docs/content_model.md): colecciones, evidencia, variantes y capa narrativa (§13).
- [docs/design_guidelines.md](docs/design_guidelines.md): dirección visual vigente («Narratorio: maravilla mítica cósmica»), pantallas, planetario e impresión.
- [docs/asset_manifest.md](docs/asset_manifest.md): medios, fuentes tipográficas y derechos.
- [docs/performance_strategy.md](docs/performance_strategy.md) y [docs/deployment_strategy.md](docs/deployment_strategy.md): presupuestos, ambientes y publicación.

## Estado curatorial

Todo el contenido está en `draft`. Las comprobaciones automáticas verifican integridad (referencias, pasajes, variantes, derechos), no verdad histórica. Publicar requiere que una persona revise cada registro (`docs/content_model.md` §7).
