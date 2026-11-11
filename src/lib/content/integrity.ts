/**
 * Integridad entre colecciones (docs/content_model.md §8).
 *
 * `reference()` solo da forma a una referencia; no comprueba que el destino exista. Este módulo puro
 * revisa todo lo que exige mirar varias colecciones a la vez, más las selecciones de capítulo:
 *
 * - referencias y `passageId`/`editionId` existentes; IDs estables y sin duplicados;
 * - genealogía: aristas reflexivas, duplicadas o cíclicas, `consort-of` deduplicado y variantes
 *   que no mezclan tradiciones;
 * - línea temporal mítica sin ciclos y ordenada dentro de su tradición;
 * - roster de doce perfiles `full`, entidades contextuales y otras tradiciones (perfil `full` fuera del roster);
 * - publicación: un registro `published` solo depende de registros `published`, cita pasajes
 *   cotejados y no usa medios sin derechos verificados.
 *
 * Las comprobaciones automáticas verifican integridad, no verdad histórica.
 */
import { isValidSlug } from '../routes.ts';
import { isModelPath } from '../three/config.ts';
import type { AppEnv } from '../env.ts';
import type { ContentCollection, EntryRef } from './schema.ts';
import { DODEKATHEON_SIZE, type ChapterSelection } from '../../config/chapters.ts';
import type {
  ArchiveData,
  ArchiveEntry,
  ArtifactData,
  DeityData,
  Evidence,
  HistoricalDate,
  RelationshipData,
  Rights,
  Status,
  TimelineEventData,
} from '../../types/content.ts';

export interface IntegrityOptions {
  /** IDs de capítulo válidos (`CHAPTERS`). */
  chapterIds: readonly string[];
  /** Roster y selecciones editoriales por capítulo. */
  selections: readonly ChapterSelection[];
  /** Comprueba que una ruta relativa a la raíz del repositorio exista. Sin ella, no se comprueban archivos. */
  fileExists?: ((repoRelativePath: string) => boolean) | undefined;
}

export class ArchiveIntegrityError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Integridad del archivo curatorial inválida (${issues.length}):\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'ArchiveIntegrityError';
    this.issues = issues;
  }
}

/** Dependencia de un registro hacia otro, con la ruta del campo para el mensaje de error. */
interface Dependency {
  collection: ContentCollection;
  id: string;
  path: string;
  /** Solo para `sources`: pasaje citado. */
  passageId?: string;
  /** Solo para evidencia visual: URL de catálogo declarada. */
  catalogueUrl?: string;
}

type VisualEvidence = DeityData['symbols'][number]['evidence'][number];

function label(collection: ContentCollection, id: string, path?: string): string {
  return path === undefined || path === '' ? `${collection}/${id}` : `${collection}/${id} → ${path}`;
}

function evidenceDeps(list: readonly Evidence[], path: string): Dependency[] {
  return list.map((evidence, index) => ({
    collection: 'sources',
    id: evidence.source.id,
    passageId: evidence.passageId,
    path: `${path}[${index}]`,
  }));
}

function visualDeps(list: readonly VisualEvidence[], path: string): Dependency[] {
  return list.flatMap((item, index): Dependency[] =>
    item.kind === 'passage'
      ? evidenceDeps([item.evidence], `${path}[${index}].evidence`)
      : [{ collection: 'artifacts', id: item.artifactId.id, catalogueUrl: item.catalogueUrl, path: `${path}[${index}]` }],
  );
}

function dateDeps(date: HistoricalDate, path: string): Dependency[] {
  if (date.kind !== 'range') return [];
  return date.evidence.flatMap((basis, index) =>
    basis.kind === 'passage' ? evidenceDeps([basis.evidence], `${path}.evidence[${index}].evidence`) : [],
  );
}

function refDeps(refs: readonly EntryRef[], path: string): Dependency[] {
  return refs.map((ref, index) => ({ collection: ref.collection, id: ref.id, path: `${path}[${index}]` }));
}

