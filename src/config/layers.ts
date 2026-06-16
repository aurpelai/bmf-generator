export const MAX_LAYERS_PER_GLYPH = 5;

// Editor tints for layers. Index 0 is white so the auto-created base layer
// renders identically to the final exported ink; subsequent indices are
// distinct hues so additional layers stand out from each other and the base.
export const DEFAULT_LAYER_PALETTE = [
  'rgb(255,255,255)',
  'oklch(0.80 0.17 50)',
  'oklch(0.78 0.13 230)',
  'oklch(0.88 0.16 95)',
  'oklch(0.72 0.20 330)',
] as const;
