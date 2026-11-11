/**
 * Solo build: reduce el archivo visible a los datos mínimos del explorador (`GenealogyData`). Las
 * aristas `associated-with` no son parentescos y quedan fuera; las citas se resuelven a enlaces de
 * pasaje. La isla del cliente nunca importa este módulo.
 */
import type { ChapterSelection } from '../../config/chapters.ts';
import type { ArchiveData } from '../../types/content.ts';
import { PassageIndex } from '../content/citations.ts';
import { CERTAINTY_LABELS } from '../content/labels.ts';
import { paths } from '../routes.ts';
import type { GenealogyData, GenealogyEdge, GenealogyEntity } from './model.ts';

export function genealogyData(archive: ArchiveData, selection: ChapterSelection): GenealogyData {
  const index = new PassageIndex(archive);
  const edges: GenealogyEdge[] = archive.relationships.flatMap((entry) => {
    const { kind, subject, object, label, traditionLabel, certainty, variantGroup, variantOption, note, evidence } = entry.data;
    if (kind !== 'parent-of' && kind !== 'consort-of') return [];
    const citations = index
      .citeAll(evidence)
      .flatMap((citation) => (citation.href === undefined ? [] : [{ label: citation.passage.locator.display, href: citation.href }]));
    return [
      {
        id: entry.id,
        kind,
        subject: subject.id,
        object: object.id,
        label,
        tradition: traditionLabel,
        certainty: CERTAINTY_LABELS[certainty],
        variant: variantGroup !== undefined && variantOption !== undefined ? { group: variantGroup, option: variantOption } : undefined,
        note,
        citations,
      },
    ];
  });

  const related = new Set([...selection.roster.map((item) => item.id), ...edges.flatMap((edge) => [edge.subject, edge.object])]);
  const entities: GenealogyEntity[] = archive.deities
    .filter((entry) => related.has(entry.id))
    .map((entry) => ({
      id: entry.id,
      name: entry.data.name,
      profile: entry.data.profile,
      href: entry.data.profile === 'full' ? paths.deity(entry.id) : undefined,
    }));

  const groups = Object.entries(selection.variantLabels)
    .filter(([group]) => edges.some((edge) => edge.variant?.group === group))
    .map(([group, labels]) => ({
      id: group,
      label: labels.label,
      options: Object.entries(labels.options).map(([id, label]) => ({ id, label })),
      defaultOption: selection.defaultVariants[group] ?? Object.keys(labels.options)[0] ?? '',
    }));

  const roster = [...selection.roster].sort((a, b) => a.order - b.order).map((item) => item.id);
  return { roster, defaultFocus: roster[0] ?? '', entities, edges, groups };
}

/**
 * JSON seguro para incrustar en `<script type="application/json">`: el signo «menor que» y los
 * separadores de línea U+2028/U+2029 se escriben como escapes Unicode de JSON (barra invertida, «u» y
 * cuatro cifras), así el contenido nunca puede cerrar la etiqueta.
 */
export function serializeForScript(value: unknown): string {
  const escapeCode = (code: number) => `${String.fromCharCode(92)}u${code.toString(16).padStart(4, '0')}`;
  return JSON.stringify(value)
    .replaceAll(String.fromCharCode(0x3c), escapeCode(0x3c))
    .replaceAll(String.fromCharCode(0x2028), escapeCode(0x2028))
    .replaceAll(String.fromCharCode(0x2029), escapeCode(0x2029));
}
