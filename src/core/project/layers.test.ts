import { describe, expect, it } from 'vitest';

import { MAX_LAYERS_PER_GLYPH } from '@/config';

import {
  addLayer,
  cycleHitLayer,
  flattenGlyph,
  hitTestLayer,
  makeBaseLayerFromBitmap,
  makeBlankLayer,
  removeLayer,
  reorderLayers,
  syncLegacyFields,
  trimLayerToInk,
  updateLayer,
  updateLayerPixels,
} from './layers';
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

describe('hitTestLayer', () => {
  it('returns the topmost visible layer with ink at the cell', () => {
    const lower = inkLayer(2, 1, 0, 0, [200, 200]);
    const upper = { ...inkLayer(2, 1, 1, 0, [255, 0]), id: 'upper' };
    const result = hitTestLayer(makeGlyph([lower, upper]), 1, 0, 128);

    expect(result?.id).toBe('upper');
  });

  it('skips hidden and locked layers', () => {
    const hidden = { ...inkLayer(1, 1, 0, 0, [255]), id: 'hidden', visible: false };
    const locked = { ...inkLayer(1, 1, 0, 0, [255]), id: 'locked', locked: true };
    const visible = { ...inkLayer(1, 1, 0, 0, [255]), id: 'visible' };
    const result = hitTestLayer(makeGlyph([hidden, locked, visible]), 0, 0, 128);

    expect(result?.id).toBe('visible');
  });

  it('returns null when no layer is inked under the cell', () => {
    const layer = inkLayer(2, 1, 0, 0, [0, 0]);

    expect(hitTestLayer(makeGlyph([layer]), 0, 0, 128)).toBeNull();
  });

  it('respects the threshold value', () => {
    const layer = inkLayer(1, 1, 0, 0, [100]);

    expect(hitTestLayer(makeGlyph([layer]), 0, 0, 50)).not.toBeNull();
    expect(hitTestLayer(makeGlyph([layer]), 0, 0, 150)).toBeNull();
  });
});

describe('cycleHitLayer', () => {
  it('returns the next layer beneath the current one under the cursor', () => {
    const a = { ...inkLayer(1, 1, 0, 0, [255]), id: 'a' };
    const b = { ...inkLayer(1, 1, 0, 0, [255]), id: 'b' };
    const c = { ...inkLayer(1, 1, 0, 0, [255]), id: 'c' };
    // layers ordered bottom-to-top: a, b, c. hits iterate top→bottom: [c, b, a].
    const glyph = makeGlyph([a, b, c]);

    expect(cycleHitLayer(glyph, 0, 0, 128, 'c')?.id).toBe('b');
    expect(cycleHitLayer(glyph, 0, 0, 128, 'b')?.id).toBe('a');
    expect(cycleHitLayer(glyph, 0, 0, 128, 'a')?.id).toBe('c');
  });

  it('returns the only hit when just one layer is inked', () => {
    const a = { ...inkLayer(1, 1, 0, 0, [255]), id: 'a' };

    expect(cycleHitLayer(makeGlyph([a]), 0, 0, 128, 'a')?.id).toBe('a');
  });
});

