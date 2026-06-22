import { DEFAULT_XADVANCE_RATIO } from '@/config';

import { makeBlankLayer } from './layers';
import type { Glyph } from './types';

export function makeBlankGlyph(fontId: string, codePoint: number, cellWidth: number): Glyph {
  const xadvance = Math.round(cellWidth * DEFAULT_XADVANCE_RATIO);

  return {
    codePoint,
    fontId,
    layers: [makeBlankLayer()],
    bmf: { xoffset: 0, yoffset: 0, xadvance },
    isDirty: false,
  };
}

export function initializeGlyphs(fontId: string, codePoints: number[], cellWidth: number): Glyph[] {
  return codePoints.map((codePoint) => makeBlankGlyph(fontId, codePoint, cellWidth));
}
