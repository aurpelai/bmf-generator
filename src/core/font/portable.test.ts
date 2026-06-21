import { describe, expect, it } from 'vitest';

import { createFont } from './font';
import { makeBlankGlyph } from './glyphs';
import { exportPortableFont, importPortableFont } from './portable';
import type { Glyph } from './types';

function inkedGlyph(fontId: string, codePoint: number, bytes: number[]): Glyph {
  const glyph = makeBlankGlyph(fontId, codePoint, 4, 4);

  glyph.pixels.set(bytes);

  return glyph;
}

describe('portable font round-trip', () => {
  it('preserves font fields through export → import', () => {
    const font = createFont('Round Trip');
    const glyphs: Glyph[] = [makeBlankGlyph(font.id, 0x41, 4, 4)];

    const json = exportPortableFont(font, glyphs);
    const restored = importPortableFont(json);

    expect(restored.font).toEqual(font);
  });

  it('preserves glyph pixel bytes', () => {
    const font = createFont('Pixels');
    const pattern = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160];
    const glyphs: Glyph[] = [inkedGlyph(font.id, 0x41, pattern)];

    const restored = importPortableFont(exportPortableFont(font, glyphs));

    expect(Array.from(restored.glyphs[0].pixels)).toEqual(pattern);
  });

  it('restores pixels as Uint8Array, not a plain array', () => {
    const font = createFont('Type');
    const glyphs: Glyph[] = [makeBlankGlyph(font.id, 0x41, 4, 4)];

    const restored = importPortableFont(exportPortableFont(font, glyphs));

    expect(restored.glyphs[0].pixels).toBeInstanceOf(Uint8Array);
  });

  it('handles bytes across the full 0–255 range', () => {
    const font = createFont('Range');
    const bytes = Array.from({ length: 16 }, (_value, index) => index * 17); // 0, 17, 34, … 255
    const glyphs: Glyph[] = [inkedGlyph(font.id, 0x41, bytes)];

    const restored = importPortableFont(exportPortableFont(font, glyphs));

    expect(Array.from(restored.glyphs[0].pixels)).toEqual(bytes);
  });

  it('preserves multiple glyphs in order', () => {
    const font = createFont('Order');
    const glyphs: Glyph[] = [
      makeBlankGlyph(font.id, 0x41, 4, 4),
      makeBlankGlyph(font.id, 0x42, 4, 4),
      makeBlankGlyph(font.id, 0x43, 4, 4),
    ];

    const restored = importPortableFont(exportPortableFont(font, glyphs));

    expect(restored.glyphs.map((glyph) => glyph.codePoint)).toEqual([0x41, 0x42, 0x43]);
  });
});

describe('importPortableFont error handling', () => {
  it('throws on unsupported version', () => {
    const bundle = JSON.stringify({ version: 1, font: { id: 'x' }, glyphs: [] });

    expect(() => importPortableFont(bundle)).toThrow('Unsupported font version: 1');
  });

  it('throws when the font bundle is missing a font id', () => {
    const bundle = JSON.stringify({ version: 2, font: {}, glyphs: [] });

    expect(() => importPortableFont(bundle)).toThrow('Invalid font bundle');
  });
});
