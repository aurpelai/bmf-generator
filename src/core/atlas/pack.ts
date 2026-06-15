import { ATLAS_CANDIDATES } from '@/config';

import { effectiveThreshold } from '../project/threshold';
import type { FontSettings, Glyph, GlyphPlacement } from '../project/types';
import { pack } from './maxrects';

export interface PackGlyphsOptions {
  atlasWidth: number;
  atlasHeight: number;
  padding: number;
  defaultAlphaThreshold: FontSettings['alphaThreshold'];
}

export interface PackGlyphsResult {
  placements: GlyphPlacement[];
  unpacked: number[]; // codePoints that did not fit
  efficiency: number; // 0–1, fraction of atlas area used
}

interface TrimmedGlyph {
  glyph: Glyph;
  trimX: number; // pixels cropped from the left
  trimY: number; // pixels cropped from the top
  width: number; // trimmed width (0 if blank)
  height: number; // trimmed height (0 if blank)
  pixels: Uint8Array; // cropped pixel buffer
}

function trimGlyph(glyph: Glyph, threshold: number): TrimmedGlyph {
  const { width, height, pixels } = glyph;

  let minX = width,
    maxX = -1,
    minY = height,
    maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[y * width + x] >= threshold) {
        if (x < minX) {
          minX = x;
        }

        if (x > maxX) {
          maxX = x;
        }

        if (y < minY) {
          minY = y;
        }

        if (y > maxY) {
          maxY = y;
        }
      }
    }
  }

  // Blank glyph — no ink pixels
  if (maxX === -1) {
    return { glyph, trimX: 0, trimY: 0, width: 0, height: 0, pixels: new Uint8Array(0) };
  }

  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const cropped = new Uint8Array(tw * th);

  for (let y = 0; y < th; y++) {
    cropped.set(pixels.subarray((minY + y) * width + minX, (minY + y) * width + minX + tw), y * tw);
  }

  return { glyph, trimX: minX, trimY: minY, width: tw, height: th, pixels: cropped };
}

export function chooseAtlasSize(
  glyphs: Glyph[],
  padding: number,
  defaultAlphaThreshold: number,
): [number, number] {
  const trimmed = glyphs.map((glyph) =>
    trimGlyph(glyph, effectiveThreshold(glyph, { alphaThreshold: defaultAlphaThreshold })),
  );
  const totalArea = trimmed.reduce(
    (sum, trimmedGlyph) =>
      sum +
      (trimmedGlyph.width === 0
        ? 0
        : (trimmedGlyph.width + padding * 2) * (trimmedGlyph.height + padding * 2)),
    0,
  );

  const startIndex = ATLAS_CANDIDATES.findIndex(([w, h]) => w * h >= totalArea);
  const from = startIndex === -1 ? ATLAS_CANDIDATES.length - 1 : startIndex;

  const canFit = ([w, h]: [number, number]): boolean =>
    packGlyphs(glyphs, { atlasWidth: w, atlasHeight: h, padding, defaultAlphaThreshold }).unpacked
      .length === 0;

  let chosen = ATLAS_CANDIDATES[ATLAS_CANDIDATES.length - 1];

  for (let index = from; index < ATLAS_CANDIDATES.length; index++) {
    if (canFit(ATLAS_CANDIDATES[index])) {
      chosen = ATLAS_CANDIDATES[index];
      break;
    }
  }

  // Step down: try one size smaller to ensure the result is as tight as possible
  const chosenIndex = ATLAS_CANDIDATES.indexOf(chosen);

  if (chosenIndex > 0 && canFit(ATLAS_CANDIDATES[chosenIndex - 1])) {
    return ATLAS_CANDIDATES[chosenIndex - 1];
  }

  return chosen;
}

export function packGlyphs(glyphs: Glyph[], options: PackGlyphsOptions): PackGlyphsResult {
  const { atlasWidth, atlasHeight, padding, defaultAlphaThreshold } = options;

  const trimmed = glyphs.map((glyph) =>
    trimGlyph(glyph, effectiveThreshold(glyph, { alphaThreshold: defaultAlphaThreshold })),
  );

  const rects = trimmed.map((trimmedGlyph) => ({
    width: trimmedGlyph.width === 0 ? 0 : trimmedGlyph.width + padding * 2,
    height: trimmedGlyph.height === 0 ? 0 : trimmedGlyph.height + padding * 2,
  }));

  const result = pack(rects, atlasWidth, atlasHeight);

  const placements: GlyphPlacement[] = result.packed.map((packedRect) => {
    const trimmedGlyph = trimmed[packedRect.index];

    return {
      codePoint: trimmedGlyph.glyph.codePoint,
      x: trimmedGlyph.width === 0 ? 0 : packedRect.x + padding,
      y: trimmedGlyph.width === 0 ? 0 : packedRect.y + padding,
      width: trimmedGlyph.width,
      height: trimmedGlyph.height,
      trimX: trimmedGlyph.trimX,
      trimY: trimmedGlyph.trimY,
    };
  });

  const usedArea = result.packed.reduce(
    (sum, packedRect) => sum + packedRect.width * packedRect.height,
    0,
  );
  const efficiency = usedArea / (atlasWidth * atlasHeight);

  const unpacked = result.unpacked.map((index) => glyphs[index].codePoint);

  return { placements, unpacked, efficiency };
}
