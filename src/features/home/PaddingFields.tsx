import React from 'react';

import { Label } from '@/components/ui/label';

import { PixelInput } from './PixelInput';

export const PaddingFields = ({
  top,
  right,
  bottom,
  left,
  onTopChange,
  onRightChange,
  onBottomChange,
  onLeftChange,
}: {
  top: number;
  right: number;
  bottom: number;
  left: number;
  onTopChange: (v: number) => void;
  onRightChange: (v: number) => void;
  onBottomChange: (v: number) => void;
  onLeftChange: (v: number) => void;
}): React.JSX.Element => {
  return (
    <div className="grid gap-1.5">
      <Label>Padding</Label>
      <p className="text-muted-foreground text-xs">Extra space around each glyph.</p>
      <div className="mt-2 grid w-fit grid-cols-3 gap-2">
        <div />
        <PixelInput label="Top" value={top} onChange={onTopChange} />
        <div />
        <PixelInput label="Left" value={left} onChange={onLeftChange} />
        <div />
        <PixelInput label="Right" value={right} onChange={onRightChange} />
        <div />
        <PixelInput label="Bottom" value={bottom} onChange={onBottomChange} />
        <div />
      </div>
    </div>
  );
};
