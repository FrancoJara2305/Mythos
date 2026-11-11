/**
 * Entradas del Temporal Atlas a partir del archivo visible (build). Dos temporalidades que nunca se
 * mezclan (docs/content_model.md, `timeline-events`):
 *
 * - **Relatos:** eventos `mythic` agrupados por secuencia y tradición, en `displayOrder` (orden de
 *   exposición, no cronología). Solo se conectan con «después de» cuando hay `after` con evidencia.
 * - **Testimonios:** eventos `historical` cuyo intervalo se lee de la obra (composición) o del objeto
 *   (fabricación); nunca se duplica. Una datación `unknown` no se dibuja.
 *
 * Divinidades de cada entrada (para el filtro): las del evento más, en objetos, las identificaciones
 * registradas y, en obras, las entidades que mencionan sus pasajes. Así el filtro no inventa vínculos.
 */
import type { ArchiveData, Evidence, HistoricalDate } from '../../types/content.ts';
import { PassageIndex, type ResolvedCitation } from '../content/citations.ts';
import { paths } from '../routes.ts';

export interface NarrativeEvent {
  id: string;
  title: string;
  tradition: string;
  displayOrder: number;
  entities: string[];
  citations: ResolvedCitation[];
  /** Eventos anteriores justificados por una fuente. */
  after: { eventId: string; title: string; citations: ResolvedCitation[] }[];
  /** Relato en la ficha de su primer participante del capítulo. */
  myth: { title: string; href: string } | undefined;
}

export interface NarrativeSequence {
  id: string;
  tradition: string;
  events: NarrativeEvent[];
  /** «`to` ocurre después de `from`», solo donde hay evidencia. */
  connectors: { from: string; to: string }[];
}

export interface HistoricalEntry {
  id: string;
  title: string;
  facet: 'composition' | 'object-production';
  subject: { collection: 'sources' | 'artifacts'; id: string; title: string; href: string; titleLang: 'en' | undefined };
  date: HistoricalDate;
  entities: string[];
  institution: string | undefined;
  catalogueUrl: string | undefined;
}

const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];

export function narrativeSequences(archive: ArchiveData, roster: readonly string[]): NarrativeSequence[] {
  const index = new PassageIndex(archive);
  const cite = (evidence: readonly Evidence[]) => index.citeAll(evidence);
  const events = archive['timeline-events'].flatMap((entry) => (entry.data.kind === 'mythic' ? [{ id: entry.id, data: entry.data }] : []));
  const titles = new Map(events.map((event) => [event.id, event.data.title]));
  const myths = new Map(archive.myths.map((myth) => [myth.id, myth.data]));
  const rostered = new Set(roster);

  const groups = new Map<string, NarrativeEvent[]>();
  for (const { id, data } of events) {
    const myth = myths.get(data.myth.id);
    const host = myth?.participants.find((participant) => rostered.has(participant.id));
    const list = groups.get(data.sequenceGroup) ?? [];
    list.push({
      id,
      title: data.title,
      tradition: data.traditionLabel,
      displayOrder: data.displayOrder,
      entities: unique(data.entities.map((entity) => entity.id)),
      citations: cite(data.evidence),
      after: data.after.map((item) => ({ eventId: item.eventId.id, title: titles.get(item.eventId.id) ?? item.eventId.id, citations: cite(item.evidence) })),
      myth: myth !== undefined && host !== undefined ? { title: myth.title, href: `${paths.deity(host.id)}#relato-${data.myth.id}` } : undefined,
    });
    groups.set(data.sequenceGroup, list);
  }

  return [...groups.entries()]
    .map(([id, list]) => {
      const sorted = [...list].sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title, 'es'));
      const inGroup = new Set(sorted.map((event) => event.id));
      const connectors = sorted.flatMap((event) => event.after.filter((item) => inGroup.has(item.eventId)).map((item) => ({ from: item.eventId, to: event.id })));
      return { id, tradition: sorted[0]?.tradition ?? '', events: sorted, connectors };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function historicalEntries(archive: ArchiveData): HistoricalEntry[] {
  const sources = new Map(archive.sources.map((entry) => [entry.id, entry.data]));
  const artifacts = new Map(archive.artifacts.map((entry) => [entry.id, entry.data]));

  const entries = archive['timeline-events'].flatMap((entry): HistoricalEntry[] => {
    const event = entry.data;
    if (event.kind !== 'historical') return [];
    const own = event.entities.map((entity) => entity.id);
    if (event.subject.collection === 'sources') {
      const source = sources.get(event.subject.id);
      if (source === undefined) return [];
      return [
        {
          id: entry.id,
          title: event.title,
          facet: 'composition',
          subject: { collection: 'sources', id: event.subject.id, title: source.title, href: paths.source(event.subject.id), titleLang: undefined },
          date: source.compositionDate,
          entities: unique([...own, ...source.passages.flatMap((passage) => passage.relatedEntities.map((entity) => entity.id))]),
          institution: undefined,
          catalogueUrl: undefined,
        },
      ];
    }
    const artifact = artifacts.get(event.subject.id);
    if (artifact === undefined) return [];
    return [
      {
        id: entry.id,
        title: event.title,
        facet: 'object-production',
        subject: { collection: 'artifacts', id: event.subject.id, title: artifact.title, href: paths.artifact(event.subject.id), titleLang: 'en' },
        date: artifact.date,
        entities: unique([...own, ...artifact.identifications.map((identification) => identification.entity.id)]),
        institution: artifact.institution,
        catalogueUrl: artifact.catalogueUrl,
      },
    ];
  });

  const startOf = (entry: HistoricalEntry) => (entry.date.kind === 'range' ? entry.date.start : Number.POSITIVE_INFINITY);
  return entries.sort((a, b) => startOf(a) - startOf(b) || a.title.localeCompare(b.title, 'es'));
}
