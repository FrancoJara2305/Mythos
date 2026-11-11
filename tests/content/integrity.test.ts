import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ACTIVE_CHAPTER, CHAPTER_SELECTIONS, CHAPTERS, DODEKATHEON, profileIds } from '../../src/config/chapters.ts';
import {
  ArchiveIntegrityError,
  assertArchiveIntegrity,
  checkArchive,
  resolveRoster,
  visibleArchive,
} from '../../src/lib/content/integrity.ts';
import { evidence, options, parseArchive, publishAll, rawArchive, ROSTER, selection, type RawArchive } from './fixtures.ts';

type Mutation = (raw: RawArchive) => void;

function issuesAfter(mutate: Mutation, opts = options()): string[] {
  const raw = rawArchive();
  mutate(raw);
  return checkArchive(parseArchive(raw), opts);
}

function expectIssue(mutate: Mutation, pattern: RegExp, opts = options()) {
  const issues = issuesAfter(mutate, opts);
  assert.ok(issues.some((issue) => pattern.test(issue)), `se esperaba ${pattern}; se obtuvo:\n${issues.join('\n') || '(ninguno)'}`);
}

const rel = (raw: RawArchive, id: string) => raw.relationships[id] as Record<string, unknown>;

describe('integridad: archivo de prueba', () => {
  test('el archivo válido no produce problemas', () => {
    assert.deepEqual(checkArchive(parseArchive(rawArchive()), options()), []);
  });

  test('assertArchiveIntegrity agrupa todos los problemas en un error', () => {
    const raw = rawArchive();
    rel(raw, 'cronus-parent-of-zeus').object = 'nobody';
    rel(raw, 'rhea-parent-of-zeus').subject = 'nobody-else';
    assert.throws(
      () => assertArchiveIntegrity(parseArchive(raw), options()),
      (error: unknown) => error instanceof ArchiveIntegrityError && error.issues.length >= 2,
    );
  });
});

describe('integridad: referencias inexistentes', () => {
  test('deidad inexistente', () => {
    expectIssue((raw) => { rel(raw, 'cronus-parent-of-zeus').object = 'kronos'; }, /referencia inexistente a deities\/kronos/);
  });

  test('obra inexistente', () => {
    expectIssue((raw) => { rel(raw, 'cronus-parent-of-zeus').evidence = [evidence('p-genealogy', 'works-and-days')]; }, /referencia inexistente a sources\/works-and-days/);
  });

  test('pasaje inexistente dentro de una obra existente', () => {
    expectIssue((raw) => { rel(raw, 'cronus-parent-of-zeus').evidence = [evidence('p-missing')]; }, /el pasaje "p-missing" no existe/);
  });

  test('edición inexistente de un pasaje', () => {
    expectIssue((raw) => {
      (raw.sources.theogony!.passages as Record<string, unknown>[])[0]!.editionId = 'eng';
    }, /la edición "eng" no existe/);
  });

  test('artefacto inexistente en evidencia visual', () => {
    expectIssue((raw) => {
      raw.deities.zeus!.symbols = [{ label: 'S', context: 'C', evidence: [{ kind: 'artifact', artifactId: 'ghost', catalogueUrl: 'https://example.org/ghost', claim: 'x' }] }];
    }, /referencia inexistente a artifacts\/ghost/);
  });

  test('la URL de catálogo citada debe coincidir con la ficha', () => {
    expectIssue((raw) => {
      raw.deities.zeus!.symbols = [{ label: 'S', context: 'C', evidence: [{ kind: 'artifact', artifactId: 'relief', catalogueUrl: 'https://example.org/other', claim: 'x' }] }];
    }, /catalogueUrl no coincide/);
  });

  test('mito, evento y capítulo inexistentes', () => {
    expectIssue((raw) => { raw['timeline-events'].first!.myth = 'unknown-myth'; }, /referencia inexistente a myths\/unknown-myth/);
    expectIssue((raw) => { raw['timeline-events'].second!.after = [{ eventId: 'zeroth', evidence: [evidence()] }]; }, /referencia inexistente a timeline-events\/zeroth/);
    expectIssue((raw) => { raw.myths['assembly-of-gods']!.chapterIds = ['titanomachy']; }, /capítulo "titanomachy" inexistente/);
  });

  test('archivo de evidencia de derechos inexistente', () => {
    expectIssue(
      (raw) => {
        (raw.sources.theogony!.editions as Record<string, Record<string, unknown>>[])[0]!.rights!.evidencePath = 'references/sources/missing.md';
      },
      /el archivo "references\/sources\/missing.md" no existe/,
      options({ fileExists: () => false }),
    );
  });
});

