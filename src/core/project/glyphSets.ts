export interface GlyphSet {
  id: string
  label: string
  codePoints: number[]
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

export const GLYPH_SETS: GlyphSet[] = [
  {
    id: 'ascii-printable',
    label: 'ASCII Printable (95 chars)',
    codePoints: range(0x20, 0x7e),
  },
  {
    id: 'latin-1',
    label: 'Latin-1 Supplement (191 chars)',
    codePoints: range(0x20, 0x7e).concat(range(0xa0, 0xff)),
  },
  {
    id: 'digits',
    label: 'Digits only (10 chars)',
    codePoints: range(0x30, 0x39),
  },
]

export function parseCustomCodePoints(input: string): number[] {
  const seen = new Set<number>()
  const result: number[] = []
  for (const char of input) {
    const cp = char.codePointAt(0)
    if (cp !== undefined && !seen.has(cp)) {
      seen.add(cp)
      result.push(cp)
    }
  }
  return result.sort((a, b) => a - b)
}
