import type { StateCreator } from 'zustand';

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
  undo: (codePoint: number) => GlyphSnapshot | null;
  redo: (codePoint: number) => GlyphSnapshot | null;
}

const MAX_UNDO_STEPS = 50;

export const createEditorSlice: StateCreator<EditorSlice> = (set, get) => ({
  selectedCodePoint: null,
  activeTool: 'pencil',
  brushSize: 1,
  zoomLevel: 8,
  showGrid: true,
  undoStacks: {},
  redoStacks: {},
  setSelectedCodePoint: (codePoint) => set({ selectedCodePoint: codePoint }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setBrushSize: (size) => set({ brushSize: Math.max(1, Math.min(8, size)) }),
  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(1, Math.min(32, zoom)) }),
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
  undo: (codePoint) => {
    const stack = [...(get().undoStacks[codePoint] ?? [])];

    if (stack.length === 0) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const snapshot = stack.pop()!; // non-empty stack guaranteed by length check above;
    const redoStack = [...(get().redoStacks[codePoint] ?? [])];

    redoStack.push(snapshot);
    set((state) => ({
      undoStacks: { ...state.undoStacks, [codePoint]: stack },
      redoStacks: { ...state.redoStacks, [codePoint]: redoStack },
    }));

    return stack[stack.length - 1] ?? null;
  },
  redo: (codePoint) => {
    const redoStack = [...(get().redoStacks[codePoint] ?? [])];

    if (redoStack.length === 0) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const snapshot = redoStack.pop()!; // non-empty stack guaranteed by length check above;
    const undoStack = [...(get().undoStacks[codePoint] ?? [])];

    undoStack.push(snapshot);
    set((state) => ({
      undoStacks: { ...state.undoStacks, [codePoint]: undoStack },
      redoStacks: { ...state.redoStacks, [codePoint]: redoStack },
    }));

    return snapshot;
  },
});
