/**
 * Modelos 3D en el contenido (Phase 6): integridad de `media[]` de tipo `model` y adaptador al
 * inspector. Hoy ningún objeto real tiene modelo; estos fixtures fijan el contrato para cuando llegue.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { checkArchive } from '../../src/lib/content/integrity.ts';
import { PassageIndex } from '../../src/lib/content/citations.ts';
import { artifactModels } from '../../src/lib/content/models.ts';
import { evidence, options, parseArchive, rawArchive, type RawArchive } from './fixtures.ts';

const RIGHTS = {
  status: 'unverified',
  licenseName: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  creator: 'Autor del escaneo',
  sourceUrl: 'https://example.org/model',
  creditLine: 'Crédito.',
  modifications: ['Convertido a GLB y comprimido.'],
};

function withModel(raw: RawArchive, overrides: Record<string, unknown> = {}): RawArchive {
  raw.artifacts.relief!.media = [
    {
      type: 'image', assetId: 'relief-front', localPath: 'src/assets/relief.webp', width: 1200, height: 800, alt: 'Relieve, vista frontal.',
      rights: { ...RIGHTS, licenseName: 'CC0' },
    },
    {
      type: 'model',
      assetId: 'relief-model',
      glbPath: 'public/assets/models/relief-1a2b.glb',
      posterAssetId: 'relief-front',
      rights: RIGHTS,
      sourceFormat: 'OBJ + texturas JPG',
      originalBytes: 52_000_000,
      optimizedBytes: 3_400_000,
      triangles: 48_000,
      textureSummary: 'Una textura de color de 2048 × 2048.',
      sha256: 'a'.repeat(64),
      optimizationLog: 'Decimación al 10 %, Meshopt.',
      coordinateVersion: 1,
      camera: { position: [0, 0.2, 2], target: [0, 0, 0], fov: 35 },
      hotspots: [
        { id: 'inscription', position: [0, 0.1, 0.05], label: 'Inscripción', description: 'Texto.', kind: 'observed-feature', evidence: { kind: 'passage', evidence: evidence() } },
        {
          id: 'repair', position: [0.1, 0, 0.05], label: 'Reparación', description: 'Texto.', kind: 'restoration',
          evidence: { kind: 'artifact', artifactId: 'relief', catalogueUrl: 'https://example.org/test/relief', claim: 'La ficha describe la reparación.' },
        },
      ],
      ...overrides,
    },
  ];
  return raw;
}

describe('modelos 3D', () => {
  test('un modelo bien formado es válido y llega al inspector con URL pública y evidencia', () => {
    const archive = parseArchive(withModel(rawArchive()));
    assert.deepEqual(checkArchive(archive, options()), []);
    const relief = archive.artifacts.find((entry) => entry.id === 'relief');
    assert.ok(relief !== undefined);
    const [model, ...rest] = artifactModels(relief.data, new PassageIndex(archive));
    assert.equal(rest.length, 0);
    assert.equal(model?.config.src, '/assets/models/relief-1a2b.glb');
    assert.equal(model?.config.bytes, 3_400_000);
    assert.deepEqual(model?.config.camera, { position: [0, 0.2, 2], target: [0, 0, 0], fov: 35 });
    assert.equal(model?.poster.assetId, 'relief-front');
    assert.deepEqual(model?.hotspots, [
      { id: 'inscription', label: 'Inscripción', description: 'Texto.', kindLabel: 'Rasgo observado', evidence: { label: 'Teog. 453–458', href: '/sources/theogony/#p-genealogy' } },
      { id: 'repair', label: 'Reparación', description: 'Texto.', kindLabel: 'Restauración', evidence: { label: 'Relieve', href: '/artifacts/relief/' } },
    ]);
  });

  test('un objeto sin modelo no produce visor', () => {
    const archive = parseArchive(rawArchive());
    assert.deepEqual(artifactModels(archive.artifacts[0]!.data, new PassageIndex(archive)), []);
  });

  test('glbPath fuera de public/assets/models/ es un error de integridad', () => {
    const archive = parseArchive(withModel(rawArchive(), { glbPath: 'references/models/relief.glb' }));
    assert.ok(checkArchive(archive, options()).some((issue) => /glbPath "references\/models\/relief.glb" debe ser public\/assets\/models/.test(issue)));
  });

  test('el póster debe ser una imagen del mismo objeto', () => {
    const archive = parseArchive(withModel(rawArchive(), { posterAssetId: 'otra-imagen' }));
    assert.ok(checkArchive(archive, options()).some((issue) => /posterAssetId "otra-imagen" no es una imagen de este objeto/.test(issue)));
  });

  test('el archivo GLB debe existir', () => {
    const archive = parseArchive(withModel(rawArchive()));
    const issues = checkArchive(archive, options({ fileExists: (file) => !file.endsWith('.glb') }));
    assert.ok(issues.some((issue) => /relief-1a2b\.glb" no existe/.test(issue)));
  });
});
