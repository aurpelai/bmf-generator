import { X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PREVIEW_CANVAS_SCALE,
  PREVIEW_DEFAULT_TEXT,
  PREVIEW_MISSING_GLYPH_ADVANCE_RATIO,
  PREVIEW_PLACEHOLDER_HEIGHT_RATIO,
} from '@/config';
import { flattenGlyph } from '@/core/font/layers';
import { effectiveThreshold } from '@/core/font/threshold';
import { useStore } from '@/store';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const PreviewFloat = ({ open, onClose }: Props): React.JSX.Element => {
  const [text, setText] = useState(PREVIEW_DEFAULT_TEXT);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const glyphs = useStore((state) => state.glyphs);
  const currentFont = useStore((state) => state.currentFont);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !currentFont) {
      return;
    }

    const { lineHeight, base, spacing } = currentFont.settings;
    const glyphMap = new Map(glyphs.map((glyph) => [glyph.codePoint, glyph]));
    const scale = PREVIEW_CANVAS_SCALE;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const codePoints = [...text].map((ch) => ch.codePointAt(0)!); // spread chars always have code points

    let totalWidth = 0;

    for (const cp of codePoints) {
      const glyph = glyphMap.get(cp);

      totalWidth += glyph
        ? glyph.bmf.xadvance + spacing.x
        : Math.round(currentFont.settings.fontSize * PREVIEW_MISSING_GLYPH_ADVANCE_RATIO);
    }

    totalWidth = Math.max(totalWidth, 1);

    canvas.width = totalWidth * scale;
    canvas.height = lineHeight * scale;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${lineHeight}px`;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const context = canvas.getContext('2d')!; // canvas is a real DOM element, always returns context

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.scale(scale, scale);

    let x = 0;

    for (const cp of codePoints) {
      const glyph = glyphMap.get(cp);
      const flat = glyph ? flattenGlyph(glyph) : null;

      if (!glyph || !flat || flat.width === 0 || flat.height === 0) {
        const advance = glyph
          ? glyph.bmf.xadvance
          : Math.round(currentFont.settings.fontSize * PREVIEW_MISSING_GLYPH_ADVANCE_RATIO);
        const placeholderHeight = currentFont.settings.fontSize * PREVIEW_PLACEHOLDER_HEIGHT_RATIO;

        context.strokeStyle = 'rgba(255,255,255,0.2)';
        context.strokeRect(
          x + 0.5,
          base - placeholderHeight + 0.5,
          advance - 2,
          placeholderHeight - 1,
        );
        x += advance + spacing.x;

        continue;
      }

      const destX = x + glyph.bmf.xoffset + flat.xoffset;
      const destY = glyph.bmf.yoffset + flat.yoffset;

      const imageData = new ImageData(flat.width, flat.height);
      const threshold = effectiveThreshold(glyph, currentFont.settings);

      for (let index = 0; index < flat.pixels.length; index++) {
        const ink = flat.pixels[index] >= threshold ? 255 : 0;

        imageData.data[index * 4 + 0] = 255;
        imageData.data[index * 4 + 1] = 255;
        imageData.data[index * 4 + 2] = 255;
        imageData.data[index * 4 + 3] = ink;
      }

      const offscreen = document.createElement('canvas');

      offscreen.width = flat.width;
      offscreen.height = flat.height;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      offscreen.getContext('2d')!.putImageData(imageData, 0, 0); // offscreen canvas always has a 2D context
      context.drawImage(offscreen, destX, destY);

      x += glyph.bmf.xadvance + spacing.x;
    }
  }, [text, glyphs, currentFont]);

  return (
    <div
      className={`border-border/50 bg-popover absolute bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-xl border shadow-lg transition-opacity ${
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      style={{ width: 480 }}
    >
      <div className="border-border/50 flex h-8 items-center justify-between border-b px-3">
        <span className="text-xs font-medium">Font preview</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex flex-col gap-3 p-3">
        <Input
          className="h-7 text-xs"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type preview text…"
        />
        <div className="bg-muted border-border/50 flex items-center justify-center overflow-x-auto rounded border p-2">
          {currentFont ? (
            <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', display: 'block' }} />
          ) : (
            <span className="text-muted-foreground text-xs">No font open.</span>
          )}
        </div>
      </div>
    </div>
  );
};
