import {
  Eraser,
  Grid2x2,
  ImageIcon,
  Maximize2,
  Minus,
  Move,
  Pencil,
  Plus,
  Redo2,
  SlidersHorizontal,
  Type,
  Undo2,
  ZoomIn,
} from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { DEFAULT_ALPHA_THRESHOLD, MAX_BRUSH_SIZE, ZOOM_PRESETS, ZOOM_REFERENCE } from '@/config';
import { saveFont } from '@/db';
import { zoomToFitLevel } from '@/features/editor/pixel-editor/zoom-helpers';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';

interface EditorToolbarProps {
  atlasOpen: boolean;
  previewOpen: boolean;
  onAtlasToggle: () => void;
  onPreviewToggle: () => void;
}

export const EditorToolbar = ({
  atlasOpen,
  previewOpen,
  onAtlasToggle,
  onPreviewToggle,
}: EditorToolbarProps): React.JSX.Element => {
  const activeTool = useStore((state) => state.activeTool);
  const setActiveTool = useStore((state) => state.setActiveTool);
  const brushSize = useStore((state) => state.brushSize);
  const setBrushSize = useStore((state) => state.setBrushSize);
  const zoomLevel = useStore((state) => state.zoomLevel);
  const setZoomLevel = useStore((state) => state.setZoomLevel);
  const requestRecenter = useStore((state) => state.requestRecenter);
  const showGrid = useStore((state) => state.showGrid);
  const setShowGrid = useStore((state) => state.setShowGrid);
  const currentFont = useStore((state) => state.currentFont);
  const updateCurrentFont = useStore((state) => state.updateCurrentFont);
  const alphaThreshold = currentFont?.settings.alphaThreshold ?? DEFAULT_ALPHA_THRESHOLD;
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  function zoomIn(): void {
    const next = ZOOM_PRESETS.find((preset) => preset > zoomLevel);

    if (next) {
      setZoomLevel(next);
    }
  }

  function zoomOut(): void {
    const next = [...ZOOM_PRESETS].reverse().find((preset) => preset < zoomLevel);

    if (next) {
      setZoomLevel(next);
    }
  }

  function zoomToReference(): void {
    setZoomLevel(ZOOM_REFERENCE);
    requestRecenter();
  }

  function zoomToFit(): void {
    if (!currentFont) {
      return;
    }

    const container = document.querySelector<HTMLElement>('[data-editor-canvas-container]');
    const viewport = container
      ? { width: container.clientWidth, height: container.clientHeight }
      : { width: window.innerWidth, height: window.innerHeight };

    setZoomLevel(zoomToFitLevel(currentFont.settings, viewport));
    requestRecenter();
  }

  const toolBtn = (
    tool: typeof activeTool,
    icon: React.ReactNode,
    title: string,
  ): React.JSX.Element => (
    <Button
      variant="ghost"
      size="icon"
      title={title}
      aria-label={title}
      aria-pressed={activeTool === tool}
      className={cn('h-7 w-7', activeTool === tool && 'bg-accent text-accent-foreground')}
      onClick={() => setActiveTool(tool)}
    >
      {icon}
    </Button>
  );

  const isPaintTool = activeTool === 'pencil' || activeTool === 'eraser';

  return (
    <div className="border-border flex h-9 shrink-0 items-center gap-1 border-b px-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="Undo (Cmd+Z)"
        aria-label="Undo"
        onClick={undo}
        disabled={!canUndo}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="Redo (Cmd+Shift+Z)"
        aria-label="Redo"
        onClick={redo}
        disabled={!canRedo}
      >
        <Redo2 className="h-3.5 w-3.5" />
      </Button>

      <div className="bg-border mx-1 h-5 w-px" />

      {toolBtn('pencil', <Pencil className="h-3.5 w-3.5" />, 'Pencil (B)')}
      {toolBtn('eraser', <Eraser className="h-3.5 w-3.5" />, 'Eraser (E)')}

      <div
        className={cn(
          'flex items-center gap-0.5 transition-opacity',
          !isPaintTool && 'pointer-events-none opacity-30',
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Decrease brush size"
          aria-label="Decrease brush size"
          onClick={() => setBrushSize(brushSize - 1)}
          disabled={brushSize <= 1}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span
          className="text-muted-foreground w-8 text-center text-xs"
          aria-label={`Brush size ${brushSize}px`}
        >
          {brushSize}px
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Increase brush size"
          aria-label="Increase brush size"
          onClick={() => setBrushSize(brushSize + 1)}
          disabled={brushSize >= MAX_BRUSH_SIZE}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="bg-border mx-1 h-5 w-px" />

      {toolBtn('move', <Move className="h-3.5 w-3.5" />, 'Move (M)')}
      {toolBtn('zoom', <ZoomIn className="h-3.5 w-3.5" />, 'Zoom (Z)')}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="Zoom out"
        aria-label="Zoom out"
        onClick={zoomOut}
        disabled={zoomLevel <= ZOOM_PRESETS[0]}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span
        className="text-muted-foreground w-8 text-center text-xs"
        aria-label={`Zoom ${Math.round(zoomLevel * 10) / 10}×`}
      >
        {Math.round(zoomLevel * 10) / 10}×
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="Zoom in"
        aria-label="Zoom in"
        onClick={zoomIn}
        disabled={zoomLevel >= ZOOM_PRESETS[ZOOM_PRESETS.length - 1]}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        title="Zoom to 100% (Shift+1)"
        aria-label="Zoom to 100%"
        onClick={zoomToReference}
      >
        100%
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="Zoom to fit (Shift+0)"
        aria-label="Zoom to fit"
        onClick={zoomToFit}
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Toggle grid (G)"
        aria-label="Toggle grid"
        aria-pressed={showGrid}
        className={cn('h-7 w-7', showGrid && 'bg-accent text-accent-foreground')}
        onClick={() => setShowGrid(!showGrid)}
      >
        <Grid2x2 className="h-3.5 w-3.5" />
      </Button>

      {currentFont?.settings.sourceFontId && (
        <>
          <div className="bg-border mx-1 h-5 w-px" />

          <div
            className="flex items-center gap-2 px-1"
            title="Alpha threshold — pixels below this value are treated as transparent on export"
          >
            <SlidersHorizontal className="text-muted-foreground h-3.5 w-3.5" />
            <div className="w-32">
              <Slider
                value={[alphaThreshold]}
                min={0}
                max={255}
                step={1}
                onValueChange={(value: number | readonly number[]) => {
                  if (!currentFont) {
                    return;
                  }

                  const next = typeof value === 'number' ? value : value[0];
                  const settings = { ...currentFont.settings, alphaThreshold: next };

                  updateCurrentFont({ settings });
                  void saveFont({ ...currentFont, settings, updatedAt: Date.now() });
                }}
                aria-label="Alpha threshold"
              />
            </div>
            <span className="text-muted-foreground w-10 text-center text-xs tabular-nums">
              {alphaThreshold}
            </span>
          </div>
        </>
      )}

      <div className="bg-border mx-1 h-5 w-px" />

      <Button
        variant="ghost"
        size="icon"
        title="Atlas (Cmd+Shift+A)"
        aria-label="Toggle atlas panel"
        aria-pressed={atlasOpen}
        className={cn('h-7 w-7', atlasOpen && 'bg-accent text-accent-foreground')}
        onClick={onAtlasToggle}
      >
        <ImageIcon className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Font preview (Cmd+Shift+P)"
        aria-label="Toggle font preview panel"
        aria-pressed={previewOpen}
        className={cn('h-7 w-7', previewOpen && 'bg-accent text-accent-foreground')}
        onClick={onPreviewToggle}
      >
        <Type className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
