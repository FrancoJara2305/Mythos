/**
 * Inspector 3D (Phase 6): ciclo de vida con tokens, lectura de GLB y plan de descodificadores,
 * encuadre y límites de cámara, fixture técnico determinista, configuración y liberación de recursos.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';
import { dolly, faceTowards, fitDistance, frame, rotate, toOrbit, ZOOM_RANGE, type Vec3 } from '../../src/lib/three/camera.ts';
import { formatBytes, modelUrl, parseInspectorConfig } from '../../src/lib/three/config.ts';
import { disposeObject } from '../../src/lib/three/dispose.ts';
import { buildFixtureGlb, checkerPng, FIXTURE_GENERATOR, FIXTURE_HOTSPOTS, fixtureTriangles } from '../../src/lib/three/fixture-model.ts';
import { decoderPlan, GlbError, inspectGlb, readGlb } from '../../src/lib/three/glb.ts';
import { canTransition, FAILURE_MESSAGES, INSPECTOR_FAILURES, InspectorLifecycle, isRetryable } from '../../src/lib/three/lifecycle.ts';

const close = (a: number, b: number, tolerance = 1e-6) => Math.abs(a - b) <= tolerance;
const toBuffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

describe('ciclo de vida', () => {
  test('póster → carga → listo ↔ suspendido; desmontar es terminal', () => {
    const lifecycle = new InspectorLifecycle();
    assert.equal(lifecycle.state, 'poster');
    const token = lifecycle.begin();
    assert.equal(lifecycle.state, 'loading');
    assert.ok(token !== undefined && lifecycle.isCurrent(token));
    assert.ok(lifecycle.transition('ready'));
    assert.ok(lifecycle.transition('suspended'));
    assert.ok(lifecycle.isCurrent(token), 'suspender no invalida la sesión');
    assert.ok(lifecycle.transition('ready'));
    assert.ok(lifecycle.transition('disposed'));
    assert.equal(lifecycle.transition('poster'), false);
    assert.equal(lifecycle.begin(), undefined);
    assert.equal(lifecycle.isCurrent(token), false);
  });

  test('transiciones no permitidas no cambian el estado', () => {
    const lifecycle = new InspectorLifecycle();
    assert.equal(lifecycle.transition('ready'), false);
    assert.equal(lifecycle.transition('suspended'), false);
    assert.equal(lifecycle.state, 'poster');
    assert.equal(canTransition('poster', 'ready'), false);
    assert.equal(canTransition('error', 'ready'), false, 'reintentar pasa por una carga nueva');
  });

  test('cancelar o fallar invalida la carga en curso; reintentar abre una sesión nueva', () => {
    const lifecycle = new InspectorLifecycle();
    const first = lifecycle.begin() ?? -1;
    assert.ok(lifecycle.transition('poster'));
    assert.equal(lifecycle.isCurrent(first), false, 'una descarga tardía de la sesión cancelada se descarta');
    const second = lifecycle.begin() ?? -1;
    assert.ok(lifecycle.fail('not-found'));
    assert.equal(lifecycle.failure, 'not-found');
    assert.equal(lifecycle.isCurrent(second), false);
    const third = lifecycle.begin() ?? -1;
    assert.ok(third > second && lifecycle.isCurrent(third));
    assert.equal(lifecycle.failure, undefined);
  });

  test('cada fallo tiene mensaje; sin WebGL2 no se ofrece reintento', () => {
    for (const failure of INSPECTOR_FAILURES) assert.ok(FAILURE_MESSAGES[failure].length > 20, failure);
    assert.equal(isRetryable('no-webgl2'), false);
    assert.equal(isRetryable('not-found'), true);
    assert.equal(isRetryable('context-lost'), true);
  });
});

describe('fixture técnico y lectura de GLB', () => {
  const bytes = buildFixtureGlb();

  test('determinista y marcado como fixture', () => {
    assert.deepEqual(buildFixtureGlb(), bytes);
    const info = readGlb(toBuffer(bytes));
    assert.equal(info.version, 2);
    assert.equal(info.byteLength, bytes.byteLength);
    assert.equal(info.generator, FIXTURE_GENERATOR);
    assert.equal(info.fixture, true);
    assert.deepEqual(info.extensionsRequired, []);
    assert.equal(fixtureTriangles(), 1356);
  });

  test('estructura glTF: tres mallas, material compartido, textura PNG incrustada', () => {
    const view = new DataView(toBuffer(bytes));
    const jsonLength = view.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength))) as {
      meshes: Array<{ primitives: Array<{ material: number }> }>;
      images: Array<{ mimeType: string }>;
      accessors: Array<{ min?: number[]; max?: number[] }>;
      buffers: Array<{ byteLength: number }>;
    };
    assert.deepEqual(
      json.meshes.map((mesh) => mesh.primitives[0]?.material),
      [0, 0, 1],
    );
    assert.equal(json.images[0]?.mimeType, 'image/png');
    const binLength = view.getUint32(20 + jsonLength, true);
    assert.equal(json.buffers[0]?.byteLength, binLength);
    assert.ok(json.accessors.some((accessor) => accessor.max?.[1] !== undefined && close(accessor.max[1], 1.62, 1e-6)));
  });

  test('PNG válido: firma, IHDR de 16×16 y CRC correcto', () => {
    const png = checkerPng();
    assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    assert.equal(new TextDecoder().decode(png.subarray(12, 16)), 'IHDR');
    assert.equal(view.getUint32(16), 16);
    assert.equal(view.getUint32(20), 16);
  });

  test('archivos inválidos: firma, versión, truncado', () => {
    const wrongMagic = new Uint8Array(bytes);
    wrongMagic[0] = 0;
    assert.throws(() => readGlb(toBuffer(wrongMagic)), (error: unknown) => error instanceof GlbError && error.problem === 'invalid-file');
    const wrongVersion = new Uint8Array(bytes);
    wrongVersion[4] = 1;
    assert.throws(() => readGlb(toBuffer(wrongVersion)), /Versión/);
    assert.throws(() => readGlb(toBuffer(bytes.subarray(0, bytes.byteLength - 4))), /truncado/);
    assert.throws(() => readGlb(new ArrayBuffer(8)), /corto/);
    const html = new TextEncoder().encode('<!doctype html><title>404</title>');
    assert.throws(() => readGlb(toBuffer(html)), GlbError);
  });

  test('descodificadores: Draco obligatorio sin descodificador → fallo «decoder»; Meshopt se carga', () => {
    assert.throws(
      () => inspectGlb(toBuffer(buildFixtureGlb({ requireDraco: true }))),
      (error: unknown) => error instanceof GlbError && error.problem === 'decoder' && /KHR_draco_mesh_compression/.test(error.message),
    );
    assert.deepEqual(inspectGlb(toBuffer(bytes)).decoders, []);
    const base = readGlb(toBuffer(bytes));
    assert.deepEqual(decoderPlan({ ...base, extensionsUsed: ['EXT_meshopt_compression'], extensionsRequired: ['EXT_meshopt_compression'] }), {
      needed: ['meshopt'],
      missing: [],
    });
    // Usada pero opcional: GLTFLoader puede caer en la versión sin comprimir.
    assert.deepEqual(decoderPlan({ ...base, extensionsUsed: ['KHR_texture_basisu'], extensionsRequired: [] }), { needed: [], missing: [] });
  });
});

describe('cámara', () => {
  test('encuadre: la esfera envolvente cabe en el campo de visión', () => {
    const framing = frame(1, 1);
    assert.equal(framing.fov, 35);
    assert.ok(close(framing.distance, fitDistance(1, 35, 1)));
    assert.ok(Math.sin((35 * Math.PI) / 360) * framing.distance >= 1, 'el radio cabe en medio campo vertical');
    assert.ok(framing.near > 0 && framing.near < framing.minDistance - 1, 'el plano cercano no corta el objeto con zoom máximo');
    assert.ok(framing.far > framing.maxDistance + 1);
    assert.ok(close(framing.minDistance, framing.distance * ZOOM_RANGE.min));
    assert.ok(close(framing.maxDistance, framing.distance * ZOOM_RANGE.max));
    // Más estrecho que alto: la distancia crece para que quepa a lo ancho.
    assert.ok(frame(1, 0.6).distance > framing.distance);
  });

  test('una cámara guardada se respeta y fija los límites relativos a ella', () => {
    const stored = { position: [0, 0, 5] as Vec3, target: [0, 0, 0] as Vec3, fov: 30 };
    const framing = frame(1, 1, stored);
    assert.deepEqual(framing.position, stored.position);
    assert.equal(framing.fov, 30);
    assert.ok(close(framing.minDistance, 3.75));
  });

  test('girar respeta los límites polares; acercar respeta el rango', () => {
    const framing = frame(1, 1);
    const start = framing.position;
    const turned = rotate(start, framing.target, 90, 0, framing);
    assert.ok(close(toOrbit(turned, framing.target).azimuth, 90, 1e-6));
    assert.ok(close(toOrbit(turned, framing.target).distance, framing.distance, 1e-9));
    const under = rotate(start, framing.target, 0, 120, framing);
    assert.ok(close(toOrbit(under, framing.target).polar, (framing.maxPolar * 180) / Math.PI, 1e-6), 'no pasa por debajo de la base');
    let position = start;
    for (let step = 0; step < 20; step += 1) position = dolly(position, framing.target, 0.85, framing);
    assert.ok(close(toOrbit(position, framing.target).distance, framing.minDistance, 1e-9));
    for (let step = 0; step < 40; step += 1) position = dolly(position, framing.target, 1 / 0.85, framing);
    assert.ok(close(toOrbit(position, framing.target).distance, framing.maxDistance, 1e-9));
  });

  test('mirar una anotación del dorso: la cámara pasa detrás conservando la distancia', () => {
    const framing = frame(1, 1);
    const position = faceTowards(framing.position, framing.target, [0, 0, -0.5], framing);
    const orbit = toOrbit(position, framing.target);
    assert.ok(close(Math.abs(orbit.azimuth), 180, 1e-6));
    assert.ok(close(orbit.distance, framing.distance, 1e-9));
    assert.deepEqual(faceTowards(framing.position, framing.target, framing.target, framing), framing.position);
  });
});

describe('configuración', () => {
  test('ruta del repositorio → URL pública, con formato estricto', () => {
    assert.equal(modelUrl('public/assets/models/athena-3f2a.glb'), '/assets/models/athena-3f2a.glb');
    assert.throws(() => modelUrl('references/models/athena.glb'), /public\/assets\/models/);
    assert.throws(() => modelUrl('public/assets/models/../secret.glb'));
    assert.throws(() => modelUrl('public/assets/models/Athena.GLB'));
  });

  test('pesos legibles', () => {
    assert.equal(formatBytes(39_360), '39 kB');
    assert.equal(formatBytes(4_200_000), '4,2 MB');
    assert.equal(formatBytes(512), '512 B');
  });

  test('el JSON incrustado se valida antes de usarlo', () => {
    const valid = { src: '/x.glb', bytes: 10, coordinateVersion: 1, hotspots: [{ id: 'a', position: [0, 1, 2] }, { id: 'b', position: [0, 'x', 2] }] };
    assert.deepEqual(parseInspectorConfig(valid)?.hotspots, [{ id: 'a', position: [0, 1, 2] }]);
    assert.equal(parseInspectorConfig({ ...valid, src: 3 }), undefined);
    assert.equal(parseInspectorConfig(null), undefined);
    assert.equal(parseInspectorConfig({ ...valid, camera: { position: [0, 0, 1], target: [0, 0, 0], fov: -1 } })?.camera, undefined);
  });

  test('las anotaciones del fixture tienen ids únicos', () => {
    const ids = FIXTURE_HOTSPOTS.map((hotspot) => hotspot.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe('liberación de recursos', () => {
  test('cada geometría, material y textura se libera una sola vez aunque se compartan', () => {
    const texture = new Texture();
    const shared = new MeshStandardMaterial({ map: texture, roughnessMap: texture });
    const geometry = new BoxGeometry();
    const root = new Group();
    const parent = new Group();
    parent.add(root);
    root.add(new Mesh(geometry, shared), new Mesh(geometry, [shared, new MeshStandardMaterial()]), new Mesh(new BoxGeometry(), shared));
    const disposed: string[] = [];
    texture.addEventListener('dispose', () => disposed.push('texture'));
    shared.addEventListener('dispose', () => disposed.push('material'));
    geometry.addEventListener('dispose', () => disposed.push('geometry'));
    const report = disposeObject(root);
    assert.deepEqual(report, { geometries: 2, materials: 2, textures: 1, bitmaps: 0 });
    assert.deepEqual(disposed.sort(), ['geometry', 'material', 'texture']);
    assert.equal(root.parent, null, 'la escena se retira de su padre');
  });
});
