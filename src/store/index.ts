import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { type AtlasSlice, createAtlasSlice } from './atlasSlice';
import { createEditorSlice, type EditorSlice } from './editorSlice';
import { createExportSlice, type ExportSlice } from './exportSlice';
import { createGlyphSlice, type GlyphSlice } from './glyphSlice';
import { createProjectSlice, type ProjectSlice } from './projectSlice';
import { createUiSlice, type UiSlice } from './uiSlice';

export type AppStore = ProjectSlice & GlyphSlice & EditorSlice & UiSlice & AtlasSlice & ExportSlice;

export const useStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createProjectSlice(...args),
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
        currentProject: state.currentProject,
        view: state.view,
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
export * from './glyphSlice';
export * from './projectSlice';
export * from './uiSlice';
