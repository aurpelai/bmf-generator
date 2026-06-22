import type { Font, Glyph, Layer } from '../types';
import { fromBase64 } from './codec';
import { importPortableFontV2 } from './import-v2';
import type { PortableFontV3 } from './types';

interface VersionedBundle {
  version?: number;
  font?: { id?: string };
}

export function importPortableFont(json: string): { font: Font; glyphs: Glyph[] } {
  const data = JSON.parse(json) as VersionedBundle;

  if (!data.font?.id) {
    throw new Error('Invalid font bundle: missing font data');
  }

  if (data.version === 3) {
    return importV3(data as unknown as PortableFontV3);
  }

  if (data.version === 2) {
    return importPortableFontV2(data as unknown as Parameters<typeof importPortableFontV2>[0]);
  }

  throw new Error(`Unsupported font version: ${String(data.version)}`);
}

function importV3(data: PortableFontV3): { font: Font; glyphs: Glyph[] } {
  const glyphs: Glyph[] = data.glyphs.map((glyph) => ({
    codePoint: glyph.codePoint,
    fontId: glyph.fontId,
    bmf: glyph.bmf,
    isDirty: glyph.isDirty,
    alphaThreshold: glyph.alphaThreshold,
    layers: glyph.layers.map(
      (layer): Layer => ({
        id: layer.id,
        name: layer.name,
        pixels: fromBase64(layer.pixels),
        width: layer.width,
        height: layer.height,
        xoffset: layer.xoffset,
        yoffset: layer.yoffset,
        visible: layer.visible,
        preview: layer.preview,
        colorIndex: layer.colorIndex,
        locked: layer.locked,
      }),
    ),
  }));

  return { font: data.font, glyphs };
}