describe('integridad: duplicados', () => {
  test('ID de registro duplicado', () => {
    const archive = parseArchive(rawArchive());
    const duplicated = { ...archive, deities: [...archive.deities, archive.deities[0]!] };
    assert.ok(checkArchive(duplicated, options()).some((issue) => /ID duplicado/.test(issue)));
  });

  test('ID de registro que no es kebab-case', () => {
    const archive = parseArchive(rawArchive());
    const renamed = { ...archive, myths: archive.myths.map((myth) => ({ ...myth, id: 'Mito_1' })) };
    assert.ok(checkArchive(renamed, options()).some((issue) => /ID inválido/.test(issue)));
  });

  test('pasajes y ediciones duplicados en una obra', () => {
    expectIssue((raw) => {
      const passages = raw.sources.theogony!.passages as unknown[];
      passages.push(structuredClone(passages[0]));
    }, /pasaje "p-genealogy" duplicado/);
    expectIssue((raw) => {
      const editions = raw.sources.theogony!.editions as unknown[];
      editions.push(structuredClone(editions[0]));
    }, /edición "grc" duplicada/);
  });

  test('arista parent-of duplicada', () => {
    expectIssue((raw) => { raw.relationships['cronus-parent-of-zeus-again'] = structuredClone(rel(raw, 'cronus-parent-of-zeus')); }, /arista duplicada parent-of cronus → zeus/);
  });

  test('consort-of se guarda una sola vez y con clave ordenada', () => {
    expectIssue((raw) => {
      raw.relationships['zeus-consort-of-hera'] = { ...structuredClone(rel(raw, 'hera-consort-of-zeus')), subject: 'zeus', object: 'hera' };
    }, /arista duplicada consort-of hera → zeus/);
    expectIssue((raw) => { Object.assign(rel(raw, 'hera-consort-of-zeus'), { subject: 'zeus', object: 'hera' }); }, /subject < object/);
  });

  test('roster con perfil u orden repetido', () => {
    const roster = selection().roster.map((item, index) => (index === 1 ? { ...item, id: 'zeus' } : item));
    expectIssue(() => {}, /"zeus" repetido en el roster/, options({ selections: [selection({ roster })] }));
    const orders = selection().roster.map((item, index) => (index === 1 ? { ...item, order: 1 } : item));
    expectIssue(() => {}, /orden 1 repetido/, options({ selections: [selection({ roster: orders })] }));
  });

  test('identificación repetida en un artefacto', () => {
    expectIssue((raw) => {
      const identifications = raw.artifacts.relief!.identifications as unknown[];
      identifications.push(structuredClone(identifications[0]));
    }, /identificada dos veces/);
  });
});

describe('integridad: genealogía', () => {
  test('relación reflexiva', () => {
    expectIssue((raw) => { rel(raw, 'cronus-parent-of-zeus').subject = 'zeus'; }, /relación reflexiva/);
  });

  test('filiación cíclica', () => {
    expectIssue((raw) => { raw.relationships['zeus-parent-of-cronus'] = { ...structuredClone(rel(raw, 'cronus-parent-of-zeus')), subject: 'zeus', object: 'cronus' }; }, /filiación cíclica/);
  });

  test('parentescos múltiples documentados no se rechazan', () => {
    const issues = issuesAfter((raw) => {
      raw.relationships['hera-parent-of-ares'] = { ...structuredClone(rel(raw, 'cronus-parent-of-zeus')), subject: 'hera', object: 'ares' };
      raw.relationships['zeus-parent-of-ares'] = { ...structuredClone(rel(raw, 'cronus-parent-of-zeus')), subject: 'zeus', object: 'ares' };
    });
    assert.deepEqual(issues, []);
  });
});

describe('integridad: variantes incompatibles', () => {
  test('una filiación fuera del grupo mezclaría tradiciones (madres de Afrodita)', () => {
    expectIssue((raw) => {
      const edge = structuredClone(rel(raw, 'dione-parent-of-aphrodite-iliadic'));
      delete edge.variantGroup;
      delete edge.variantOption;
      raw.relationships['dione-parent-of-aphrodite'] = edge;
    }, /fuera del grupo de variantes "aphrodite-origin"; mezclaría tradiciones/);
  });

  test('cada opción cubre los mismos descendientes', () => {
    expectIssue((raw) => {
      raw.relationships['zeus-parent-of-ares-iliadic'] = { ...structuredClone(rel(raw, 'zeus-parent-of-aphrodite-iliadic')), object: 'ares' };
    }, /no cubre los mismos descendientes/);
  });

  test('un grupo necesita al menos dos opciones', () => {
    expectIssue((raw) => {
      delete raw.relationships['zeus-parent-of-aphrodite-iliadic'];
      delete raw.relationships['dione-parent-of-aphrodite-iliadic'];
    }, /necesita al menos dos opciones/);
  });

  test('progenitor único sin nota afirmativa', () => {
    expectIssue((raw) => { delete rel(raw, 'uranus-parent-of-aphrodite-hesiodic').note; }, /única filiación de aphrodite .* sin nota/);
  });

  test('opción por defecto inexistente o ausente', () => {
    expectIssue(() => {}, /variante por defecto "aphrodite-origin\/homeric" inexistente/, options({ selections: [selection({ defaultVariants: { 'aphrodite-origin': 'homeric' } })] }));
    expectIssue(() => {}, /no tiene opción por defecto/, options({ selections: [selection({ defaultVariants: {} })] }));
  });

  test('cada grupo y cada opción tienen rótulo visible', () => {
    expectIssue(() => {}, /"aphrodite-origin" no tiene rótulo/, options({ selections: [selection({ variantLabels: {} })] }));
    const partial = { 'aphrodite-origin': { label: 'Origen', options: { hesiodic: 'Teogonía' } } };
    expectIssue(() => {}, /"aphrodite-origin\/iliadic" no tiene rótulo/, options({ selections: [selection({ variantLabels: partial })] }));
  });
});

