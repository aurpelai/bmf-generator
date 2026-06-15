import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FONT_SIZE_MAX, FONT_SIZE_MIN } from '@/config';

export const FontMetricsFields = ({
  fontSize,
  lineHeight,
  base,
  capHeight,
  onFontSizeChange,
  onLineHeightChange,
  onBaseChange,
  onCapHeightChange,
}: {
  fontSize: number;
  lineHeight: number;
  base: number;
  capHeight: number;
  onFontSizeChange: (v: number) => void;
  onLineHeightChange: (v: number) => void;
  onBaseChange: (v: number) => void;
  onCapHeightChange: (v: number) => void;
}): React.JSX.Element => {
  return (
    <>
      <div className="grid gap-1.5">
        <Label>Font metrics</Label>
        <div className="grid gap-1">
          <span className="text-muted-foreground text-[10px]">Font size</span>
          <div className="flex items-center gap-1">
            <Input
              className="w-24"
              type="number"
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              value={fontSize}
              onChange={(event) => onFontSizeChange(Number(event.target.value))}
            />
            <span className="text-muted-foreground text-[10px]">px</span>
          </div>
        </div>
      </div>
      <div className="grid gap-1.5">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Advanced
        </span>
        <p className="text-muted-foreground text-xs">
          Controls how text sits within a line. Usually fine as-is.
        </p>
        <div className="mt-2 flex gap-2">
          <div className="grid gap-1">
            <span className="text-muted-foreground text-[10px]">Line height</span>
            <div className="flex items-center gap-1">
              <Input
                className="w-20"
                type="number"
                min={1}
                value={lineHeight}
                onChange={(event) => onLineHeightChange(Number(event.target.value))}
              />
              <span className="text-muted-foreground text-[10px]">px</span>
            </div>
          </div>
          <div className="grid gap-1">
            <span className="text-muted-foreground text-[10px]">Baseline</span>
            <div className="flex items-center gap-1">
              <Input
                className="w-20"
                type="number"
                min={0}
                value={base}
                onChange={(event) => onBaseChange(Math.min(Number(event.target.value), lineHeight))}
              />
              <span className="text-muted-foreground text-[10px]">px</span>
            </div>
          </div>
          <div className="grid gap-1">
            <span className="text-muted-foreground text-[10px]">Cap height</span>
            <div className="flex items-center gap-1">
              <Input
                className="w-20"
                type="number"
                min={0}
                value={capHeight}
                onChange={(event) =>
                  onCapHeightChange(Math.min(Number(event.target.value), lineHeight))
                }
              />
              <span className="text-muted-foreground text-[10px]">px</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
