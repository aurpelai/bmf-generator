import { flattenGlyph, makeBaseLayerFromBitmap } from './layers';
import type { Font, Glyph } from './types';

// v2 wire format. Each glyph carries the flattened bitmap inline (base64) and
// BMF char-line metadata at the top level. PR 3 introduces a v3 format that
// serialises the full layer stack; the v2 shape is preserved here so existing
// exports keep round-tripping while v3 is being designed.
export interface PortableFont {
  version: 2;
  font: Font;
  glyphs: PortableGlyphV2[];
}

interface PortableGlyphV2 {
  codePoint: number;
  fontId: string;
  pixels: string; // base64
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
  isDirty: boolean;
  alphaThreshold?: number;
}

function toBase64(buf: Uint8Array): string {
  let binary = '';

  for (let index = 0; index < buf.length; index++) {
    binary += String.fromCharCode(buf[index]);
  }

  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    buf[index] = binary.charCodeAt(index);
  }

  return buf;
}

export function exportPortableFont(font: Font, glyphs: Glyph[]): string {
  const portable: PortableFont = {
    version: 2,
    font,
    glyphs: glyphs.map((glyph) => {
      const flat = flattenGlyph(glyph);

      return {
        codePoint: glyph.codePoint,
        fontId: glyph.fontId,
        pixels: toBase64(flat.pixels),
        width: flat.width,
        height: flat.height,
        xoffset: glyph.bmf.xoffset,
        yoffset: glyph.bmf.yoffset,
        xadvance: glyph.bmf.xadvance,
        isDirty: glyph.isDirty,
        alphaThreshold: glyph.alphaThreshold,
      };
    }),
  };

  return JSON.stringify(portable, null, 2);
}

export function importPortableFont(json: string): { font: Font; glyphs: Glyph[] } {
  const data = JSON.parse(json) as PortableFont;

  if (data.version !== 2) {
    throw new Error(`Unsupported font version: ${String(data.version)}`);
  }

  if (!data.font?.id) {
    throw new Error('Invalid font bundle: missing font data');
  }

  const glyphs: Glyph[] = data.glyphs.map((glyph) => {
    const pixels = fromBase64(glyph.pixels);

    // v2 stores the BMF char-line nudge at the top level. On import we lift it
    // onto `bmf` and leave the base layer at (0, 0) — the layer carries ink,
    // `bmf` carries the placement metadata.
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