describe('integridad: línea temporal mítica', () => {
  test('"after" con ciclo', () => {
    expectIssue((raw) => { raw['timeline-events'].first!.after = [{ eventId: 'second', evidence: [evidence()] }]; }, /ciclo en "after"/);
  });

  test('"after" solo dentro de una tradición', () => {
    expectIssue((raw) => { raw['timeline-events'].first!.traditionLabel = 'Homero'; }, /misma tradición/);
  });

  test('displayOrder coherente y sin repetir', () => {
    expectIssue((raw) => { raw['timeline-events'].second!.displayOrder = 1; }, /displayOrder 1 repetido/);
    expectIssue((raw) => { raw['timeline-events'].second!.displayOrder = 0; }, /displayOrder contradice el orden/);
  });

  test('evento histórico con sujeto inexistente', () => {
    expectIssue((raw) => { raw['timeline-events']['relief-production']!.subject = { collection: 'artifacts', id: 'vase' }; }, /referencia inexistente a artifacts\/vase/);
  });
});

describe('integridad: roster y selecciones', () => {
  test('exactamente doce perfiles', () => {
    expectIssue(() => {}, /exactamente 12 perfiles \(tiene 11\)/, options({ selections: [selection({ roster: selection().roster.slice(0, 11) })] }));
  });

  test('un perfil del roster debe ser full y existir', () => {
    expectIssue((raw) => { raw.deities.zeus!.profile = 'context'; }, /"zeus" del roster debe ser una deidad con perfil full/);
    expectIssue((raw) => { delete raw.deities.hermes; }, /"hermes" del roster no existe/);
  });

  test('la divinidad de la otra tradición no puede estar a la vez en el roster', () => {
    const roster = selection().roster.map((item) => (item.id === 'dionysus' ? { ...item, id: 'hestia' } : item));
    expectIssue(() => {}, /"hestia" ya está en el roster principal/, options({ selections: [selection({ roster })] }));
  });

  test('la divinidad de la otra tradición tiene ficha completa, emblema documentado y relato', () => {
    expectIssue((raw) => { raw.deities.hestia = { name: 'Hestia', entityKind: 'deity', profile: 'context', review: { status: 'draft' } }; }, /"hestia" de la otra tradición debe ser una deidad con perfil full/);
    expectIssue((raw) => { raw.myths['assembly-of-gods']!.participants = ROSTER; }, /"hestia" no participa en ningún mito/);
    const alternatives = selection().alternatives.map((item) => ({ ...item, emblem: { symbol: 'Trono', depicts: 'trono' } }));
    expectIssue(() => {}, /emblema de "hestia" \(«Trono»\) no corresponde/, options({ selections: [selection({ alternatives })] }));
  });

  test('una entidad contextual declarada no puede ser un perfil del roster', () => {
    expectIssue(() => {}, /"zeus" no puede ser a la vez roster y contextual/, options({ selections: [selection({ contextual: ['zeus'] })] }));
  });

  test('roster y otras tradiciones exigen la capa narrativa completa', () => {
    expectIssue((raw) => { delete raw.deities.apollo!.constellationConfig; }, /a "apollo" le falta la capa narrativa \(constellationConfig\)/);
    expectIssue((raw) => { delete raw.deities.hestia!.tagline; raw.deities.hestia!.storySections = []; }, /a "hestia" le falta la capa narrativa \(tagline, storySections\)/);
  });

  test('cada perfil participa en algún mito', () => {
    expectIssue((raw) => { raw.myths['assembly-of-gods']!.participants = ['zeus']; }, /"hera" no participa en ningún mito/);
  });

  test('perfil full fuera de todo roster', () => {
    expectIssue((raw) => { raw.deities.hebe = { ...structuredClone(raw.deities.zeus), name: 'Hebe' }; }, /deities\/hebe: perfil full fuera de todo roster/);
  });

  test('la selección alternativa debe estar respaldada por la ficha', () => {
    expectIssue((raw) => {
      (raw.artifacts.relief!.identifications as Record<string, unknown>[]).push({ entity: 'dionysus', certainty: 'explicit', attributionLabel: 'D', basisUrl: 'https://example.org/test/relief', note: 'N' });
    }, /no respalda «con hestia, sin dionysus»/);
  });

  test('el emblema editorial dibuja un símbolo documentado de la ficha', () => {
    const roster = selection().roster.map((item) => (item.id === 'athena' ? { ...item, emblem: { symbol: 'Olivo', depicts: 'olivo' } } : item));
    expectIssue(() => {}, /emblema de "athena" \(«Olivo»\) no corresponde/, options({ selections: [selection({ roster })] }));
  });
});

