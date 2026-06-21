import type { FontSettings, Glyph } from './types';

export function effectiveThreshold(
  glyph: Pick<Glyph, 'alphaThreshold'>,
  settings: Pick<FontSettings, 'alphaThreshold'>,
): number {
  return glyph.alphaThreshold ?? settings.alphaThreshold;
}
