import opentype from 'opentype.js'

export interface RasterizeRequest {
  fontBuffer: ArrayBuffer
  codePoints: number[]
  fontSize: number
}

export interface RasterizedGlyph {
  codePoint: number
  pixels: Uint8Array // 8-bit greyscale, width × height
  width: number
  height: number
  xoffset: number
  yoffset: number
  xadvance: number
}

export interface RasterizeResult {
  glyphs: RasterizedGlyph[]
  lineHeight: number
  base: number
  capHeight: number
}

export function rasterizeFont(req: RasterizeRequest): RasterizeResult {
  const font = opentype.parse(req.fontBuffer, { lowMemory: true })
  const scale = req.fontSize / font.unitsPerEm

  const os2 = font.tables.os2 as { sTypoLineGap?: number; sCapHeight?: number } | undefined
  const lineGap = os2?.sTypoLineGap ?? 0
  const lineHeight = Math.round((font.ascender - font.descender + lineGap) * scale)
  const base = Math.round(font.ascender * scale)
  const capHeight = Math.round((os2?.sCapHeight ?? Math.round(font.ascender * 0.7)) * scale)

  const glyphs: RasterizedGlyph[] = []

  for (const codePoint of req.codePoints) {
    const glyph = font.charToGlyph(String.fromCodePoint(codePoint))

    // Space and other non-outlined glyphs
    if (!glyph || glyph.index === 0) {
      const spaceGlyph = font.glyphs.get(font.charToGlyphIndex(' '))
      const xadvance = Math.round((glyph?.advanceWidth ?? spaceGlyph?.advanceWidth ?? req.fontSize / 2) * scale)
      glyphs.push({ codePoint, pixels: new Uint8Array(0), width: 0, height: 0, xoffset: 0, yoffset: 0, xadvance })
      continue
    }

    const bb = glyph.getBoundingBox()
    const width = Math.ceil((bb.x2 - bb.x1) * scale)
    const height = Math.ceil((bb.y2 - bb.y1) * scale)
    const xoffset = Math.floor(bb.x1 * scale)
    const yoffset = Math.floor((font.ascender - bb.y2) * scale)
    const xadvance = Math.round((glyph.advanceWidth ?? 0) * scale)

    if (width <= 0 || height <= 0) {
      glyphs.push({ codePoint, pixels: new Uint8Array(0), width: 0, height: 0, xoffset, yoffset, xadvance })
      continue
    }

    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')!

    // x: shift left edge of glyph bounding box to canvas origin
    // y: baseline in canvas space = distance from top of bounding box to baseline
    //    font Y-up: baseline is at y=0, bb.y2 is above baseline → canvas y = bb.y2 * scale
    const penX = -bb.x1 * scale
    const penY = bb.y2 * scale
    const path = glyph.getPath(penX, penY, req.fontSize)
    path.draw(ctx)

    const imageData = ctx.getImageData(0, 0, width, height)
    // Alpha channel carries AA coverage regardless of fill colour
    const pixels = new Uint8Array(width * height)
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = imageData.data[i * 4 + 3]
    }

    glyphs.push({ codePoint, pixels, width, height, xoffset, yoffset, xadvance })
  }

  return { glyphs, lineHeight, base, capHeight }
}
