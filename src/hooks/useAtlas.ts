import { useCallback, useRef } from 'react';

import { flattenGlyph } from '@/core/project/layers';
import type { Glyph, GlyphPlacement } from '@/core/project/types';
import type { AtlasWorkerRequest, AtlasWorkerResponse } from '@/workers/atlas.worker';

export interface AtlasResult {
  placements: GlyphPlacement[];
  atlasImageData: ImageData;
  atlasWidth: number;
  atlasHeight: number;
  efficiency: number;
  unpacked: number[];
}

export function useAtlas(): {
  packAtlas: (
    glyphs: Glyph[],
    padding: number,
    defaultAlphaThreshold: number,
  ) => Promise<AtlasResult>;
} {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<
    Map<string, { resolve: (r: AtlasResult) => void; reject: (e: Error) => void }>
  >(new Map());

  function getWorker(): Worker {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/atlas.worker.ts', import.meta.url), {
        type: 'module',
      });

      workerRef.current.onmessage = (e: MessageEvent<AtlasWorkerResponse>) => {
        const {
          id,
          placements,
          atlasImageData,
          atlasWidth,
          atlasHeight,
          efficiency,
          unpacked,
          error,
        } = e.data;
        const pending = pendingRef.current.get(id);

        if (!pending) {
          return;
        }

        pendingRef.current.delete(id);

        if (error) {
          pending.reject(new Error(error));
        } else if (
          placements &&
          atlasImageData &&
          atlasWidth &&
          atlasHeight &&
          efficiency !== undefined &&
          unpacked
        ) {
          pending.resolve({
            placements,
            atlasImageData,
            atlasWidth,
            atlasHeight,
            efficiency,
            unpacked,
          });
        }
      };
    }

    return workerRef.current;
  }

  const packAtlas = useCallback(
    (glyphs: Glyph[], padding: number, defaultAlphaThreshold: number): Promise<AtlasResult> => {
      return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();

        pendingRef.current.set(id, { resolve, reject });
        // Flatten each glyph's layers into the legacy single-bitmap shape before
        // posting to the worker. Keeps the worker's input contract stable and
        // means Stage B (which drops the legacy top-level fields from the in-memory
        // Glyph type) won't need to ship flattenGlyph into the worker bundle.
        const flattenedGlyphs: Glyph[] = glyphs.map((glyph) => {
          const flat = flattenGlyph(glyph);

          return {
            ...glyph,
            pixels: flat.pixels,
            width: flat.width,
            height: flat.height,
            xoffset: flat.xoffset,
            yoffset: flat.yoffset,
          };
        });
        const req: AtlasWorkerRequest = {
          id,
          glyphs: flattenedGlyphs,
          atlasWidth: 0,
          atlasHeight: 0,
          padding,
          defaultAlphaThreshold,
        };

        getWorker().postMessage(req);
      });
    },
    [],
  );

  return { packAtlas };
}
