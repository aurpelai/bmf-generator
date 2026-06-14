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

// Candidates ordered by total area ascending — square sizes plus half-height rectangles
// to allow tighter fits when glyphs pack more efficiently in wide layouts.
const ATLAS_CANDIDATES: [number, number][] = [
  [64, 64],
  [128, 64],
  [128, 128],
  [256, 128],
  [256, 256],
  [512, 256],
  [512, 512],
  [1024, 512],
  [1024, 1024],
  [2048, 1024],
  [2048, 2048],
  [4096, 2048],
  [4096, 4096],
]

interface TrimmedGlyph {
  glyph: Glyph
  trimX: number // pixels cropped from the left
  trimY: number // pixels cropped from the top
  width: number // trimmed width (0 if blank)
  height: number // trimmed height (0 if blank)
  pixels: Uint8Array // cropped pixel buffer
}

function trimGlyph(glyph: Glyph): TrimmedGlyph {
  const { width, height, pixels } = glyph

  let minX = width, maxX = -1, minY = height, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[y * width + x] !== 0) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  // Blank glyph — no ink pixels
  if (maxX === -1) {
    return { glyph, trimX: 0, trimY: 0, width: 0, height: 0, pixels: new Uint8Array(0) }
  }

  const tw = maxX - minX + 1
  const th = maxY - minY + 1
  const cropped = new Uint8Array(tw * th)
  for (let y = 0; y < th; y++) {
    cropped.set(pixels.subarray((minY + y) * width + minX, (minY + y) * width + minX + tw), y * tw)
  }

  return { glyph, trimX: minX, trimY: minY, width: tw, height: th, pixels: cropped }
}

export function chooseAtlasSize(glyphs: Glyph[], padding: number): [number, number] {
  const trimmed = glyphs.map(trimGlyph)
  const totalArea = trimmed.reduce(
    (sum, t) => sum + (t.width === 0 ? 0 : (t.width + padding * 2) * (t.height + padding * 2)),
    0,
  )

  const startIndex = ATLAS_CANDIDATES.findIndex(([w, h]) => w * h >= totalArea)
  const from = startIndex === -1 ? ATLAS_CANDIDATES.length - 1 : startIndex

  const canFit = ([w, h]: [number, number]) =>
    packGlyphs(glyphs, { atlasWidth: w, atlasHeight: h, padding }).unpacked.length === 0

  let chosen = ATLAS_CANDIDATES[ATLAS_CANDIDATES.length - 1]
  for (let i = from; i < ATLAS_CANDIDATES.length; i++) {
    if (canFit(ATLAS_CANDIDATES[i])) { chosen = ATLAS_CANDIDATES[i]; break }
  }

  // Step down: try one size smaller to ensure the result is as tight as possible
  const chosenIndex = ATLAS_CANDIDATES.indexOf(chosen)
  if (chosenIndex > 0 && canFit(ATLAS_CANDIDATES[chosenIndex - 1])) {
    return ATLAS_CANDIDATES[chosenIndex - 1]
  }

  return chosen
}

export function packGlyphs(glyphs: Glyph[], options: PackGlyphsOptions): PackGlyphsResult {
  const { atlasWidth, atlasHeight, padding } = options

  const trimmed = glyphs.map(trimGlyph)

  const rects = trimmed.map((t) => ({
    width: t.width === 0 ? 0 : t.width + padding * 2,
    height: t.height === 0 ? 0 : t.height + padding * 2,
  }))

  const result = pack(rects, atlasWidth, atlasHeight)

  const placements: GlyphPlacement[] = result.packed.map((p) => {
    const t = trimmed[p.index]
    return {
      codePoint: t.glyph.codePoint,
      x: t.width === 0 ? 0 : p.x + padding,
      y: t.width === 0 ? 0 : p.y + padding,
      width: t.width,
      height: t.height,
      trimX: t.trimX,
      trimY: t.trimY,
    }
  })

  const usedArea = result.packed.reduce((sum, p) => sum + p.width * p.height, 0)
  const efficiency = usedArea / (atlasWidth * atlasHeight)

  const unpacked = result.unpacked.map((i) => glyphs[i].codePoint)

  return { placements, unpacked, efficiency }
}
