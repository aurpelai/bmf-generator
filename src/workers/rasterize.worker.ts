import {
  rasterizeFont,
  type RasterizeRequest,
  type RasterizeResult,
} from '@/core/rasterize/rasterize';

export interface RasterizeWorkerRequest extends RasterizeRequest {
  id: string;
}

export interface RasterizeWorkerResponse {
  id: string;
  result?: RasterizeResult;
  error?: string;
}

self.onmessage = (e: MessageEvent<RasterizeWorkerRequest>) => {
  const { id, ...req } = e.data;

  try {
    const result = rasterizeFont(req);
    // Transfer pixel buffers to avoid copying
    const response: RasterizeWorkerResponse = { id, result };

    self.postMessage(response);
  } catch (err) {
    const response: RasterizeWorkerResponse = {
      id,
      error: err instanceof Error ? err.message : String(err),
    };

    self.postMessage(response);
  }
};
