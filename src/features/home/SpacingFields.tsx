import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
        <div className="grid gap-1">
          <span className="text-muted-foreground text-[10px]">Horizontal</span>
          <Input
            className="w-20"
            type="number"
            min={0}
            max={16}
            value={x}
            onChange={(event) => onXChange(Number(event.target.value))}
          />
        </div>
        <div className="grid gap-1">
          <span className="text-muted-foreground text-[10px]">Vertical</span>
          <Input
            className="w-20"
            type="number"
            min={0}
            max={16}
            value={y}
            onChange={(event) => onYChange(Number(event.target.value))}
          />
        </div>
      </div>
    </div>
  );
};
