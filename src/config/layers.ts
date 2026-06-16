export const MAX_LAYERS_PER_GLYPH = 5;

// Editor tints for layers. Picked to stay distinguishable against the white canvas ink and against each other.
export const DEFAULT_LAYER_PALETTE = [
  'oklch(0.78 0.17 30)',
  'oklch(0.80 0.16 200)',
  'oklch(0.75 0.20 330)',
  'oklch(0.83 0.18 120)',
  'oklch(0.75 0.18 270)',
] as const;
