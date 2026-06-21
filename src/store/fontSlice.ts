import type { StateCreator } from 'zustand';

import type { Font } from '@/core/font';

export interface FontSlice {
  currentFont: Font | null;
  setCurrentFont: (font: Font | null) => void;
  updateCurrentFont: (changes: Partial<Omit<Font, 'id' | 'createdAt'>>) => void;
}

export const createFontSlice: StateCreator<FontSlice> = (set) => ({
  currentFont: null,
  setCurrentFont: (font) => set({ currentFont: font }),
  updateCurrentFont: (changes) =>
    set((state) => ({
      currentFont: state.currentFont
        ? { ...state.currentFont, ...changes, updatedAt: Date.now() }
        : null,
    })),
});
