import { describe, expect, it } from 'vitest';

import { pack } from './maxrects';

describe('pack', () => {
  it('packs a single rect', () => {
    const result = pack([{ width: 10, height: 10 }], 64, 64);

    expect(result.packed).toHaveLength(1);
    expect(result.unpacked).toHaveLength(0);
    expect(result.packed[0]).toMatchObject({ x: 0, y: 0, width: 10, height: 10, index: 0 });
  });

  it('packs multiple non-overlapping rects', () => {
    const rects = [
      { width: 32, height: 32 },
      { width: 32, height: 32 },
      { width: 32, height: 32 },
      { width: 32, height: 32 },
    ];
    const result = pack(rects, 64, 64);

    expect(result.packed).toHaveLength(4);
    expect(result.unpacked).toHaveLength(0);

    // No two placements should overlap
    for (let index = 0; index < result.packed.length; index++) {
      for (let otherIndex = index + 1; otherIndex < result.packed.length; otherIndex++) {
        const rect = result.packed[index];
        const otherRect = result.packed[otherIndex];
        const overlaps =
          rect.x < otherRect.x + otherRect.width &&
          rect.x + rect.width > otherRect.x &&
          rect.y < otherRect.y + otherRect.height &&
          rect.y + rect.height > otherRect.y;

        expect(overlaps).toBe(false);
      }
    }
  });

  it('reports unpacked rects when they do not fit', () => {
    const result = pack([{ width: 100, height: 100 }], 64, 64);

    expect(result.packed).toHaveLength(0);
    expect(result.unpacked).toEqual([0]);
  });

  it('places all rects within bin bounds', () => {
    const rects = Array.from({ length: 20 }, () => ({ width: 8, height: 8 }));
    const result = pack(rects, 64, 64);

    for (const p of result.packed) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x + p.width).toBeLessThanOrEqual(64);
      expect(p.y + p.height).toBeLessThanOrEqual(64);
    }
  });

  it('handles zero-size rects without crashing', () => {
    const result = pack([{ width: 0, height: 0 }], 64, 64);

    expect(result.packed).toHaveLength(1);
    expect(result.unpacked).toHaveLength(0);
  });

  it('preserves original index in packed results', () => {
    const rects = [
      { width: 4, height: 4 },
      { width: 32, height: 32 }, // packed first due to sort
      { width: 4, height: 4 },
    ];
    const result = pack(rects, 64, 64);
    const indices = result.packed.map((packedRect) => packedRect.index).sort((a, b) => a - b);

    expect(indices).toEqual([0, 1, 2]);
  });
});
