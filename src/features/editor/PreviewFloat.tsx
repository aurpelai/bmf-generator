import { X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { effectiveThreshold } from '@/core/project/threshold';
import { useStore } from '@/store';

interface Props {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_TEXT = 'Hello World';

export const PreviewFloat = ({ open, onClose }: Props): React.JSX.Element => {
  const [text, setText] = useState(DEFAULT_TEXT);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const glyphs = useStore((state) => state.glyphs);
  const currentProject = useStore((state) => state.currentProject);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !currentProject) {
      return;
    }

    const { lineHeight, base, spacing } = currentProject.settings;
    const glyphMap = new Map(glyphs.map((glyph) => [glyph.codePoint, glyph]));
    const scale = 2;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const codePoints = [...text].map((ch) => ch.codePointAt(0)!); // spread chars always have code points

    let totalWidth = 0;

    for (const cp of codePoints) {
      const glyph = glyphMap.get(cp);

      totalWidth += glyph
        ? glyph.xadvance + spacing.x
        : Math.round(currentProject.settings.fontSize * 0.5);
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

      if (!glyph || glyph.width === 0 || glyph.height === 0) {
        const advance = glyph ? glyph.xadvance : Math.round(currentProject.settings.fontSize * 0.5);

        context.strokeStyle = 'rgba(255,255,255,0.2)';
        context.strokeRect(
          x + 0.5,
          base - currentProject.settings.fontSize * 0.7 + 0.5,
          advance - 2,
          currentProject.settings.fontSize * 0.7 - 1,
        );
        x += advance + spacing.x;

        continue;
      }

      const destX = x + glyph.xoffset;
      const destY = glyph.yoffset;

      const imageData = new ImageData(glyph.width, glyph.height);
      const threshold = effectiveThreshold(glyph, currentProject.settings);

      for (let index = 0; index < glyph.pixels.length; index++) {
        const ink = glyph.pixels[index] >= threshold ? 255 : 0;

        imageData.data[index * 4 + 0] = 255;
        imageData.data[index * 4 + 1] = 255;
        imageData.data[index * 4 + 2] = 255;
        imageData.data[index * 4 + 3] = ink;
      }

      const offscreen = document.createElement('canvas');

      offscreen.width = glyph.width;
      offscreen.height = glyph.height;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      offscreen.getContext('2d')!.putImageData(imageData, 0, 0); // offscreen canvas always has a 2D context
      context.drawImage(offscreen, destX, destY);

      x += glyph.xadvance + spacing.x;
    }
  }, [text, glyphs, currentProject]);

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
          {currentProject ? (
            <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', display: 'block' }} />
          ) : (
            <span className="text-muted-foreground text-xs">No project open.</span>
          )}
        </div>
      </div>
    </div>
  );
};
