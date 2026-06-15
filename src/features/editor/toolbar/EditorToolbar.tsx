import {
  Grid2x2,
  Grid2x2X,
  ImageIcon,
  Minus,
  Move,
  Pencil,
  Plus,
  SlidersHorizontal,
  Type,
  ZoomIn,
} from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZOOM_PRESETS } from '@/config';
import { saveProject } from '@/db';
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
  const showGrid = useStore((state) => state.showGrid);
  const setShowGrid = useStore((state) => state.setShowGrid);
  const currentProject = useStore((state) => state.currentProject);
  const updateCurrentProject = useStore((state) => state.updateCurrentProject);
  const alphaThreshold = currentProject?.settings.alphaThreshold ?? 128;

  function zoomIn(): void {
    const next = ZOOM_PRESETS.find((z) => z > zoomLevel);

    if (next) {
      setZoomLevel(next);
    }
  }

  function zoomOut(): void {
    const next = [...ZOOM_PRESETS].reverse().find((z) => z < zoomLevel);

    if (next) {
      setZoomLevel(next);
    }
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
      {toolBtn('pencil', <Pencil className="h-3.5 w-3.5" />, 'Pencil (B)')}
      {toolBtn('eraser', <Grid2x2X className="h-3.5 w-3.5" />, 'Eraser (E)')}

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
          disabled={brushSize >= 8}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {currentProject?.settings.sourceFontId && (
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
                  if (!currentProject) {
                    return;
                  }

                  const next = Array.isArray(value) ? value[0] : value;
                  const settings = { ...currentProject.settings, alphaThreshold: next };

                  updateCurrentProject({ settings });
                  void saveProject({ ...currentProject, settings, updatedAt: Date.now() });
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
        aria-label={`Zoom ${zoomLevel}×`}
      >
        {zoomLevel}×
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

      <div className="bg-border mx-1 h-5 w-px" />

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
