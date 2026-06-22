import { describe, expect, it } from 'vitest';

import { DEFAULT_XADVANCE_RATIO } from '@/config';

import { initializeGlyphs, makeBlankGlyph } from './glyphs';
import { flattenGlyph } from './layers';

describe('makeBlankGlyph', () => {
  it('returns a glyph with the requested code point and font id', () => {
    const glyph = makeBlankGlyph('font-1', 0x41, 8);

    expect(glyph.codePoint).toBe(0x41);
    expect(glyph.fontId).toBe('font-1');
  });

  it('starts with a single blank base layer (0x0)', () => {
    const glyph = makeBlankGlyph('font-1', 0x41, 8);

    expect(glyph.layers).toHaveLength(1);
    expect(glyph.layers[0].width).toBe(0);
    expect(glyph.layers[0].height).toBe(0);
    expect(glyph.layers[0].pixels.length).toBe(0);
  });

  it('flattens to a 0x0 bitmap', () => {
    const glyph = makeBlankGlyph('font-1', 0x41, 8);
    const flat = flattenGlyph(glyph);

    expect(flat.width).toBe(0);
    expect(flat.height).toBe(0);
    expect(flat.pixels.length).toBe(0);
  });

  it('defaults xadvance to DEFAULT_XADVANCE_RATIO × the cell width, rounded', () => {
    const glyph = makeBlankGlyph('font-1', 0x41, 8);

    expect(glyph.bmf.xadvance).toBe(Math.round(8 * DEFAULT_XADVANCE_RATIO));
    expect(glyph.bmf.xoffset).toBe(0);
    expect(glyph.bmf.yoffset).toBe(0);
  });

  it('is not marked dirty', () => {
    const glyph = makeBlankGlyph('font-1', 0x41, 8);

    expect(glyph.isDirty).toBe(false);
  });
});

describe('initializeGlyphs', () => {
  it('produces one glyph per code point, preserving order', () => {
    const codePoints = [0x41, 0x42, 0x43];
    const glyphs = initializeGlyphs('font-1', codePoints, 8);

    expect(glyphs).toHaveLength(3);
    expect(glyphs.map((glyph) => glyph.codePoint)).toEqual(codePoints);
  });

  it('returns an empty array when no code points are given', () => {
    expect(initializeGlyphs('font-1', [], 8)).toEqual([]);
  });

  it('produces blank glyphs that flatten to 0x0', () => {
    const glyphs = initializeGlyphs('font-1', [0x41, 0x42], 6);

    for (const glyph of glyphs) {
      const flat = flattenGlyph(glyph);

      expect(flat.width).toBe(0);
      expect(flat.height).toBe(0);
    }
  });
});
