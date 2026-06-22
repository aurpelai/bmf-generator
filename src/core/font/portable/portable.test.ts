import { describe, expect, it } from 'vitest';

import { createFont } from '../font';
import { makeBlankGlyph } from '../glyphs';
import { flattenGlyph, makeBlankLayer } from '../layers';
import type { Glyph, Layer } from '../types';
import { toBase64 } from './codec';
import { exportPortableFont } from './export';
import { importPortableFont } from './import';

function inkedLayer(
  width: number,
  height: number,
  bytes: number[],
  overrides: Partial<Layer> = {},
): Layer {
  return {
    ...makeBlankLayer(),
    pixels: new Uint8Array(bytes),
    width,
    height,
    ...overrides,
  };
}

function inkedGlyph(fontId: string, codePoint: number, bytes: number[]): Glyph {
  const glyph = makeBlankGlyph(fontId, codePoint, 4);

  glyph.layers[0] = {
    ...glyph.layers[0],
    pixels: new Uint8Array(bytes),
    width: 4,
    height: 4,
  };

  return glyph;
}

describe('PortableFont v3 round-trip', () => {
  it('preserves the font object byte-for-byte', () => {
    const font = createFont('Round Trip');
    const glyphs: Glyph[] = [makeBlankGlyph(font.id, 0x41, 4)];

    const restored = importPortableFont(exportPortableFont(font, glyphs));

    expect(restored.font).toEqual(font);
  });

  it('round-trips a multi-layer glyph with full layer metadata preserved', () => {
    const font = createFont('Layers');
    const baseLayer = inkedLayer(2, 2, [10, 20, 30, 40], {
      id: 'layer-base',
      name: 'Base',
      colorIndex: 0,
      xoffset: 1,
      yoffset: 2,
    });
    const overlay = inkedLayer(2, 2, [100, 110, 120, 130], {
      id: 'layer-overlay',
      name: 'Overlay',
      colorIndex: 2,
      xoffset: 3,
      yoffset: 4,
      visible: false,
      preview: false,
      locked: true,
    });
    const glyph: Glyph = {
      codePoint: 0x41,
      fontId: font.id,
      layers: [baseLayer, overlay],
      bmf: { xoffset: 5, yoffset: 6, xadvance: 7 },
      isDirty: true,
      alphaThreshold: 200,
    };

    const restored = importPortableFont(exportPortableFont(font, [glyph]));
    const restoredGlyph = restored.glyphs[0];

    expect(restoredGlyph.layers).toHaveLength(2);
    expect(restoredGlyph.bmf).toEqual({ xoffset: 5, yoffset: 6, xadvance: 7 });
    expect(restoredGlyph.isDirty).toBe(true);
    expect(restoredGlyph.alphaThreshold).toBe(200);

    const [restoredBase, restoredOverlay] = restoredGlyph.layers;

    expect(restoredBase.id).toBe('layer-base');
    expect(restoredBase.name).toBe('Base');
    expect(restoredBase.colorIndex).toBe(0);
    expect(restoredBase.xoffset).toBe(1);
    expect(restoredBase.yoffset).toBe(2);
    expect(restoredBase.visible).toBe(true);
    expect(restoredBase.preview).toBe(true);
    expect(restoredBase.locked).toBe(false);
    expect(Array.from(restoredBase.pixels)).toEqual([10, 20, 30, 40]);

    expect(restoredOverlay.id).toBe('layer-overlay');
    expect(restoredOverlay.colorIndex).toBe(2);
    expect(restoredOverlay.xoffset).toBe(3);
    expect(restoredOverlay.yoffset).toBe(4);
    expect(restoredOverlay.visible).toBe(false);
    expect(restoredOverlay.preview).toBe(false);
    expect(restoredOverlay.locked).toBe(true);
    expect(Array.from(restoredOverlay.pixels)).toEqual([100, 110, 120, 130]);
  });

  it('restores per-layer pixels as Uint8Array', () => {
    const font = createFont('Type');
    const glyphs: Glyph[] = [
      inkedGlyph(font.id, 0x41, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
    ];

    const restored = importPortableFont(exportPortableFont(font, glyphs));

    expect(restored.glyphs[0].layers[0].pixels).toBeInstanceOf(Uint8Array);
  });

  it('handles bytes across the full 0–255 range', () => {
    const font = createFont('Range');
    const bytes = Array.from({ length: 16 }, (_value, index) => index * 17);
    const glyphs: Glyph[] = [inkedGlyph(font.id, 0x41, bytes)];

    const restored = importPortableFont(exportPortableFont(font, glyphs));

    expect(Array.from(restored.glyphs[0].layers[0].pixels)).toEqual(bytes);
  });

  it('preserves multiple glyphs in order', () => {
    const font = createFont('Order');
    const glyphs: Glyph[] = [
      makeBlankGlyph(font.id, 0x41, 4),
      makeBlankGlyph(font.id, 0x42, 4),
      makeBlankGlyph(font.id, 0x43, 4),
    ];

    const restored = importPortableFont(exportPortableFont(font, glyphs));

    expect(restored.glyphs.map((glyph) => glyph.codePoint)).toEqual([0x41, 0x42, 0x43]);
  });
});

describe('importPortableFont v2 shim', () => {
  it('reconstructs a single base layer from a v2 bundle', () => {
    const font = createFont('Legacy');
    const pattern = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160];
    const v2Bundle = JSON.stringify({
      version: 2,
      font,
      glyphs: [
        {
          codePoint: 0x41,
          fontId: font.id,
          pixels: toBase64(new Uint8Array(pattern)),
          width: 4,
          height: 4,
          xoffset: 1,
          yoffset: 2,
          xadvance: 5,
          isDirty: false,
        },
      ],
    });

    const restored = importPortableFont(v2Bundle);
    const glyph = restored.glyphs[0];

    expect(glyph.layers).toHaveLength(1);
    expect(glyph.bmf).toEqual({ xoffset: 1, yoffset: 2, xadvance: 5 });
    expect(glyph.layers[0].xoffset).toBe(0);
    expect(glyph.layers[0].yoffset).toBe(0);
    expect(Array.from(glyph.layers[0].pixels)).toEqual(pattern);
  });

  it('produces a flattenGlyph result equal to the v2 stored bitmap', () => {
    const font = createFont('Flatten');
    const bytes = [1, 2, 3, 4];
    const v2Bundle = JSON.stringify({
      version: 2,
      font,
      glyphs: [
        {
          codePoint: 0x41,
          fontId: font.id,
          pixels: toBase64(new Uint8Array(bytes)),
          width: 2,
          height: 2,
          xoffset: 0,
          yoffset: 0,
          xadvance: 2,
          isDirty: false,
        },
      ],
    });

    const flat = flattenGlyph(importPortableFont(v2Bundle).glyphs[0]);

    expect(Array.from(flat.pixels)).toEqual(bytes);
  });
});

describe('importPortableFont error handling', () => {
  it('throws on unsupported version', () => {
    const bundle = JSON.stringify({ version: 1, font: { id: 'x' }, glyphs: [] });

    expect(() => importPortableFont(bundle)).toThrow('Unsupported font version: 1');
  });

  it('throws when the font bundle is missing a font id', () => {
    const bundle = JSON.stringify({ version: 3, font: {}, glyphs: [] });

    expect(() => importPortableFont(bundle)).toThrow('Invalid font bundle');
  });
});
