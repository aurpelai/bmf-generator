import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rasterizeFont } from './rasterize';

interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface FakeGlyph {
  index: number;
  advanceWidth: number;
  getBoundingBox: () => BoundingBox;
  getPath: (x: number, y: number, fontSize: number) => { draw: (ctx: unknown) => void };
}

function makeFakeGlyph(index: number, advanceWidth: number, boundingBox: BoundingBox): FakeGlyph {
  return {
    index,
    advanceWidth,
    getBoundingBox: () => boundingBox,
    getPath: () => ({ draw: () => undefined }),
  };
}

interface FakeFont {
  ascender: number;
  descender: number;
  unitsPerEm: number;
  tables: { os2?: { sTypoLineGap?: number; sCapHeight?: number } };
  glyphs: { get: (index: number) => FakeGlyph | undefined };
  charToGlyph: (char: string) => FakeGlyph | undefined;
  charToGlyphIndex: (char: string) => number;
}

const parseMock = vi.fn();

vi.mock('opentype.js', () => ({
  default: {
    parse: (buffer: ArrayBuffer): unknown => parseMock(buffer),
  },
}));

class FakeOffscreenCanvas {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext(_contextId: string): {
    getImageData: (
      x: number,
      y: number,
      width: number,
      height: number,
    ) => { data: Uint8ClampedArray };
  } {
    return {
      getImageData: (_x, _y, width, height) => {
        // Fully opaque RGBA buffer — alpha = 255 everywhere
        const data = new Uint8ClampedArray(width * height * 4);

        for (let index = 0; index < width * height; index++) {
          data[index * 4 + 3] = 255;
        }

        return { data };
      },
    };
  }
}

function makeFakeFont(overrides: Partial<FakeFont> = {}): FakeFont {
  const defaultGlyph = makeFakeGlyph(1, 600, { x1: 0, y1: 0, x2: 500, y2: 700 });

  return {
    ascender: 800,
    descender: -200,
    unitsPerEm: 1000,
    tables: { os2: { sTypoLineGap: 100, sCapHeight: 700 } },
    glyphs: {
      get: () => defaultGlyph,
    },
    charToGlyph: () => defaultGlyph,
    charToGlyphIndex: () => 1,
    ...overrides,
  };
}

beforeEach(() => {
  // jsdom does not provide OffscreenCanvas; install a deterministic stub
  (globalThis as unknown as { OffscreenCanvas: typeof FakeOffscreenCanvas }).OffscreenCanvas =
    FakeOffscreenCanvas;
});

