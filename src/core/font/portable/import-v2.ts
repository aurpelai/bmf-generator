import { makeBaseLayerFromBitmap } from '../layers';
import type { Font, Glyph } from '../types';
import { fromBase64 } from './codec';

// v2 wire format snapshot. Each glyph carried the flattened bitmap inline
// (base64) and BMF char-line metadata at the top level — no per-layer data.
interface PortableFontV2 {
  version: 2;
  font: Font;
  glyphs: PortableGlyphV2[];
}

interface PortableGlyphV2 {
  codePoint: number;
  fontId: string;
  pixels: string;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
  isDirty: boolean;
  alphaThreshold?: number;
}

// v2 bundles flatten to a single base layer on import. The top-level
// xoffset/yoffset/xadvance become `bmf`; the base layer sits at (0, 0)
// since v2 had no concept of layer offsets independent of the flatten
// origin.
export function importPortableFontV2(data: PortableFontV2): { font: Font; glyphs: Glyph[] } {
  const glyphs: Glyph[] = data.glyphs.map((glyph) => {
    const pixels = fromBase64(glyph.pixels);

    return {
      codePoint: glyph.codePoint,
      fontId: glyph.fontId,
      layers: [
        makeBaseLayerFromBitmap({
          pixels,
          width: glyph.width,
          height: glyph.height,
          xoffset: 0,
          yoffset: 0,
        }),
      ],
      bmf: { xoffset: glyph.xoffset, yoffset: glyph.yoffset, xadvance: glyph.xadvance },
      isDirty: glyph.isDirty,
      alphaThreshold: glyph.alphaThreshold,
    };
  });

  return { font: data.font, glyphs };
}
