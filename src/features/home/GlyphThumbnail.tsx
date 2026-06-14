import React, { useEffect, useRef } from 'react';

export interface GlyphPreviewData {
  codePoint: number;
  pixels: Uint8Array;
  width: number;
  height: number;
}

export const GlyphThumbnail = ({
  glyph,
  threshold = 128,
}: {
  glyph: GlyphPreviewData;
  threshold?: number;
}): React.JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || glyph.width === 0 || glyph.height === 0) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const context = canvas.getContext('2d')!; // canvas is a real DOM element;
    const imageData = context.createImageData(glyph.width, glyph.height);

    for (let index = 0; index < glyph.pixels.length; index++) {
      const ink = glyph.pixels[index] >= threshold ? 255 : 0;

      imageData.data[index * 4 + 0] = ink;
      imageData.data[index * 4 + 1] = ink;
      imageData.data[index * 4 + 2] = ink;
      imageData.data[index * 4 + 3] = ink;
    }

    context.putImageData(imageData, 0, 0);
  }, [glyph, threshold]);

  if (glyph.width === 0 || glyph.height === 0) {
    return (
      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded text-xs opacity-30">
        ·
      </div>
    );
  }

  return (
    <div className="bg-muted flex h-8 w-8 items-center justify-center overflow-hidden rounded">
      <canvas
        ref={canvasRef}
        width={glyph.width}
        height={glyph.height}
        style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
};
