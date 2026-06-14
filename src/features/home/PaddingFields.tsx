import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
        <div className="grid gap-1">
          <span className="text-muted-foreground text-[10px]">Top</span>
          <Input
            className="w-20"
            type="number"
            min={0}
            max={16}
            value={top}
            onChange={(event) => onTopChange(Number(event.target.value))}
          />
        </div>
        <div />
        <div className="grid gap-1">
          <span className="text-muted-foreground text-[10px]">Left</span>
          <Input
            className="w-20"
            type="number"
            min={0}
            max={16}
            value={left}
            onChange={(event) => onLeftChange(Number(event.target.value))}
          />
        </div>
        <div />
        <div className="grid gap-1">
          <span className="text-muted-foreground text-[10px]">Right</span>
          <Input
            className="w-20"
            type="number"
            min={0}
            max={16}
            value={right}
            onChange={(event) => onRightChange(Number(event.target.value))}
          />
        </div>
        <div />
        <div className="grid gap-1">
          <span className="text-muted-foreground text-[10px]">Bottom</span>
          <Input
            className="w-20"
            type="number"
            min={0}
            max={16}
            value={bottom}
            onChange={(event) => onBottomChange(Number(event.target.value))}
          />
        </div>
        <div />
      </div>
    </div>
  );
};
