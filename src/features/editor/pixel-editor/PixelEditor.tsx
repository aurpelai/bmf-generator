import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  AUTO_SAVE_TOAST_DELAY_MS,
  BRUSH_RESIZE_WHEEL_THRESHOLD,
  GLYPH_GRAB_OUTLINE_COLOR,
  GLYPH_GRAB_PADDING_CELLS,
  GRID_MIN_ZOOM,
  GUTTER_LEFT_PAD_PX,
  GUTTER_RIGHT_PAD_PX,
  LABEL_SIZE_MAX_PX,
  LABEL_SIZE_MIN_PX,
  LABEL_SIZE_SCALE,
  TOAST_DURATION_MS,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_PRESETS,
  ZOOM_WHEEL_SENSITIVITY,
} from '@/config';
import {
  cloneLayers,
  cycleHitLayer,
  flattenGlyph,
  hitTestLayer,
  layerColor,
  unionLayerBounds,
  updateLayerPixels,
} from '@/core/font/layers';
import { effectiveThreshold } from '@/core/font/threshold';
import type { Glyph, Layer } from '@/core/font/types';
import { saveGlyphs } from '@/db/glyphs';
import { useStore } from '@/store';

import { computeCanvasLayout } from './zoom-helpers';

function nextZoomStep(currentZoom: number, direction: 1 | -1): number {
  if (direction > 0) {
    return ZOOM_PRESETS.find((preset) => preset > currentZoom) ?? currentZoom;
  }

  return [...ZOOM_PRESETS].reverse().find((preset) => preset < currentZoom) ?? currentZoom;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
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
  const pendingRecenter = useStore((state) => state.pendingRecenter);
  const setZoomLevel = useStore((state) => state.setZoomLevel);
  const setBrushSize = useStore((state) => state.setBrushSize);
  const upsertGlyph = useStore((state) => state.upsertGlyph);
  const pushUndo = useStore((state) => state.pushUndo);
  const addToast = useStore((state) => state.addToast);
  const currentFont = useStore((state) => state.currentFont);
  const activeLayerId = useStore((state) => state.activeLayerId);
  const setActiveLayerId = useStore((state) => state.setActiveLayerId);
  const multiSelectLayerIds = useStore((state) => state.multiSelectLayerIds);

  const autoSaveToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveToastShown = useRef(false);

  const glyph = glyphs.find((glyphItem) => glyphItem.codePoint === selectedCodePoint) ?? null;

  // overGrab drives both the JSX cursor and the grab-outline pass in drawCanvas;
  // lifting it to React state keeps the cursor in sync without flicker.
  const [overGrab, setOverGrab] = useState(false);

  const initialMoveLayerOrigins: Record<string, { xoffset: number; yoffset: number }> = {};
  const stateRef = useRef({
    glyph,
    activeTool,
    brushSize,
    zoomLevel,
    showGrid,
    activeLayerId: null as string | null,
    multiSelectLayerIds: [] as string[],
    overGrab: false,
    isDrawing: false,
    lastPixel: -1,
    cursorCell: null as { col: number; row: number } | null,
    // Layer IDs the move tool would grab right now under the cursor. Recomputed on hover.
    // Empty when the cursor is over empty space — in that case the move tool falls back to canvas pan.
    hoverGrabLayerIds: [] as string[],
    moveOrigin: null as { x: number; y: number } | null,
    // Pre-drag offsets per moved layer, captured at pointerdown.
    moveLayerOrigins: initialMoveLayerOrigins,
    moveDelta: { dx: 0, dy: 0 },
    isPanning: false,
    panOrigin: null as {
      clientX: number;
      clientY: number;
      scrollLeft: number;
      scrollTop: number;
    } | null,
    shiftWheelAccum: 0,
    // The actual origin used by the last drawCanvas pass — stashed here so
    // pointer-to-cell mapping uses the exact same origin (including any
    // viewport-overscan adjustment) that the canvas was painted with.
    lastLayout: {
      originX: 0,
      originY: 0,
      canvasCols: 0,
      canvasRows: 0,
      labelGutterPx: 0,
    },
    // Pending zoom-at-cursor recenter — cell coordinates and viewport-relative
    // cursor position, captured at the moment Ctrl/Cmd+wheel fires. After the
    // next paint the effect on zoomLevel applies the scroll so the cell stays
    // under the cursor.
    pendingZoomCursor: null as {
      cellCol: number;
      cellRow: number;
      viewportX: number;
      viewportY: number;
    } | null,
  });

  // Sync the latest props/state into the ref so the imperative event handlers
  // and the canvas draw routine always read fresh values without re-binding.
  useEffect(() => {
    stateRef.current.glyph = glyph;
    stateRef.current.activeTool = activeTool;
    stateRef.current.brushSize = brushSize;
    stateRef.current.zoomLevel = zoomLevel;
    stateRef.current.showGrid = showGrid;
    stateRef.current.activeLayerId = activeLayerId;
    stateRef.current.multiSelectLayerIds = multiSelectLayerIds;
    stateRef.current.overGrab = overGrab;
  });

  // Auto-select a layer when none is active (or when the active one no longer
  // belongs to the selected glyph). Prefers the topmost visible unlocked layer.
  useEffect(() => {
    if (!glyph) {
      return;
    }

    const stillValid = glyph.layers.some((layer) => layer.id === activeLayerId);

    if (stillValid) {
      return;
    }

    const candidate =
      [...glyph.layers].reverse().find((layer) => layer.visible && !layer.locked) ??
      glyph.layers[glyph.layers.length - 1];

    setActiveLayerId(candidate?.id ?? null);
  }, [glyph, activeLayerId, setActiveLayerId]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const currentGlyph = stateRef.current.glyph;
    const font = currentFont;

    if (!canvas || !font) {
      return;
    }

    const zoom = stateRef.current.zoomLevel;
    const grid = stateRef.current.showGrid;
    const { fontSize, lineHeight, base, capHeight } = font.settings;

    // During a move drag the store is not updated — offsets live only in stateRef.
    // Only the layers being dragged are shifted by (dx, dy); other layers stay put.
    const moveLayerOrigins = stateRef.current.moveLayerOrigins;
    const movingLayerIds = Object.keys(moveLayerOrigins);
    const dragging = movingLayerIds.length > 0;
    const { dx, dy } = stateRef.current.moveDelta;
    const flatBounds = currentGlyph ? flattenGlyph(currentGlyph) : null;
    const layoutXoffset = flatBounds?.xoffset ?? 0;
    const layoutYoffset = flatBounds?.yoffset ?? 0;
    // dragBounds expands the layout to cover both the original and dragged glyph
    // positions so panning during a drag never reveals empty canvas. We use the
    // glyph-level (flat) bounds shifted by (dx, dy) as a slightly loose upper bound.
    const container = containerRef.current;
    const dragBounds = flatBounds
      ? dragging
        ? {
            xoffset: Math.min(layoutXoffset, layoutXoffset + dx),
            yoffset: Math.min(layoutYoffset, layoutYoffset + dy),
            width: flatBounds.width + Math.abs(dx),
            height: flatBounds.height + Math.abs(dy),
          }
        : {
            xoffset: layoutXoffset,
            yoffset: layoutYoffset,
            width: flatBounds.width,
            height: flatBounds.height,
          }
      : null;
    const layout = computeCanvasLayout(
      font.settings,
      dragBounds,
      zoom,
      container ? { width: container.clientWidth, height: container.clientHeight } : null,
    );
    const { originX, originY, canvasCols, canvasRows } = layout;

    // Measure the widest label so the right-hand gutter actually fits the text.
    const labelSize = Math.max(
      LABEL_SIZE_MIN_PX,
      Math.min(LABEL_SIZE_MAX_PX, zoom * LABEL_SIZE_SCALE),
    );
    const labelGutterPx = (() => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const measureContext = canvas.getContext('2d')!; // canvas is a real DOM element

      measureContext.font = `${labelSize}px monospace`;

      const widest = Math.max(
        measureContext.measureText('Baseline').width,
        measureContext.measureText('Cap height').width,
      );

      return Math.ceil(GUTTER_LEFT_PAD_PX + widest + GUTTER_RIGHT_PAD_PX);
    })();

    canvas.width = canvasCols * zoom + labelGutterPx;
    canvas.height = canvasRows * zoom;

    // Stash the layout so pointer-to-cell mapping and the post-paint
    // zoom-at-cursor recenter both use the same origin the canvas was
    // actually painted with.
    stateRef.current.lastLayout = {
      originX,
      originY,
      canvasCols,
      canvasRows,
      labelGutterPx,
    };
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const context = canvas.getContext('2d')!; // canvas is a real DOM element

    context.clearRect(0, 0, canvas.width, canvas.height);

    // Cell background — subtle distinction from overflow area
    const cellX = -originX * zoom;
    const cellY = -originY * zoom;

    context.fillStyle = 'rgba(255,255,255,0.03)';
    context.fillRect(cellX, cellY, fontSize * zoom, lineHeight * zoom);

    // Glyph pixels — render each visible layer bottom-up.
    // Layers being dragged are shifted by (dx, dy); other layers stay at rest.
    if (currentGlyph) {
      const threshold = effectiveThreshold(currentGlyph, font.settings);

      for (const layer of currentGlyph.layers) {
        if (!layer.visible || layer.width === 0 || layer.height === 0) {
          continue;
        }

        const beingMoved = layer.id in moveLayerOrigins;
        const layerOriginX = layer.xoffset + (beingMoved ? dx : 0);
        const layerOriginY = layer.yoffset + (beingMoved ? dy : 0);
        const inkColor = layer.preview ? layerColor(layer) : 'rgb(255,255,255)';

        for (let row = 0; row < layer.height; row++) {
          for (let column = 0; column < layer.width; column++) {
            const value = layer.pixels[row * layer.width + column];

            if (value < threshold) {
              continue;
            }

            const cellColumn = layerOriginX + column;
            const cellRow = layerOriginY + row;
            const canvasX = (cellColumn - originX) * zoom;
            const canvasY = (cellRow - originY) * zoom;
            const inCell =
              cellColumn >= 0 && cellColumn < fontSize && cellRow >= 0 && cellRow < lineHeight;

            context.globalAlpha = inCell ? 1 : 0.35;
            context.fillStyle = inkColor;
            context.fillRect(canvasX, canvasY, zoom, zoom);
          }
        }
      }

      context.globalAlpha = 1;
    }

    // Guide lines: baseline and cap-height
    {
      const baselineY = (base - originY) * zoom;
      const capY = Math.max(0, baselineY - capHeight * zoom);

      const cellRight = cellX + fontSize * zoom;
      const gutterX = cellRight + GUTTER_LEFT_PAD_PX;

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

    // Move-tool grab outline — wraps the layers under the cursor (or being
    // dragged). Skipped if the move tool isn't active or no layers are picked.
    if (stateRef.current.activeTool === 'move' && currentGlyph) {
      const outlineIds = dragging ? movingLayerIds : stateRef.current.hoverGrabLayerIds;
      const outlineBox = unionLayerBounds(currentGlyph, outlineIds, dragging ? { dx, dy } : null);

      if (outlineBox) {
        const padding = GLYPH_GRAB_PADDING_CELLS;
        const rectX = (outlineBox.left - padding - originX) * zoom + 0.5;
        const rectY = (outlineBox.top - padding - originY) * zoom + 0.5;
        const rectWidth = (outlineBox.right - outlineBox.left + padding * 2) * zoom - 1;
        const rectHeight = (outlineBox.bottom - outlineBox.top + padding * 2) * zoom - 1;

        context.save();
        context.strokeStyle = GLYPH_GRAB_OUTLINE_COLOR;
        context.lineWidth = 1;
        context.setLineDash([]);
        context.strokeRect(rectX, rectY, rectWidth, rectHeight);
        context.restore();
      }
    }

    // Grid overlay (cell area only)
    if (grid && zoom >= GRID_MIN_ZOOM && currentGlyph) {
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
  }, [currentFont]);

  useEffect(() => {
    drawCanvas();

    // After repainting, apply any pending zoom-at-cursor scroll adjustment.
    // The new origin lives in stateRef.current.lastLayout (just written by
    // drawCanvas), so we can place the captured cell directly under the cursor.
    const pending = stateRef.current.pendingZoomCursor;

    if (pending) {
      const container = containerRef.current;

      if (container) {
        const { originX, originY } = stateRef.current.lastLayout;
        const cellCanvasX = (pending.cellCol - originX) * zoomLevel;
        const cellCanvasY = (pending.cellRow - originY) * zoomLevel;

        container.scrollLeft = cellCanvasX - pending.viewportX;
        container.scrollTop = cellCanvasY - pending.viewportY;
      }

      stateRef.current.pendingZoomCursor = null;
    }
  }, [glyph, zoomLevel, showGrid, overGrab, drawCanvas]);

  // Hide the brush highlight whenever the container scrolls (trackpad pan,
  // mouse wheel, or programmatic). The pointer is stationary on screen during
  // a scroll while the underlying cell shifts, so the cached cursorCell would
  // be visually misleading. Refreshed on the next pointermove.
  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    function handleScroll(): void {
      if (stateRef.current.cursorCell) {
        stateRef.current.cursorCell = null;
        drawCanvas();
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [drawCanvas]);

  // Redraw when the scroll container changes size — the canvas dimensions
  // depend on container.clientWidth/Height via CANVAS_VIEWPORT_OVERSCAN.
  useEffect(() => {
    const container = containerRef.current;

    if (!container || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      drawCanvas();
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [drawCanvas]);

  // Prevent the browser from scrolling the container when dragging on the canvas.
  // Must be native non-passive listeners — React synthetic events are passive by default.
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    function prevent(event: PointerEvent): void {
      event.preventDefault();
    }

    canvas.addEventListener('pointerdown', prevent, { passive: false });
    canvas.addEventListener('pointermove', prevent, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', prevent);
      canvas.removeEventListener('pointermove', prevent);
    };
  }, []);

  // Center the glyph cell inside the scroll container's viewport. Used on
  // initial mount, glyph changes, and after zoom-to-fit / zoom-to-100%.
  // The canvas is much larger than the cell (overscan padding), so centering
  // the cell — not the canvas — keeps the meaningful content in view.
  const recenterCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const font = currentFont;

    if (!canvas || !container || !font) {
      return;
    }

    const zoom = stateRef.current.zoomLevel;
    const currentGlyph = stateRef.current.glyph;
    const { fontSize, lineHeight } = font.settings;
    // Shared layout math with drawCanvas — single source of truth for where
    // the cell sits within the (possibly overscan-padded) canvas.
    const flatBounds = currentGlyph ? flattenGlyph(currentGlyph) : null;
    const { originX, originY } = computeCanvasLayout(
      font.settings,
      flatBounds
        ? {
            xoffset: flatBounds.xoffset,
            yoffset: flatBounds.yoffset,
            width: flatBounds.width,
            height: flatBounds.height,
          }
        : null,
      zoom,
      { width: container.clientWidth, height: container.clientHeight },
    );
    const cellCenterX = (-originX + fontSize / 2) * zoom;
    const cellCenterY = (-originY + lineHeight / 2) * zoom;

    container.scrollLeft = Math.max(0, cellCenterX - container.clientWidth / 2);
    container.scrollTop = Math.max(0, cellCenterY - container.clientHeight / 2);
  }, [currentFont]);

  // Native non-passive wheel listener:
  //  - Shift+wheel        → adjust brush size (existing behavior)
  //  - Ctrl/Meta+wheel    → zoom toward the cursor (also catches trackpad pinch)
  //  - plain wheel        → fall through to native container scrolling (pan)
  // Bound natively because React's synthetic wheel listeners are passive in
  // modern React, so preventDefault() is ignored.
  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    function handleWheel(event: WheelEvent): void {
      // Shift-only → brush size
      if (event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        stateRef.current.shiftWheelAccum += event.deltaY;

        if (Math.abs(stateRef.current.shiftWheelAccum) >= BRUSH_RESIZE_WHEEL_THRESHOLD) {
          const step = stateRef.current.shiftWheelAccum < 0 ? 1 : -1;

          setBrushSize(stateRef.current.brushSize + step);
          stateRef.current.shiftWheelAccum = 0;
        }

        return;
      }

      // Ctrl/Meta+wheel (and trackpad pinch) → smooth continuous zoom at cursor.
      // Capture the cell under the cursor and the viewport-relative cursor
      // position; an effect on zoomLevel applies the scroll once the canvas
      // has been repainted at the new zoom (and the new origin is known).
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        const currentZoom = stateRef.current.zoomLevel;
        const nextZoom = clamp(
          currentZoom * Math.exp(-event.deltaY * ZOOM_WHEEL_SENSITIVITY),
          ZOOM_MIN,
          ZOOM_MAX,
        );

        if (nextZoom === currentZoom) {
          return;
        }

        const canvas = canvasRef.current;
        const containerEl = containerRef.current;

        if (canvas && containerEl) {
          const canvasRect = canvas.getBoundingClientRect();
          const containerRect = containerEl.getBoundingClientRect();
          const { originX, originY } = stateRef.current.lastLayout;
          // Convert the cursor's canvas-pixel position to cell-space using the
          // ORIGIN the canvas was just painted with — independent of zoom.
          const cellCol = (event.clientX - canvasRect.left) / currentZoom + originX;
          const cellRow = (event.clientY - canvasRect.top) / currentZoom + originY;

          stateRef.current.pendingZoomCursor = {
            cellCol,
            cellRow,
            viewportX: event.clientX - containerRect.left,
            viewportY: event.clientY - containerRect.top,
          };
        }

        setZoomLevel(nextZoom);

        return;
      }

      // Plain wheel / two-finger trackpad → let the container scroll natively.
    }

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zoom toward a specific client point, keeping the canvas cell under that
  // point fixed in the viewport. Captures the cell coordinate at the current
  // zoom; a useEffect on zoomLevel applies the scroll after the canvas has
  // repainted at the new zoom (and the new origin is known).
  function zoomTowardClientPoint(nextZoom: number, clientX: number, clientY: number): void {
    const currentZoom = stateRef.current.zoomLevel;

    if (nextZoom === currentZoom) {
      return;
    }

    const canvas = canvasRef.current;
    const containerEl = containerRef.current;

    if (canvas && containerEl) {
      const canvasRect = canvas.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      const { originX, originY } = stateRef.current.lastLayout;
      const cellCol = (clientX - canvasRect.left) / currentZoom + originX;
      const cellRow = (clientY - canvasRect.top) / currentZoom + originY;

      stateRef.current.pendingZoomCursor = {
        cellCol,
        cellRow,
        viewportX: clientX - containerRect.left,
        viewportY: clientY - containerRect.top,
      };
    }

    setZoomLevel(nextZoom);
  }

  // Recenter when an external action (zoom-to-fit / 100%) requests it.
  // Runs after the drawCanvas effect, so lastLayout reflects the new zoom.
  useEffect(() => {
    if (pendingRecenter === 0) {
      return;
    }

    recenterCanvas();
  }, [pendingRecenter, recenterCanvas]);

  // Center on initial mount and whenever the selected glyph changes.
  // Runs after the drawCanvas effect declared above, so lastLayout has been
  // refreshed for the new glyph before we read it.
  useEffect(() => {
    recenterCanvas();
  }, [selectedCodePoint, recenterCanvas]);

  function cellFromClientPoint(
    clientX: number,
    clientY: number,
  ): { col: number; row: number } | null {
    const canvas = canvasRef.current;
    const font = currentFont;

    if (!canvas || !font) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const zoom = stateRef.current.zoomLevel;
    // Read the exact origin the canvas was last painted with — any
    // viewport-overscan growth must be reflected here or pointer → cell
    // mapping ends up far to the right/below the visible glyph.
    const { originX, originY } = stateRef.current.lastLayout;

    return {
      col: Math.floor((clientX - rect.left) / zoom) + originX,
      row: Math.floor((clientY - rect.top) / zoom) + originY,
    };
  }

  function cellFromEvent(event: React.PointerEvent): { col: number; row: number } | null {
    return cellFromClientPoint(event.clientX, event.clientY);
  }

  /**
   * Returns the layer IDs the move tool would grab at the given cell.
   * - If the user has a multi-selection in the layer panel, return those IDs (whole-glyph-style move).
   * - Otherwise hit-test the topmost visible inked layer under the cursor.
   * - Returns [] if nothing is under the cursor → move tool falls back to canvas pan.
   */
  function moveGrabLayerIds(cell: { col: number; row: number } | null): string[] {
    const currentGlyph = stateRef.current.glyph;
    const font = currentFont;

    if (!cell || !currentGlyph || !font) {
      return [];
    }

    if (stateRef.current.multiSelectLayerIds.length > 0) {
      return stateRef.current.multiSelectLayerIds;
    }

    const threshold = effectiveThreshold(currentGlyph, font.settings);
    const hit = hitTestLayer(currentGlyph, cell.col, cell.row, threshold);

    return hit ? [hit.id] : [];
  }

  function resolveTargetLayer(currentGlyph: Glyph): Layer | null {
    const id = stateRef.current.activeLayerId;

    if (id) {
      const match = currentGlyph.layers.find((layer) => layer.id === id);

      if (match) {
        return match;
      }
    }

    // Fall back to the topmost visible unlocked layer.
    for (let index = currentGlyph.layers.length - 1; index >= 0; index--) {
      const layer = currentGlyph.layers[index];

      if (layer.visible && !layer.locked) {
        return layer;
      }
    }

    return null;
  }

  function applyPaint(cell: { col: number; row: number } | null): void {
    const currentGlyph = stateRef.current.glyph;
    const font = currentFont;

    if (!currentGlyph || !cell || !font) {
      return;
    }

    const targetLayer = resolveTargetLayer(currentGlyph);

    if (!targetLayer || targetLayer.locked) {
      return;
    }

    const tool = stateRef.current.activeTool;
    const size = stateRef.current.brushSize;
    const half = Math.floor(size / 2);
    const value = tool === 'pencil' ? 255 : 0;

    // Brush footprint in cell-space.
    const brushLeft = cell.col - half;
    const brushTop = cell.row - half;
    const brushRight = brushLeft + size; // exclusive
    const brushBottom = brushTop + size; // exclusive

    // Eraser is a no-op outside the existing buffer — nothing to erase there.
    // Pencil grows the buffer to include any in-cell footprint pixels that fall
    // outside the current rect. We never grow beyond the editable cell area.
    const { fontSize, lineHeight } = font.settings;

    // Clip brush to the cell — painting outside the cell is dropped (matches the
    // existing in-cell vs out-of-cell rendering distinction).
    const clipLeft = Math.max(brushLeft, 0);
    const clipTop = Math.max(brushTop, 0);
    const clipRight = Math.min(brushRight, fontSize);
    const clipBottom = Math.min(brushBottom, lineHeight);

    if (clipLeft >= clipRight || clipTop >= clipBottom) {
      return;
    }

    // An empty layer (0×0) has no meaningful offset; anchor the new buffer at
    // the brush footprint instead of unioning with the placeholder (0, 0) origin.
    const layerIsEmpty = targetLayer.width === 0 || targetLayer.height === 0;
    const currentLeft = layerIsEmpty ? clipLeft : targetLayer.xoffset;
    const currentTop = layerIsEmpty ? clipTop : targetLayer.yoffset;
    const currentRight = layerIsEmpty ? clipRight : currentLeft + targetLayer.width;
    const currentBottom = layerIsEmpty ? clipBottom : currentTop + targetLayer.height;

    let newLeft = currentLeft;
    let newTop = currentTop;
    let newRight = currentRight;
    let newBottom = currentBottom;

    if (tool === 'pencil') {
      newLeft = Math.min(currentLeft, clipLeft);
      newTop = Math.min(currentTop, clipTop);
      newRight = Math.max(currentRight, clipRight);
      newBottom = Math.max(currentBottom, clipBottom);
    }

    const newWidth = newRight - newLeft;
    const newHeight = newBottom - newTop;
    const grew =
      newLeft !== currentLeft ||
      newTop !== currentTop ||
      newWidth !== targetLayer.width ||
      newHeight !== targetLayer.height;

    let newPixels: Uint8Array;

    if (grew) {
      newPixels = new Uint8Array(newWidth * newHeight);
      const shiftX = currentLeft - newLeft;
      const shiftY = currentTop - newTop;

      for (let row = 0; row < targetLayer.height; row++) {
        for (let col = 0; col < targetLayer.width; col++) {
          newPixels[(row + shiftY) * newWidth + (col + shiftX)] =
            targetLayer.pixels[row * targetLayer.width + col];
        }
      }
    } else {
      newPixels = new Uint8Array(targetLayer.pixels);
    }

    let changed = grew;

    for (let py = clipTop; py < clipBottom; py++) {
      for (let px = clipLeft; px < clipRight; px++) {
        const bufferX = px - newLeft;
        const bufferY = py - newTop;

        if (bufferX < 0 || bufferY < 0 || bufferX >= newWidth || bufferY >= newHeight) {
          continue;
        }

        const index = bufferY * newWidth + bufferX;

        if (newPixels[index] !== value) {
          newPixels[index] = value;
          changed = true;
        }
      }
    }

    if (!changed) {
      return;
    }

    const updated: Glyph = {
      ...updateLayerPixels(currentGlyph, targetLayer.id, {
        pixels: newPixels,
        width: newWidth,
        height: newHeight,
        xoffset: newLeft,
        yoffset: newTop,
      }),
      isDirty: true,
    };

    upsertGlyph(updated);
    void saveGlyphs([updated]);
    drawCanvas();
  }

  function onPointerDown(event: React.PointerEvent): void {
    const currentGlyph = stateRef.current.glyph;

    // Zoom tool — discrete step at cursor. Works without a glyph.
    if (stateRef.current.activeTool === 'zoom') {
      const direction: 1 | -1 = event.altKey ? -1 : 1;

      zoomTowardClientPoint(
        nextZoomStep(stateRef.current.zoomLevel, direction),
        event.clientX,
        event.clientY,
      );

      return;
    }

    // Move tool — branches into layer-drag (over an inked layer) or canvas-pan.
    if (stateRef.current.activeTool === 'move') {
      const cell = cellFromEvent(event);
      let targetIds = moveGrabLayerIds(cell);
      const font = currentFont;

      // Alt+click cycles to the next layer underneath the current pick (Figma-like
      // "click through"). Only meaningful when not in multi-select mode.
      if (
        targetIds.length === 1 &&
        event.altKey &&
        currentGlyph &&
        font &&
        cell &&
        stateRef.current.multiSelectLayerIds.length === 0
      ) {
        const threshold = effectiveThreshold(currentGlyph, font.settings);
        const next = cycleHitLayer(currentGlyph, cell.col, cell.row, threshold, targetIds[0]);

        if (next) {
          targetIds = [next.id];
        }
      }

      event.currentTarget.setPointerCapture(event.pointerId);

      if (targetIds.length > 0 && currentGlyph) {
        // Layer drag — undoable.
        pushUndo(currentGlyph.codePoint, { layers: cloneLayers(currentGlyph.layers) });

        const origins: Record<string, { xoffset: number; yoffset: number }> = {};

        for (const layer of currentGlyph.layers) {
          if (targetIds.includes(layer.id)) {
            origins[layer.id] = { xoffset: layer.xoffset, yoffset: layer.yoffset };
          }
        }

        stateRef.current.moveOrigin = { x: event.clientX, y: event.clientY };
        stateRef.current.moveLayerOrigins = origins;

        // Promote a single-layer hit to the active layer so subsequent paint
        // strokes target the layer the user just grabbed.
        if (targetIds.length === 1 && stateRef.current.multiSelectLayerIds.length === 0) {
          setActiveLayerId(targetIds[0]);
        }

        stateRef.current.isDrawing = true;
        (event.currentTarget as HTMLCanvasElement).style.cursor = 'grabbing';
      } else {
        // Pan drag — ephemeral, NOT undoable.
        const container = containerRef.current;

        if (container) {
          stateRef.current.panOrigin = {
            clientX: event.clientX,
            clientY: event.clientY,
            scrollLeft: container.scrollLeft,
            scrollTop: container.scrollTop,
          };
          stateRef.current.isPanning = true;
          (event.currentTarget as HTMLCanvasElement).style.cursor = 'grabbing';
        }
      }

      return;
    }

    // Pencil / Eraser — need a glyph to paint into.
    if (!currentGlyph) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    pushUndo(currentGlyph.codePoint, { layers: cloneLayers(currentGlyph.layers) });
    stateRef.current.isDrawing = true;
    stateRef.current.lastPixel = -1;
    stateRef.current.moveOrigin = null;
    applyPaint(cellFromEvent(event));
  }

  function onPointerMove(event: React.PointerEvent): void {
    // Active pan drag — adjust container scroll directly. The container's
    // scroll listener handles hiding the brush highlight; nothing else to do.
    if (stateRef.current.isPanning) {
      const container = containerRef.current;
      const origin = stateRef.current.panOrigin;

      if (container && origin) {
        container.scrollLeft = origin.scrollLeft - (event.clientX - origin.clientX);
        container.scrollTop = origin.scrollTop - (event.clientY - origin.clientY);
      }

      return;
    }

    // Active layer drag — move tool with moveOrigin set.
    if (stateRef.current.activeTool === 'move' && stateRef.current.moveOrigin) {
      const origin = stateRef.current.moveOrigin;
      const zoom = stateRef.current.zoomLevel;

      stateRef.current.moveDelta = {
        dx: Math.round((event.clientX - origin.x) / zoom),
        dy: Math.round((event.clientY - origin.y) / zoom),
      };
      drawCanvas();

      return;
    }

    // Move tool, hovering — recompute the picked layer(s) for the outline + cursor.
    if (stateRef.current.activeTool === 'move') {
      const cell = cellFromEvent(event);
      const grabIds = moveGrabLayerIds(cell);
      const wasGrabbing = stateRef.current.hoverGrabLayerIds;
      const changed =
        grabIds.length !== wasGrabbing.length ||
        grabIds.some((id, index) => id !== wasGrabbing[index]);

      stateRef.current.cursorCell = cell;
      stateRef.current.hoverGrabLayerIds = grabIds;

      const overGlyph = grabIds.length > 0;

      if (overGlyph !== stateRef.current.overGrab) {
        setOverGrab(overGlyph);
      } else if (changed) {
        drawCanvas();
      }

      return;
    }

    // Pencil/Eraser — update brush highlight and paint if drawing.
    const cell = cellFromEvent(event);

    stateRef.current.cursorCell = cell;

    if (stateRef.current.isDrawing) {
      applyPaint(cell);
    }

    drawCanvas();
  }

  function onPointerLeave(): void {
    stateRef.current.cursorCell = null;
    stateRef.current.hoverGrabLayerIds = [];

    if (stateRef.current.overGrab) {
      setOverGrab(false);
    }

    drawCanvas();
  }

  function onPointerUp(event: React.PointerEvent): void {
    // Pan drag — release without saving, toasting, or pushing undo.
    if (stateRef.current.isPanning) {
      stateRef.current.isPanning = false;
      stateRef.current.panOrigin = null;

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // pointer capture may already be released; ignore.
      }

      (event.currentTarget as HTMLCanvasElement).style.cursor = stateRef.current.overGrab
        ? 'move'
        : 'grab';

      // Refresh cursorCell so the brush highlight reappears at the right
      // place when the user toggles back to a paint tool (e.g. releasing Space).
      stateRef.current.cursorCell = cellFromEvent(event);
      drawCanvas();

      return;
    }

    const currentGlyph = stateRef.current.glyph;
    let didSave = false;

    if (stateRef.current.activeTool === 'move' && currentGlyph && stateRef.current.moveOrigin) {
      const { dx, dy } = stateRef.current.moveDelta;
      const origins = stateRef.current.moveLayerOrigins;

      if ((dx !== 0 || dy !== 0) && Object.keys(origins).length > 0) {
        const shiftedLayers = currentGlyph.layers.map((layer) => {
          const origin = origins[layer.id];

          if (!origin) {
            return layer;
          }

          return { ...layer, xoffset: origin.xoffset + dx, yoffset: origin.yoffset + dy };
        });
        const updated: Glyph = {
          ...currentGlyph,
          layers: shiftedLayers,
          isDirty: true,
        };

        upsertGlyph(updated);
        void saveGlyphs([updated]);
        didSave = true;
      }

      (event.currentTarget as HTMLCanvasElement).style.cursor = stateRef.current.overGrab
        ? 'move'
        : 'grab';
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
        }, TOAST_DURATION_MS);
      }, AUTO_SAVE_TOAST_DELAY_MS);
    }

    stateRef.current.isDrawing = false;
    stateRef.current.lastPixel = -1;
    stateRef.current.moveOrigin = null;
    stateRef.current.moveLayerOrigins = {};
    stateRef.current.moveDelta = { dx: 0, dy: 0 };
  }

  // No font open at all
  if (!currentFont) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-muted-foreground text-sm">Select a glyph to edit</span>
      </div>
    );
  }

  const moveCursor = overGrab ? 'move' : 'grab';
  const canvasCursor =
    activeTool === 'move'
      ? moveCursor
      : activeTool === 'zoom'
        ? 'zoom-in'
        : activeTool === 'eraser'
          ? 'cell'
          : 'crosshair';

  return (
    <div
      ref={containerRef}
      data-editor-canvas-container
      className="relative flex-1 overflow-auto bg-[#111]"
      style={{ touchAction: 'none' }}
    >
      {/* Inner wrapper centers the canvas when it's smaller than the viewport
          and grows to the canvas size when it's larger — so the scroll
          container has somewhere to pan to once the canvas exceeds the
          viewport. inline-flex (not flex) keeps the wrapper from collapsing
          to the parent's width when the canvas is wider than the viewport,
          so scrollWidth reflects the canvas's actual painted width and
          recenterCanvas / pointer mapping work. */}
      <div
        className="inline-flex items-center justify-center"
        style={{ minWidth: '100%', minHeight: '100%' }}
      >
        {!glyph ? (
          <span className="text-muted-foreground text-sm">Select a glyph to edit</span>
        ) : (
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Pixel editor — ${activeTool} tool`}
            className="block shrink-0"
            style={{
              imageRendering: 'pixelated',
              touchAction: 'none',
              cursor: canvasCursor,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onPointerUp={onPointerUp}
          />
        )}
      </div>
    </div>
  );
};
