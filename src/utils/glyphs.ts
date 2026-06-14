export const GLYPH_NAMES: Record<number, string> = {
  0x0020: 'Space',
  0x00A0: 'NBSP',
  0x0009: 'Tab',
  0x000A: 'LF',
  0x000D: 'CR',
  0x200B: 'ZWSP',
  0x200C: 'ZWNJ',
  0x200D: 'ZWJ',
  0xFEFF: 'BOM',
}

export function glyphDisplayName(cp: number): string {
  return GLYPH_NAMES[cp] ?? String.fromCodePoint(cp)
}
