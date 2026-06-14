import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export const AddGlyphDialog = ({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (codePoint: number) => void;
}): React.JSX.Element => {
  const [value, setValue] = useState('');

  function resolve(): number | null {
    // Check for a single character before trimming — preserves space (U+0020) and other whitespace
    if ([...value].length === 1) {
      return value.codePointAt(0) ?? null;
    } // single char always has a code point

    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    // U+XXXX or 0xXXXX or plain hex/decimal
    const hexMatch = trimmed.match(/^(?:U\+|0x)?([0-9a-fA-F]+)$/);

    if (hexMatch) {
      return parseInt(hexMatch[1], 16);
    }

    const dec = parseInt(trimmed, 10);

    return isNaN(dec) ? null : dec;
  }

  function handleAdd(): void {
    const codePoint = resolve();

    if (codePoint === null || codePoint < 0 || codePoint > 0x10ffff) {
      return;
    }

    onAdd(codePoint);
    setValue('');
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);

        if (!isOpen) {
          setValue('');
        }
      }}
    >
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Add Glyph</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-1">
          <Input
            autoFocus
            placeholder="A  or  U+0041  or  65"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
          />
          <p className="text-muted-foreground text-xs">
            Enter a character, U+XXXX code point, or decimal number.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={resolve() === null}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
