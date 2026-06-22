import type { Font, Glyph } from '../types';
import { toBase64 } from './codec';
import type { PortableFontV3, PortableLayerV3 } from './types';

export function exportPortableFont(font: Font, glyphs: Glyph[]): string {
  const portable: PortableFontV3 = {
    version: 3,
    font,
    glyphs: glyphs.map((glyph) => ({
      codePoint: glyph.codePoint,
      fontId: glyph.fontId,
      bmf: glyph.bmf,
      isDirty: glyph.isDirty,
      alphaThreshold: glyph.alphaThreshold,
      layers: glyph.layers.map(
        (layer): PortableLayerV3 => ({
          id: layer.id,
          name: layer.name,
          pixels: toBase64(layer.pixels),
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
    })),
  };

  return JSON.stringify(portable, null, 2);
}
