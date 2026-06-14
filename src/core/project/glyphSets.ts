export interface GlyphSet {
  id: string;
  label: string;
  codePoints: number[];
  custom?: boolean;
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_item, index) => from + index);
}

// A–Z + a–z
const ASCII_LETTERS = [...range(0x41, 0x5a), ...range(0x61, 0x7a)];
// 0–9
const ASCII_DIGITS = range(0x30, 0x39);

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
    id: 'letters-digits',
    label: 'Letters & digits (63 chars)',
    codePoints: [0x0020, ...ASCII_LETTERS, ...ASCII_DIGITS].sort((a, b) => a - b),
    custom: true,
  },
  {
    id: 'letters',
    label: 'Letters only (53 chars)',
    codePoints: [0x0020, ...ASCII_LETTERS],
    custom: true,
  },
  {
    id: 'digits',
    label: 'Digits only (10 chars)',
    codePoints: ASCII_DIGITS,
    custom: true,
  },
];

export function parseCustomCodePoints(input: string): number[] {
  const seen = new Set<number>();
  const result: number[] = [];

  for (const char of input) {
    const cp = char.codePointAt(0);

    if (cp !== undefined && !seen.has(cp)) {
      seen.add(cp);
      result.push(cp);
    }
  }

  return result.sort((a, b) => a - b);
}
