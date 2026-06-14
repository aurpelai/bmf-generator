import { ChevronLeft, ChevronRight, Eraser, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import React, { memo, useEffect, useMemo, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Glyph } from '@/core/project';
import { makeBlankGlyph } from '@/core/project';
import { deleteGlyph, getFontFile, saveGlyphs } from '@/db';
import { useRasterize } from '@/hooks/useRasterize';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';
import { glyphDisplayName } from '@/utils/glyphs';

function glyphSortKey(cp: number): [number, number] {
  const ch = String.fromCodePoint(cp);

  if (/^\p{Lu}$/u.test(ch)) {
    return [0, cp];
  } // uppercase letters

  if (/^\p{Ll}$/u.test(ch)) {
    return [1, cp];
  } // lowercase letters

  if (cp >= 0x30 && cp <= 0x39) {
    return [2, cp];
  } // digits 0-9

  return [3, cp]; // everything else
}

function sortGlyphs(glyphs: Glyph[]): Glyph[] {
  return [...glyphs].sort((a, b) => {
    const [ga, ia] = glyphSortKey(a.codePoint);
    const [gb, ib] = glyphSortKey(b.codePoint);

    return ga !== gb ? ga - gb : ia - ib;
  });
}

const GlyphThumbnail = memo(function GlyphThumbnailInner({
  pixels,
  width,
  height,
}: {
  pixels: Uint8Array;
  width: number;
  height: number;
}): React.JSX.Element {
  const size = 28;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${width} ${height}`}
      style={{ imageRendering: 'pixelated' }}
      className="shrink-0"
    >
      {Array.from(pixels).map((v, i) => {
        if (v < 32) {
          return null;
        }

        const column = i % width;
        const row = Math.floor(i / width);
        const alpha = Math.round((v / 255) * 100) / 100;

        return (
          <rect
            key={i}
            x={column}
            y={row}
            width={1}
            height={1}
            fill={`rgba(255,255,255,${alpha})`}
          />
        );
      })}
    </svg>
  );
});

const AddGlyphDialog = ({
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
    const cp = resolve();

    if (cp === null || cp < 0 || cp > 0x10ffff) {
      return;
    }

    onAdd(cp);
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

export const GlyphList = ({
  collapsed,
  onCollapse,
  width,
}: {
  collapsed: boolean;
  onCollapse: () => void;
  width: number;
}): React.JSX.Element | null => {
  const [addOpen, setAddOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [xadvance, setXadvance] = useState(0);
  const [resetting, setResetting] = useState(false);

  const glyphs = useStore((state) => state.glyphs);
  const currentProject = useStore((state) => state.currentProject);
  const selectedCodePoint = useStore((state) => state.selectedCodePoint);
  const setSelectedCodePoint = useStore((state) => state.setSelectedCodePoint);
  const upsertGlyph = useStore((state) => state.upsertGlyph);
  const pushUndo = useStore((state) => state.pushUndo);
  const removeGlyph = useStore((state) => state.removeGlyph);
  const updateCurrentProject = useStore((state) => state.updateCurrentProject);
  const { rasterize } = useRasterize();

  const sortedGlyphs = useMemo(() => sortGlyphs(glyphs), [glyphs]);
  const selectedGlyph = glyphs.find((glyph) => glyph.codePoint === selectedCodePoint) ?? null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setXadvance(selectedGlyph?.xadvance ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCodePoint]);

  function commitXadvance(value: number): void {
    if (!selectedGlyph) {
      return;
    }

    const updated: Glyph = { ...selectedGlyph, xadvance: value };

    upsertGlyph(updated);
    void saveGlyphs([updated]);
  }

  async function handleResetToFont(): Promise<void> {
    if (!selectedGlyph || !currentProject?.settings.sourceFontId) {
      return;
    }

    setResetting(true);

    try {
      const buf = await getFontFile(currentProject.settings.sourceFontId);

      if (!buf) {
        return;
      }

      const result = await rasterize(
        buf,
        [selectedGlyph.codePoint],
        currentProject.settings.fontSize,
      );
      const rg = result.glyphs[0];

      if (!rg) {
        return;
      }

      const updated: Glyph = {
        ...selectedGlyph,
        pixels: rg.pixels,
        width: rg.width,
        height: rg.height,
        xoffset: rg.xoffset,
        yoffset: rg.yoffset,
        xadvance: rg.xadvance,
        isDirty: false,
      };

      upsertGlyph(updated);
      await saveGlyphs([updated]);
      setXadvance(rg.xadvance);
    } finally {
      setResetting(false);
    }
  }

  async function confirmRemoveGlyph(): Promise<void> {
    if (!selectedGlyph || !currentProject) {
      return;
    }

    setRemoveOpen(false);
    removeGlyph(selectedGlyph.codePoint);
    await deleteGlyph(currentProject.id, selectedGlyph.codePoint);
    updateCurrentProject({
      glyphs: currentProject.glyphs.filter((codePoint) => codePoint !== selectedGlyph.codePoint),
    });
    setSelectedCodePoint(null);
  }

  async function handleClearGlyph(): Promise<void> {
    if (!selectedGlyph) {
      return;
    }

    pushUndo(selectedGlyph.codePoint, {
      pixels: new Uint8Array(selectedGlyph.pixels),
      xoffset: selectedGlyph.xoffset,
      yoffset: selectedGlyph.yoffset,
    });
    const cleared: Glyph = {
      ...selectedGlyph,
      pixels: new Uint8Array(selectedGlyph.width * selectedGlyph.height),
      isDirty: true,
    };

    upsertGlyph(cleared);
    await saveGlyphs([cleared]);
  }

  if (!currentProject) {
    return null;
  }

  const hasSourceFont = !!currentProject.settings.sourceFontId;

  async function handleAddGlyph(codePoint: number): Promise<void> {
    if (!currentProject) {
      return;
    }

    if (glyphs.some((glyph) => glyph.codePoint === codePoint)) {
      setSelectedCodePoint(codePoint);

      return;
    }

    const { fontSize, lineHeight } = currentProject.settings;
    const glyph = makeBlankGlyph(currentProject.id, codePoint, fontSize, lineHeight);

    await saveGlyphs([glyph]);
    upsertGlyph(glyph);

    // Add code point to project metadata if not already listed
    if (!currentProject.glyphs.includes(codePoint)) {
      updateCurrentProject({ glyphs: [...currentProject.glyphs, codePoint] });
    }

    setSelectedCodePoint(codePoint);
  }

  if (collapsed) {
    return (
      <div className="border-border flex h-full shrink-0 flex-col border-r" style={{ width }}>
        <div className="border-border flex h-9 shrink-0 items-center border-b px-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Expand glyph list"
            aria-label="Expand glyph list"
            aria-expanded={false}
            onClick={onCollapse}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div role="listbox" aria-label="Glyphs" className="flex-1 overflow-y-auto">
          {sortedGlyphs.map((glyph) => {
            const isSelected = glyph.codePoint === selectedCodePoint;
            const label = `${String.fromCodePoint(glyph.codePoint)} U+${glyph.codePoint.toString(16).toUpperCase().padStart(4, '0')}`;

            return (
              <button
                key={glyph.codePoint}
                role="option"
                aria-selected={isSelected}
                onClick={() => setSelectedCodePoint(glyph.codePoint)}
                title={label}
                aria-label={label}
                className={cn(
                  'flex w-full cursor-pointer items-center px-2 py-1.5 transition-colors',
                  isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                )}
              >
                <div className="bg-background/30 border-border/40 flex h-8 w-8 shrink-0 items-center justify-center rounded border">
                  {glyph.width > 0 && glyph.height > 0 ? (
                    <GlyphThumbnail
                      pixels={glyph.pixels}
                      width={glyph.width}
                      height={glyph.height}
                    />
                  ) : (
                    <span className="text-muted-foreground text-xs">?</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <AddGlyphDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onAdd={(codePoint) => {
            void handleAddGlyph(codePoint);
          }}
        />
      </div>
    );
  }

  return (
    <div className="border-border flex h-full shrink-0 flex-col border-r" style={{ width }}>
      <div className="border-border flex h-9 shrink-0 items-center border-b px-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          title="Collapse glyph list"
          aria-label="Collapse glyph list"
          aria-expanded={true}
          onClick={onCollapse}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-muted-foreground ml-2 flex-1 text-xs font-medium">
          Glyphs ({glyphs.length})
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="Add glyph"
          aria-label="Add glyph"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div role="listbox" aria-label="Glyphs" className="flex-1 overflow-y-auto">
        {sortedGlyphs.map((glyph) => {
          const char = glyphDisplayName(glyph.codePoint);
          const isSelected = glyph.codePoint === selectedCodePoint;
          const label = `${char} U+${glyph.codePoint.toString(16).toUpperCase().padStart(4, '0')}`;

          return (
            <div key={glyph.codePoint}>
              <div
                role="option"
                aria-selected={isSelected}
                className={cn(
                  'flex w-full items-center gap-2 px-2 py-1.5 transition-colors',
                  isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                )}
              >
                <button
                  aria-label={label}
                  onClick={() => setSelectedCodePoint(glyph.codePoint)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                >
                  <div className="bg-background/30 border-border/40 flex h-8 w-8 shrink-0 items-center justify-center rounded border">
                    {glyph.width > 0 && glyph.height > 0 ? (
                      <GlyphThumbnail
                        pixels={glyph.pixels}
                        width={glyph.width}
                        height={glyph.height}
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">?</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium">{char}</div>
                    <div className="text-muted-foreground text-[10px]">
                      U+{glyph.codePoint.toString(16).toUpperCase().padStart(4, '0')}
                    </div>
                  </div>
                </button>
                {isSelected && (
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="hover:text-accent-foreground/50 shrink-0 hover:bg-white/10"
                      title="Clear glyph"
                      aria-label="Clear glyph"
                      onClick={() => {
                        void handleClearGlyph();
                      }}
                    >
                      <Eraser className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="hover:text-destructive shrink-0 hover:bg-white/10"
                      title="Remove glyph"
                      aria-label="Remove glyph"
                      onClick={() => setRemoveOpen(true)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              {isSelected && (
                <div className="border-border/30 bg-muted/40 flex items-center gap-2 border-b px-2 py-1.5">
                  <Label className="text-muted-foreground shrink-0 text-[10px]">X advance</Label>
                  <Input
                    type="number"
                    className="h-6 w-16 text-xs"
                    value={xadvance}
                    onChange={(event) => setXadvance(Number(event.target.value))}
                    onBlur={() => commitXadvance(xadvance)}
                    onKeyDown={(event) => event.key === 'Enter' && commitXadvance(xadvance)}
                  />
                  {hasSourceFont && glyph.isDirty && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto h-6 w-6 shrink-0"
                      title="Reset to font"
                      aria-label="Reset to font"
                      onClick={() => {
                        void handleResetToFont();
                      }}
                      disabled={resetting}
                    >
                      {resetting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AddGlyphDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={(codePoint) => {
          void handleAddGlyph(codePoint);
        }}
      />

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Glyph?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-foreground font-medium">
                {selectedGlyph ? glyphDisplayName(selectedGlyph.codePoint) : ''}
              </span>{' '}
              (U+{selectedGlyph?.codePoint.toString(16).toUpperCase().padStart(4, '0')}) will be
              permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                void confirmRemoveGlyph();
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
