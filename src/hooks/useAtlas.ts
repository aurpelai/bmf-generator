import { useCallback, useRef } from 'react'
import type { AtlasWorkerRequest, AtlasWorkerResponse } from '@/workers/atlas.worker'
import type { Glyph, GlyphPlacement } from '@/core/project/types'

export interface AtlasResult {
  placements: GlyphPlacement[]
  atlasImageData: ImageData
  efficiency: number
  unpacked: number[]
}

export function useAtlas() {
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<Map<string, { resolve: (r: AtlasResult) => void; reject: (e: Error) => void }>>(new Map())

  function getWorker(): Worker {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/atlas.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current.onmessage = (e: MessageEvent<AtlasWorkerResponse>) => {
        const { id, placements, atlasImageData, efficiency, unpacked, error } = e.data
        const pending = pendingRef.current.get(id)
        if (!pending) return
        pendingRef.current.delete(id)
        if (error) pending.reject(new Error(error))
        else if (placements && atlasImageData && efficiency !== undefined && unpacked)
          pending.resolve({ placements, atlasImageData, efficiency, unpacked })
      }
    }
    return workerRef.current
  }

  const packAtlas = useCallback(
    (glyphs: Glyph[], atlasWidth: number, atlasHeight: number, padding: number): Promise<AtlasResult> => {
      return new Promise((resolve, reject) => {
        const id = crypto.randomUUID()
        pendingRef.current.set(id, { resolve, reject })
        const req: AtlasWorkerRequest = { id, glyphs, atlasWidth, atlasHeight, padding }
        getWorker().postMessage(req)
      })
    },
    [],
  )

  return { packAtlas }
}