function dependenciesOf(collection: ContentCollection, data: ArchiveData[ContentCollection][number]['data']): Dependency[] {
  switch (collection) {
    case 'deities': {
      const deity = data as DeityData;
      return [
        ...deity.epithets.flatMap((epithet, index) => evidenceDeps(epithet.evidence, `epithets[${index}].evidence`)),
        ...deity.domains.flatMap((domain, index) => visualDeps(domain.evidence, `domains[${index}].evidence`)),
        ...deity.symbols.flatMap((symbol, index) => visualDeps(symbol.evidence, `symbols[${index}].evidence`)),
      ];
    }
    case 'myths': {
      const myth = data as ArchiveData['myths'][number]['data'];
      return [...refDeps(myth.participants, 'participants'), ...evidenceDeps(myth.evidence, 'evidence')];
    }
    case 'sources': {
      const source = data as ArchiveData['sources'][number]['data'];
      return [
        ...dateDeps(source.compositionDate, 'compositionDate'),
        ...source.passages.flatMap((passage, index) => refDeps(passage.relatedEntities, `passages[${index}].relatedEntities`)),
      ];
    }
    case 'artifacts': {
      const artifact = data as ArtifactData;
      return [
        ...dateDeps(artifact.date, 'date'),
        ...refDeps(
          artifact.identifications.map((identification) => identification.entity),
          'identifications',
        ),
        ...artifact.media.flatMap((media, index) =>
          media.type === 'model'
            ? media.hotspots.flatMap((hotspot, h) => visualDeps([hotspot.evidence], `media[${index}].hotspots[${h}].evidence`))
            : [],
        ),
      ];
    }
    case 'relationships': {
      const relationship = data as RelationshipData;
      return [
        { collection: 'deities', id: relationship.subject.id, path: 'subject' },
        { collection: 'deities', id: relationship.object.id, path: 'object' },
        ...evidenceDeps(relationship.evidence, 'evidence'),
      ];
    }
    case 'timeline-events': {
      const event = data as TimelineEventData;
      if (event.kind === 'historical') {
        return [{ collection: event.subject.collection, id: event.subject.id, path: 'subject' }, ...refDeps(event.entities, 'entities')];
      }
      return [
        { collection: 'myths', id: event.myth.id, path: 'myth' },
        ...event.after.flatMap((after, index) => [
          { collection: 'timeline-events' as const, id: after.eventId.id, path: `after[${index}].eventId` },
          ...evidenceDeps(after.evidence, `after[${index}].evidence`),
        ]),
        ...refDeps(event.entities, 'entities'),
        ...evidenceDeps(event.evidence, 'evidence'),
      ];
    }
  }
}

function rightsOf(collection: ContentCollection, data: ArchiveData[ContentCollection][number]['data']): { rights: Rights; path: string }[] {
  if (collection === 'sources') {
    const source = data as ArchiveData['sources'][number]['data'];
    return [
      ...source.editions.map((edition, index) => ({ rights: edition.rights, path: `editions[${index}].rights` })),
      ...source.passages.flatMap((passage, index) =>
        passage.excerpt === undefined ? [] : [{ rights: passage.excerpt.rights, path: `passages[${index}].excerpt.rights` }],
      ),
    ];
  }
  if (collection === 'artifacts') {
    return (data as ArtifactData).media.map((media, index) => ({ rights: media.rights, path: `media[${index}].rights` }));
  }
  return [];
}

function findDuplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

/** Devuelve un ciclo (lista de nodos) en un grafo dirigido, o `undefined` si no hay. */
function findCycle(edges: ReadonlyMap<string, readonly string[]>): string[] | undefined {
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const visit = (node: string): string[] | undefined => {
    if (state.get(node) === 'done') return undefined;
    if (state.get(node) === 'visiting') return [...stack.slice(stack.indexOf(node)), node];
    state.set(node, 'visiting');
    stack.push(node);
    for (const next of edges.get(node) ?? []) {
      const cycle = visit(next);
      if (cycle !== undefined) return cycle;
    }
    stack.pop();
    state.set(node, 'done');
    return undefined;
  };
  for (const node of edges.keys()) {
    const cycle = visit(node);
    if (cycle !== undefined) return cycle;
  }
  return undefined;
}

function pushEdge(edges: Map<string, string[]>, from: string, to: string): void {
  const list = edges.get(from) ?? [];
  list.push(to);
  edges.set(from, list);
}

