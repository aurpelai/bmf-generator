export const ZOOM_MIN = 2;
export const ZOOM_MAX = 32;
export const ZOOM_DEFAULT = 8;
export const ZOOM_PRESETS = [2, 4, 8, 12, 16, 24, 32] as const;

// Zoom level the Shift+1 / "100%" shortcut targets.
export const ZOOM_REFERENCE = ZOOM_DEFAULT;

// Exponential sensitivity for Ctrl/Cmd+wheel zoom. Each wheel pixel multiplies
// zoom by exp(-deltaY * ZOOM_WHEEL_SENSITIVITY); 0.0025 ≈ 9% zoom change per
// 35-pixel wheel tick, which feels close to Figma.
export const ZOOM_WHEEL_SENSITIVITY = 0.0025;
