// MaxRects bin packing — Best Short Side Fit (BSSF) heuristic.

export interface Rect {
  width: number
  height: number
}

export interface PackedRect extends Rect {
  x: number
  y: number
  index: number // original index in the input array
}

export interface PackResult {
  packed: PackedRect[]
  unpacked: number[] // indices of rects that did not fit
  binWidth: number
  binHeight: number
}

interface FreeRect {
  x: number
  y: number
  width: number
  height: number
}

type Heuristic = 'bssf' | 'blsf' | 'bl'

export function pack(rects: Rect[], binWidth: number, binHeight: number): PackResult {
  // Run all heuristics and return the best result:
  // 1. Most glyphs packed
  // 2. Smallest bounding box (tightest layout)
  const results = (['bssf', 'blsf', 'bl'] as Heuristic[]).map((h) =>
    packWithHeuristic(rects, binWidth, binHeight, h),
  )
  return results.reduce((best, r) => {
    if (r.packed.length > best.packed.length) return r
    if (r.packed.length === best.packed.length) {
      const bbox = (res: PackResult) => res.packed.reduce(
        (max, p) => Math.max(max, (p.y + p.height) * binWidth + (p.x + p.width)), 0,
      )
      if (bbox(r) < bbox(best)) return r
    }
    return best
  })
}

function packWithHeuristic(
  rects: Rect[],
  binWidth: number,
  binHeight: number,
  heuristic: Heuristic,
): PackResult {
  const freeRects: FreeRect[] = [{ x: 0, y: 0, width: binWidth, height: binHeight }]
  const packed: PackedRect[] = []
  const unpacked: number[] = []

  // Sort largest-area-first for better packing efficiency
  const order = rects
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)

  for (const { r, i } of order) {
    if (r.width === 0 || r.height === 0) {
      packed.push({ x: 0, y: 0, width: 0, height: 0, index: i })
      continue
    }

    const placement = findPlacement(freeRects, r.width, r.height, heuristic)
    if (!placement) {
      unpacked.push(i)
      continue
    }

    packed.push({ x: placement.x, y: placement.y, width: r.width, height: r.height, index: i })
    splitFreeRects(freeRects, placement, r.width, r.height)
    pruneFreeRects(freeRects)
  }

  return { packed, unpacked, binWidth, binHeight }
}

function findPlacement(
  freeRects: FreeRect[],
  w: number,
  h: number,
  heuristic: Heuristic,
): { x: number; y: number } | null {
  let bestScore = Infinity
  let bestScore2 = Infinity
  let best: { x: number; y: number } | null = null

  for (const fr of freeRects) {
    if (fr.width >= w && fr.height >= h) {
      let score: number
      let score2: number
      if (heuristic === 'bssf') {
        score = Math.min(fr.width - w, fr.height - h)
        score2 = Math.max(fr.width - w, fr.height - h)
      } else if (heuristic === 'blsf') {
        score = Math.max(fr.width - w, fr.height - h)
        score2 = Math.min(fr.width - w, fr.height - h)
      } else {
        // Bottom-Left: minimise y first, then x
        score = fr.y
        score2 = fr.x
      }
      if (score < bestScore || (score === bestScore && score2 < bestScore2)) {
        bestScore = score
        bestScore2 = score2
        best = { x: fr.x, y: fr.y }
      }
    }
  }

  return best
}

function splitFreeRects(
  freeRects: FreeRect[],
  placement: { x: number; y: number },
  w: number,
  h: number,
): void {
  const toAdd: FreeRect[] = []
  let i = freeRects.length

  while (i--) {
    const fr = freeRects[i]
    if (!overlaps(fr, placement.x, placement.y, w, h)) continue

    freeRects.splice(i, 1)

    // Left strip
    if (fr.x < placement.x) {
      toAdd.push({ x: fr.x, y: fr.y, width: placement.x - fr.x, height: fr.height })
    }
    // Right strip
    if (placement.x + w < fr.x + fr.width) {
      toAdd.push({ x: placement.x + w, y: fr.y, width: fr.x + fr.width - (placement.x + w), height: fr.height })
    }
    // Top strip
    if (fr.y < placement.y) {
      toAdd.push({ x: fr.x, y: fr.y, width: fr.width, height: placement.y - fr.y })
    }
    // Bottom strip
    if (placement.y + h < fr.y + fr.height) {
      toAdd.push({ x: fr.x, y: placement.y + h, width: fr.width, height: fr.y + fr.height - (placement.y + h) })
    }
  }

  freeRects.push(...toAdd)
}

function pruneFreeRects(freeRects: FreeRect[]): void {
  let i = freeRects.length
  while (i--) {
    let j = freeRects.length
    while (j--) {
      if (i === j) continue
      if (contains(freeRects[j], freeRects[i])) {
        freeRects.splice(i, 1)
        break
      }
    }
  }
}

function overlaps(fr: FreeRect, x: number, y: number, w: number, h: number): boolean {
  return x < fr.x + fr.width && x + w > fr.x && y < fr.y + fr.height && y + h > fr.y
}

function contains(outer: FreeRect, inner: FreeRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}
