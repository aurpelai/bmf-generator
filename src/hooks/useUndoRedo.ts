import { useCallback } from 'react';

import { cloneLayers, syncLegacyFields } from '@/core/font/layers';
import { saveGlyphs } from '@/db/glyphs';
import { useStore } from '@/store';

interface UseUndoRedoResult {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useUndoRedo(): UseUndoRedoResult {
  const selectedCodePoint = useStore((state) => state.selectedCodePoint);
  const glyphs = useStore((state) => state.glyphs);
  const upsertGlyph = useStore((state) => state.upsertGlyph);
  const undoAction = useStore((state) => state.undo);
  const redoAction = useStore((state) => state.redo);
  const undoStack = useStore((state) =>
    selectedCodePoint === null ? undefined : state.undoStacks[selectedCodePoint],
  );
  const redoStack = useStore((state) =>
    selectedCodePoint === null ? undefined : state.redoStacks[selectedCodePoint],
  );

  const canUndo = (undoStack?.length ?? 0) > 0;
  const canRedo = (redoStack?.length ?? 0) > 0;

  const undo = useCallback(() => {
    if (selectedCodePoint === null) {
      return;
    }

    const glyph = glyphs.find((glyphItem) => glyphItem.codePoint === selectedCodePoint);

    if (!glyph) {
      return;
    }

    const snapshot = undoAction(selectedCodePoint, { layers: cloneLayers(glyph.layers) });

    if (!snapshot) {
      return;
    }

    const updated = syncLegacyFields({
      ...glyph,
      layers: snapshot.layers,
      isDirty: true,
    });

    upsertGlyph(updated);
    void saveGlyphs([updated]);
  }, [selectedCodePoint, glyphs, undoAction, upsertGlyph]);

  const redo = useCallback(() => {
    if (selectedCodePoint === null) {
      return;
    }

    const glyph = glyphs.find((glyphItem) => glyphItem.codePoint === selectedCodePoint);

    if (!glyph) {
      return;
    }

    const snapshot = redoAction(selectedCodePoint, { layers: cloneLayers(glyph.layers) });

    if (!snapshot) {
      return;
    }

    const updated = syncLegacyFields({
      ...glyph,
      layers: snapshot.layers,
      isDirty: true,
    });

    upsertGlyph(updated);
    void saveGlyphs([updated]);
  }, [selectedCodePoint, glyphs, redoAction, upsertGlyph]);

  return { undo, redo, canUndo, canRedo };
}
