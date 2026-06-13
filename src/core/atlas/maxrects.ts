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

export function pack(rects: Rect[], binWidth: number, binHeight: number): PackResult {
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

    const placement = findBssf(freeRects, r.width, r.height)
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

function findBssf(
  freeRects: FreeRect[],
  w: number,
  h: number,
): { x: number; y: number } | null {
  let bestScore = Infinity
  let best: { x: number; y: number } | null = null

  for (const fr of freeRects) {
    if (fr.width >= w && fr.height >= h) {
      const shortSide = Math.min(fr.width - w, fr.height - h)
      if (shortSide < bestScore) {
        bestScore = shortSide
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

    // Right of placed rect
    if (placement.x + w < fr.x + fr.width) {
      toAdd.push({
        x: placement.x + w,
        y: fr.y,
        width: fr.x + fr.width - (placement.x + w),
        height: fr.height,
      })
    }
    // Below placed rect
    if (placement.y + h < fr.y + fr.height) {
      toAdd.push({
        x: fr.x,
        y: placement.y + h,
        width: fr.width,
        height: fr.y + fr.height - (placement.y + h),
      })
    }
    // Left of placed rect
    if (fr.x < placement.x) {
      toAdd.push({
        x: fr.x,
        y: fr.y,
        width: placement.x - fr.x,
        height: fr.height,
      })
    }
    // Above placed rect
    if (fr.y < placement.y) {
      toAdd.push({
        x: fr.x,
        y: fr.y,
        width: fr.width,
        height: placement.y - fr.y,
      })
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
