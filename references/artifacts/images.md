# Imágenes de objetos — adquisición y derechos

Adquisición: **2026-11-09** (Phase 3). Registro canónico de estados en `docs/asset_manifest.md`; aquí se
conserva la evidencia. Los originales **no se guardan en el repositorio** (4,5 MB el mayor): se pueden volver a
descargar de la URL indicada y comprobar con su SHA-256. En el repositorio solo está el maestro web derivado,
del que Astro genera AVIF/WebP en el build (`astro:assets`, sin recorte).

Herramienta de derivación: sharp 0.35.5 (dependencia de Astro), `resize` dentro de 1600×1600 sin ampliar y JPEG
mozjpeg calidad 85. Sin recorte, retoque, cambio de color ni eliminación de escalas o cartelas.

## Walters Art Museum 23.40 — derechos verificados (CC0 1.0)

- Ficha: <https://art.thewalters.org/object/23.40/> (HTML del 2026-11-08, SHA-256
  `943125239604b3eb9a2bdc340cdde4fe68afa355eb3f614047e146ead9c281c1`).
- En la ficha, el bloque de la imagen `PL1_23.40_Fnt_TR_T92.jpg` (vista frontal, 1799×635) lleva junto al botón de
  descarga este marcado (extracto literal, sangría eliminada):

  ```html
  <img src="https://art.thewalters.org/images/art/PL1_23.40_Fnt_TR_T92.jpg"
      alt="Image for Procession of Twelve Gods and Goddesses" width="1799" height="635">
  …
  <strong>Creative Commons License</strong>
  …
  <p><a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank">Creative Commons Zero</a></p>
  …
  <a target="_blank" href="?download=PL1_23.40_Fnt_TR_T92.jpg" class="btn btn--outline item__btn btn--download …">
  ```

- El enlace de descarga (`?download=PL1_23.40_Fnt_TR_T92.jpg`) responde 301 hacia
  `https://art.thewalters.org/images/art/PL1_23.40_Fnt_TR_T92.jpg`; se descargó ese archivo (HTTP 200,
  `image/jpeg`).
- La segunda imagen de la ficha (`PL1_23.40_FntDet_TR_T92II.jpg`, detalle) lleva el mismo marcado; no se adquirió.

## The Metropolitan Museum of Art — derechos **sin verificar** (CC0 probable)

Cadena de evidencia reunida:

1. La Collection API devuelve `isPublicDomain: true` y `primaryImage`/`additionalImages` para los seis objetos
   (respuestas registradas en `README.md`).
2. Documentación de la API (<https://metmuseum.github.io/>, HTML del 2026-11-09, SHA-256
   `6fbfe3a7620d9b79bbc49e68313d33ce10410aabbacf38e5e5f1f6349b942ff2`): la API «gives access to all of The Met's
   Open Access data and to corresponding high resolution images (JPEG format) that are in the public domain»; el
   objeto contiene «its image (if the image is available under Open Access)»; `isPublicDomain`: «When "true"
   indicates an artwork in the Public Domain».
3. README del repositorio Open Access
   (<https://raw.githubusercontent.com/metmuseum/openaccess/master/README.md>, SHA-256
   `ac9314989c15f006f58b81de77753069fb69e202b2723d652fed6b90788f7da5`): «Images are not included and are not part
   of the dataset. Companion artworks listed in the dataset covered by the policy are identified in the Collection
   section of the Museum's website with the Creative Commons Zero (CC0) icon.»

Lo que falta: la página de la política (<https://www.metmuseum.org/policies/image-resources>) y las fichas web
respondieron **HTTP 429** a peticiones automatizadas (2026-11-08 y 2026-11-09), de modo que no se observó el icono
CC0 de cada ficha. La planificación (2026-11-08) lo anotó como «Public Domain» en las seis fichas, pero esa nota no
se repitió en esta adquisición. Por eso los medios del Met quedan con `rights.status: "unverified"` hasta que una
persona confirme el icono CC0 en cada ficha; el validador impide publicarlos así.

## Archivos

| assetId (maestro en `src/assets/images/artifacts/`) | URL del original | Original (px; bytes; SHA-256) | Maestro (px; bytes; SHA-256) |
| --- | --- | --- | --- |
| `walters-23-40-front.jpg` | `https://art.thewalters.org/images/art/PL1_23.40_Fnt_TR_T92.jpg` | 1799×635; 231.100; `ef92cf500dfc726f208b55fcd3e8c558daf7a9d8c1897b1cf2103d13cad206a4` | Copia sin modificar |
| `met-241924-dp-40407-001.jpg` | `https://images.metmuseum.org/CRDImages/gr/original/DP-40407-001.jpg` | 4000×3200; 4.546.744; `80da369d0bb8c55280088491eb1fd5780e52136280084046843c1a8ace22ebc8` | 1600×1280; 311.616; `be51c0ba87c9b249b8e3d7504f528099ed5325e9c73a1a6799f3d3d1e95998e2` |
| `met-251515-dp-20875-001.jpg` | `https://images.metmuseum.org/CRDImages/gr/original/DP-20875-001.jpg` | 3508×4000; 2.597.645; `d7b4a7bda097968d6caf7e63dc30ba755bc7bcb96b03365e88d0e68716b63ae7` | 1403×1600; 152.644; `550d40fc0ee43ac431b5443a6cccf2b0fbff625bbf15a369fe1234c1c56c1666` |
| `met-254872-dp102377.jpg` | `https://images.metmuseum.org/CRDImages/gr/original/DP102377.jpg` | 2881×3601; 1.205.500; `9bcd85535c9273bcc086955124ca68c9ea7477b3157b462cac26e7cdd397339a` | 1280×1600; 140.472; `7fd14d34cfb8bb9d2aebd01e4fc3dccf33363ae4902441181fbe6d127b6e7993` |
| `met-256431-dp328155.jpg` | `https://images.metmuseum.org/CRDImages/gr/original/DP328155.jpg` | 3860×3860; 1.508.573; `a2f48ee543fad97c6230259feca9ed4ffd512e28971d235f0e54c66b64f81e1e` | 1600×1600; 136.567; `efc803416e90edcb93032db9ded41ac246515017a4c665c8bb8f4102ad2dfcd3` |
| `met-257623-dp143038.jpg` | `https://images.metmuseum.org/CRDImages/gr/original/DP143038.jpg` | 3552×4000; 1.908.706; `fe179920e92f6ff982ee09e9cc57011b02e0c208a350dfe30b35eb70dbab1a2f` | 1421×1600; 218.373; `71b2552807230a827e132d3b7dbe704f2a98297104479bb62fcfb533948c226d` |
| `met-745388-dvb11671-1-ff.jpg` | `https://images.metmuseum.org/CRDImages/gr/original/DVB11671_1_ff.jpg` | 3447×2104; 1.524.969; `0fa72b6a1bc032b6d5dca7e928e0be220eaf9841a5f537c664294518184c92ab` | 1600×977; 179.472; `d31577db898afeab82e3b3804a82be83d82d5d5b92be1b9c949c232b82d1ed41` |

## Elección de vistas

- **Met 254872:** la imagen principal (`DP102378`) muestra un combate de dos hoplitas. Se adquirió la vista adicional
  `DP102377`: en el panel, una figura barbada con manto y un cuerno para beber entre dos sátiros. Las etiquetas de la
  ficha («Dionysus», «Satyrs») sostienen la identificación **probable**; qué cara es el anverso no se comprobó.
- **Resto:** imagen principal de la API. En 745388 se conservan la escala métrica y la cartela de la fotografía.
- No se adquirieron las vistas adicionales restantes (no aportan a las páginas previstas).
