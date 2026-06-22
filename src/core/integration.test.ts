import { describe, expect, it } from 'vitest';

import { packGlyphs } from './atlas/pack';
import { parseBmfText } from './bmf/parse';
import type { BmfGlyphData } from './bmf/serialize';
import { serializeBmfText } from './bmf/serialize';
import { createFont } from './font/font';
import { makeBlankGlyph } from './font/glyphs';
import type { Glyph } from './font/types';

function inkBlock(
  glyph: Glyph,
  cellWidth: number,
  cellHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
): Glyph {
  const layer = glyph.layers[0];
  // The base layer starts at width=0/height=0 — resize it to the glyph cell and ink the inner block.
  const pixels = new Uint8Array(cellWidth * cellHeight);

  for (let row = y; row < y + height; row++) {
    for (let column = x; column < x + width; column++) {
      pixels[row * cellWidth + column] = 255;
    }
  }

  layer.pixels = pixels;
  layer.width = cellWidth;
  layer.height = cellHeight;
  layer.xoffset = 0;
  layer.yoffset = 0;

  glyph.bmf = { xoffset: 1, yoffset: 2, xadvance: cellWidth + 1 };

  return glyph;
}

describe('pack → serialize → parse round-trip', () => {
  it('preserves face name, common metrics, and char entries', () => {
    const font = createFont('Integration', {
      padding: { top: 1, right: 1, bottom: 1, left: 1 },
    });

    // 3 glyphs, each 8×8, ink in a 4×4 inner block so trimming has work to do
    const glyphs: Glyph[] = [0x41, 0x42, 0x43].map((codePoint) =>
      inkBlock(makeBlankGlyph(font.id, codePoint, 8), 8, 8, 2, 2, 4, 4),
    );

    const atlasWidth = 64;
    const atlasHeight = 64;
    const packed = packGlyphs(glyphs, {
      atlasWidth,
      atlasHeight,
      padding: 1,
      defaultAlphaThreshold: 128,
    });

    expect(packed.unpacked).toEqual([]);

    const glyphData: BmfGlyphData[] = packed.placements.map((placement) => {
      const sourceGlyph = glyphs.find((glyph) => glyph.codePoint === placement.codePoint);

      if (!sourceGlyph) {
        throw new Error(`Missing source glyph for ${placement.codePoint}`);
      }

      return {
        placement,
        codePoint: sourceGlyph.codePoint,
        bmf: sourceGlyph.bmf,
      };
    });

    const fnt = serializeBmfText({
      font,
      glyphs: glyphData,
      atlasWidth,
      atlasHeight,
      atlasFilename: 'Integration.png',
    });

    const parsed = parseBmfText(fnt);

    expect(parsed.info.face).toBe('Integration');
    expect(parsed.info.size).toBe(font.settings.fontSize);
    expect(parsed.info.padding).toEqual(font.settings.padding);
    expect(parsed.common.scaleW).toBe(atlasWidth);
    expect(parsed.common.scaleH).toBe(atlasHeight);
    expect(parsed.atlasFilename).toBe('Integration.png');
    expect(parsed.chars).toHaveLength(glyphs.length);

    // Every original placement round-trips through the parsed char entry
    for (const entry of glyphData) {
      const parsedChar = parsed.chars.find((char) => char.id === entry.placement.codePoint);

      expect(parsedChar).toBeDefined();
      expect(parsedChar?.x).toBe(entry.placement.x);
      expect(parsedChar?.y).toBe(entry.placement.y);
      expect(parsedChar?.width).toBe(entry.placement.width);
      expect(parsedChar?.height).toBe(entry.placement.height);
      expect(parsedChar?.xoffset).toBe(entry.bmf.xoffset);
      expect(parsedChar?.yoffset).toBe(entry.bmf.yoffset);
      expect(parsedChar?.xadvance).toBe(entry.bmf.xadvance);
    }
  });
});
