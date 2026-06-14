import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SpacingInput = ({
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
        <SpacingInput label="Horizontal" value={x} onChange={onXChange} />
        <SpacingInput label="Vertical" value={y} onChange={onYChange} />
      </div>
    </div>
  );
};
