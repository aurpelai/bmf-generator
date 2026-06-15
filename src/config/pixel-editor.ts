// Symmetric overflow padding around the cell, as a multiple of fontSize/lineHeight.
// Keeps the cell centred in the viewport while a glyph is moved partly off the grid.
export const OVERFLOW_PADDING_MULTIPLIER = 1.5;

// Metric-label sizing inside the right-hand gutter.
export const LABEL_SIZE_MIN_PX = 8;
export const LABEL_SIZE_MAX_PX = 11;
export const LABEL_SIZE_SCALE = 1.5;
export const GUTTER_LEFT_PAD_PX = 10;
export const GUTTER_RIGHT_PAD_PX = 4;

// Grid overlay is hidden below this zoom level — finer than this and the lines dominate.
export const GRID_MIN_ZOOM = 4;

// Shift+wheel pixel accumulation required to step brush size up/down by one.
export const BRUSH_RESIZE_WHEEL_THRESHOLD = 50;
