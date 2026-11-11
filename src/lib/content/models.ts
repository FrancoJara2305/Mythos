/**
 * Modelos 3D de un objeto → datos del inspector (Phase 6). Puro; lo usa la ficha de objeto en el
 * build y se prueba con fixtures. Un modelo solo llega aquí si existe en `media[]` con archivo real,
 * hash y derechos (content_model §4): este módulo no inventa cámaras ni anotaciones.
 */
import type { ArtifactData, ArtifactMedia } from '../../types/content.ts';
import { modelUrl, type InspectorConfig, type InspectorHotspotView } from '../three/config.ts';
import type { PassageIndex } from './citations.ts';

export type ModelMedia = Extract<ArtifactMedia, { type: 'model' }>;
export type ImageMedia = Extract<ArtifactMedia, { type: 'image' }>;

export const HOTSPOT_KIND_LABELS: Readonly<Record<ModelMedia['hotspots'][number]['kind'], string>> = {
  'observed-feature': 'Rasgo observado',
  interpretation: 'Interpretación',
  restoration: 'Restauración',
};

export interface ArtifactModelView {
  media: ModelMedia;
  poster: ImageMedia;
  config: InspectorConfig;
  hotspots: InspectorHotspotView[];
}

export function artifactModels(artifact: ArtifactData, citations: PassageIndex): ArtifactModelView[] {
  const images = new Map(artifact.media.flatMap((media) => (media.type === 'image' ? [[media.assetId, media] as const] : [])));
  return artifact.media.flatMap((media): ArtifactModelView[] => {
    if (media.type !== 'model') return [];
    const poster = images.get(media.posterAssetId);
    // La integridad ya exige que el póster sea una imagen del objeto; aquí no se degrada en silencio.
    if (poster === undefined) throw new Error(`Modelo ${media.assetId}: póster ${media.posterAssetId} inexistente.`);
    return [
      {
        media,
        poster,
        config: {
          src: modelUrl(media.glbPath),
          bytes: media.optimizedBytes,
          coordinateVersion: media.coordinateVersion,
          camera: media.camera,
          hotspots: media.hotspots.map((hotspot) => ({ id: hotspot.id, position: hotspot.position })),
        },
        hotspots: media.hotspots.map((hotspot): InspectorHotspotView => {
          const [cited] = citations.citeVisual([hotspot.evidence]);
          let evidence: InspectorHotspotView['evidence'];
          if (cited?.kind === 'passage' && cited.href !== undefined) evidence = { label: cited.passage.locator.display, href: cited.href };
          else if (cited?.kind === 'artifact') {
            evidence = cited.href !== undefined ? { label: cited.title ?? cited.claim, href: cited.href } : { label: 'Ficha del museo', href: cited.catalogueUrl, external: true };
          }
          return {
            id: hotspot.id,
            label: hotspot.label,
            description: hotspot.description,
            kindLabel: HOTSPOT_KIND_LABELS[hotspot.kind],
            ...(evidence === undefined ? {} : { evidence }),
          };
        }),
      },
    ];
  });
}
