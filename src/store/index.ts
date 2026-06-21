import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { type AtlasSlice, createAtlasSlice } from './atlasSlice';
import { createEditorSlice, type EditorSlice } from './editorSlice';
import { createExportSlice, type ExportSlice } from './exportSlice';
import { createFontSlice, type FontSlice } from './fontSlice';
import { createGlyphSlice, type GlyphSlice } from './glyphSlice';
import { createUiSlice, type UiSlice } from './uiSlice';

export type AppStore = FontSlice & GlyphSlice & EditorSlice & UiSlice & AtlasSlice & ExportSlice;

export const useStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createFontSlice(...args),
      ...createGlyphSlice(...args),
      ...createEditorSlice(...args),
      ...createUiSlice(...args),
      ...createAtlasSlice(...args),
      ...createExportSlice(...args),
    }),
    {
      name: 'bmf-generator',
      // Only persist lightweight metadata; pixel buffers live in IndexedDB
      partialize: (state) => ({
        currentFont: state.currentFont,
        activeTool: state.activeTool,
        zoomLevel: state.zoomLevel,
        showGrid: state.showGrid,
      }),
    },
  ),
);

export * from './atlasSlice';
export * from './editorSlice';
export * from './exportSlice';
export * from './fontSlice';
export * from './glyphSlice';
export * from './uiSlice';
