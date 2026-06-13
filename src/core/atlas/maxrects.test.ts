import { describe, it, expect } from 'vitest'
import { pack } from './maxrects'

describe('pack', () => {
  it('packs a single rect', () => {
    const result = pack([{ width: 10, height: 10 }], 64, 64)
    expect(result.packed).toHaveLength(1)
    expect(result.unpacked).toHaveLength(0)
    expect(result.packed[0]).toMatchObject({ x: 0, y: 0, width: 10, height: 10, index: 0 })
  })

  it('packs multiple non-overlapping rects', () => {
    const rects = [
      { width: 32, height: 32 },
      { width: 32, height: 32 },
      { width: 32, height: 32 },
      { width: 32, height: 32 },
    ]
    const result = pack(rects, 64, 64)
    expect(result.packed).toHaveLength(4)
    expect(result.unpacked).toHaveLength(0)

    // No two placements should overlap
    for (let i = 0; i < result.packed.length; i++) {
      for (let j = i + 1; j < result.packed.length; j++) {
        const a = result.packed[i]
        const b = result.packed[j]
        const overlaps =
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y
        expect(overlaps).toBe(false)
      }
    }
  })

  it('reports unpacked rects when they do not fit', () => {
    const result = pack([{ width: 100, height: 100 }], 64, 64)
    expect(result.packed).toHaveLength(0)
    expect(result.unpacked).toEqual([0])
  })

  it('places all rects within bin bounds', () => {
    const rects = Array.from({ length: 20 }, () => ({ width: 8, height: 8 }))
    const result = pack(rects, 64, 64)
    for (const p of result.packed) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.x + p.width).toBeLessThanOrEqual(64)
      expect(p.y + p.height).toBeLessThanOrEqual(64)
    }
  })

  it('handles zero-size rects without crashing', () => {
    const result = pack([{ width: 0, height: 0 }], 64, 64)
    expect(result.packed).toHaveLength(1)
    expect(result.unpacked).toHaveLength(0)
  })

  it('preserves original index in packed results', () => {
    const rects = [
      { width: 4, height: 4 },
      { width: 32, height: 32 }, // packed first due to sort
      { width: 4, height: 4 },
    ]
    const result = pack(rects, 64, 64)
    const indices = result.packed.map((p) => p.index).sort((a, b) => a - b)
    expect(indices).toEqual([0, 1, 2])
  })
})
