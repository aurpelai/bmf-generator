export const MAX_LAYERS_PER_GLYPH = 5;

// Editor tints for layers. Index 0 is white so the auto-created base layer
// renders identically to the final exported ink; subsequent indices are
// distinct hues so additional layers stand out from each other and the base.
export const DEFAULT_LAYER_PALETTE = [
  'rgb(255,255,255)',
  'oklch(0.78 0.17 30)',
  'oklch(0.80 0.16 200)',
  'oklch(0.83 0.18 120)',
  'oklch(0.75 0.18 270)',
] as const;
