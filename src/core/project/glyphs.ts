import type { Glyph } from './types';

export function makeBlankGlyph(
  projectId: string,
  codePoint: number,
  width: number,
  height: number,
): Glyph {
  return {
    codePoint,
    projectId,
    pixels: new Uint8Array(width * height),
    width,
    height,
    xoffset: 0,
    yoffset: 0,
    xadvance: width,
    isDirty: false,
  };
}

export function initializeGlyphs(
  projectId: string,
  codePoints: number[],
  width: number,
  height: number,
): Glyph[] {
  return codePoints.map((codePoint) => makeBlankGlyph(projectId, codePoint, width, height));
}
