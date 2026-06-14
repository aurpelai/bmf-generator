import { describe, expect, it } from 'vitest';

import { packGlyphs } from './atlas/pack';
import { parseBmfText } from './bmf/parse';
import type { BmfGlyphData } from './bmf/serialize';
import { serializeBmfText } from './bmf/serialize';
import { makeBlankGlyph } from './project/glyphs';
import { createProject } from './project/project';
import type { Glyph } from './project/types';

function inkBlock(glyph: Glyph, x: number, y: number, width: number, height: number): Glyph {
  for (let row = y; row < y + height; row++) {
    for (let column = x; column < x + width; column++) {
      glyph.pixels[row * glyph.width + column] = 255;
    }
  }

  glyph.xoffset = 1;
  glyph.yoffset = 2;
  glyph.xadvance = glyph.width + 1;

  return glyph;
}

describe('pack → serialize → parse round-trip', () => {
  it('preserves face name, common metrics, and char entries', () => {
    const project = createProject('Integration', { padding: { top: 1, right: 1, bottom: 1, left: 1 } });

    // 3 glyphs, each 8×8, ink in a 4×4 inner block so trimming has work to do
    const glyphs: Glyph[] = [0x41, 0x42, 0x43].map((codePoint) =>
      inkBlock(makeBlankGlyph(project.id, codePoint, 8, 8), 2, 2, 4, 4),
    );

    const atlasWidth = 64;
    const atlasHeight = 64;
    const packed = packGlyphs(glyphs, { atlasWidth, atlasHeight, padding: 1 });

    expect(packed.unpacked).toEqual([]);

    const glyphData: BmfGlyphData[] = packed.placements.map((placement) => {
      const sourceGlyph = glyphs.find((glyph) => glyph.codePoint === placement.codePoint);

      if (!sourceGlyph) {
        throw new Error(`Missing source glyph for ${placement.codePoint}`);
      }

      return {
        placement,
        glyph: {
          codePoint: sourceGlyph.codePoint,
          xoffset: sourceGlyph.xoffset,
          yoffset: sourceGlyph.yoffset,
          xadvance: sourceGlyph.xadvance,
        },
      };
    });

    const fnt = serializeBmfText({
      project,
      glyphs: glyphData,
      atlasWidth,
      atlasHeight,
      atlasFilename: 'Integration.png',
    });

    const parsed = parseBmfText(fnt);

    expect(parsed.info.face).toBe('Integration');
    expect(parsed.info.size).toBe(project.settings.fontSize);
    expect(parsed.info.padding).toEqual(project.settings.padding);
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
      expect(parsedChar?.xoffset).toBe(entry.glyph.xoffset);
      expect(parsedChar?.yoffset).toBe(entry.glyph.yoffset);
      expect(parsedChar?.xadvance).toBe(entry.glyph.xadvance);
    }
  });
});
