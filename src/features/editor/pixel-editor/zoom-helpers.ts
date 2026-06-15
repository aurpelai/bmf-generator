import {
  CANVAS_VIEWPORT_OVERSCAN,
  OVERFLOW_PADDING_MULTIPLIER,
  ZOOM_MIN,
  ZOOM_PRESETS,
} from '@/config';

interface FontMetrics {
  fontSize: number;
  lineHeight: number;
}

interface GlyphRect {
  xoffset: number;
  yoffset: number;
  width: number;
  height: number;
}

export interface CanvasLayout {
  originX: number;
  originY: number;
  canvasCols: number;
  canvasRows: number;
}

// Single source of truth for where the glyph cell lives within the canvas.
// drawCanvas paints with this layout; recenterCanvas reads it to put the cell
// in the middle of the viewport. Whenever either side diverges from the other,
// pointer-to-cell mapping and centering both break — keep them in sync via
// this helper.
export function computeCanvasLayout(
  settings: FontMetrics,
  glyphRect: GlyphRect | null,
  zoom: number,
  viewport: { width: number; height: number } | null,
): CanvasLayout {
  const padCols = Math.ceil(settings.fontSize * OVERFLOW_PADDING_MULTIPLIER);
  const padRows = Math.ceil(settings.lineHeight * OVERFLOW_PADDING_MULTIPLIER);

  const glyphLeft = glyphRect?.xoffset ?? 0;
  const glyphTop = glyphRect?.yoffset ?? 0;
  const glyphRight = glyphRect ? glyphLeft + glyphRect.width : 0;
  const glyphBottom = glyphRect ? glyphTop + glyphRect.height : 0;

  // Minimum padding on every side: the overflow constant, plus — when a
  // viewport is given — enough extra room to fill (OVERSCAN - 1) viewports
  // around the cell. With OVERSCAN = 2.5 that's ~0.75 viewports of canvas on
  // each side. The +1 viewport itself is the cell area; everything beyond is
  // pan headroom that must be applied evenly so the cell stays centered
  // regardless of the OVERSCAN value.
  const overscanCols = viewport
    ? Math.ceil((viewport.width * (CANVAS_VIEWPORT_OVERSCAN - 1)) / 2 / zoom)
    : 0;
  const overscanRows = viewport
    ? Math.ceil((viewport.height * (CANVAS_VIEWPORT_OVERSCAN - 1)) / 2 / zoom)
    : 0;

  const leftPad = padCols + overscanCols;
  const rightPad = padCols + overscanCols;
  const topPad = padRows + overscanRows;
  const bottomPad = padRows + overscanRows;

  // Each side independently grows to whichever is further: the symmetric
  // padding around the cell, or far enough out to cover the glyph rect.
  const originX = Math.min(-leftPad, glyphLeft);
  const originY = Math.min(-topPad, glyphTop);
  const rightExtent = Math.max(settings.fontSize + rightPad, glyphRight);
  const bottomExtent = Math.max(settings.lineHeight + bottomPad, glyphBottom);

  return {
    originX,
    originY,
    canvasCols: rightExtent - originX,
    canvasRows: bottomExtent - originY,
  };
}

// Largest zoom preset where the centered cell + overflow padding fits inside
// the editor viewport on both axes. Falls back to ZOOM_MIN when nothing fits.
export function zoomToFitLevel(
  settings: FontMetrics,
  viewport: { width: number; height: number },
): number {
  const padCols = Math.ceil(settings.fontSize * OVERFLOW_PADDING_MULTIPLIER);
  const padRows = Math.ceil(settings.lineHeight * OVERFLOW_PADDING_MULTIPLIER);
  const widthCells = settings.fontSize + 2 * padCols;
  const heightCells = settings.lineHeight + 2 * padRows;

  if (widthCells <= 0 || heightCells <= 0) {
    return ZOOM_MIN;
  }

  let best = ZOOM_MIN;

  for (const preset of ZOOM_PRESETS) {
    if (preset * widthCells <= viewport.width && preset * heightCells <= viewport.height) {
      best = preset;
    }
  }

  return best;
}
