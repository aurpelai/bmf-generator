import { DEFAULT_LAYER_PALETTE } from '@/config';

import type { Glyph, Layer } from './types';

export function defaultLayerColor(index: number): string {
  return DEFAULT_LAYER_PALETTE[index % DEFAULT_LAYER_PALETTE.length];
}

interface MakeBlankLayerOptions {
  name?: string;
  color?: string;
  index?: number;
}

export function makeBlankLayer(options: MakeBlankLayerOptions = {}): Layer {
  const index = options.index ?? 0;

  return {
    id: crypto.randomUUID(),
    name: options.name ?? (index === 0 ? 'Base' : `Layer ${index + 1}`),
    pixels: new Uint8Array(0),
    width: 0,
    height: 0,
    xoffset: 0,
    yoffset: 0,
    visible: true,
    preview: true,
    color: options.color ?? defaultLayerColor(index),
    locked: false,
  };
}

interface MakeBaseLayerFromBitmapInput {
  pixels: Uint8Array;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
}

export function makeBaseLayerFromBitmap(input: MakeBaseLayerFromBitmapInput): Layer {
  return {
    id: crypto.randomUUID(),
    name: 'Base',
    pixels: new Uint8Array(input.pixels),
    width: input.width,
    height: input.height,
    xoffset: input.xoffset,
    yoffset: input.yoffset,
    visible: true,
    preview: true,
    color: defaultLayerColor(0),
    locked: false,
  };
}

export interface FlattenedGlyph {
  pixels: Uint8Array;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
}

interface FlattenOptions {
  includeHidden?: boolean;
}

/**
 * Composite a glyph's layers into the legacy single-bitmap shape that the export pipeline consumes.
 *
 * The union bbox of contributing layers becomes the result's rect; each layer's pixels are written
 * with max-blending (matches the binarised render path — there is no real alpha blending in the editor).
 * An all-empty glyph flattens to a 0×0 buffer at offset (0, 0).
 */
export function flattenGlyph(glyph: Glyph, options: FlattenOptions = {}): FlattenedGlyph {
  const includeHidden = options.includeHidden ?? false;
  const contributing = glyph.layers.filter(
    (layer) => (includeHidden || layer.visible) && layer.width > 0 && layer.height > 0,
  );

  if (contributing.length === 0) {
    return { pixels: new Uint8Array(0), width: 0, height: 0, xoffset: 0, yoffset: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const layer of contributing) {
    if (layer.xoffset < minX) {
      minX = layer.xoffset;
    }

    if (layer.yoffset < minY) {
      minY = layer.yoffset;
    }

    if (layer.xoffset + layer.width > maxX) {
      maxX = layer.xoffset + layer.width;
    }

    if (layer.yoffset + layer.height > maxY) {
      maxY = layer.yoffset + layer.height;
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const pixels = new Uint8Array(width * height);

  for (const layer of contributing) {
    const layerDX = layer.xoffset - minX;
    const layerDY = layer.yoffset - minY;

    for (let row = 0; row < layer.height; row++) {
      const destinationY = layerDY + row;
      const sourceRowStart = row * layer.width;
      const destinationRowStart = destinationY * width;

      for (let column = 0; column < layer.width; column++) {
        const sourceValue = layer.pixels[sourceRowStart + column];

        if (sourceValue === 0) {
          continue;
        }

        const destinationIndex = destinationRowStart + layerDX + column;
        const existing = pixels[destinationIndex];

        if (sourceValue > existing) {
          pixels[destinationIndex] = sourceValue;
        }
      }
    }
  }

  return { pixels, width, height, xoffset: minX, yoffset: minY };
}
