export const GLYPH_NAMES: Record<number, string> = {
  0x0020: 'Space',
  0x00a0: 'NBSP',
  0x0009: 'Tab',
  0x000a: 'LF',
  0x000d: 'CR',
  0x200b: 'ZWSP',
  0x200c: 'ZWNJ',
  0x200d: 'ZWJ',
  0xfeff: 'BOM',
};

export function glyphDisplayName(cp: number): string {
  return GLYPH_NAMES[cp] ?? String.fromCodePoint(cp);
}
