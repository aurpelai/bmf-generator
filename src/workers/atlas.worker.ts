import { packGlyphs, chooseAtlasSize } from '@/core/atlas/pack'
import type { Glyph, GlyphPlacement } from '@/core/project/types'

export interface AtlasWorkerRequest {
  id: string
  glyphs: Glyph[]
  /** Pass 0 to auto-select the smallest fitting size via chooseAtlasSize. */
  atlasWidth: number
  atlasHeight: number
  padding: number
}

export interface AtlasWorkerResponse {
  id: string
  placements?: GlyphPlacement[]
  atlasImageData?: ImageData
  atlasWidth?: number
  atlasHeight?: number
  efficiency?: number
  unpacked?: number[]
  error?: string
}

self.onmessage = (e: MessageEvent<AtlasWorkerRequest>) => {
  const { id, glyphs, padding } = e.data
  let { atlasWidth, atlasHeight } = e.data
  try {
    if (atlasWidth === 0) {
      ;[atlasWidth, atlasHeight] = chooseAtlasSize(glyphs, padding)
    }
    const { placements, unpacked, efficiency } = packGlyphs(glyphs, {
      atlasWidth,
      atlasHeight,
      padding,
    })

    // Render atlas onto an OffscreenCanvas
    const canvas = new OffscreenCanvas(atlasWidth, atlasHeight)
    const ctx = canvas.getContext('2d')!

    for (const placement of placements) {
      if (placement.width === 0 || placement.height === 0) continue
      const glyph = glyphs.find((g) => g.codePoint === placement.codePoint)
      if (!glyph) continue

      // Render the trimmed region of the glyph's pixel buffer
      const { trimX, trimY } = placement
      const tw = placement.width
      const th = placement.height
      const glyphImageData = ctx.createImageData(tw, th)
      for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
          const v = glyph.pixels[(trimY + y) * glyph.width + (trimX + x)]
          const i = (y * tw + x) * 4
          glyphImageData.data[i] = v
          glyphImageData.data[i + 1] = v
          glyphImageData.data[i + 2] = v
          glyphImageData.data[i + 3] = v
        }
      }
      ctx.putImageData(glyphImageData, placement.x, placement.y)
    }

    const atlasImageData = ctx.getImageData(0, 0, atlasWidth, atlasHeight)
    const response: AtlasWorkerResponse = {
      id,
      placements,
      atlasImageData,
      atlasWidth,
      atlasHeight,
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
