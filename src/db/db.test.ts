import { describe, expect, it } from 'vitest';

import type { Glyph } from '@/core/font/types';

import { upgradeGlyphV1ToV2 } from './db';

function makeV1Record(): Glyph & { id: string } {
  const pixels = new Uint8Array([10, 20, 30, 40, 50, 60]);

  // Cast through unknown to model a real v1 record (no `layers` field present).
  return {
    id: 'font-1:65',
    codePoint: 65,
    fontId: 'font-1',
    pixels,
    width: 3,
    height: 2,
    xoffset: 4,
    yoffset: 7,
    xadvance: 9,
    isDirty: true,
  } as unknown as Glyph & { id: string };
}

describe('upgradeGlyphV1ToV2', () => {
  it('wraps the legacy bitmap into a single base layer', () => {
    const record = makeV1Record();

    upgradeGlyphV1ToV2(record);

    expect(record.layers.length).toBe(1);
    const baseLayer = record.layers[0];

    expect(baseLayer.name).toBe('Base');
    expect(baseLayer.width).toBe(3);
    expect(baseLayer.height).toBe(2);
    expect(baseLayer.xoffset).toBe(4);
    expect(baseLayer.yoffset).toBe(7);
    expect(Array.from(baseLayer.pixels)).toEqual([10, 20, 30, 40, 50, 60]);
    expect(baseLayer.visible).toBe(true);
    expect(baseLayer.preview).toBe(true);
    expect(baseLayer.locked).toBe(false);
  });

  it('preserves legacy fields for one-shot rollback safety', () => {
    const record = makeV1Record();
    const legacy = record as unknown as {
      pixels: Uint8Array;
      width: number;
      height: number;
      xoffset: number;
      yoffset: number;
      xadvance: number;
    };
    const originalPixelsRef = legacy.pixels;

    upgradeGlyphV1ToV2(record);

    expect(legacy.pixels).toBe(originalPixelsRef);
    expect(legacy.width).toBe(3);
    expect(legacy.height).toBe(2);
    expect(legacy.xoffset).toBe(4);
    expect(legacy.yoffset).toBe(7);
    expect(legacy.xadvance).toBe(9);
    expect(record.isDirty).toBe(true);
  });

  it('detaches the layer bitmap from the legacy buffer so later edits do not desync mid-transaction', () => {
    const record = makeV1Record();
    const legacy = record as unknown as { pixels: Uint8Array };

    upgradeGlyphV1ToV2(record);
    legacy.pixels[0] = 255;

    expect(record.layers[0].pixels[0]).toBe(10);
  });
});
