import type { StateCreator } from 'zustand';

import {
  INITIAL_ACTIVE_TOOL,
  INITIAL_BRUSH_SIZE,
  INITIAL_SHOW_GRID,
  MAX_BRUSH_SIZE,
  MAX_UNDO_STEPS,
  ZOOM_DEFAULT,
  ZOOM_MAX,
} from '@/config';

export type EditorTool = 'pencil' | 'eraser' | 'move' | 'zoom';

export interface GlyphSnapshot {
  pixels: Uint8Array;
  xoffset: number;
  yoffset: number;
}

export interface EditorSlice {
  selectedCodePoint: number | null;
  activeTool: EditorTool;
  brushSize: number;
  zoomLevel: number;
  showGrid: boolean;
  // Per-glyph undo stacks: codePoint → stack of glyph snapshots
  undoStacks: Record<number, GlyphSnapshot[]>;
  redoStacks: Record<number, GlyphSnapshot[]>;
  setSelectedCodePoint: (codePoint: number | null) => void;
  setActiveTool: (tool: EditorTool) => void;
  setBrushSize: (size: number) => void;
  setZoomLevel: (zoom: number) => void;
  setShowGrid: (show: boolean) => void;
  pushUndo: (codePoint: number, snapshot: GlyphSnapshot) => void;
  /** Undo the last edit; pass the current glyph state so it can be pushed onto the redo stack. */
  undo: (codePoint: number, current: GlyphSnapshot) => GlyphSnapshot | null;
  /** Redo the most recently undone edit; pass the current glyph state so it can be pushed onto the undo stack. */
  redo: (codePoint: number, current: GlyphSnapshot) => GlyphSnapshot | null;
}

export const createEditorSlice: StateCreator<EditorSlice> = (set, get) => ({
  selectedCodePoint: null,
  activeTool: INITIAL_ACTIVE_TOOL,
  brushSize: INITIAL_BRUSH_SIZE,
  zoomLevel: ZOOM_DEFAULT,
  showGrid: INITIAL_SHOW_GRID,
  undoStacks: {},
  redoStacks: {},
  setSelectedCodePoint: (codePoint) => set({ selectedCodePoint: codePoint }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setBrushSize: (size) => set({ brushSize: Math.max(1, Math.min(MAX_BRUSH_SIZE, size)) }),
  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(1, Math.min(ZOOM_MAX, zoom)) }),
  setShowGrid: (show) => set({ showGrid: show }),
  pushUndo: (codePoint, snapshot) =>
    set((state) => {
      const stack = [...(state.undoStacks[codePoint] ?? [])];

      stack.push(snapshot);

      if (stack.length > MAX_UNDO_STEPS) {
        stack.shift();
      }

      return {
        undoStacks: { ...state.undoStacks, [codePoint]: stack },
        redoStacks: { ...state.redoStacks, [codePoint]: [] },
      };
    }),
  undo: (codePoint, current) => {
    const stack = [...(get().undoStacks[codePoint] ?? [])];

    if (stack.length === 0) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const snapshot = stack.pop()!; // non-empty stack guaranteed by length check above
    const redoStack = [...(get().redoStacks[codePoint] ?? []), current];

    set((state) => ({
      undoStacks: { ...state.undoStacks, [codePoint]: stack },
      redoStacks: { ...state.redoStacks, [codePoint]: redoStack },
    }));

    return snapshot;
  },
  redo: (codePoint, current) => {
    const redoStack = [...(get().redoStacks[codePoint] ?? [])];

    if (redoStack.length === 0) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const snapshot = redoStack.pop()!; // non-empty stack guaranteed by length check above
    const undoStack = [...(get().undoStacks[codePoint] ?? []), current];

    set((state) => ({
      undoStacks: { ...state.undoStacks, [codePoint]: undoStack },
      redoStacks: { ...state.redoStacks, [codePoint]: redoStack },
    }));

    return snapshot;
  },
});