describe('borradores y producción', () => {
  test('en producción solo son visibles los registros published', () => {
    const raw = rawArchive();
    raw.deities.zeus!.review = { status: 'published', reviewer: 'Revisora', reviewedAt: '2026-11-08' };
    raw.deities.hera!.review = { status: 'reviewed', reviewer: 'Revisora', reviewedAt: '2026-11-08' };
    const archive = parseArchive(raw);
    assert.deepEqual(visibleArchive(archive, 'production').deities.map((entry) => entry.id), ['zeus']);
    assert.equal(visibleArchive(archive, 'production').myths.length, 0);
    assert.equal(visibleArchive(archive, 'staging').deities.length, archive.deities.length);
    assert.equal(visibleArchive(archive, 'development').deities.length, archive.deities.length);
  });

  test('un registro published no puede depender de un draft', () => {
    expectIssue((raw) => {
      rel(raw, 'cronus-parent-of-zeus').review = { status: 'published', reviewer: 'Revisora', reviewedAt: '2026-11-08' };
    }, /un registro published depende de deities\/cronus, que está en "draft"/);
  });

  test('un registro published no puede citar un pasaje sin cotejar', () => {
    expectIssue((raw) => {
      publishAll(raw);
      delete (raw.sources.theogony!.passages as Record<string, unknown>[])[1]!.verifiedAt;
    }, /cita el pasaje "p-epithets" sin verifiedAt/);
  });

  test('un medio de un registro published necesita derechos verified', () => {
    expectIssue((raw) => {
      publishAll(raw);
      raw.artifacts.relief!.media = [{
        type: 'image', assetId: 'relief-front', localPath: 'src/assets/relief.webp', width: 1200, height: 800, alt: 'Relieve.',
        rights: { status: 'unverified', licenseName: 'CC0', creator: 'Museo', sourceUrl: 'https://example.org/img', creditLine: 'C', modifications: [] },
      }];
    }, /necesita derechos "verified"/);
  });

  test('un archivo íntegramente published es válido', () => {
    assert.deepEqual(checkArchive(parseArchive(publishAll(rawArchive())), options()), []);
  });

  test('el roster de producción falla si falta algún perfil published', () => {
    const archive = parseArchive(rawArchive());
    assert.throws(() => resolveRoster(visibleArchive(archive, 'production'), selection()), /perfiles no disponibles en este ambiente: zeus, hera/);
    const roster = resolveRoster(visibleArchive(archive, 'development'), selection());
    assert.equal(roster.length, 12);
    assert.deepEqual(roster.map((item) => item.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

describe('configuración editorial real', () => {
  test('Dodekatheon: doce perfiles únicos y la tradición de Hestia como selección alternativa', () => {
    assert.equal(DODEKATHEON.roster.length, 12);
    assert.equal(new Set(DODEKATHEON.roster.map((item) => item.id)).size, 12);
    assert.ok(DODEKATHEON.roster.some((item) => item.id === 'dionysus'));
    assert.ok(!DODEKATHEON.roster.some((item) => item.id === 'hestia'));
    assert.deepEqual(DODEKATHEON.contextual, []);
    assert.deepEqual(profileIds(DODEKATHEON).slice(-2), ['dionysus', 'hestia']);
    assert.deepEqual(
      DODEKATHEON.alternatives.map((alternative) => [alternative.without, alternative.with, alternative.evidenceArtifactId]),
      [['dionysus', 'hestia', 'walters-23-40']],
    );
  });

  test('seis capítulos GR-01…GR-06; solo The Dodekatheon tiene selección', () => {
    assert.deepEqual(CHAPTERS.map((chapter) => chapter.number), ['GR-01', 'GR-02', 'GR-03', 'GR-04', 'GR-05', 'GR-06']);
    assert.equal(ACTIVE_CHAPTER.id, 'dodekatheon');
    assert.deepEqual(CHAPTER_SELECTIONS.map((item) => item.chapterId), ['dodekatheon']);
  });
});