export function checkArchive(archive: ArchiveData, options: IntegrityOptions): string[] {
  const issues: string[] = [];
  const collections = Object.keys(archive) as ContentCollection[];
  const index = new Map<ContentCollection, Map<string, ArchiveEntry<ArchiveData[ContentCollection][number]['data']>>>();

  // IDs estables, sin duplicados.
  for (const collection of collections) {
    const entries = archive[collection];
    const map = new Map<string, ArchiveEntry<ArchiveData[ContentCollection][number]['data']>>();
    for (const entry of entries) {
      if (!isValidSlug(entry.id)) issues.push(`${label(collection, entry.id)}: ID inválido; usa ASCII kebab-case estable.`);
      map.set(entry.id, entry);
    }
    for (const duplicate of findDuplicates(entries.map((entry) => entry.id))) {
      issues.push(`${label(collection, duplicate)}: ID duplicado en la colección.`);
    }
    index.set(collection, map);
  }

  const get = <C extends ContentCollection>(collection: C, id: string) =>
    index.get(collection)?.get(id) as ArchiveEntry<ArchiveData[C][number]['data']> | undefined;
  const statusOf = (collection: ContentCollection, id: string): Status | undefined => get(collection, id)?.data.review.status;
  const checkFile = (path: string, where: string) => {
    if (options.fileExists !== undefined && !options.fileExists(path)) issues.push(`${where}: el archivo "${path}" no existe.`);
  };

  // Referencias, pasajes, derechos y reglas de publicación de cada registro.
  for (const collection of collections) {
    for (const entry of archive[collection]) {
      const status = entry.data.review.status;
      const published = status === 'published';

      for (const dependency of dependenciesOf(collection, entry.data)) {
        const where = label(collection, entry.id, dependency.path);
        const target = get(dependency.collection, dependency.id);
        if (target === undefined) {
          issues.push(`${where}: referencia inexistente a ${dependency.collection}/${dependency.id}.`);
          continue;
        }
        if (dependency.passageId !== undefined) {
          const passage = (target.data as ArchiveData['sources'][number]['data']).passages.find((item) => item.id === dependency.passageId);
          if (passage === undefined) {
            issues.push(`${where}: el pasaje "${dependency.passageId}" no existe en sources/${dependency.id}.`);
          } else if (published && passage.verifiedAt === undefined) {
            issues.push(`${where}: un registro published cita el pasaje "${dependency.passageId}" sin verifiedAt.`);
          }
        }
        if (dependency.catalogueUrl !== undefined) {
          const catalogueUrl = (target.data as ArtifactData).catalogueUrl;
          if (catalogueUrl !== dependency.catalogueUrl) {
            issues.push(`${where}: catalogueUrl no coincide con la ficha de artifacts/${dependency.id} (${catalogueUrl}).`);
          }
        }
        if (published && statusOf(dependency.collection, dependency.id) !== 'published') {
          issues.push(
            `${where}: un registro published depende de ${dependency.collection}/${dependency.id}, que está en "${statusOf(dependency.collection, dependency.id)}".`,
          );
        }
      }

      for (const { rights, path } of rightsOf(collection, entry.data)) {
        const where = label(collection, entry.id, path);
        if (rights.evidencePath !== undefined) checkFile(rights.evidencePath, where);
        if (published && collection === 'artifacts' && rights.status !== 'verified') {
          issues.push(`${where}: un medio de un registro published necesita derechos "verified" (tiene "${rights.status}").`);
        }
        if (published && path.includes('excerpt') && rights.status !== 'verified') {
          issues.push(`${where}: un extracto publicado necesita derechos "verified" (tiene "${rights.status}").`);
        }
      }
    }
  }

  // sources: ediciones y pasajes internos.
  for (const { id, data } of archive.sources) {
    for (const duplicate of findDuplicates(data.editions.map((edition) => edition.id))) {
      issues.push(`${label('sources', id, 'editions')}: edición "${duplicate}" duplicada.`);
    }
    for (const duplicate of findDuplicates(data.passages.map((passage) => passage.id))) {
      issues.push(`${label('sources', id, 'passages')}: pasaje "${duplicate}" duplicado.`);
    }
    const editionIds = new Set(data.editions.map((edition) => edition.id));
    data.passages.forEach((passage, index) => {
      if (!editionIds.has(passage.editionId)) {
        issues.push(`${label('sources', id, `passages[${index}].editionId`)}: la edición "${passage.editionId}" no existe en esta obra.`);
      }
    });
  }

  // myths: capítulos válidos.
  const chapterIds = new Set(options.chapterIds);
  for (const { id, data } of archive.myths) {
    data.chapterIds.forEach((chapterId, index) => {
      if (!chapterIds.has(chapterId)) issues.push(`${label('myths', id, `chapterIds[${index}]`)}: capítulo "${chapterId}" inexistente.`);
    });
    for (const duplicate of findDuplicates(data.participants.map((participant) => participant.id))) {
      issues.push(`${label('myths', id, 'participants')}: participante "${duplicate}" repetido.`);
    }
  }

  // artifacts: medios e identificaciones.
  const assetIds: string[] = [];
  for (const { id, data } of archive.artifacts) {
    for (const duplicate of findDuplicates(data.identifications.map((identification) => identification.entity.id))) {
      issues.push(`${label('artifacts', id, 'identifications')}: "${duplicate}" identificada dos veces.`);
    }
    const imageIds = new Set(data.media.flatMap((media) => (media.type === 'image' ? [media.assetId] : [])));
    data.media.forEach((media, index) => {
      const where = label('artifacts', id, `media[${index}]`);
      assetIds.push(media.assetId);
      if (media.type === 'image') {
        checkFile(media.localPath, where);
        return;
      }
      // Los GLB se sirven sin transformación desde public/assets/models/ (estructura cerrada en ADR).
      if (!isModelPath(media.glbPath)) issues.push(`${where}: glbPath "${media.glbPath}" debe ser public/assets/models/{nombre}.glb.`);
      checkFile(media.glbPath, where);
      if (!imageIds.has(media.posterAssetId)) issues.push(`${where}: posterAssetId "${media.posterAssetId}" no es una imagen de este objeto.`);
      for (const duplicate of findDuplicates(media.hotspots.map((hotspot) => hotspot.id))) {
        issues.push(`${where}: hotspot "${duplicate}" duplicado.`);
      }
    });
  }
  for (const duplicate of findDuplicates(assetIds)) issues.push(`artifacts: assetId "${duplicate}" duplicado entre medios.`);

  checkRelationships(archive.relationships, options.selections, issues);
  checkTimeline(archive['timeline-events'], issues);
  checkSelections(archive, options, issues);

  // Cada perfil full necesita un lugar en algún roster: si no, generaría una página huérfana.
  const rostered = new Set(
    options.selections.flatMap((selection) => [...selection.roster.map((item) => item.id), ...selection.alternatives.map((item) => item.with)]),
  );
  for (const { id, data } of archive.deities) {
    if (data.profile === 'full' && !rostered.has(id)) issues.push(`${label('deities', id)}: perfil full fuera de todo roster de capítulo.`);
  }

  return issues;
}

