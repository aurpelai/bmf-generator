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

// Move tool grab region — cells of slack around the glyph's pixel rect.
// Inside this region the Move tool grabs the glyph; outside it pans the canvas.
export const GLYPH_GRAB_PADDING_CELLS = 1;

// Outline color drawn around the glyph's pixel rect when the Move tool hovers it.
// Distinct from the cyan cap-height guide and the white cell boundary.
export const GLYPH_GRAB_OUTLINE_COLOR = 'oklch(0.75 0.15 80)';

// Minimum canvas size as a multiple of the viewport on each axis. Keeps the
// scroll container with somewhere to pan to even at low zoom levels — without
// this the canvas could be smaller than the viewport and pan would be a no-op.
export const CANVAS_VIEWPORT_OVERSCAN = 2.5;
