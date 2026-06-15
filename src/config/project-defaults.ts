export const DEFAULT_FONT_SIZE = 32;
export const DEFAULT_LINE_HEIGHT = 36;
export const DEFAULT_BASE = 28;
export const DEFAULT_CAP_HEIGHT = 22;
export const DEFAULT_PADDING = { top: 1, right: 1, bottom: 1, left: 1 } as const;
export const DEFAULT_SPACING = { x: 1, y: 1 } as const;
export const DEFAULT_ALPHA_THRESHOLD = 128;

// Wizard-side ratios used to derive metrics from a chosen fontSize.
export const LINE_HEIGHT_RATIO = 1.2;
export const BASE_RATIO = 0.8;
export const CAP_HEIGHT_RATIO = 0.7;

// Bounds for the fontSize input in the wizards.
export const FONT_SIZE_MIN = 4;
export const FONT_SIZE_MAX = 256;
