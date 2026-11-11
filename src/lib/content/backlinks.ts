/**
 * «Citado en»: para cada pasaje (`obra#pasaje`), las fichas y secciones que lo usan como evidencia.
 * Puro, sobre el archivo visible; solo enlaza a fichas `full` que existen como página.
 */
import { profileIds, type ChapterSelection } from '../../config/chapters.ts';
import type { ArchiveData, Evidence } from '../../types/content.ts';
import { paths } from '../routes.ts';

export interface Backlink {
  label: string;
  href: string;
}

export function passageBacklinks(archive: ArchiveData, selection: ChapterSelection): Map<string, Backlink[]> {
  // Cada figura con ficha (roster y otras tradiciones) es una página a la que se puede volver.
  const rostered = new Set(profileIds(selection));
  const visibleRoster = new Set(archive.deities.filter((entry) => rostered.has(entry.id)).map((entry) => entry.id));
  const names = new Map(archive.deities.map((entry) => [entry.id, entry.data.name]));
  const index = new Map<string, Backlink[]>();

  const add = (evidence: readonly Evidence[], link: Backlink | undefined) => {
    if (link === undefined) return;
    for (const item of evidence) {
      const key = `${item.source.id}#${item.passageId}`;
      const list = index.get(key) ?? [];
      if (!list.some((existing) => existing.href === link.href)) list.push(link);
      index.set(key, list);
    }
  };
  const profile = (id: string, anchor: string, label: string): Backlink | undefined =>
    visibleRoster.has(id) ? { label, href: `${paths.deity(id)}#${anchor}` } : undefined;

  for (const entry of archive.deities) {
    const name = entry.data.name;
    entry.data.epithets.forEach((epithet) => add(epithet.evidence, profile(entry.id, 'nombres', `${name}: epítetos`)));
    for (const attribute of [...entry.data.domains, ...entry.data.symbols]) {
      for (const item of attribute.evidence) {
        if (item.kind === 'passage') add([item.evidence], profile(entry.id, 'poderes', `${name}: dominios y símbolos`));
      }
    }
  }
  for (const myth of archive.myths) {
    const host = myth.data.participants.find((participant) => visibleRoster.has(participant.id));
    if (host !== undefined) {
      add(myth.data.evidence, { label: `Relato: ${myth.data.title}`, href: `${paths.deity(host.id)}#relato-${myth.id}` });
    }
  }
  for (const relation of archive.relationships) {
    const { subject, object, label } = relation.data;
    const host = visibleRoster.has(object.id) ? object.id : visibleRoster.has(subject.id) ? subject.id : undefined;
    if (host !== undefined) {
      const text = `${names.get(subject.id) ?? subject.id} → ${names.get(object.id) ?? object.id} (${label})`;
      add(relation.data.evidence, { label: `Genealogía: ${text}`, href: `${paths.deity(host)}#linaje` });
    }
  }
  return index;
}
