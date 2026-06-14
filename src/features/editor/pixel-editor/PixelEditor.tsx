import React, { useCallback, useEffect, useRef } from 'react';

import { effectiveThreshold } from '@/core/project/threshold';
import type { Glyph } from '@/core/project/types';
import { saveGlyphs } from '@/db/glyphs';
import { useStore } from '@/store';

const MIN_ZOOM = 2;
const MAX_ZOOM = 32;
const ZOOM_PRESETS = [2, 4, 8, 12, 16, 24, 32];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export const PixelEditor = (): React.JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const glyphs = useStore((state) => state.glyphs);
  const selectedCodePoint = useStore((state) => state.selectedCodePoint);
  const activeTool = useStore((state) => state.activeTool);
  const brushSize = useStore((state) => state.brushSize);
  const zoomLevel = useStore((state) => state.zoomLevel);
  const showGrid = useStore((state) => state.showGrid);
  const setZoomLevel = useStore((state) => state.setZoomLevel);
  const setBrushSize = useStore((state) => state.setBrushSize);
  const upsertGlyph = useStore((state) => state.upsertGlyph);
  const pushUndo = useStore((state) => state.pushUndo);
  const addToast = useStore((state) => state.addToast);
  const currentProject = useStore((state) => state.currentProject);

  const autoSaveToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveToastShown = useRef(false);

  const glyph = glyphs.find((glyphItem) => glyphItem.codePoint === selectedCodePoint) ?? null;

  const stateRef = useRef({
    glyph,
    activeTool,
    brushSize,
    zoomLevel,
    showGrid,
    isDrawing: false,
    lastPixel: -1,
    cursorCell: null as { col: number; row: number } | null,
    moveOrigin: null as { x: number; y: number; xoffset: number; yoffset: number } | null,
    moveDelta: { dx: 0, dy: 0 },
    shiftWheelAccum: 0,
  });

  // eslint-disable-next-line react-hooks/refs
  stateRef.current.glyph = glyph;
  // eslint-disable-next-line react-hooks/refs
  stateRef.current.activeTool = activeTool;
  // eslint-disable-next-line react-hooks/refs
  stateRef.current.brushSize = brushSize;
  // eslint-disable-next-line react-hooks/refs
  stateRef.current.zoomLevel = zoomLevel;
  // eslint-disable-next-line react-hooks/refs
  stateRef.current.showGrid = showGrid;

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const currentGlyph = stateRef.current.glyph;
    const project = currentProject;

    if (!canvas || !project) {
      return;
    }

    const zoom = stateRef.current.zoomLevel;
    const grid = stateRef.current.showGrid;
    const { fontSize, lineHeight, base, capHeight } = project.settings;

    // During a move drag the store is not updated — offsets live only in stateRef.
    // layoutXoffset/Y use the original offsets so the grid stays fixed.
    // renderXoffset/Y apply the current drag delta for pixel rendering only.
    const origin = stateRef.current.moveOrigin;
    const { dx, dy } = stateRef.current.moveDelta;
    const layoutXoffset = currentGlyph?.xoffset ?? 0;
    const layoutYoffset = currentGlyph?.yoffset ?? 0;
    const renderXoffset = origin ? origin.xoffset + dx : layoutXoffset;
    const renderYoffset = origin ? origin.yoffset + dy : layoutYoffset;

    const LABEL_GUTTER_PX = 36;
    const glyphRight = currentGlyph
      ? Math.max(layoutXoffset + currentGlyph.width, renderXoffset + currentGlyph.width)
      : 0;
    const glyphBottom = currentGlyph
      ? Math.max(layoutYoffset + currentGlyph.height, renderYoffset + currentGlyph.height)
      : 0;
    const originX = Math.min(0, layoutXoffset, renderXoffset);
    const originY = Math.min(0, layoutYoffset, renderYoffset);
    const canvasCols = Math.max(fontSize, glyphRight) - originX;
    const canvasRows = Math.max(lineHeight, glyphBottom) - originY;

    canvas.width = canvasCols * zoom + LABEL_GUTTER_PX;
    canvas.height = canvasRows * zoom;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const context = canvas.getContext('2d')!; // canvas is a real DOM element

    context.clearRect(0, 0, canvas.width, canvas.height);

    // Cell background — subtle distinction from overflow area
    const cellX = -originX * zoom;
    const cellY = -originY * zoom;

    context.fillStyle = 'rgba(255,255,255,0.03)';
    context.fillRect(cellX, cellY, fontSize * zoom, lineHeight * zoom);

    // Glyph pixels — dimmed outside the cell; binarized at the effective threshold
    if (currentGlyph && currentGlyph.width > 0 && currentGlyph.height > 0) {
      const threshold = effectiveThreshold(currentGlyph, project.settings);

      for (let py = 0; py < currentGlyph.height; py++) {
        for (let px = 0; px < currentGlyph.width; px++) {
          const value = currentGlyph.pixels[py * currentGlyph.width + px];

          if (value < threshold) {
            continue;
          }

          const cx = (renderXoffset + px - originX) * zoom;
          const cy = (renderYoffset + py - originY) * zoom;
          const inCell =
            renderXoffset + px >= 0 &&
            renderXoffset + px < fontSize &&
            renderYoffset + py >= 0 &&
            renderYoffset + py < lineHeight;
          const alpha = inCell ? 1 : 0.35;

          context.fillStyle = `rgba(255,255,255,${alpha})`;
          context.fillRect(cx, cy, zoom, zoom);
        }
      }
    }

    // Guide lines: baseline and cap-height
    {
      const baselineY = (base - originY) * zoom;
      const capY = Math.max(0, baselineY - capHeight * zoom);
      const labelSize = Math.max(8, Math.min(11, zoom * 1.5));

      const cellRight = cellX + fontSize * zoom;
      const gutterX = cellRight + 10;

      context.save();
      context.lineWidth = 1;
      context.setLineDash([4, 3]);
      // Baseline — amber, clipped to cell width
      context.strokeStyle = 'rgba(251,191,36,0.5)';
      context.beginPath();
      context.moveTo(cellX, baselineY + 0.5);
      context.lineTo(cellRight, baselineY + 0.5);
      context.stroke();
      // Cap-height — cyan, clipped to cell width
      context.strokeStyle = 'rgba(34,211,238,0.4)';
      context.beginPath();
      context.moveTo(cellX, capY + 0.5);
      context.lineTo(cellRight, capY + 0.5);
      context.stroke();
      // Labels in the gutter, vertically centred on the line
      context.setLineDash([]);
      context.font = `${labelSize}px monospace`;
      context.textAlign = 'left';
      context.textBaseline = 'middle';
      context.fillStyle = 'rgba(251,191,36,0.7)';
      context.fillText('Baseline', gutterX, baselineY + 0.5);
      context.fillStyle = 'rgba(34,211,238,0.6)';
      context.fillText('Cap height', gutterX, capY + 0.5);
      context.restore();
    }

    // Cell boundary
    {
      context.save();
      context.strokeStyle = 'rgba(255,255,255,0.12)';
      context.lineWidth = 1;
      context.setLineDash([]);
      context.strokeRect(cellX + 0.5, cellY + 0.5, fontSize * zoom - 1, lineHeight * zoom - 1);
      context.restore();
    }

    // Grid overlay (cell area only)
    if (grid && zoom >= 4 && currentGlyph) {
      context.strokeStyle = 'rgba(255,255,255,0.08)';
      context.lineWidth = 1;
      context.setLineDash([]);

      for (let x = 0; x <= fontSize; x++) {
        context.beginPath();
        context.moveTo(cellX + x * zoom + 0.5, cellY);
        context.lineTo(cellX + x * zoom + 0.5, cellY + lineHeight * zoom);
        context.stroke();
      }

      for (let y = 0; y <= lineHeight; y++) {
        context.beginPath();
        context.moveTo(cellX, cellY + y * zoom + 0.5);
        context.lineTo(cellX + fontSize * zoom, cellY + y * zoom + 0.5);
        context.stroke();
      }
    }

    // Brush highlight — border outline of the brush footprint at the cursor
    const cursor = stateRef.current.cursorCell;
    const tool = stateRef.current.activeTool;
    const size = stateRef.current.brushSize;

    if (cursor && currentGlyph && (tool === 'pencil' || tool === 'eraser')) {
      const half = Math.floor(size / 2);
      const bx = (cursor.col - half - originX) * zoom + 0.5;
      const by = (cursor.row - half - originY) * zoom + 0.5;
      const bw = size * zoom - 1;

      context.save();
      context.lineWidth = 1;
      context.setLineDash([]);
      context.strokeStyle = tool === 'pencil' ? 'oklch(0.45 0.09 196)' : 'oklch(0.45 0.12 20)';
      context.strokeRect(bx, by, bw, bw);
      context.restore();
    }
  }, [currentProject]);

  useEffect(() => {
    drawCanvas();
  }, [glyph, zoomLevel, showGrid, drawCanvas]);

  // Prevent the browser from scrolling the container when dragging on the canvas.
  // Must be native non-passive listeners — React synthetic events are passive by default.
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    function prevent(e: PointerEvent): void {
      e.preventDefault();
    }

    canvas.addEventListener('pointerdown', prevent, { passive: false });
    canvas.addEventListener('pointermove', prevent, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', prevent);
      canvas.removeEventListener('pointermove', prevent);
    };
  }, []);

  function cellFromEvent(e: React.PointerEvent): { col: number; row: number } | null {
    const canvas = canvasRef.current;
    const currentGlyph = stateRef.current.glyph;

    if (!canvas || !currentGlyph) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const zoom = stateRef.current.zoomLevel;
    const originX = Math.min(0, currentGlyph.xoffset);
    const originY = Math.min(0, currentGlyph.yoffset);

    return {
      col: Math.floor((e.clientX - rect.left) / zoom) + originX,
      row: Math.floor((e.clientY - rect.top) / zoom) + originY,
    };
  }

  function applyPaint(cell: { col: number; row: number } | null): void {
    const currentGlyph = stateRef.current.glyph;

    if (!currentGlyph || !cell) {
      return;
    }

    const tool = stateRef.current.activeTool;
    const size = stateRef.current.brushSize;
    const half = Math.floor(size / 2);
    const newPixels = new Uint8Array(currentGlyph.pixels);
    let changed = false;

    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const px = cell.col - half + dx - currentGlyph.xoffset;
        const py = cell.row - half + dy - currentGlyph.yoffset;

        if (px < 0 || py < 0 || px >= currentGlyph.width || py >= currentGlyph.height) {
          continue;
        }

        const index = py * currentGlyph.width + px;
        const value = tool === 'pencil' ? 255 : 0;

        if (newPixels[index] !== value) {
          newPixels[index] = value;
          changed = true;
        }
      }
    }

    if (!changed) {
      return;
    }

    const updated: Glyph = { ...currentGlyph, pixels: newPixels, isDirty: true };

    upsertGlyph(updated);
    void saveGlyphs([updated]);
    drawCanvas();
  }

  function onPointerDown(e: React.PointerEvent): void {
    const currentGlyph = stateRef.current.glyph;

    if (!currentGlyph) {
      return;
    }

    if (stateRef.current.activeTool === 'zoom') {
      const zoomIn = !e.altKey;
      const currentZoom = stateRef.current.zoomLevel;
      const nextZoom = zoomIn
        ? (ZOOM_PRESETS.find((z) => z > currentZoom) ?? currentZoom)
        : ([...ZOOM_PRESETS].reverse().find((z) => z < currentZoom) ?? currentZoom);

      if (nextZoom === currentZoom) {
        return;
      }

      // Zoom towards cursor: keep the canvas point under the cursor fixed
      const canvas = canvasRef.current;
      const container = containerRef.current;

      if (canvas && container) {
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left; // cursor offset within canvas
        const cy = e.clientY - rect.top;
        const scale = nextZoom / currentZoom;
        // After zoom the canvas resizes; adjust scroll so cursor point stays put
        const containerRect = container.getBoundingClientRect();
        const scrollX = container.scrollLeft + cx * scale - (e.clientX - containerRect.left);
        const scrollY = container.scrollTop + cy * scale - (e.clientY - containerRect.top);

        setZoomLevel(nextZoom);
        requestAnimationFrame(() => {
          container.scrollLeft = scrollX;
          container.scrollTop = scrollY;
        });
      } else {
        setZoomLevel(nextZoom);
      }

      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    pushUndo(currentGlyph.codePoint, {
      pixels: new Uint8Array(currentGlyph.pixels),
      xoffset: currentGlyph.xoffset,
      yoffset: currentGlyph.yoffset,
    });
    stateRef.current.isDrawing = true;
    stateRef.current.lastPixel = -1;

    if (stateRef.current.activeTool === 'move') {
      stateRef.current.moveOrigin = {
        x: e.clientX,
        y: e.clientY,
        xoffset: currentGlyph.xoffset,
        yoffset: currentGlyph.yoffset,
      };
      (e.currentTarget as HTMLCanvasElement).style.cursor = 'grabbing';
    } else {
      stateRef.current.moveOrigin = null;
      applyPaint(cellFromEvent(e));
    }
  }

  function onPointerMove(e: React.PointerEvent): void {
    if (stateRef.current.activeTool === 'move') {
      if (!stateRef.current.isDrawing) {
        return;
      }

      const origin = stateRef.current.moveOrigin;

      if (!origin) {
        return;
      }

      const zoom = stateRef.current.zoomLevel;

      stateRef.current.moveDelta = {
        dx: Math.round((e.clientX - origin.x) / zoom),
        dy: Math.round((e.clientY - origin.y) / zoom),
      };
      drawCanvas();
    } else {
      // Always update cursor cell for highlight, paint only while drawing
      const cell = cellFromEvent(e);

      stateRef.current.cursorCell = cell;

      if (stateRef.current.isDrawing) {
        applyPaint(cell);
      }

      drawCanvas();
    }
  }

  function onPointerLeave(): void {
    stateRef.current.cursorCell = null;
    drawCanvas();
  }

  function onPointerUp(e: React.PointerEvent): void {
    const currentGlyph = stateRef.current.glyph;
    let didSave = false;

    if (stateRef.current.activeTool === 'move' && currentGlyph && stateRef.current.moveOrigin) {
      const { xoffset, yoffset } = stateRef.current.moveOrigin;
      const { dx, dy } = stateRef.current.moveDelta;

      if (dx !== 0 || dy !== 0) {
        const updated: Glyph = {
          ...currentGlyph,
          xoffset: xoffset + dx,
          yoffset: yoffset + dy,
          isDirty: true,
        };

        upsertGlyph(updated);
        void saveGlyphs([updated]);
        didSave = true;
      }

      (e.currentTarget as HTMLCanvasElement).style.cursor = 'grab';
    } else if (stateRef.current.isDrawing) {
      didSave = true;
    }

    if (didSave && !autoSaveToastShown.current) {
      if (autoSaveToastTimer.current) {
        clearTimeout(autoSaveToastTimer.current);
      }

      autoSaveToastTimer.current = setTimeout(() => {
        addToast('Auto-saved');
        autoSaveToastShown.current = true;
        setTimeout(() => {
          autoSaveToastShown.current = false;
        }, 3000);
      }, 800);
    }

    stateRef.current.isDrawing = false;
    stateRef.current.lastPixel = -1;
    stateRef.current.moveOrigin = null;
    stateRef.current.moveDelta = { dx: 0, dy: 0 };
  }

  function onWheel(e: React.WheelEvent): void {
    e.preventDefault();

    if (e.shiftKey) {
      stateRef.current.shiftWheelAccum += e.deltaY;
      const threshold = 50;

      if (Math.abs(stateRef.current.shiftWheelAccum) >= threshold) {
        const step = stateRef.current.shiftWheelAccum < 0 ? 1 : -1;

        setBrushSize(stateRef.current.brushSize + step);
        stateRef.current.shiftWheelAccum = 0;
      }
    } else {
      const delta = e.deltaY < 0 ? 1 : -1;

      setZoomLevel(clamp(zoomLevel + delta, MIN_ZOOM, MAX_ZOOM));
    }
  }

  // No project open at all
  if (!currentProject) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-muted-foreground text-sm">Select a glyph to edit</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 items-center justify-center overflow-auto bg-[#111]"
      style={{ touchAction: 'none' }}
      onWheel={onWheel}
    >
      {!glyph ? (
        <span className="text-muted-foreground text-sm">Select a glyph to edit</span>
      ) : (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Pixel editor — ${activeTool} tool`}
          style={{
            imageRendering: 'pixelated',
            touchAction: 'none',
            cursor:
              activeTool === 'move'
                ? 'grab'
                : activeTool === 'zoom'
                  ? 'zoom-in'
                  : activeTool === 'eraser'
                    ? 'cell'
                    : 'crosshair',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onPointerUp={onPointerUp}
        />
      )}
    </div>
  );
};
