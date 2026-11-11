# Modelos 3D — estado de adquisición y viabilidad

Consulta: **2026-11-08**, con la API pública de metadatos de Sketchfab (`GET https://api.sketchfab.com/v3/models/{uid}`),
sin cuenta, sin descargar archivos y sin endpoints internos del visor. Cada instantánea `sketchfab-*.json`
guarda los campos relevantes y el SHA-256 de la respuesta completa. **Ningún modelo se ha descargado**:
formato, texturas y bytes reales siguen siendo desconocidos.

## M01 — Busto de Atenea

| | Reedición indicada en el manifiesto | Original enlazado en su crédito |
| --- | --- | --- |
| Modelo | «Bust of Athena (c. 100–200 CE)», `b4a20645ac364c988b6dc4bce3367cd0` | «Bust of Athena, British Museum», `946eef1fbff748939f6b328649356d80` |
| Publicador | The Virtual Museum (`TheViMu`) | **Thomas Flynn** (`nebulousflynn`) |
| Publicado | 2026-04-26 | 2014-09-17 |
| `isDownloadable` | **false** | **true** |
| Licencia en la API | **ninguna** (objeto vacío) | **CC Attribution** → <https://creativecommons.org/licenses/by/4.0/> |
| Caras / vértices declarados | 31.032 / 16.102 | 31.376 / 16.201 |
| Evidencia | [sketchfab-athena-thevimu.json](sketchfab-athena-thevimu.json) | [sketchfab-athena-flynn-original.json](sketchfab-athena-flynn-original.json) |

- El enlace corto del crédito, `https://skfb.ly/Br8x`, redirige (301) a `https://sketchfab.com/s/Br8x` y de ahí
  (301) a `https://sketchfab.com/3d-models/bust-of-athena-british-museum-946eef1fbff748939f6b328649356d80`.
  **Riesgo R1 resuelto en cuanto a fuente:** el original de Thomas Flynn es descargable y declara CC BY 4.0.
- La reedición de The Virtual Museum **no es utilizable**: no permite descarga ni declara licencia propia.
- El original lleva la etiqueta `noai` puesta por su autor. MYTHOS usaría el modelo para visualización, no para
  entrenar modelos; aun así, registrar la etiqueta y revisarla con el responsable curatorial antes de adquirir.
- Pendiente: descargar con cuenta autorizada, registrar formato y texturas, confirmar la licencia en la página
  de descarga y cotejar el objeto con la ficha del British Museum (identificación, fecha, restauraciones; la
  reedición menciona mármol y bronce y ojos originalmente incrustados, sin verificar).
- **Viabilidad para Phase 6: favorable** (≈31 k triángulos, por debajo de presupuestos móviles razonables), a
  condición de las comprobaciones anteriores.

## M02 — Torso de Dioniso de Salamina

| Campo | Valor observado |
| --- | --- |
| Modelo | «Torso of Dionysus from Salamis», `c503d9dcde8e465fbb234c9dab461b90` |
| Publicador | Fitzwilliam Museum (`fitzwilliammuseum`), 2019-08-13 |
| Autor del escaneo (descripción) | Daniel Pett, 112 fotografías Sony A6000, procesado en Metashape |
| Objeto (descripción) | GR.2.1891; mármol, siglo II d. C., gimnasio de Salamina (Chipre); donado en 1891 |
| `isDownloadable` | **true** |
| Licencia en la API | **CC Attribution** → <https://creativecommons.org/licenses/by/4.0/> |
| Caras / vértices declarados | 499.592 / 254.198 |
| Evidencia | [sketchfab-dionysus-fitzwilliam.json](sketchfab-dionysus-fitzwilliam.json) |

- **Riesgo R2 avanzado:** la versión de licencia (4.0) queda confirmada por la API; descarga, formatos, texturas
  y peso siguen sin ensayar.
- El catálogo `https://data.fitzmuseum.cam.ac.uk/id/object/66629` falló el 2026-11-08 por un certificado TLS
  que no corresponde al host (`SEC_E_WRONG_PRINCIPAL`). No se forzó la conexión; los datos del objeto proceden
  solo de la descripción del propio museo en Sketchfab y deben cotejarse con el catálogo.
- **Viabilidad para Phase 6: favorable con trabajo de optimización**: ~500 k triángulos exigen decimación
  preservando detalle y texturas hasta 2K antes de cumplir el presupuesto.

## Qué queda fuera de este registro

- Ningún registro de `src/content/artifacts/` describe todavía estos dos objetos: sus fichas institucionales
  (British Museum, Fitzwilliam) no se pudieron cotejar en esta fase. Se crearán al adquirir los modelos.
- No hay `media[]` de tipo `model` en el contenido: un medio solo se registra con archivo real, hash y derechos.
