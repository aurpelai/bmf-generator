import { chooseAtlasSize, packGlyphs } from '@/core/atlas/pack';
import { effectiveThreshold } from '@/core/project/threshold';
import type { Glyph, GlyphPlacement } from '@/core/project/types';

export interface AtlasWorkerRequest {
  id: string;
  glyphs: Glyph[];
  /** Pass 0 to auto-select the smallest fitting size via chooseAtlasSize. */
  atlasWidth: number;
  atlasHeight: number;
  padding: number;
  /** Project-wide alpha cutoff (0–255); glyphs may override individually. */
  defaultAlphaThreshold: number;
}

export interface AtlasWorkerResponse {
  id: string;
  placements?: GlyphPlacement[];
  atlasImageData?: ImageData;
  atlasWidth?: number;
  atlasHeight?: number;
  efficiency?: number;
  unpacked?: number[];
  error?: string;
}

self.onmessage = (event: MessageEvent<AtlasWorkerRequest>) => {
  const { id, glyphs, padding, defaultAlphaThreshold } = event.data;
  let { atlasWidth, atlasHeight } = event.data;

  try {
    if (atlasWidth === 0) {
      [atlasWidth, atlasHeight] = chooseAtlasSize(glyphs, padding, defaultAlphaThreshold);
    }

    const { placements, unpacked, efficiency } = packGlyphs(glyphs, {
      atlasWidth,
      atlasHeight,
      padding,
      defaultAlphaThreshold,
    });

    // Render atlas onto an OffscreenCanvas
    const canvas = new OffscreenCanvas(atlasWidth, atlasHeight);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const context = canvas.getContext('2d')!; // OffscreenCanvas always returns a 2D context;

    for (const placement of placements) {
      if (placement.width === 0 || placement.height === 0) {
        continue;
      }

      const glyph = glyphs.find((glyphItem) => glyphItem.codePoint === placement.codePoint);

      if (!glyph) {
        continue;
      }

      // Render the trimmed region of the glyph's pixel buffer
      const { trimX, trimY } = placement;
      const tw = placement.width;
      const th = placement.height;
      const glyphImageData = context.createImageData(tw, th);
      const threshold = effectiveThreshold(glyph, { alphaThreshold: defaultAlphaThreshold });

      for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
          const value = glyph.pixels[(trimY + y) * glyph.width + (trimX + x)];
          const ink = value >= threshold ? 255 : 0;
          const index = (y * tw + x) * 4;

          glyphImageData.data[index] = ink;
          glyphImageData.data[index + 1] = ink;
          glyphImageData.data[index + 2] = ink;
          glyphImageData.data[index + 3] = ink;
        }
      }

      context.putImageData(glyphImageData, placement.x, placement.y);
    }

    const atlasImageData = context.getImageData(0, 0, atlasWidth, atlasHeight);
    const response: AtlasWorkerResponse = {
      id,
      placements,
      atlasImageData,
      atlasWidth,
      atlasHeight,
      efficiency,
      unpacked,
    };

    self.postMessage(response, { transfer: [atlasImageData.data.buffer] });
  } catch (err) {
    const response: AtlasWorkerResponse = {
      id,
      error: err instanceof Error ? err.message : String(err),
    };

    self.postMessage(response);
  }
};
