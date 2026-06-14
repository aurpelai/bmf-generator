import React, { memo } from 'react';

export const GlyphThumbnail = memo(function GlyphThumbnailInner({
  pixels,
  width,
  height,
}: {
  pixels: Uint8Array;
  width: number;
  height: number;
}): React.JSX.Element {
  const size = 28;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${width} ${height}`}
      style={{ imageRendering: 'pixelated' }}
      className="shrink-0"
    >
      {Array.from(pixels).map((v, i) => {
        if (v < 32) {
          return null;
        }

        const column = i % width;
        const row = Math.floor(i / width);
        const alpha = Math.round((v / 255) * 100) / 100;

        return (
          <rect
            key={i}
            x={column}
            y={row}
            width={1}
            height={1}
            fill={`rgba(255,255,255,${alpha})`}
          />
        );
      })}
    </svg>
  );
});
