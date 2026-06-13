import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createProjectSlice, type ProjectSlice } from './projectSlice'
import { createGlyphSlice, type GlyphSlice } from './glyphSlice'
import { createEditorSlice, type EditorSlice } from './editorSlice'
import { createUiSlice, type UiSlice } from './uiSlice'

export type AppStore = ProjectSlice & GlyphSlice & EditorSlice & UiSlice

export const useStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createProjectSlice(...args),
      ...createGlyphSlice(...args),
      ...createEditorSlice(...args),
      ...createUiSlice(...args),
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
)

export * from './projectSlice'
export * from './glyphSlice'
export * from './editorSlice'
export * from './uiSlice'
