import { ArrowLeft, Download, FileType, HelpCircle, Settings } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  GLYPH_LIST_COLLAPSE_THRESHOLD_PX,
  GLYPH_LIST_INITIAL_WIDTH_PX,
  GLYPH_LIST_MAX_WIDTH_PX,
  GLYPH_LIST_MIN_WIDTH_PX,
  ZOOM_REFERENCE,
} from '@/config';
import { cloneLayers, syncLegacyFields, trimLayerToInk } from '@/core/project/layers';
import { getGlyphsForProject } from '@/db/glyphs';
import { saveGlyphs } from '@/db/glyphs';
import { ExportDialog } from '@/features/export/ExportDialog';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useStore } from '@/store';
import type { EditorTool } from '@/store/editorSlice';

import { AtlasFloat } from './AtlasFloat';
import { GlyphList } from './glyph-list/GlyphList';
import { HelpOverlay } from './HelpOverlay';
import { LayerPanel } from './pixel-editor/LayerPanel';
import { PixelEditor } from './pixel-editor/PixelEditor';
import { zoomToFitLevel } from './pixel-editor/zoom-helpers';
import { PreviewFloat } from './PreviewFloat';
import { SettingsDialog } from './SettingsDialog';
import { EditorToolbar } from './toolbar/EditorToolbar';

