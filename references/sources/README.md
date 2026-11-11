# Fuentes literarias — notas de investigación

Consulta: **2026-11-08**. Estos archivos documentan **cómo** se verificaron los registros de
`src/content/sources/`; no contienen copias del corpus. Los pasajes, localizadores y síntesis viven en los
JSON de cada obra.

| Archivo | Contenido |
| --- | --- |
| [perseus-license.md](perseus-license.md) | Declaración de licencia del repositorio Perseus, commit fijado y decisión `unverified` |
| [tei-sha256.txt](tei-sha256.txt) | Hash SHA-256 de los 18 TEI (griego + traducción) consultados |

## Las cuatro familias literarias y sus ediciones

| Registro | Obra (URN CTS) | Edición griega (numeración de los localizadores) | Traducción consultada |
| --- | --- | --- | --- |
| `hesiod-theogony` | `tlg0020.tlg001` | `perseus-grc2`, H. G. Evelyn-White (Loeb, 1914) | `perseus-eng2`, Evelyn-White (1914) |
| `homer-iliad` | `tlg0012.tlg001` | `perseus-grc2`, D. B. Monro y T. W. Allen, OCT 3.ª ed. (1908–1920) | `perseus-eng3`, A. T. Murray (1924–1925) |
| `homer-odyssey` | `tlg0012.tlg002` | `perseus-grc2`, A. T. Murray (Loeb, 1919) | `perseus-eng3`, Murray (1919) |
| `hymn-demeter`, `hymn-apollo`, `hymn-hermes`, `hymn-aphrodite`, `hymn-dionysus`, `hymn-hestia` | `tlg0013.tlg002/003/004/005/007/029` | `perseus-grc2`, Evelyn-White (1914) | `perseus-eng2`, Evelyn-White (1914) |

**Discrepancia con la planificación:** docs/content_model.md §6 asociaba la Ilíada a Murray. En el TEI,
Murray es la **traducción** (`perseus-eng3`); la edición griega `perseus-grc2` es la de **Monro y Allen**.
Los localizadores siguen la numeración griega.

## Método de cotejo

1. Descarga de cada TEI desde la URL fijada al commit (no `master`).
2. Extracción de los versos `<l n="…">` del rango citado en la edición griega y lectura de la traducción
   para la síntesis. La traducción agrupa versos en bloques: su numeración no se usa como localizador.
3. `verifiedAt` de cada pasaje = fecha de ese cotejo. **No es una revisión humana**; ningún registro tiene
   `reviewer`.
4. `canonicalUrl` apunta al lector Scaife (`https://scaife.perseus.org/reader/urn:cts:…:rango/`); una muestra
   respondió HTTP 200 el 2026-11-08, pero el contenido renderizado con JavaScript no se verificó. `backupUrl`
   apunta al TEI fijado.

## Advertencias

- Teogonía 929a–929t: la edición imprime una versión alternativa del nacimiento de Hefesto y de Atenea. No se
  usa como texto principal; queda señalada en el pasaje `hephaestus-without-union`.
- La datación de todas las obras es `unknown` hasta disponer de referencias académicas (Phase 5).
- El Himno 24 a Hestia no se consultó; el registro `hymn-hestia` corresponde al Himno 29.