function checkRelationships(relationships: ArchiveData['relationships'], selections: readonly ChapterSelection[], issues: string[]): void {
  const keys: string[] = [];
  const parentEdges = new Map<string, string[]>();
  /** grupo → opción → aristas parent-of de esa opción. */
  const groups = new Map<string, Map<string, ArchiveEntry<RelationshipData>[]>>();
  const groupOptionsAll = new Map<string, Set<string>>();

  for (const entry of relationships) {
    const { subject, object, kind, variantGroup, variantOption } = entry.data;
    const where = label('relationships', entry.id);
    if (subject.id === object.id) issues.push(`${where}: relación reflexiva (${subject.id} → ${subject.id}).`);
    if (kind === 'consort-of' && subject.id > object.id) {
      issues.push(`${where}: consort-of se guarda una vez con subject < object (usa ${object.id} → ${subject.id}).`);
    }
    const [a, b] = kind === 'parent-of' ? [subject.id, object.id] : [subject.id, object.id].sort();
    keys.push(`${kind}|${a}|${b}|${variantGroup ?? ''}|${variantOption ?? ''}`);
    if (variantGroup !== undefined && variantOption !== undefined) {
      const options = groupOptionsAll.get(variantGroup) ?? new Set<string>();
      options.add(variantOption);
      groupOptionsAll.set(variantGroup, options);
    }
    if (kind !== 'parent-of') continue;
    pushEdge(parentEdges, subject.id, object.id);
    if (variantGroup !== undefined && variantOption !== undefined) {
      const options = groups.get(variantGroup) ?? new Map<string, ArchiveEntry<RelationshipData>[]>();
      options.set(variantOption, [...(options.get(variantOption) ?? []), entry]);
      groups.set(variantGroup, options);
    }
  }

  for (const duplicate of findDuplicates(keys)) {
    const [kind, a, b] = duplicate.split('|');
    issues.push(`relationships: arista duplicada ${kind} ${a} → ${b} en la misma tradición/opción.`);
  }

  const cycle = findCycle(parentEdges);
  if (cycle !== undefined) issues.push(`relationships: filiación cíclica ${cycle.join(' → ')}.`);

  // Variantes: cada opción es un conjunto completo sobre los mismos descendientes.
  const variedBy = new Map<string, string>();
  for (const [group, options] of groupOptionsAll) {
    if (options.size < 2) issues.push(`relationships: el grupo de variantes "${group}" necesita al menos dos opciones.`);
    const parentOptions = groups.get(group);
    if (parentOptions === undefined) continue;
    const objectSets = [...parentOptions].map(([option, edges]) => ({
      option,
      edges,
      objects: [...new Set(edges.map((edge) => edge.data.object.id))].sort(),
    }));
    const reference = objectSets[0]?.objects.join(',');
    for (const { option, objects } of objectSets) {
      if (objects.join(',') !== reference) {
        issues.push(`relationships: en "${group}", la opción "${option}" no cubre los mismos descendientes (${objects.join(', ')} ≠ ${reference}).`);
      }
    }
    for (const option of options) {
      if (!parentOptions.has(option)) issues.push(`relationships: en "${group}", la opción "${option}" no contiene ninguna filiación.`);
    }
    for (const { option, edges, objects } of objectSets) {
      for (const object of objects) {
        const owner = variedBy.get(object);
        if (owner !== undefined && owner !== group) {
          issues.push(`relationships: ${object} varía en dos grupos ("${owner}" y "${group}"); unifícalos.`);
        }
        variedBy.set(object, group);
        const parents = edges.filter((edge) => edge.data.object.id === object);
        // Un nacimiento con un único progenitor no es un dato faltante: exige nota afirmativa.
        if (parents.length === 1 && parents[0]?.data.note === undefined) {
          issues.push(`${label('relationships', parents[0]?.id ?? '?')}: única filiación de ${object} en "${group}/${option}" sin nota que lo explique.`);
        }
      }
    }
  }

  // Nunca mezclar tradiciones: fuera de un grupo no puede haber filiaciones de un descendiente que varía.
  for (const entry of relationships) {
    const { kind, object, variantGroup } = entry.data;
    if (kind !== 'parent-of' || variantGroup !== undefined) continue;
    const group = variedBy.get(object.id);
    if (group !== undefined) {
      issues.push(
        `${label('relationships', entry.id)}: filiación de ${object.id} fuera del grupo de variantes "${group}"; mezclaría tradiciones incompatibles.`,
      );
    }
  }

  // Cada grupo necesita opción por defecto, y cada opción por defecto debe existir.
  for (const selection of selections) {
    for (const [group, option] of Object.entries(selection.defaultVariants)) {
      if (!groupOptionsAll.get(group)?.has(option)) {
        issues.push(`chapters/${selection.chapterId}: variante por defecto "${group}/${option}" inexistente.`);
      }
    }
  }
  for (const group of groupOptionsAll.keys()) {
    if (!selections.some((selection) => Object.hasOwn(selection.defaultVariants, group))) {
      issues.push(`relationships: el grupo "${group}" no tiene opción por defecto en ningún capítulo.`);
    }
  }

  // Cada grupo y cada opción necesitan un rótulo visible en los capítulos que los muestran.
  for (const [group, options] of groupOptionsAll) {
    for (const selection of selections) {
      if (!Object.hasOwn(selection.defaultVariants, group)) continue;
      const labels = Object.hasOwn(selection.variantLabels, group) ? selection.variantLabels[group] : undefined;
      if (labels === undefined) {
        issues.push(`chapters/${selection.chapterId}: el grupo de variantes "${group}" no tiene rótulo en variantLabels.`);
        continue;
      }
      for (const option of options) {
        if (!Object.hasOwn(labels.options, option)) {
          issues.push(`chapters/${selection.chapterId}: la opción "${group}/${option}" no tiene rótulo en variantLabels.`);
        }
      }
    }
  }
}

