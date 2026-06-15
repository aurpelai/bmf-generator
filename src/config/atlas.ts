// Candidate atlas dimensions ordered by total area ascending. Square sizes plus
// half-height rectangles so glyphs that pack better wide can find a tighter fit.
export const ATLAS_CANDIDATES: [number, number][] = [
  [64, 64],
  [128, 64],
  [128, 128],
  [256, 128],
  [256, 256],
  [512, 256],
  [512, 512],
  [1024, 512],
  [1024, 1024],
  [2048, 1024],
  [2048, 2048],
  [4096, 2048],
  [4096, 4096],
];
