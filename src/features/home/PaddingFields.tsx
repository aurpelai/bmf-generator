import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PaddingInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}): React.JSX.Element => (
  <div className="grid gap-1">
    <span className="text-muted-foreground text-[10px]">{label}</span>
    <div className="flex items-center gap-1">
      <Input
        className="w-20"
        type="number"
        min={0}
        max={16}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="text-muted-foreground text-[10px]">px</span>
    </div>
  </div>
);

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
        <PaddingInput label="Top" value={top} onChange={onTopChange} />
        <div />
        <PaddingInput label="Left" value={left} onChange={onLeftChange} />
        <div />
        <PaddingInput label="Right" value={right} onChange={onRightChange} />
        <div />
        <PaddingInput label="Bottom" value={bottom} onChange={onBottomChange} />
        <div />
      </div>
    </div>
  );
};
