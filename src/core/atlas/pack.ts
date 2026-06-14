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

const ATLAS_CANDIDATES = [256, 512, 1024, 2048, 4096]

export function chooseAtlasSize(glyphs: Glyph[], padding: number): number {
  const totalArea = glyphs.reduce(
    (sum, g) => sum + (g.width + padding * 2) * (g.height + padding * 2),
    0,
  )

  const startIndex = ATLAS_CANDIDATES.findIndex((s) => s * s >= totalArea)
  const from = startIndex === -1 ? ATLAS_CANDIDATES.length - 1 : startIndex

  let chosen = ATLAS_CANDIDATES[ATLAS_CANDIDATES.length - 1]
  for (let i = from; i < ATLAS_CANDIDATES.length; i++) {
    const s = ATLAS_CANDIDATES[i]
    if (packGlyphs(glyphs, { atlasWidth: s, atlasHeight: s, padding }).unpacked.length === 0) {
      chosen = s
      break
    }
  }

  // Step down: try one size smaller to ensure the result is as tight as possible
  const chosenIndex = ATLAS_CANDIDATES.indexOf(chosen)
  if (chosenIndex > 0) {
    const smaller = ATLAS_CANDIDATES[chosenIndex - 1]
    if (packGlyphs(glyphs, { atlasWidth: smaller, atlasHeight: smaller, padding }).unpacked.length === 0) {
      return smaller
    }
  }

  return chosen
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
