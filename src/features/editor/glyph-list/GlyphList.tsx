import { ChevronLeft, ChevronRight, Eraser, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { Glyph } from '@/core/project';
import { makeBlankGlyph } from '@/core/project';
import { cloneLayers, makeBaseLayerFromBitmap, syncLegacyFields } from '@/core/project/layers';
import { deleteGlyph, getFontFile, saveGlyphs } from '@/db';
import { useRasterize } from '@/hooks/useRasterize';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';
import { glyphDisplayName } from '@/utils/glyphs';

import { AddGlyphDialog } from './AddGlyphDialog';
import { GlyphThumbnail } from './GlyphThumbnail';

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

  function setGlyphAlphaThreshold(glyph: Glyph, threshold: number | undefined): void {
    const updated: Glyph = { ...glyph, alphaThreshold: threshold };

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

      // Reset from the source font discards all user-edited layers and replaces them with one fresh base layer.
      const updated: Glyph = syncLegacyFields({
        ...selectedGlyph,
        layers: [
          makeBaseLayerFromBitmap({
            pixels: rg.pixels,
            width: rg.width,
            height: rg.height,
            xoffset: rg.xoffset,
            yoffset: rg.yoffset,
          }),
        ],
        xadvance: rg.xadvance,
        isDirty: false,
      });

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

    pushUndo(selectedGlyph.codePoint, { layers: cloneLayers(selectedGlyph.layers) });
    // Clear every layer (preserve their metadata: id, name, color, visibility, etc).
    const clearedLayers = selectedGlyph.layers.map((layer) => ({
      ...layer,
      pixels: new Uint8Array(0),
      width: 0,
      height: 0,
      xoffset: 0,
      yoffset: 0,
    }));
    const cleared: Glyph = syncLegacyFields({
      ...selectedGlyph,
      layers: clearedLayers,
      isDirty: true,
    });

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
                  isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-white/10',
                )}
              >
                <div className="bg-background/30 border-border/40 relative flex h-8 w-8 shrink-0 items-center justify-center rounded border">
                  {glyph.width > 0 && glyph.height > 0 ? (
                    <GlyphThumbnail
                      pixels={glyph.pixels}
                      width={glyph.width}
                      height={glyph.height}
                      threshold={glyph.alphaThreshold ?? currentProject.settings.alphaThreshold}
                    />
                  ) : (
                    <span className="text-muted-foreground text-xs">?</span>
                  )}
                  {hasSourceFont && glyph.alphaThreshold !== undefined && (
                    <span
                      className="bg-foreground/70 absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full"
                      title={`Per-glyph alpha threshold: ${glyph.alphaThreshold}`}
                    />
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
                  isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-white/10',
                )}
              >
                <button
                  aria-label={label}
                  onClick={() => setSelectedCodePoint(glyph.codePoint)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                >
                  <div className="bg-background/30 border-border/40 relative flex h-8 w-8 shrink-0 items-center justify-center rounded border">
                    {glyph.width > 0 && glyph.height > 0 ? (
                      <GlyphThumbnail
                        pixels={glyph.pixels}
                        width={glyph.width}
                        height={glyph.height}
                        threshold={glyph.alphaThreshold ?? currentProject.settings.alphaThreshold}
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">?</span>
                    )}
                    {hasSourceFont && glyph.alphaThreshold !== undefined && (
                      <span
                        className="bg-foreground/70 absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full"
                        title={`Per-glyph alpha threshold: ${glyph.alphaThreshold}`}
                      />
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
                      className="hover:text-accent-foreground/50 shrink-0 hover:bg-white/20"
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
                      className="hover:text-destructive shrink-0 hover:bg-white/20"
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
                <div className="border-border/30 bg-muted/40 flex flex-col gap-1.5 border-b px-2 py-1.5">
                  {hasSourceFont && (
                    <div className="flex items-center gap-2">
                      <Label className="text-muted-foreground shrink-0 text-[10px]">α cutoff</Label>
                      <Slider
                        value={[glyph.alphaThreshold ?? currentProject.settings.alphaThreshold]}
                        min={0}
                        max={255}
                        step={1}
                        onValueChange={(value: number | readonly number[]) => {
                          const next = typeof value === 'number' ? value : value[0];

                          setGlyphAlphaThreshold(glyph, next);
                        }}
                        className="flex-1"
                        aria-label="Per-glyph alpha threshold"
                      />
                      <span
                        className={cn(
                          'w-9 text-center text-[10px] tabular-nums',
                          glyph.alphaThreshold !== undefined
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground',
                        )}
                      >
                        {glyph.alphaThreshold ?? currentProject.settings.alphaThreshold}
                      </span>
                      {glyph.alphaThreshold !== undefined && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="h-5 w-5 shrink-0"
                          title="Reset to project default"
                          aria-label="Reset alpha threshold to project default"
                          onClick={() => setGlyphAlphaThreshold(glyph, undefined)}
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground shrink-0 text-[10px]">Advance</Label>
                    <Input
                      type="number"
                      className="h-6 w-16 text-xs"
                      value={xadvance}
                      onChange={(event) => setXadvance(Number(event.target.value))}
                      onBlur={() => commitXadvance(xadvance)}
                      onKeyDown={(event) => event.key === 'Enter' && commitXadvance(xadvance)}
                    />
                    <span className="text-muted-foreground text-[10px]">px</span>
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
