import React, { memo } from 'react';

import { GLYPH_THUMBNAIL_SIZE_PX } from '@/config';

export const GlyphThumbnail = memo(function GlyphThumbnailInner({
  pixels,
  width,
  height,
  threshold,
}: {
  pixels: Uint8Array;
  width: number;
  height: number;
  threshold: number;
}): React.JSX.Element {
  return (
    <svg
      width={GLYPH_THUMBNAIL_SIZE_PX}
      height={GLYPH_THUMBNAIL_SIZE_PX}
      viewBox={`0 0 ${width} ${height}`}
      style={{ imageRendering: 'pixelated' }}
      className="shrink-0"
    >
      {Array.from(pixels).map((value, index) => {
        if (value < threshold) {
          return null;
        }

        const column = index % width;
        const row = Math.floor(index / width);

        return <rect key={index} x={column} y={row} width={1} height={1} fill="rgb(255,255,255)" />;
      })}
    </svg>
  );
});
