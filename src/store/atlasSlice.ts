import type { StateCreator } from 'zustand';

import type { GlyphPlacement } from '@/core/font/types';

export interface AtlasSlice {
  atlasPlacements: GlyphPlacement[];
  atlasImageData: ImageData | null;
  atlasWidth: number;
  atlasHeight: number;
  atlasEfficiency: number;
  setAtlasResult: (
    placements: GlyphPlacement[],
    imageData: ImageData,
    width: number,
    height: number,
    efficiency: number,
  ) => void;
  clearAtlas: () => void;
}

export const createAtlasSlice: StateCreator<AtlasSlice> = (set) => ({
  atlasPlacements: [],
  atlasImageData: null,
  atlasWidth: 512,
  atlasHeight: 512,
  atlasEfficiency: 0,
  setAtlasResult: (placements, imageData, width, height, efficiency) =>
    set({
      atlasPlacements: placements,
      atlasImageData: imageData,
      atlasWidth: width,
      atlasHeight: height,
      atlasEfficiency: efficiency,
    }),
  clearAtlas: () => set({ atlasPlacements: [], atlasImageData: null, atlasEfficiency: 0 }),
});
