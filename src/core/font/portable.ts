import { makeBaseLayerFromBitmap } from './layers';
import type { Font, Glyph } from './types';

export interface PortableFont {
  version: 2;
  font: Font;
  // Pixels serialized as base64 strings to survive JSON round-trip.
  // Layers are reconstructed from the legacy bitmap on import.
  glyphs: Array<Omit<Glyph, 'pixels' | 'layers' | 'bmf'> & { pixels: string }>;
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
      const rest: Omit<Glyph, 'pixels' | 'layers' | 'bmf'> = {
        codePoint: glyph.codePoint,
        fontId: glyph.fontId,
        width: glyph.width,
        height: glyph.height,
        xoffset: glyph.bmf.xoffset,
        yoffset: glyph.bmf.yoffset,
        xadvance: glyph.bmf.xadvance,
        isDirty: glyph.isDirty,
        alphaThreshold: glyph.alphaThreshold,
      };

      return { ...rest, pixels: toBase64(glyph.pixels) };
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
    // v2 carries a single flat bitmap. The xoffset/yoffset stored on v2 are
    // the BMF char-line metadata (conflated with the flatten origin in PR 1,
    // de-conflated in PR 2). On import we treat them as `bmf` and keep the
    // base layer at (0, 0).
    const bmf = { xoffset: glyph.xoffset, yoffset: glyph.yoffset, xadvance: glyph.xadvance };

    return {
      ...glyph,
      pixels,
      bmf,
      layers: [
        makeBaseLayerFromBitmap({
          pixels,
          width: glyph.width,
          height: glyph.height,
          xoffset: 0,
          yoffset: 0,
        }),
      ],
    };
  });

  return { font: data.font, glyphs };
}