export const EditorScreen = (): React.JSX.Element => {
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [glyphListCollapsed, setGlyphListCollapsed] = useState(false);
  const [glyphListWidth, setGlyphListWidth] = useState(GLYPH_LIST_INITIAL_WIDTH_PX);
  const draggingRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function onMouseMove(event: MouseEvent): void {
      const drag = draggingRef.current;

      if (!drag) {
        return;
      }

      const clientX = event.clientX;

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const delta = clientX - drag.startX;
        const width = drag.startWidth + delta;

        if (width < GLYPH_LIST_COLLAPSE_THRESHOLD_PX) {
          setGlyphListCollapsed(true);
          draggingRef.current = null;
        } else {
          setGlyphListWidth(
            Math.min(GLYPH_LIST_MAX_WIDTH_PX, Math.max(GLYPH_LIST_MIN_WIDTH_PX, width)),
          );
        }
      });
    }

    function onMouseUp(): void {
      draggingRef.current = null;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const navigate = useNavigate();
  const currentProject = useStore((state) => state.currentProject);
  const setGlyphs = useStore((state) => state.setGlyphs);
  const activeTool = useStore((state) => state.activeTool);
  const setActiveTool = useStore((state) => state.setActiveTool);
  const showGrid = useStore((state) => state.showGrid);
  const setShowGrid = useStore((state) => state.setShowGrid);
  const selectedCodePoint = useStore((state) => state.selectedCodePoint);
  const glyphs = useStore((state) => state.glyphs);
  const upsertGlyph = useStore((state) => state.upsertGlyph);
  const { undo, redo } = useUndoRedo();
  const setZoomLevel = useStore((state) => state.setZoomLevel);
  const requestRecenter = useStore((state) => state.requestRecenter);
  const pushUndo = useStore((state) => state.pushUndo);

  // Track the tool to restore after Space/Alt temporary overrides
  const toolBeforeOverride = useRef<EditorTool | null>(null);

  // Load glyphs from IndexedDB whenever the active project changes
  useEffect(() => {
    if (!currentProject) {
      return;
    }

    void getGlyphsForProject(currentProject.id).then((loaded) =>
      // Re-tighten every layer's buffer to its inked bounds on load — repairs
      // any glyphs saved before the trim-on-write fix in updateLayerPixels.
      setGlyphs(
        loaded.map((loadedGlyph) =>
          syncLegacyFields({
            ...loadedGlyph,
            layers: loadedGlyph.layers.map((layer) => trimLayerToInk(layer)),
          }),
        ),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    function isTyping(e: KeyboardEvent): boolean {
      return e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    }

    function onKeyDown(e: KeyboardEvent): void {
      const ctrl = e.ctrlKey || e.metaKey;

      // Undo / redo
      if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();

        return;
      }

      if (ctrl && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();

        return;
      }

      // Export
      if (ctrl && e.key === 'e') {
        e.preventDefault();
        setExportOpen(true);

        return;
      }

      // Ctrl+Shift+S — settings
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSettingsOpen((value) => !value);

        return;
      }

      // Ctrl+S is a no-op (auto-saved) but prevent browser save dialog
      if (ctrl && e.key === 's') {
        e.preventDefault();

        return;
      }

      // Ctrl+Shift+A — toggle atlas
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAtlasOpen((value) => !value);

        return;
      }

      // Ctrl+Shift+P — toggle preview
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPreviewOpen((value) => !value);

        return;
      }

      // Cmd+' — toggle all non-editor elements
      if (ctrl && e.key === "'") {
        e.preventDefault();
        const anyVisible = !glyphListCollapsed || atlasOpen || previewOpen;

        if (anyVisible) {
          setGlyphListCollapsed(true);
          setAtlasOpen(false);
          setPreviewOpen(false);
        } else {
          setGlyphListCollapsed(false);
          setAtlasOpen(true);
          setPreviewOpen(true);
        }

        return;
      }

      if (isTyping(e)) {
        return;
      }

      // Shift+1 → zoom to 100% (ZOOM_REFERENCE); Shift+0 → zoom to fit.
      if (e.shiftKey && !ctrl && !e.altKey && (e.key === '1' || e.key === '0')) {
        e.preventDefault();

        if (e.key === '1') {
          setZoomLevel(ZOOM_REFERENCE);
          requestRecenter();
        } else if (currentProject) {
          const container = document.querySelector<HTMLElement>('[data-editor-canvas-container]');
          const viewport = container
            ? { width: container.clientWidth, height: container.clientHeight }
            : { width: window.innerWidth, height: window.innerHeight };

          setZoomLevel(zoomToFitLevel(currentProject.settings, viewport));
          requestRecenter();
        }

        return;
      }

      // Arrow keys nudge glyph offset by 1px when the Move tool is active.
      // Each press is its own undo step (matches Figma).
      if (
        activeTool === 'move' &&
        !ctrl &&
        !e.altKey &&
        !e.shiftKey &&
        (e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight' ||
          e.key === 'ArrowUp' ||
          e.key === 'ArrowDown') &&
        selectedCodePoint !== null
      ) {
        const glyph = glyphs.find((glyphItem) => glyphItem.codePoint === selectedCodePoint);

        if (!glyph) {
          return;
        }

        e.preventDefault();

        const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;

        pushUndo(selectedCodePoint, { layers: cloneLayers(glyph.layers) });

        // Arrow-key nudge moves every layer together (preserves the whole-glyph translation behaviour).
        const shiftedLayers = glyph.layers.map((layer) => ({
          ...layer,
          xoffset: layer.xoffset + dx,
          yoffset: layer.yoffset + dy,
        }));
        const updated = syncLegacyFields({
          ...glyph,
          layers: shiftedLayers,
          isDirty: true,
        });

        upsertGlyph(updated);
        void saveGlyphs([updated]);

        return;
      }

      // Tool switching
      switch (e.key.toLowerCase()) {
        case 'b':
          setActiveTool('pencil');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'm':
          setActiveTool('move');
          break;
        case 'z':
          setActiveTool('zoom');
          break;
        case 'g':
          setShowGrid(!showGrid);
          break;
      }

      if (e.key === '?') {
        setHelpOpen(true);

        return;
      }

      // Space — temporarily activate move tool. Always preventDefault so the
      // browser doesn't scroll the editor container on space keydown (including
      // auto-repeats after the first press).
      if (e.key === ' ') {
        e.preventDefault();

        if (!e.repeat && activeTool !== 'move') {
          toolBeforeOverride.current = activeTool;
          setActiveTool('move');
        }
      }

      // Alt — invert active tool (pencil↔eraser)
      if (e.key === 'Alt' && !e.repeat) {
        if (activeTool === 'pencil') {
          toolBeforeOverride.current = 'pencil';
          setActiveTool('eraser');
        } else if (activeTool === 'eraser') {
          toolBeforeOverride.current = 'eraser';
          setActiveTool('pencil');
        }
      }
    }

    function onKeyUp(e: KeyboardEvent): void {
      // Restore tool after Space/Alt released
      if ((e.key === ' ' || e.key === 'Alt') && toolBeforeOverride.current !== null) {
        setActiveTool(toolBeforeOverride.current);
        toolBeforeOverride.current = null;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showGrid,
    activeTool,
    selectedCodePoint,
    glyphs,
    glyphListCollapsed,
    atlasOpen,
    previewOpen,
    currentProject,
  ]);

  if (!currentProject) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="border-border flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <FileType className="text-muted-foreground h-4 w-4" />
        <span className="text-sm font-medium">{currentProject?.name ?? 'Untitled'}</span>
        <span className="text-muted-foreground text-xs">
          {currentProject?.settings.fontSize}px · {currentProject?.glyphs.length} glyphs
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Auto-saved</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Keyboard shortcuts (?)"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Settings (Cmd+Shift+S)"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <div className="bg-border h-5 w-px" />
          <Button size="sm" className="h-7 text-xs" onClick={() => setExportOpen(true)}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </header>

      {/* Editor workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Glyph list — full or collapsed strip */}
        <GlyphList
          collapsed={glyphListCollapsed}
          onCollapse={() => setGlyphListCollapsed(!glyphListCollapsed)}
          width={glyphListCollapsed ? 48 : glyphListWidth}
        />

        {/* Left drag handle */}
        {!glyphListCollapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize glyph list"
            className="hover:bg-primary/40 w-1 shrink-0 cursor-col-resize transition-colors"
            onMouseDown={(event) => {
              event.preventDefault();
              draggingRef.current = { startX: event.clientX, startWidth: glyphListWidth };
            }}
            onDoubleClick={() => setGlyphListCollapsed(true)}
          />
        )}

        <div className="relative flex flex-1 flex-col overflow-hidden">
          <EditorToolbar
            atlasOpen={atlasOpen}
            previewOpen={previewOpen}
            onAtlasToggle={() => setAtlasOpen((value) => !value)}
            onPreviewToggle={() => setPreviewOpen((value) => !value)}
          />
          <div className="flex flex-1 overflow-hidden">
            <PixelEditor />
            <LayerPanel />
          </div>
          <AtlasFloat open={atlasOpen} onClose={() => setAtlasOpen(false)} />
          <PreviewFloat open={previewOpen} onClose={() => setPreviewOpen(false)} />
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <HelpOverlay open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
};
