import { describe, expect, it } from 'vitest';

import { GLYPH_SETS, parseCustomCodePoints } from './glyphSets';

describe('parseCustomCodePoints', () => {
  it('returns code points sorted ascending', () => {
    expect(parseCustomCodePoints('cba')).toEqual([0x61, 0x62, 0x63]);
  });

  it('deduplicates repeated characters', () => {
    expect(parseCustomCodePoints('aaa')).toEqual([0x61]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseCustomCodePoints('')).toEqual([]);
  });

  it('handles whitespace as a code point', () => {
    expect(parseCustomCodePoints(' a')).toEqual([0x20, 0x61]);
  });

  it('yields full code points for astral characters, not surrogate halves', () => {
    // U+1F600 GRINNING FACE — outside the BMP, encoded as surrogate pair in JS strings
    const result = parseCustomCodePoints('\u{1F600}');

    expect(result).toEqual([0x1f600]);
  });

  it('combines astral and BMP characters in sorted order', () => {
    const result = parseCustomCodePoints('z\u{1F600}a');

    expect(result).toEqual([0x61, 0x7a, 0x1f600]);
  });
});

describe('GLYPH_SETS', () => {
  it('exposes unique ids', () => {
    const ids = GLYPH_SETS.map((set) => set.id);
    const unique = new Set(ids);

    expect(unique.size).toBe(ids.length);
  });

  it('has non-empty, sorted, deduplicated code points in every preset', () => {
    for (const set of GLYPH_SETS) {
      expect(set.codePoints.length).toBeGreaterThan(0);

      for (let index = 1; index < set.codePoints.length; index++) {
        expect(set.codePoints[index]).toBeGreaterThan(set.codePoints[index - 1]);
      }
    }
  });
});
