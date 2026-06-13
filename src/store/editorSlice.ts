import type { StateCreator } from 'zustand'

export type EditorTool = 'pencil' | 'eraser'

export interface EditorSlice {
  selectedCodePoint: number | null
  activeTool: EditorTool
  zoomLevel: number
  showGrid: boolean
  // Per-glyph undo stacks: codePoint → stack of pixel snapshots
  undoStacks: Record<number, Uint8Array[]>
  redoStacks: Record<number, Uint8Array[]>
  setSelectedCodePoint: (codePoint: number | null) => void
  setActiveTool: (tool: EditorTool) => void
  setZoomLevel: (zoom: number) => void
  setShowGrid: (show: boolean) => void
  pushUndo: (codePoint: number, snapshot: Uint8Array) => void
  undo: (codePoint: number) => Uint8Array | null
  redo: (codePoint: number) => Uint8Array | null
}

const MAX_UNDO_STEPS = 50

export const createEditorSlice: StateCreator<EditorSlice> = (set, get) => ({
  selectedCodePoint: null,
  activeTool: 'pencil',
  zoomLevel: 8,
  showGrid: true,
  undoStacks: {},
  redoStacks: {},
  setSelectedCodePoint: (codePoint) => set({ selectedCodePoint: codePoint }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(1, Math.min(32, zoom)) }),
  setShowGrid: (show) => set({ showGrid: show }),
  pushUndo: (codePoint, snapshot) =>
    set((state) => {
      const stack = [...(state.undoStacks[codePoint] ?? [])]
      stack.push(snapshot)
      if (stack.length > MAX_UNDO_STEPS) stack.shift()
      return {
        undoStacks: { ...state.undoStacks, [codePoint]: stack },
        redoStacks: { ...state.redoStacks, [codePoint]: [] },
      }
    }),
  undo: (codePoint) => {
    const stack = [...(get().undoStacks[codePoint] ?? [])]
    if (stack.length === 0) return null
    const snapshot = stack.pop()!
    const redoStack = [...(get().redoStacks[codePoint] ?? [])]
    redoStack.push(snapshot)
    set((state) => ({
      undoStacks: { ...state.undoStacks, [codePoint]: stack },
      redoStacks: { ...state.redoStacks, [codePoint]: redoStack },
    }))
    return stack[stack.length - 1] ?? null
  },
  redo: (codePoint) => {
    const redoStack = [...(get().redoStacks[codePoint] ?? [])]
    if (redoStack.length === 0) return null
    const snapshot = redoStack.pop()!
    const undoStack = [...(get().undoStacks[codePoint] ?? [])]
    undoStack.push(snapshot)
    set((state) => ({
      undoStacks: { ...state.undoStacks, [codePoint]: undoStack },
      redoStacks: { ...state.redoStacks, [codePoint]: redoStack },
    }))
    return snapshot
  },
})
