import React, { useEffect, useRef } from 'react';

export interface GlyphPreviewData {
  codePoint: number;
  pixels: Uint8Array;
  width: number;
  height: number;
}

export const GlyphThumbnail = ({ glyph }: { glyph: GlyphPreviewData }): React.JSX.Element => {
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
      const value = glyph.pixels[index];

      imageData.data[index * 4 + 0] = value;
      imageData.data[index * 4 + 1] = value;
      imageData.data[index * 4 + 2] = value;
      imageData.data[index * 4 + 3] = value;
    }

    context.putImageData(imageData, 0, 0);
  }, [glyph]);

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
