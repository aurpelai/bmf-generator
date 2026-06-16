import { describe, expect, it } from 'vitest';

import { flattenGlyph, makeBaseLayerFromBitmap, makeBlankLayer } from './layers';
import type { Glyph, Layer } from './types';

function makeGlyph(layers: Layer[]): Glyph {
  return {
    codePoint: 0x41,
    projectId: 'project-1',
    layers,
    pixels: new Uint8Array(0),
    width: 0,
    height: 0,
    xoffset: 0,
    yoffset: 0,
    xadvance: 0,
    isDirty: false,
  };
}

function inkLayer(width: number, height: number, xoffset: number, yoffset: number, ink: number[]): Layer {
  const pixels = new Uint8Array(width * height);

  ink.forEach((value, index) => {
    pixels[index] = value;
  });

  return {
    ...makeBlankLayer(),
    pixels,
    width,
    height,
    xoffset,
    yoffset,
  };
}

describe('flattenGlyph', () => {
  it('returns a 0×0 result when every layer is empty', () => {
    const glyph = makeGlyph([makeBlankLayer(), makeBlankLayer({ index: 1 })]);
    const result = flattenGlyph(glyph);

    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
    expect(result.pixels.length).toBe(0);
    expect(result.xoffset).toBe(0);
    expect(result.yoffset).toBe(0);
  });

  it('flattens a single layer to its own bounds and offset', () => {
    const layer = inkLayer(2, 2, 3, 5, [10, 20, 30, 40]);
    const result = flattenGlyph(makeGlyph([layer]));

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.xoffset).toBe(3);
    expect(result.yoffset).toBe(5);
    expect(Array.from(result.pixels)).toEqual([10, 20, 30, 40]);
  });

  it('takes the max value when two layers overlap', () => {
    const lower = inkLayer(2, 1, 0, 0, [50, 200]);
    const upper = inkLayer(2, 1, 1, 0, [255, 10]);
    const result = flattenGlyph(makeGlyph([lower, upper]));

    // Union bbox: x ∈ [0, 3), y ∈ [0, 1)
    expect(result.width).toBe(3);
    expect(result.height).toBe(1);
    expect(result.xoffset).toBe(0);
    expect(result.yoffset).toBe(0);
    // lower contributes [50, 200, 0]; upper contributes [_, 255, 10]; max wins.
    expect(Array.from(result.pixels)).toEqual([50, 255, 10]);
  });

  it('handles negative offsets and unions correctly', () => {
    const a = inkLayer(1, 1, -2, -1, [128]);
    const b = inkLayer(1, 1, 3, 4, [64]);
    const result = flattenGlyph(makeGlyph([a, b]));

    expect(result.xoffset).toBe(-2);
    expect(result.yoffset).toBe(-1);
    expect(result.width).toBe(6);
    expect(result.height).toBe(6);
    // a sits at (0, 0) in the result buffer; b at (5, 5).
    expect(result.pixels[0]).toBe(128);
    expect(result.pixels[5 * 6 + 5]).toBe(64);
  });

  it('skips hidden layers by default', () => {
    const visibleLayer = inkLayer(1, 1, 0, 0, [200]);
    const hiddenLayer = { ...inkLayer(1, 1, 5, 5, [100]), visible: false };
    const result = flattenGlyph(makeGlyph([visibleLayer, hiddenLayer]));

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(Array.from(result.pixels)).toEqual([200]);
  });

  it('includes hidden layers when includeHidden is true', () => {
    const visibleLayer = inkLayer(1, 1, 0, 0, [200]);
    const hiddenLayer = { ...inkLayer(1, 1, 2, 0, [100]), visible: false };
    const result = flattenGlyph(makeGlyph([visibleLayer, hiddenLayer]), { includeHidden: true });

    expect(result.width).toBe(3);
    expect(Array.from(result.pixels)).toEqual([200, 0, 100]);
  });
});

describe('makeBaseLayerFromBitmap', () => {
  it('copies the source bitmap so later mutation does not bleed through', () => {
    const source = new Uint8Array([1, 2, 3, 4]);
    const layer = makeBaseLayerFromBitmap({
      pixels: source,
      width: 2,
      height: 2,
      xoffset: 7,
      yoffset: 9,
    });

    source[0] = 99;

    expect(layer.pixels[0]).toBe(1);
    expect(layer.width).toBe(2);
    expect(layer.height).toBe(2);
    expect(layer.xoffset).toBe(7);
    expect(layer.yoffset).toBe(9);
    expect(layer.name).toBe('Base');
    expect(layer.visible).toBe(true);
  });
});