function checkTimeline(events: ArchiveData['timeline-events'], issues: string[]): void {
  const mythic = new Map(events.flatMap((entry) => (entry.data.kind === 'mythic' ? [[entry.id, entry.data] as const] : [])));
  const edges = new Map<string, string[]>();
  const orders: string[] = [];

  for (const [id, event] of mythic) {
    orders.push(`${event.sequenceGroup}|${event.displayOrder}`);
    for (const after of event.after) {
      const previous = mythic.get(after.eventId.id);
      const where = label('timeline-events', id, 'after');
      if (previous === undefined) {
        if (events.some((entry) => entry.id === after.eventId.id)) issues.push(`${where}: "${after.eventId.id}" no es un evento mítico.`);
        continue;
      }
      if (previous.traditionLabel !== event.traditionLabel) {
        issues.push(`${where}: "after" solo puede enlazar eventos de la misma tradición ("${previous.traditionLabel}" ≠ "${event.traditionLabel}").`);
      }
      if (previous.sequenceGroup === event.sequenceGroup && previous.displayOrder >= event.displayOrder) {
        issues.push(`${where}: displayOrder contradice el orden "after" respecto de "${after.eventId.id}".`);
      }
      pushEdge(edges, after.eventId.id, id);
    }
  }

  for (const duplicate of findDuplicates(orders)) {
    const [group, order] = duplicate.split('|');
    issues.push(`timeline-events: displayOrder ${order} repetido en la secuencia "${group}".`);
  }
  const cycle = findCycle(edges);
  if (cycle !== undefined) issues.push(`timeline-events: ciclo en "after": ${cycle.join(' → ')}.`);
}