afterEach(() => {
  parseMock.mockReset();
  delete (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
});

describe('rasterizeFont metrics', () => {
  it('computes lineHeight from ascender − descender + typo line gap, scaled', () => {
    parseMock.mockReturnValue(makeFakeFont());

    const result = rasterizeFont({
      fontBuffer: new ArrayBuffer(8),
      codePoints: [],
      fontSize: 100,
    });

    // scale = 100 / 1000 = 0.1; lineHeight = (800 − (−200) + 100) × 0.1 = 110
    expect(result.lineHeight).toBe(110);
    expect(result.base).toBe(80); // 800 × 0.1
    expect(result.capHeight).toBe(70); // 700 × 0.1
  });

  it('falls back to 0.7 × ascender for capHeight when os2.sCapHeight is missing', () => {
    parseMock.mockReturnValue(
      makeFakeFont({
        tables: { os2: { sTypoLineGap: 0 } },
      }),
    );

    const result = rasterizeFont({
      fontBuffer: new ArrayBuffer(8),
      codePoints: [],
      fontSize: 100,
    });

    // Math.round(800 × 0.7) × 0.1 → Math.round(560) × 0.1 = 56
    expect(result.capHeight).toBe(56);
  });

  it('handles a missing os2 table entirely', () => {
    parseMock.mockReturnValue(makeFakeFont({ tables: {} }));

    const result = rasterizeFont({
      fontBuffer: new ArrayBuffer(8),
      codePoints: [],
      fontSize: 100,
    });

    expect(result.lineHeight).toBe(100); // 800 − (−200) + 0 = 1000 → ×0.1
    expect(result.capHeight).toBe(56);
  });
});

describe('rasterizeFont non-outlined glyphs', () => {
  it('produces a blank glyph entry for non-outlined characters (index 0)', () => {
    const spaceGlyph = makeFakeGlyph(0, 250, { x1: 0, y1: 0, x2: 0, y2: 0 });

    parseMock.mockReturnValue(
      makeFakeFont({
        charToGlyph: () => spaceGlyph,
        charToGlyphIndex: () => 0,
        glyphs: { get: () => spaceGlyph },
      }),
    );

    const result = rasterizeFont({
      fontBuffer: new ArrayBuffer(8),
      codePoints: [0x20],
      fontSize: 100,
    });

    expect(result.glyphs).toHaveLength(1);
    expect(result.glyphs[0].pixels.length).toBe(0);
    expect(result.glyphs[0].width).toBe(0);
    expect(result.glyphs[0].height).toBe(0);
  });

  it('uses the space glyph advance for non-outlined glyphs', () => {
    const spaceGlyph = makeFakeGlyph(0, 250, { x1: 0, y1: 0, x2: 0, y2: 0 });

    parseMock.mockReturnValue(
      makeFakeFont({
        charToGlyph: () => spaceGlyph,
        charToGlyphIndex: () => 0,
        glyphs: { get: () => spaceGlyph },
      }),
    );

    const result = rasterizeFont({
      fontBuffer: new ArrayBuffer(8),
      codePoints: [0x20],
      fontSize: 100,
    });

    // 250 × 0.1 = 25
    expect(result.glyphs[0].xadvance).toBe(25);
  });
});

describe('rasterizeFont zero-area bounding boxes', () => {
  it('returns blank pixels but preserves offsets and advance', () => {
    // x1 === x2: bb width is zero → width <= 0 branch
    const collapsedGlyph = makeFakeGlyph(5, 300, { x1: 100, y1: 0, x2: 100, y2: 200 });

    parseMock.mockReturnValue(
      makeFakeFont({
        charToGlyph: () => collapsedGlyph,
      }),
    );

    const result = rasterizeFont({
      fontBuffer: new ArrayBuffer(8),
      codePoints: [0x41],
      fontSize: 100,
    });

    expect(result.glyphs[0].pixels.length).toBe(0);
    expect(result.glyphs[0].width).toBe(0);
    expect(result.glyphs[0].height).toBe(0);
    expect(result.glyphs[0].xadvance).toBe(30); // 300 × 0.1
  });
});

describe('rasterizeFont normal glyphs', () => {
  it('produces a width × height pixel buffer copied from the alpha channel', () => {
    // bb: 0..500 × 0..700 → at scale 0.1: width=50, height=70
    const glyph = makeFakeGlyph(1, 600, { x1: 0, y1: 0, x2: 500, y2: 700 });

    parseMock.mockReturnValue(makeFakeFont({ charToGlyph: () => glyph }));

    const result = rasterizeFont({
      fontBuffer: new ArrayBuffer(8),
      codePoints: [0x41],
      fontSize: 100,
    });

    const rasterized = result.glyphs[0];

    expect(rasterized.width).toBe(50);
    expect(rasterized.height).toBe(70);
    expect(rasterized.pixels.length).toBe(50 * 70);
    // FakeOffscreenCanvas fills alpha = 255 everywhere
    expect(Array.from(rasterized.pixels.slice(0, 5))).toEqual([255, 255, 255, 255, 255]);
    expect(rasterized.xadvance).toBe(60); // 600 × 0.1
  });

  it('rasterises every requested code point in order', () => {
    parseMock.mockReturnValue(makeFakeFont());

    const result = rasterizeFont({
      fontBuffer: new ArrayBuffer(8),
      codePoints: [0x41, 0x42, 0x43],
      fontSize: 100,
    });

    expect(result.glyphs.map((glyph) => glyph.codePoint)).toEqual([0x41, 0x42, 0x43]);
  });
});
