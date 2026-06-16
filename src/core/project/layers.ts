import { DEFAULT_LAYER_PALETTE, MAX_LAYERS_PER_GLYPH } from '@/config';

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

/** Deep-clones a layer stack (independent pixel buffers) for use as an undo snapshot. */
export function cloneLayers(layers: Layer[]): Layer[] {
  return layers.map((layer) => ({ ...layer, pixels: new Uint8Array(layer.pixels) }));
}

/**
 * Refresh the legacy top-level pixel fields on a Glyph from its `layers` array.
 *
 * Maintains the Stage A invariant: every Glyph in memory and at rest has its
 * legacy fields equal to flattenGlyph(glyph). Will be removed in Stage B once
 * the editor and export pipeline read `layers` directly.
 */
export function syncLegacyFields(glyph: Glyph): Glyph {
  const flat = flattenGlyph(glyph);

  return {
    ...glyph,
    pixels: flat.pixels,
    width: flat.width,
    height: flat.height,
    xoffset: flat.xoffset,
    yoffset: flat.yoffset,
  };
}

/** Returns the topmost visible inked layer under the given cell (in glyph cell-space), or null. */
export function hitTestLayer(glyph: Glyph, cellX: number, cellY: number, threshold: number): Layer | null {
  for (let layerIndex = glyph.layers.length - 1; layerIndex >= 0; layerIndex--) {
    const layer = glyph.layers[layerIndex];

    if (!layer.visible || layer.locked) {
      continue;
    }

    const localX = cellX - layer.xoffset;
    const localY = cellY - layer.yoffset;

    if (localX < 0 || localY < 0 || localX >= layer.width || localY >= layer.height) {
      continue;
    }

    const value = layer.pixels[localY * layer.width + localX];

    if (value >= threshold) {
      return layer;
    }
  }

  return null;
}

/**
 * Returns the layer directly beneath `currentLayerId` under the given cell, wrapping to the top
 * of the stack if `currentLayerId` is the bottommost hit. Used to cycle the move tool's grab target.
 */
export function cycleHitLayer(
  glyph: Glyph,
  cellX: number,
  cellY: number,
  threshold: number,
  currentLayerId: string,
): Layer | null {
  const hits: Layer[] = [];

  for (let layerIndex = glyph.layers.length - 1; layerIndex >= 0; layerIndex--) {
    const layer = glyph.layers[layerIndex];

    if (!layer.visible || layer.locked) {
      continue;
    }

    const localX = cellX - layer.xoffset;
    const localY = cellY - layer.yoffset;

    if (localX < 0 || localY < 0 || localX >= layer.width || localY >= layer.height) {
      continue;
    }

    if (layer.pixels[localY * layer.width + localX] >= threshold) {
      hits.push(layer);
    }
  }

  if (hits.length <= 1) {
    return hits[0] ?? null;
  }

  const currentIndex = hits.findIndex((layer) => layer.id === currentLayerId);

  if (currentIndex === -1) {
    return hits[0];
  }

  return hits[(currentIndex + 1) % hits.length];
}

function replaceLayer(glyph: Glyph, layerId: string, replacement: Layer): Glyph {
  return syncLegacyFields({
    ...glyph,
    layers: glyph.layers.map((layer) => (layer.id === layerId ? replacement : layer)),
  });
}

export function addLayer(glyph: Glyph): Glyph {
  if (glyph.layers.length >= MAX_LAYERS_PER_GLYPH) {
    return glyph;
  }

  const newLayer = makeBlankLayer({ index: glyph.layers.length });

  return syncLegacyFields({ ...glyph, layers: [...glyph.layers, newLayer] });
}

export function removeLayer(glyph: Glyph, layerId: string): Glyph {
  if (glyph.layers.length <= 1) {
    return glyph;
  }

  const next = glyph.layers.filter((layer) => layer.id !== layerId);

  if (next.length === glyph.layers.length) {
    return glyph;
  }

  return syncLegacyFields({ ...glyph, layers: next });
}

export function reorderLayers(glyph: Glyph, fromIndex: number, toIndex: number): Glyph {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= glyph.layers.length ||
    toIndex >= glyph.layers.length
  ) {
    return glyph;
  }

  const next = [...glyph.layers];
  const [moved] = next.splice(fromIndex, 1);

  next.splice(toIndex, 0, moved);

  return syncLegacyFields({ ...glyph, layers: next });
}

interface LayerPatch {
  name?: string;
  visible?: boolean;
  preview?: boolean;
  color?: string;
  locked?: boolean;
  xoffset?: number;
  yoffset?: number;
}

export function updateLayer(glyph: Glyph, layerId: string, patch: LayerPatch): Glyph {
  const target = glyph.layers.find((layer) => layer.id === layerId);

  if (!target) {
    return glyph;
  }

  return replaceLayer(glyph, layerId, { ...target, ...patch });
}

export interface LayerPixelsPatch {
  pixels: Uint8Array;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
}

export function updateLayerPixels(glyph: Glyph, layerId: string, patch: LayerPixelsPatch): Glyph {
  const target = glyph.layers.find((layer) => layer.id === layerId);

  if (!target) {
    return glyph;
  }

  return replaceLayer(glyph, layerId, {
    ...target,
    pixels: patch.pixels,
    width: patch.width,
    height: patch.height,
    xoffset: patch.xoffset,
    yoffset: patch.yoffset,
  });
}
