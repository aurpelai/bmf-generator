import { packGlyphs } from '@/core/atlas/pack'
import type { Glyph, GlyphPlacement } from '@/core/project/types'

export interface AtlasWorkerRequest {
  id: string
  glyphs: Glyph[]
  atlasWidth: number
  atlasHeight: number
  padding: number
}

export interface AtlasWorkerResponse {
  id: string
  placements?: GlyphPlacement[]
  atlasImageData?: ImageData
  efficiency?: number
  unpacked?: number[]
  error?: string
}

self.onmessage = (e: MessageEvent<AtlasWorkerRequest>) => {
  const { id, glyphs, atlasWidth, atlasHeight, padding } = e.data
  try {
    const { placements, unpacked, efficiency } = packGlyphs(glyphs, {
      atlasWidth,
      atlasHeight,
      padding,
    })

    // Render atlas onto an OffscreenCanvas
    const canvas = new OffscreenCanvas(atlasWidth, atlasHeight)
    const ctx = canvas.getContext('2d')!

    for (const placement of placements) {
      const glyph = glyphs.find((g) => g.codePoint === placement.codePoint)
      if (!glyph || glyph.pixels.length === 0) continue

      const glyphImageData = ctx.createImageData(glyph.width, glyph.height)
      for (let i = 0; i < glyph.pixels.length; i++) {
        const v = glyph.pixels[i]
        glyphImageData.data[i * 4 + 0] = v
        glyphImageData.data[i * 4 + 1] = v
        glyphImageData.data[i * 4 + 2] = v
        glyphImageData.data[i * 4 + 3] = v
      }
      ctx.putImageData(glyphImageData, placement.x, placement.y)
    }

    const atlasImageData = ctx.getImageData(0, 0, atlasWidth, atlasHeight)
    const response: AtlasWorkerResponse = {
      id,
      placements,
      atlasImageData,
      efficiency,
      unpacked,
    }
    self.postMessage(response, { transfer: [atlasImageData.data.buffer] })
  } catch (err) {
    const response: AtlasWorkerResponse = {
      id,
      error: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(response)
  }
}
