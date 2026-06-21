import { describe, expect, it } from 'vitest';

import { initializeGlyphs, makeBlankGlyph } from './glyphs';

describe('makeBlankGlyph', () => {
  it('returns a glyph with the requested code point and font id', () => {
    const glyph = makeBlankGlyph('font-1', 0x41, 8, 12);

    expect(glyph.codePoint).toBe(0x41);
    expect(glyph.fontId).toBe('font-1');
  });

  it('allocates a pixel buffer sized width × height', () => {
    const glyph = makeBlankGlyph('font-1', 0x41, 8, 12);

    expect(glyph.pixels).toBeInstanceOf(Uint8Array);
    expect(glyph.pixels.length).toBe(8 * 12);
  });

  it('zero-initialises the pixel buffer', () => {
    const glyph = makeBlankGlyph('font-1', 0x41, 4, 4);

    for (const value of glyph.pixels) {
      expect(value).toBe(0);
    }
  });

  it('defaults xadvance to 0.7× the cell width, rounded', () => {
    const glyph = makeBlankGlyph('font-1', 0x41, 8, 12);

    expect(glyph.xadvance).toBe(Math.round(8 * 0.7));
    expect(glyph.xoffset).toBe(0);
    expect(glyph.yoffset).toBe(0);
  });

  it('is not marked dirty', () => {
    const glyph = makeBlankGlyph('font-1', 0x41, 8, 12);

    expect(glyph.isDirty).toBe(false);
  });
});

describe('initializeGlyphs', () => {
  it('produces one glyph per code point, preserving order', () => {
    const codePoints = [0x41, 0x42, 0x43];
    const glyphs = initializeGlyphs('font-1', codePoints, 8, 12);

    expect(glyphs).toHaveLength(3);
    expect(glyphs.map((glyph) => glyph.codePoint)).toEqual(codePoints);
  });

  it('returns an empty array when no code points are given', () => {
    expect(initializeGlyphs('font-1', [], 8, 12)).toEqual([]);
  });

  it('sizes every glyph buffer identically', () => {
    const glyphs = initializeGlyphs('font-1', [0x41, 0x42], 6, 10);

    for (const glyph of glyphs) {
      expect(glyph.width).toBe(6);
      expect(glyph.height).toBe(10);
      expect(glyph.pixels.length).toBe(60);
    }
  });
});
