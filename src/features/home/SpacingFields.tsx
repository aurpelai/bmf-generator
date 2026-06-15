import React from 'react';

import { Label } from '@/components/ui/label';

import { PixelInput } from './PixelInput';

export const SpacingFields = ({
  x,
  y,
  onXChange,
  onYChange,
}: {
  x: number;
  y: number;
  onXChange: (v: number) => void;
  onYChange: (v: number) => void;
}): React.JSX.Element => {
  return (
    <div className="grid gap-1.5">
      <Label>Spacing</Label>
      <p className="text-muted-foreground text-xs">Extra gap between glyphs in the atlas.</p>
      <div className="mt-2 flex gap-2">
        <PixelInput label="Horizontal" value={x} onChange={onXChange} />
        <PixelInput label="Vertical" value={y} onChange={onYChange} />
      </div>
    </div>
  );
};
