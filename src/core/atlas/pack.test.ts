import { describe, expect, it } from 'vitest';

import { makeBaseLayerFromBitmap } from '../font/layers';
import type { Glyph } from '../font/types';
import { chooseAtlasSize, packGlyphs } from './pack';

function makeGlyph(
  codePoint: number,
  width: number,
  height: number,
  inkAt: [number, number][],
): Glyph {
  const pixels = new Uint8Array(width * height);

  for (const [x, y] of inkAt) {
    pixels[y * width + x] = 255;
  }

  return {
    codePoint,
    fontId: 'font-1',
    layers: [makeBaseLayerFromBitmap({ pixels, width, height, xoffset: 0, yoffset: 0 })],
    bmf: { xoffset: 0, yoffset: 0, xadvance: width },
    pixels,
    width,
    height,
    xoffset: 0,
    yoffset: 0,
    xadvance: width,
    isDirty: false,
  };
}

function filledGlyph(codePoint: number, width: number, height: number): Glyph {
  const pixels = new Uint8Array(width * height).fill(255);

  return {
    codePoint,
    fontId: 'font-1',
    layers: [makeBaseLayerFromBitmap({ pixels, width, height, xoffset: 0, yoffset: 0 })],
    bmf: { xoffset: 0, yoffset: 0, xadvance: width },
    pixels,
    width,
    height,
    xoffset: 0,
    yoffset: 0,
    xadvance: width,
    isDirty: false,
  };
}

describe('packGlyphs trimming', () => {
  it('trims blank surrounding pixels and reports the trim offset', () => {
    // 6×6 glyph with ink only at (2,2)..(3,3) — a 2×2 block inset by 2
    const inkPositions: [number, number][] = [
      [2, 2],
      [3, 2],
      [2, 3],
      [3, 3],
    ];
    const glyph = makeGlyph(0x41, 6, 6, inkPositions);

    const result = packGlyphs([glyph], {
      atlasWidth: 64,
      atlasHeight: 64,
      padding: 0,
      defaultAlphaThreshold: 128,
    });
    const placement = result.placements[0];

    expect(placement.width).toBe(2);
    expect(placement.height).toBe(2);
    expect(placement.trimX).toBe(2);
    expect(placement.trimY).toBe(2);
  });

  it('treats blank glyphs as zero-sized and gives them x=0, y=0', () => {
    const blank = makeGlyph(0x20, 4, 4, []);

    const result = packGlyphs([blank], {
      atlasWidth: 64,
      atlasHeight: 64,
      padding: 1,
      defaultAlphaThreshold: 128,
    });
    const placement = result.placements[0];

    expect(placement.width).toBe(0);
    expect(placement.height).toBe(0);
    expect(placement.x).toBe(0);
    expect(placement.y).toBe(0);
    expect(placement.trimX).toBe(0);
    expect(placement.trimY).toBe(0);
  });

  it('preserves code points across placements', () => {
    const glyphs = [filledGlyph(0x41, 8, 8), filledGlyph(0x42, 8, 8)];

    const result = packGlyphs(glyphs, {
      atlasWidth: 64,
      atlasHeight: 64,
      padding: 0,
      defaultAlphaThreshold: 128,
    });
    const placedCodePoints = result.placements.map((placement) => placement.codePoint).sort();

    expect(placedCodePoints).toEqual([0x41, 0x42]);
  });
});

describe('packGlyphs padding', () => {
  it('shifts placement origin in by the padding amount', () => {
    // A single filled glyph: its trimmed bounds equal its full bounds, and the
    // packed rect is (width + 2·padding) × (height + 2·padding). The placement
    // x/y point at the glyph itself, i.e. padding inside the packed rect.
    const glyph = filledGlyph(0x41, 4, 4);

    const result = packGlyphs([glyph], {
      atlasWidth: 64,
      atlasHeight: 64,
      padding: 2,
      defaultAlphaThreshold: 128,
    });
    const placement = result.placements[0];

    expect(placement.x).toBeGreaterThanOrEqual(2);
    expect(placement.y).toBeGreaterThanOrEqual(2);
  });
});

describe('packGlyphs efficiency and overflow', () => {
  it('reports a fractional efficiency in (0, 1] for a non-trivial pack', () => {
    const glyphs = [filledGlyph(0x41, 16, 16), filledGlyph(0x42, 16, 16)];

    const result = packGlyphs(glyphs, {
      atlasWidth: 64,
      atlasHeight: 64,
      padding: 0,
      defaultAlphaThreshold: 128,
    });

    expect(result.efficiency).toBeGreaterThan(0);
    expect(result.efficiency).toBeLessThanOrEqual(1);
  });

  it('surfaces unpacked code points when the atlas is too small', () => {
    const glyphs = [
      filledGlyph(0x41, 32, 32),
      filledGlyph(0x42, 32, 32),
      filledGlyph(0x43, 32, 32),
    ];

    // 32×32 only fits one 32×32 rect — the other two must spill into unpacked
    const result = packGlyphs(glyphs, {
      atlasWidth: 32,
      atlasHeight: 32,
      padding: 0,
      defaultAlphaThreshold: 128,
    });

    expect(result.unpacked.length).toBeGreaterThan(0);
    expect(result.unpacked.every((codePoint) => [0x41, 0x42, 0x43].includes(codePoint))).toBe(true);
  });
});

describe('chooseAtlasSize', () => {
  it('returns one of the predefined candidate sizes', () => {
    const glyphs = [filledGlyph(0x41, 8, 8)];

    const [width, height] = chooseAtlasSize(glyphs, 1, 128);
    const candidates: [number, number][] = [
      [64, 64],
      [128, 64],
      [128, 128],
      [256, 128],
      [256, 256],
      [512, 256],
      [512, 512],
      [1024, 512],
      [1024, 1024],
      [2048, 1024],
      [2048, 2048],
      [4096, 2048],
      [4096, 4096],
    ];

    expect(candidates).toContainEqual([width, height]);
  });

  it('picks the smallest size that actually fits the input', () => {
    const glyphs = Array.from({ length: 4 }, (_value, index) => filledGlyph(0x41 + index, 8, 8));

    const [width, height] = chooseAtlasSize(glyphs, 0, 128);

    // Four 8×8 glyphs (256 px²) easily fit in 64×64 (4096 px²)
    expect(width).toBe(64);
    expect(height).toBe(64);
  });

  it('never returns a size too small for the input', () => {
    const glyphs = Array.from({ length: 8 }, (_value, index) => filledGlyph(0x41 + index, 32, 32));

    const [width, height] = chooseAtlasSize(glyphs, 1, 128);
    const result = packGlyphs(glyphs, {
      atlasWidth: width,
      atlasHeight: height,
      padding: 1,
      defaultAlphaThreshold: 128,
    });

    expect(result.unpacked).toEqual([]);
  });
});
