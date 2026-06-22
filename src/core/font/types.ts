import {
  DEFAULT_ALPHA_THRESHOLD,
  DEFAULT_BASE,
  DEFAULT_CAP_HEIGHT,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_PADDING,
  DEFAULT_SPACING,
} from '@/config';

export interface FontSettings {
  sourceFontId: string | null;
  fontSize: number;
  padding: { top: number; right: number; bottom: number; left: number };
  spacing: { x: number; y: number };
  lineHeight: number;
  base: number;
  capHeight: number;
  // Alpha cutoff (0–255) deciding which grayscale pixels are rendered/exported as ink.
  alphaThreshold: number;
}

export interface Font {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: FontSettings;
  glyphs: number[]; // ordered list of Unicode code points
}

export interface Layer {
  id: string;
  name: string;
  pixels: Uint8Array; // 8-bit greyscale, width × height bytes
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  visible: boolean;
  // When true the editor renders the layer in its tint colour; when false it renders white (final look).
  preview: boolean;
  // Editor-only tint slot — resolved through DEFAULT_LAYER_PALETTE at render time. Preserved across reorder.
  colorIndex: number;
  locked: boolean;
}

/**
 * BMF char-line metadata. `xoffset`/`yoffset` are the source-font positioning nudge
 * (from TTF bearings or a parsed .fnt) — independent of where ink sits in the layer
 * buffer. `xadvance` is the pen-advance in pixels. Exported as the `char` line's
 * xoffset/yoffset/xadvance fields, summed with the flatten origin and placement trim.
 */
export interface BmfGlyphMetadata {
  xoffset: number;
  yoffset: number;
  xadvance: number;
}

export interface Glyph {
  codePoint: number;
  fontId: string;
  layers: Layer[];
  bmf: BmfGlyphMetadata;
  isDirty: boolean;
  alphaThreshold?: number;
}

export interface GlyphPlacement {
  codePoint: number;
  x: number;
  y: number;
  width: number;
  height: number;
  // Trim offsets: pixels cropped from the left/top of the stored glyph before packing.
  // Added to xoffset/yoffset at export time so the renderer positions the glyph correctly.
  trimX: number;
  trimY: number;
}

export interface AtlasResult {
  imageData: ImageData;
  placements: GlyphPlacement[];
  atlasWidth: number;
  atlasHeight: number;
}

export function defaultFontSettings(): FontSettings {
  return {
    sourceFontId: null,
    fontSize: DEFAULT_FONT_SIZE,
    padding: { ...DEFAULT_PADDING },
    spacing: { ...DEFAULT_SPACING },
    lineHeight: DEFAULT_LINE_HEIGHT,
    base: DEFAULT_BASE,
    capHeight: DEFAULT_CAP_HEIGHT,
    alphaThreshold: DEFAULT_ALPHA_THRESHOLD,
  };
}