function checkSelections(archive: ArchiveData, options: IntegrityOptions, issues: string[]): void {
  const deities = new Map(archive.deities.map((entry) => [entry.id, entry.data]));
  const artifacts = new Map(archive.artifacts.map((entry) => [entry.id, entry.data]));
  const chapterIds = new Set(options.chapterIds);

  for (const selection of options.selections) {
    const where = `chapters/${selection.chapterId}`;
    if (!chapterIds.has(selection.chapterId)) issues.push(`${where}: capítulo inexistente.`);
    if (selection.roster.length !== DODEKATHEON_SIZE) {
      issues.push(`${where}: el roster debe tener exactamente ${DODEKATHEON_SIZE} perfiles (tiene ${selection.roster.length}).`);
    }
    for (const duplicate of findDuplicates(selection.roster.map((item) => item.id))) issues.push(`${where}: "${duplicate}" repetido en el roster.`);
    for (const duplicate of findDuplicates(selection.roster.map((item) => String(item.order)))) {
      issues.push(`${where}: orden ${duplicate} repetido en el roster.`);
    }
    const orders = selection.roster.map((item) => item.order).sort((a, b) => a - b);
    if (orders.some((order, position) => order !== position + 1)) issues.push(`${where}: el orden del roster debe ser 1…${selection.roster.length} sin huecos.`);

    // Una figura con ficha (roster u otra tradición): deidad `full`, emblema documentado y capa narrativa completa.
    const checkProfile = (id: string, emblem: { symbol: string }, place: string) => {
      const deity = deities.get(id);
      if (deity === undefined) {
        issues.push(`${where}: "${id}" ${place} no existe en deities.`);
        return;
      }
      if (deity.profile !== 'full' || deity.entityKind !== 'deity') {
        issues.push(`${where}: "${id}" ${place} debe ser una deidad con perfil full.`);
        return;
      }
      // El emblema editorial solo puede dibujar un atributo documentado en la ficha (símbolo o dominio).
      if (![...deity.symbols, ...deity.domains].some((attribute) => attribute.label === emblem.symbol)) {
        issues.push(`${where}: el emblema de "${id}" («${emblem.symbol}») no corresponde a ningún símbolo con evidencia de su ficha.`);
      }
      // El planetario y la ficha narrativa no se publican a medias.
      const missing = [
        deity.tagline === undefined ? 'tagline' : undefined,
        deity.narrativeHook === undefined ? 'narrativeHook' : undefined,
        deity.storySections.length === 0 ? 'storySections' : undefined,
        deity.constellationConfig === undefined ? 'constellationConfig' : undefined,
      ].filter((field) => field !== undefined);
      if (missing.length > 0) issues.push(`${where}: a "${id}" le falta la capa narrativa (${missing.join(', ')}).`);
    };
    for (const { id, emblem } of selection.roster) checkProfile(id, emblem, 'del roster');
    const rosterIds = new Set(selection.roster.map((item) => item.id));
    // Al menos un relato pertinente por perfil (un mismo mito puede servir a varias fichas).
    const inMyths = new Set(
      archive.myths
        .filter((myth) => myth.data.chapterIds.includes(selection.chapterId))
        .flatMap((myth) => myth.data.participants.map((participant) => participant.id)),
    );
    for (const id of [...rosterIds, ...selection.alternatives.map((alternative) => alternative.with)]) {
      if (!inMyths.has(id)) issues.push(`${where}: "${id}" no participa en ningún mito del capítulo.`);
    }
    for (const id of selection.contextual) {
      const deity = deities.get(id);
      if (deity === undefined) issues.push(`${where}: entidad contextual "${id}" inexistente.`);
      else if (deity.profile !== 'context') issues.push(`${where}: "${id}" debe tener perfil context.`);
      if (rosterIds.has(id)) issues.push(`${where}: "${id}" no puede ser a la vez roster y contextual.`);
    }
    for (const alternative of selection.alternatives) {
      const at = `${where} → alternatives/${alternative.id}`;
      if (!rosterIds.has(alternative.without)) issues.push(`${at}: "${alternative.without}" no está en el roster.`);
      if (rosterIds.has(alternative.with)) issues.push(`${at}: "${alternative.with}" ya está en el roster principal.`);
      else checkProfile(alternative.with, alternative.emblem, 'de la otra tradición');
      const artifact = artifacts.get(alternative.evidenceArtifactId);
      if (artifact === undefined) {
        issues.push(`${at}: artefacto de evidencia "${alternative.evidenceArtifactId}" inexistente.`);
        continue;
      }
      const identified = new Set(artifact.identifications.map((identification) => identification.entity.id));
      if (!identified.has(alternative.with) || identified.has(alternative.without)) {
        issues.push(`${at}: la ficha de ${alternative.evidenceArtifactId} no respalda «con ${alternative.with}, sin ${alternative.without}».`);
      }
    }
  }
}