describe('layer mutators', () => {
  it('addLayer appends a fresh layer up to the cap', () => {
    let glyph = makeGlyph([makeBlankLayer()]);

    for (let index = 1; index < MAX_LAYERS_PER_GLYPH; index++) {
      glyph = addLayer(glyph);
    }

    expect(glyph.layers.length).toBe(MAX_LAYERS_PER_GLYPH);

    const capped = addLayer(glyph);

    expect(capped.layers.length).toBe(MAX_LAYERS_PER_GLYPH);
    expect(capped).toBe(glyph);
  });

  it('removeLayer refuses to leave a glyph with zero layers', () => {
    const onlyLayer = makeBlankLayer();
    const glyph = makeGlyph([onlyLayer]);
    const result = removeLayer(glyph, onlyLayer.id);

    expect(result.layers.length).toBe(1);
    expect(result).toBe(glyph);
  });

  it('removeLayer drops the matching layer', () => {
    const first = makeBlankLayer({ index: 0 });
    const second = makeBlankLayer({ index: 1 });
    const result = removeLayer(makeGlyph([first, second]), second.id);

    expect(result.layers.length).toBe(1);
    expect(result.layers[0].id).toBe(first.id);
  });

  it('reorderLayers moves a layer to a new index', () => {
    const a = makeBlankLayer({ index: 0 });
    const b = makeBlankLayer({ index: 1 });
    const c = makeBlankLayer({ index: 2 });
    const result = reorderLayers(makeGlyph([a, b, c]), 0, 2);

    expect(result.layers.map((layer) => layer.id)).toEqual([b.id, c.id, a.id]);
  });

  it('updateLayer patches the matching layer without touching others', () => {
    const a = makeBlankLayer({ index: 0 });
    const b = makeBlankLayer({ index: 1 });
    const result = updateLayer(makeGlyph([a, b]), b.id, { visible: false, name: 'Renamed' });

    expect(result.layers[0]).toBe(a);
    expect(result.layers[1].visible).toBe(false);
    expect(result.layers[1].name).toBe('Renamed');
  });

  it('updateLayerPixels writes the new buffer and rect on the target layer', () => {
    const original = makeBlankLayer();
    const glyph = makeGlyph([original]);
    const newPixels = new Uint8Array([1, 2, 3, 4]);
    const result = updateLayerPixels(glyph, original.id, {
      pixels: newPixels,
      width: 2,
      height: 2,
      xoffset: 5,
      yoffset: 6,
    });

    expect(result.layers[0].pixels).toBe(newPixels);
    expect(result.layers[0].width).toBe(2);
    expect(result.layers[0].xoffset).toBe(5);
  });

  it('layer mutators keep the legacy fields in sync with flattenGlyph', () => {
    const layer = inkLayer(2, 1, 3, 4, [255, 128]);
    const result = updateLayer(makeGlyph([layer]), layer.id, { xoffset: 10 });

    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
    expect(result.xoffset).toBe(10);
    expect(result.yoffset).toBe(4);
    expect(Array.from(result.pixels)).toEqual([255, 128]);
  });
});

describe('trimLayerToInk', () => {
  it('crops a buffer with blank top-left rows and columns, shifting the offset to compensate', () => {
    // 4×3 buffer with ink at (2, 1) and (3, 2); the inked bbox is x=2..3, y=1..2.
    const pixels = new Uint8Array(4 * 3);

    pixels[1 * 4 + 2] = 200;
    pixels[2 * 4 + 3] = 150;

    const layer: Layer = {
      ...makeBlankLayer(),
      pixels,
      width: 4,
      height: 3,
      xoffset: 10,
      yoffset: 20,
    };
    const result = trimLayerToInk(layer);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.xoffset).toBe(12);
    expect(result.yoffset).toBe(21);
    // Trimmed buffer: row 0 = [200, 0]; row 1 = [0, 150]
    expect(Array.from(result.pixels)).toEqual([200, 0, 0, 150]);
  });

  it('collapses a fully-erased non-empty buffer to 0×0 at the origin', () => {
    const layer: Layer = {
      ...makeBlankLayer(),
      pixels: new Uint8Array(4),
      width: 2,
      height: 2,
      xoffset: 5,
      yoffset: 7,
    };
    const result = trimLayerToInk(layer);

    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
    expect(result.xoffset).toBe(0);
    expect(result.yoffset).toBe(0);
    expect(result.pixels.length).toBe(0);
  });

  it('returns the same reference when the buffer already hugs its ink', () => {
    const layer = inkLayer(2, 2, 0, 0, [10, 20, 30, 40]);
    const result = trimLayerToInk(layer);

    expect(result).toBe(layer);
  });

  it('returns the same reference for a layer that is already 0×0', () => {
    const layer = makeBlankLayer();
    const result = trimLayerToInk(layer);

    expect(result).toBe(layer);
  });
});

describe('syncLegacyFields', () => {
  it('rewrites the legacy bitmap fields to match the layer stack', () => {
    const layer = inkLayer(2, 1, 7, 8, [99, 100]);
    const stale: Glyph = {
      codePoint: 0x41,
      projectId: 'project-1',
      layers: [layer],
      pixels: new Uint8Array([0, 0, 0, 0]),
      width: 9999,
      height: 9999,
      xoffset: 9999,
      yoffset: 9999,
      xadvance: 0,
      isDirty: false,
    };
    const result = syncLegacyFields(stale);

    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
    expect(result.xoffset).toBe(7);
    expect(result.yoffset).toBe(8);
    expect(Array.from(result.pixels)).toEqual([99, 100]);
  });
});
