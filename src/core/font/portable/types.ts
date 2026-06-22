import type { BmfGlyphMetadata, Font } from '../types';

// v3 wire format. Each glyph carries the full layer stack with per-layer
// pixel buffers, offsets, visibility, and edit-time metadata. The BMF
// char-line nudge lives on `bmf`, separate from layer offsets.

export interface PortableFontV3 {
  version: 3;
  font: Font;
  glyphs: PortableGlyphV3[];
}

export interface PortableGlyphV3 {
  codePoint: number;
  fontId: string;
  bmf: BmfGlyphMetadata;
  isDirty: boolean;
  alphaThreshold?: number;
  layers: PortableLayerV3[];
}

export interface PortableLayerV3 {
  id: string;
  name: string;
  pixels: string; // base64-encoded Uint8Array (greyscale, width × height bytes)
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  visible: boolean;
  preview: boolean;
  colorIndex: number;
  locked: boolean;
}
