/**
 * Resolución de evidencias a citas visibles: obra, localizador, enlace a la página de la obra (ancla
 * del pasaje) y enlace externo a la edición. Puro; la integridad ya garantizó que obra y pasaje existen
 * en el archivo completo, pero en producción la obra podría no ser visible: entonces no hay enlace
 * interno y se conserva el externo.
 */
import type { ArchiveData, ArchiveEntry, Evidence, Passage, SourceData } from '../../types/content.ts';
import { paths } from '../routes.ts';

export interface ResolvedPassage {
  sourceId: string;
  sourceTitle: string;
  passage: Passage;
  /** Enlace a la página de la obra en MYTHOS, si la obra es visible en este ambiente. */
  href: string | undefined;
}

export interface ResolvedCitation extends ResolvedPassage {
  claim: string;
  role: Evidence['role'];
}

export interface ArtifactCitation {
  kind: 'artifact';
  artifactId: string;
  title: string | undefined;
  claim: string;
  catalogueUrl: string;
  href: string | undefined;
}

export type VisualCitation = ({ kind: 'passage' } & ResolvedCitation) | ArtifactCitation;

export class PassageIndex {
  readonly #sources: Map<string, ArchiveEntry<SourceData>>;
  readonly #artifacts: Map<string, string>;

  constructor(archive: ArchiveData) {
    this.#sources = new Map(archive.sources.map((entry) => [entry.id, entry]));
    this.#artifacts = new Map(archive.artifacts.map((entry) => [entry.id, entry.data.title]));
  }

  passage(sourceId: string, passageId: string): ResolvedPassage | undefined {
    const source = this.#sources.get(sourceId);
    const passage = source?.data.passages.find((item) => item.id === passageId);
    if (source === undefined || passage === undefined) return undefined;
    return { sourceId, sourceTitle: source.data.title, passage, href: paths.passage(sourceId, passageId) };
  }

  /** Cita de una evidencia literaria; `undefined` si la obra no es visible en este ambiente. */
  cite(evidence: Evidence): ResolvedCitation | undefined {
    const resolved = this.passage(evidence.source.id, evidence.passageId);
    return resolved === undefined ? undefined : { ...resolved, claim: evidence.claim, role: evidence.role };
  }

  citeAll(evidence: readonly Evidence[]): ResolvedCitation[] {
    return evidence.flatMap((item) => this.cite(item) ?? []);
  }

  citeVisual(
    evidence: readonly (
      | { kind: 'passage'; evidence: Evidence }
      | { kind: 'artifact'; artifactId: { id: string }; catalogueUrl: string; claim: string }
    )[],
  ): VisualCitation[] {
    return evidence.flatMap((item): VisualCitation[] => {
      if (item.kind === 'passage') {
        const cited = this.cite(item.evidence);
        return cited === undefined ? [] : [{ kind: 'passage', ...cited }];
      }
      const title = this.#artifacts.get(item.artifactId.id);
      return [
        {
          kind: 'artifact',
          artifactId: item.artifactId.id,
          title,
          claim: item.claim,
          catalogueUrl: item.catalogueUrl,
          href: title === undefined ? undefined : paths.artifact(item.artifactId.id),
        },
      ];
    });
  }
}

/** Localizador sin el nombre de la obra: «18.468–477», «176–187». Para listas agrupadas por obra. */
export function shortLocator(locator: Passage['locator']): string {
  const lines = locator.lineEnd !== undefined && locator.lineEnd !== locator.lineStart ? `${locator.lineStart}–${locator.lineEnd}` : `${locator.lineStart}`;
  return locator.scheme === 'book.line' ? `${locator.book}.${lines}` : lines;
}
