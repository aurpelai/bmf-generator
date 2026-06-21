import { makeBlankLayer } from './layers';
import type { Glyph } from './types';

export function makeBlankGlyph(
  fontId: string,
  codePoint: number,
  width: number,
  height: number,
): Glyph {
  return {
    codePoint,
    fontId,
    layers: [makeBlankLayer()],
    pixels: new Uint8Array(width * height),
    width,
    height,
    xoffset: 0,
    yoffset: 0,
    xadvance: Math.round(width * 0.7),
    isDirty: false,
  };
}

export function initializeGlyphs(
  fontId: string,
  codePoints: number[],
  width: number,
  height: number,
): Glyph[] {
  return codePoints.map((codePoint) => makeBlankGlyph(fontId, codePoint, width, height));
}
