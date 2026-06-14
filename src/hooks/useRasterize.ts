import { useCallback, useRef } from 'react';

import type { RasterizeResult } from '@/core/font/rasterize';
import type { RasterizeWorkerRequest, RasterizeWorkerResponse } from '@/workers/rasterize.worker';

export function useRasterize(): {
  rasterize: (
    fontBuffer: ArrayBuffer,
    codePoints: number[],
    fontSize: number,
  ) => Promise<RasterizeResult>;
} {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<
    Map<string, { resolve: (r: RasterizeResult) => void; reject: (e: Error) => void }>
  >(new Map());

  function getWorker(): Worker {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/rasterize.worker.ts', import.meta.url), {
        type: 'module',
      });

      workerRef.current.onmessage = (e: MessageEvent<RasterizeWorkerResponse>) => {
        const { id, result, error } = e.data;
        const pending = pendingRef.current.get(id);

        if (!pending) {
          return;
        }

        pendingRef.current.delete(id);

        if (error) {
          pending.reject(new Error(error));
        } else if (result) {
          pending.resolve(result);
        }
      };
    }

    return workerRef.current;
  }

  const rasterize = useCallback(
    (fontBuffer: ArrayBuffer, codePoints: number[], fontSize: number): Promise<RasterizeResult> => {
      return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();

        pendingRef.current.set(id, { resolve, reject });
        const req: RasterizeWorkerRequest = { id, fontBuffer, codePoints, fontSize };

        getWorker().postMessage(req, [fontBuffer]);
      });
    },
    [],
  );

  return { rasterize };
}
