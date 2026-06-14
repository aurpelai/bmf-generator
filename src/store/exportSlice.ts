import type { StateCreator } from 'zustand';

export type GlyphPreset = 'all' | 'letters' | 'letters-digits' | 'digits' | 'custom';

export type ImportPreset = 'all' | 'letters' | 'letters-digits' | 'digits';

export const IMPORT_PRESETS: Array<{ id: ImportPreset; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'letters', label: 'Letters' },
  { id: 'letters-digits', label: 'Letters & digits' },
  { id: 'digits', label: 'Digits' },
];

export interface ExportSlice {
  // null means "all glyphs" (default). A Set means an explicit selection.
  exportSelection: Set<number> | null;
  exportPreset: GlyphPreset;
  setExportPreset: (preset: GlyphPreset, allCodePoints: number[]) => void;
  toggleExportGlyph: (codePoint: number, allCodePoints: number[]) => void;
  resetExportSelection: () => void;
}

function isLetter(cp: number): boolean {
  return /^\p{L}$/u.test(String.fromCodePoint(cp));
}

function isDigit(cp: number): boolean {
  return cp >= 0x30 && cp <= 0x39;
}

export function filterCodePointsByPreset(preset: ImportPreset, all: number[]): number[] {
  if (preset === 'all') {
    return all;
  }

  return all.filter((codePoint) => {
    if (preset === 'letters') {
      return isLetter(codePoint);
    }

    if (preset === 'digits') {
      return isDigit(codePoint);
    }

    return isLetter(codePoint) || isDigit(codePoint);
  });
}

function codePointsForPreset(
  preset: Exclude<GlyphPreset, 'custom'>,
  all: number[],
): Set<number> | null {
  if (preset === 'all') {
    return null;
  }

  return new Set(
    all.filter((codePoint) => {
      if (preset === 'letters') {
        return isLetter(codePoint);
      }

      if (preset === 'digits') {
        return isDigit(codePoint);
      }

      if (preset === 'letters-digits') {
        return isLetter(codePoint) || isDigit(codePoint);
      }

      return true;
    }),
  );
}

export const createExportSlice: StateCreator<ExportSlice> = (set) => ({
  exportSelection: null,
  exportPreset: 'all',

  setExportPreset: (preset, allCodePoints) =>
    set({
      exportPreset: preset,
      exportSelection:
        preset === 'custom' ? new Set(allCodePoints) : codePointsForPreset(preset, allCodePoints),
    }),

  toggleExportGlyph: (codePoint, allCodePoints) =>
    set((state) => {
      // Materialise "all" into an explicit set before toggling
      const current = state.exportSelection ?? new Set(allCodePoints);
      const next = new Set(current);

      if (next.has(codePoint)) {
        next.delete(codePoint);
      } else {
        next.add(codePoint);
      }

      return { exportSelection: next, exportPreset: 'custom' };
    }),

  resetExportSelection: () => set({ exportSelection: null, exportPreset: 'all' }),
});
