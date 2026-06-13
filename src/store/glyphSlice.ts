import type { StateCreator } from 'zustand'
import type { Glyph } from '@/core/project'

export interface GlyphSlice {
  glyphs: Glyph[]
  setGlyphs: (glyphs: Glyph[]) => void
  upsertGlyph: (glyph: Glyph) => void
  removeGlyph: (codePoint: number) => void
}

export const createGlyphSlice: StateCreator<GlyphSlice> = (set) => ({
  glyphs: [],
  setGlyphs: (glyphs) => set({ glyphs }),
  upsertGlyph: (glyph) =>
    set((state) => {
      const index = state.glyphs.findIndex((g) => g.codePoint === glyph.codePoint)
      if (index >= 0) {
        const next = [...state.glyphs]
        next[index] = glyph
        return { glyphs: next }
      }
      return { glyphs: [...state.glyphs, glyph] }
    }),
  removeGlyph: (codePoint) =>
    set((state) => ({ glyphs: state.glyphs.filter((g) => g.codePoint !== codePoint) })),
})
