import { pack } from './maxrects'
import type { Glyph, GlyphPlacement } from '../project/types'

export interface PackGlyphsOptions {
  atlasWidth: number
  atlasHeight: number
  padding: number
}

export interface PackGlyphsResult {
  placements: GlyphPlacement[]
  unpacked: number[] // codePoints that did not fit
  efficiency: number // 0–1, fraction of atlas area used
}

export function packGlyphs(glyphs: Glyph[], options: PackGlyphsOptions): PackGlyphsResult {
  const { atlasWidth, atlasHeight, padding } = options

  const rects = glyphs.map((g) => ({
    width: g.width + padding * 2,
    height: g.height + padding * 2,
  }))

  const result = pack(rects, atlasWidth, atlasHeight)

  const placements: GlyphPlacement[] = result.packed.map((p) => ({
    codePoint: glyphs[p.index].codePoint,
    x: p.x + padding,
    y: p.y + padding,
    width: glyphs[p.index].width,
    height: glyphs[p.index].height,
  }))

  const usedArea = result.packed.reduce((sum, p) => sum + p.width * p.height, 0)
  const efficiency = usedArea / (atlasWidth * atlasHeight)

  const unpacked = result.unpacked.map((i) => glyphs[i].codePoint)

  return { placements, unpacked, efficiency }
}
