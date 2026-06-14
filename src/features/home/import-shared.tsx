import { Loader2, Upload } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GLYPH_SETS } from '@/core/project/glyphSets';

// Minimal shape needed by GlyphThumbnail — satisfied by both Glyph and RasterizedGlyph
export interface GlyphPreviewData {
  codePoint: number;
  pixels: Uint8Array;
  width: number;
  height: number;
}

export const GlyphThumbnail = ({ glyph }: { glyph: GlyphPreviewData }): React.JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || glyph.width === 0 || glyph.height === 0) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const context = canvas.getContext('2d')!; // canvas is a real DOM element;
    const imageData = context.createImageData(glyph.width, glyph.height);

    for (let index = 0; index < glyph.pixels.length; index++) {
      const value = glyph.pixels[index];

      imageData.data[index * 4 + 0] = value;
      imageData.data[index * 4 + 1] = value;
      imageData.data[index * 4 + 2] = value;
      imageData.data[index * 4 + 3] = value;
    }

    context.putImageData(imageData, 0, 0);
  }, [glyph]);

  if (glyph.width === 0 || glyph.height === 0) {
    return (
      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded text-xs opacity-30">
        ·
      </div>
    );
  }

  return (
    <div className="bg-muted flex h-8 w-8 items-center justify-center overflow-hidden rounded">
      <canvas
        ref={canvasRef}
        width={glyph.width}
        height={glyph.height}
        style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
};

export const DropZone = ({
  label,
  accept,
  file,
  onFile,
  hint,
}: {
  label: string;
  accept: string;
  file: File | null;
  onFile: (f: File) => void;
  hint?: string;
}): React.JSX.Element => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`flex h-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-5 text-sm transition-colors ${
        dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const droppedFile = event.dataTransfer.files[0];

        if (droppedFile) {
          onFile(droppedFile);
        }
      }}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="text-muted-foreground h-4 w-4" />
      {file ? (
        <span className="text-foreground max-w-full truncate px-2 font-medium">{file.name}</span>
      ) : (
        <>
          <span className="text-muted-foreground">{label}</span>
          {hint && <span className="text-muted-foreground mt-1 text-xs">{hint}</span>}
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const selectedFile = event.target.files?.[0];

          if (selectedFile) {
            onFile(selectedFile);
          }
        }}
      />
    </div>
  );
};

export const GlyphPreviewStep = ({
  loading,
  loadingMessage,
  error,
  glyphs,
  summary,
}: {
  loading: boolean;
  loadingMessage: string;
  error: string | null;
  glyphs: GlyphPreviewData[];
  summary: React.ReactNode;
}): React.JSX.Element => {
  return (
    <div className="grid gap-4 py-2">
      {loading ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingMessage}
        </div>
      ) : error ? (
        <div className="text-destructive flex h-40 items-center justify-center text-sm">
          {error}
        </div>
      ) : (
        <div className="max-h-52 overflow-y-auto">
          <div className="flex flex-wrap gap-1">
            {glyphs.map((glyph) => (
              <GlyphThumbnail key={glyph.codePoint} glyph={glyph} />
            ))}
          </div>
        </div>
      )}
      <p className="text-muted-foreground text-xs">{summary}</p>
    </div>
  );
};

export const GlyphSetSelect = ({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element => {
  return (
    <select
      id={id}
      className="bg-input border-border text-foreground h-8 rounded-md border px-3 text-sm"
      value={value}
      onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
    >
      <optgroup label="Standard sets">
        {GLYPH_SETS.filter((glyphSet) => !glyphSet.custom).map((glyphSet) => (
          <option key={glyphSet.id} value={glyphSet.id}>
            {glyphSet.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Custom sets">
        {GLYPH_SETS.filter((glyphSet) => glyphSet.custom).map((glyphSet) => (
          <option key={glyphSet.id} value={glyphSet.id}>
            {glyphSet.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
};

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

export const FontMetricsFields = ({
  fontSize,
  lineHeight,
  base,
  capHeight,
  onFontSizeChange,
  onLineHeightChange,
  onBaseChange,
  onCapHeightChange,
}: {
  fontSize: number;
  lineHeight: number;
  base: number;
  capHeight: number;
  onFontSizeChange: (v: number) => void;
  onLineHeightChange: (v: number) => void;
  onBaseChange: (v: number) => void;
  onCapHeightChange: (v: number) => void;
}): React.JSX.Element => {
  return (
    <>
      <div className="grid gap-1.5">
        <Label>Font metrics</Label>
        <div className="grid gap-1">
          <span className="text-muted-foreground text-[10px]">Font size</span>
          <Input
            className="w-24"
            type="number"
            min={4}
            max={256}
            value={fontSize}
            onChange={(event) => onFontSizeChange(Number(event.target.value))}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Advanced
        </span>
        <p className="text-muted-foreground text-xs">
          Controls how text sits within a line. Usually fine as-is.
        </p>
        <div className="mt-2 flex gap-2">
          <div className="grid gap-1">
            <span className="text-muted-foreground text-[10px]">Line height</span>
            <Input
              className="w-20"
              type="number"
              min={1}
              value={lineHeight}
              onChange={(event) => onLineHeightChange(Number(event.target.value))}
            />
          </div>
          <div className="grid gap-1">
            <span className="text-muted-foreground text-[10px]">Baseline</span>
            <Input
              className="w-20"
              type="number"
              min={0}
              value={base}
              onChange={(event) => onBaseChange(Math.min(Number(event.target.value), lineHeight))}
            />
          </div>
          <div className="grid gap-1">
            <span className="text-muted-foreground text-[10px]">Cap height</span>
            <Input
              className="w-20"
              type="number"
              min={0}
              value={capHeight}
              onChange={(event) =>
                onCapHeightChange(Math.min(Number(event.target.value), lineHeight))
              }
            />
          </div>
        </div>
      </div>
    </>
  );
};

export const WizardFooter = ({
  step,
  totalSteps,
  onClose,
  onBack,
  onNext,
  onConfirm,
  nextDisabled,
  backDisabled,
  confirmDisabled,
  confirming,
  confirmLabel = 'Import',
  confirmingLabel = 'Importing…',
}: {
  step: number;
  totalSteps: number;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  onConfirm: () => void;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  confirmDisabled?: boolean;
  confirming?: boolean;
  confirmLabel?: string;
  confirmingLabel?: string;
}): React.JSX.Element => {
  return (
    <DialogFooter className="gap-2">
      <Button variant="outline" onClick={onClose} className="mr-auto">
        Cancel
      </Button>
      {step > 1 && (
        <Button variant="outline" onClick={onBack} disabled={backDisabled}>
          Back
        </Button>
      )}
      {step < totalSteps ? (
        <Button onClick={onNext} disabled={nextDisabled}>
          Next
        </Button>
      ) : (
        <Button onClick={onConfirm} disabled={confirmDisabled}>
          {confirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {confirmingLabel}
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      )}
    </DialogFooter>
  );
};
