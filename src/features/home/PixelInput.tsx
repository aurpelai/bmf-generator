import React from 'react';

import { Input } from '@/components/ui/input';

export const PixelInput = ({
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
