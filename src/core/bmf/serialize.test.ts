import { describe, expect, it } from 'vitest';

import { createFont } from '../font/font';
import type { BmfGlyphData } from './serialize';
import { serializeBmfText } from './serialize';

function makeGlyphData(
  codePoint: number,
  x: number,
  y: number,
  w: number,
  h: number,
): BmfGlyphData {
  return {
    placement: { codePoint, x, y, width: w, height: h, trimX: 0, trimY: 0 },
    codePoint,
    bmf: { xoffset: 0, yoffset: 0, xadvance: w + 1 },
  };
}

describe('serializeBmfText', () => {
  it('produces an info line', () => {
    const font = createFont('TestFont');
    const output = serializeBmfText({
      font,
      glyphs: [],
      atlasWidth: 256,
      atlasHeight: 256,
      atlasFilename: 'TestFont.png',
    });

    expect(output).toContain('info face="TestFont"');
    expect(output).toContain('size=32');
  });

  it('produces a common line with correct dimensions', () => {
    const font = createFont('TestFont');
    const output = serializeBmfText({
      font,
      glyphs: [],
      atlasWidth: 512,
      atlasHeight: 256,
      atlasFilename: 'TestFont.png',
    });

    expect(output).toContain('scaleW=512');
    expect(output).toContain('scaleH=256');
    expect(output).toContain('lineHeight=36');
    expect(output).toContain('base=28');
  });

  it('produces a page line with the atlas filename', () => {
    const font = createFont('TestFont');
    const output = serializeBmfText({
      font,
      glyphs: [],
      atlasWidth: 256,
      atlasHeight: 256,
      atlasFilename: 'my-atlas.png',
    });

    expect(output).toContain('page id=0 file="my-atlas.png"');
  });

  it('produces a chars count line', () => {
    const font = createFont('TestFont');
    const glyphs = [makeGlyphData(65, 0, 0, 8, 12), makeGlyphData(66, 8, 0, 8, 12)];
    const output = serializeBmfText({
      font,
      glyphs,
      atlasWidth: 256,
      atlasHeight: 256,
      atlasFilename: 'TestFont.png',
    });

    expect(output).toContain('chars count=2');
  });

  it('produces a char line per glyph with correct fields', () => {
    const font = createFont('TestFont');
    const glyphs = [makeGlyphData(65, 4, 8, 10, 14)];
    const output = serializeBmfText({
      font,
      glyphs,
      atlasWidth: 256,
      atlasHeight: 256,
      atlasFilename: 'TestFont.png',
    });

    expect(output).toContain('char id=65 x=4 y=8 width=10 height=14');
    expect(output).toContain('xadvance=11');
    expect(output).toContain('page=0 chnl=15');
  });

  it('includes padding in the info line', () => {
    const font = createFont('TestFont', {
      padding: { top: 2, right: 2, bottom: 2, left: 2 },
    });
    const output = serializeBmfText({
      font,
      glyphs: [],
      atlasWidth: 256,
      atlasHeight: 256,
      atlasFilename: 'TestFont.png',
    });

    expect(output).toContain('padding=2,2,2,2');
  });

  it('ends with a newline', () => {
    const font = createFont('TestFont');
    const output = serializeBmfText({
      font,
      glyphs: [],
      atlasWidth: 256,
      atlasHeight: 256,
      atlasFilename: 'TestFont.png',
    });

    expect(output.endsWith('\n')).toBe(true);
  });
});
