# Fichas de objetos — registro de consultas

Consulta: **2026-11-08**. Respaldo de `src/content/artifacts/`. No se descargó ninguna imagen.

## The Metropolitan Museum of Art — Collection API

Endpoint público: `https://collectionapi.metmuseum.org/public/collection/v1/objects/{objectID}`. Las seis
respuestas fueron HTTP 200; se registran los campos usados y el SHA-256 de cada respuesta.

| Registro | objectID | Inventario | Título (API) | Fecha (API) | SHA-256 de la respuesta |
| --- | --- | --- | --- | --- | --- |
| `met-241924` | 241924 | 74.51.2370 | Limestone inscribed relief | ca. 3rd century BCE (-299/-200) | `9b852dfaf37da86879753a897f82c87a337e13c9ded0ab42019339f4384b061f` |
| `met-256431` | 256431 | 2012.477.1 | Marble head of a goddess | 2nd–1st century BCE (-199/-1) | `d19b2c12c4156041e1ae42927c0beff84cb477f47a4df402403e5cc118014b18` |
| `met-257623` | 257623 | 2002.604 | Marble head of a veiled goddess | late 4th or 3rd century BCE (-330/-200) | `d5793080a0d889a643cfb735d208798b838ee916438d729e25f325b63346ac82` |
| `met-745388` | 745388 | 2011.604.3.481a, b | Terracotta fragments of a neck-amphora of Panathenaic shape | third quarter of the 6th century BCE (-650/-400) | `bb222ac0824836c8cd313c89b627d8b152bdca5235b1840c997f936dada37315` |
| `met-254872` | 254872 | 56.171.14 | Terracotta amphora (jar) | ca. 530 BCE (-530/-530) | `c5574af4b199db504ca7fea288d327e6a09e79d3861f7937050f8898111814b7` |
| `met-251515` | 251515 | 24.97.88b | Marble head of Aphrodite? | 2nd–1st century BC (-199/-1) | `6ec43472c54a9c96c27b6f5fa10502d913601614cfbfbc56cf0dad2e9efa5073` |

- Las seis tienen `isPublicDomain: true`. Política: <https://www.metmuseum.org/policies/image-resources>.
- La API **no incluye** la descripción curatorial ni el historial de propiedad. La ficha web
  (`https://www.metmuseum.org/art/collection/search/241924`) respondió **HTTP 429** a una petición automatizada;
  no se insistió. Por eso las identificaciones que la planificación tomó de las descripciones web (A03
  Afrodita/Artemisa, A04 Deméter, A05 Atenea) **no se registran** hasta cotejarlas, y las procedencias quedan
  `unknown`.
- Los intervalos numéricos del contenido se derivan de la **datación textual**; los campos
  `objectBeginDate/objectEndDate` usan una convención propia (p. ej. -299/-200 para el siglo III a. C.) y en
  745388 son mucho más amplios que el texto. Cada registro lo explica en `date.basis`.

## The Walters Art Museum — 23.40

Ficha: <https://art.thewalters.org/object/23.40/> (HTTP 200; SHA-256 del HTML descargado
`943125239604b3eb9a2bdc340cdde4fe68afa355eb3f614047e146ead9c281c1`).

- Título: «Procession of Twelve Gods and Goddesses». 1st century BCE–1st century CE (Hellenistic). Pentelic
  marble. Place of Discovery: Italy, Taranto (Tarentum). 38,2 × 119,7 × 5,5 cm. Credit Line: «Acquired by Henry
  Walters, 1913». Imagen marcada **Creative Commons Zero**.
- Descripción (cita literal): «The figures from left to right are: Hestia (goddess of the hearth), with scepter;
  Hermes (messenger of the gods), with cap and staff; Aphrodite (goddess of love and beauty), with veil; Ares (god
  of war), with helmet and spear; Demeter (goddess of agriculture), with scepter and wheat sheaf; Hephaestus (god
  of fire and metal-working), with staff; Hera (queen of the gods), with scepter; Poseidon (god of the sea), with
  trident; Athena (goddess of wisdom and the arts), with owl and helmet; Zeus (king of the gods), with thunderbolt
  and staff; Artemis (goddess of the hunt and moon), with bow and quiver; and Apollo (god of the sun), with
  "kithara."»
- Procedencia (cita literal): «Jakob Hirsch, Paris [date and mode of acquisition unknown]; Henry Walters,
  Baltimore, 1913, by purchase; Walters Art Museum, 1931, by bequest.»
- Doce figuras **con Hestia y sin Dioniso**: evidencia de la selección alternativa en `src/config/chapters.ts`.
  Las equivalencias «moon»/«sun» de la ficha no se adoptan (docs/content_model.md §1).