/**
 * Lanza `ArchiveIntegrityError` con todos los problemas encontrados.
 */
export function assertArchiveIntegrity(archive: ArchiveData, options: IntegrityOptions): void {
  const issues = checkArchive(archive, options);
  if (issues.length > 0) throw new ArchiveIntegrityError(issues);
}

/**
 * Registros visibles en un ambiente. En `production` solo existen los `published`; en desarrollo y
 * staging se ven todos, y la interfaz debe rotular su estado (nunca mezclar draft con reviewed en
 * silencio). La integridad se comprueba antes sobre el conjunto completo.
 */
export function visibleArchive(archive: ArchiveData, appEnv: AppEnv): ArchiveData {
  if (appEnv !== 'production') return archive;
  const published = <T extends { review: { status: Status } }>(entries: readonly ArchiveEntry<T>[]) =>
    entries.filter((entry) => entry.data.review.status === 'published');
  return {
    deities: published(archive.deities),
    myths: published(archive.myths),
    sources: published(archive.sources),
    artifacts: published(archive.artifacts),
    relationships: published(archive.relationships),
    'timeline-events': published(archive['timeline-events']),
  };
}

export interface ResolvedRosterEntry {
  id: string;
  order: number;
  deity: DeityData;
}

/**
 * Roster ordenado de un capítulo sobre el archivo visible. Si falta un perfil (en producción: si no
 * está published) lanza un error: la bóveda no se publica con menos de doce.
 */
export function resolveRoster(visible: ArchiveData, selection: ChapterSelection): ResolvedRosterEntry[] {
  const deities = new Map(visible.deities.map((entry) => [entry.id, entry.data]));
  const missing = selection.roster.filter((item) => !deities.has(item.id)).map((item) => item.id);
  if (missing.length > 0) {
    throw new ArchiveIntegrityError([`chapters/${selection.chapterId}: perfiles no disponibles en este ambiente: ${missing.join(', ')}.`]);
  }
  return [...selection.roster]
    .sort((a, b) => a.order - b.order)
    .map((item) => ({ id: item.id, order: item.order, deity: deities.get(item.id) as DeityData }));
}

