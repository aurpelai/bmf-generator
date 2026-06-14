export interface FontSettings {
  sourceFontId: string | null;
  fontSize: number;
  padding: { top: number; right: number; bottom: number; left: number };
  spacing: { x: number; y: number };
  lineHeight: number;
  base: number;
  capHeight: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: FontSettings;
  glyphs: number[]; // ordered list of Unicode code points
}

export interface Glyph {
  codePoint: number;
  projectId: string;
  pixels: Uint8Array; // 8-bit greyscale, width × height bytes
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
  isDirty: boolean; // true when edited vs font-derived original
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
    fontSize: 32,
    padding: { top: 1, right: 1, bottom: 1, left: 1 },
    spacing: { x: 1, y: 1 },
    lineHeight: 36,
    base: 28,
    capHeight: 22,
  };
}
