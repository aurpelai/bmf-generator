import { strToU8, zipSync } from 'fflate';
import { Check, Clipboard, Download, FileJson, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TOAST_DURATION_MS } from '@/config';
import type { BmfGlyphData } from '@/core/bmf';
import { serializeBmfText } from '@/core/bmf';
import { exportPortableFont } from '@/core/font';
import { GlyphSelection } from '@/features/editor/GlyphSelection';
import { useStore } from '@/store';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function atlasImageDataToPngBlob(imageData: ImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  canvas.getContext('2d')!.putImageData(imageData, 0, 0); // canvas is a real DOM element

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to encode atlas as PNG'));
      }
    }, 'image/png');
  });
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'font';
}

export const ExportDialog = ({ open, onOpenChange }: Props): React.JSX.Element => {
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentFont = useStore((state) => state.currentFont);
  const glyphs = useStore((state) => state.glyphs);
  const atlasPlacements = useStore((state) => state.atlasPlacements);
  const addToast = useStore((state) => state.addToast);
  const atlasImageData = useStore((state) => state.atlasImageData);
  const atlasWidth = useStore((state) => state.atlasWidth);
  const atlasHeight = useStore((state) => state.atlasHeight);
  const exportSelection = useStore((state) => state.exportSelection);

  const baseName = currentFont ? safeName(currentFont.name) : 'font';
  const atlasFilename = `${baseName}.png`;

  // Only include placements that are in the current selection
  const selectedPlacements =
    exportSelection === null
      ? atlasPlacements
      : atlasPlacements.filter((placement) => exportSelection.has(placement.codePoint));

  const fntText = useMemo(
    () =>
      currentFont && selectedPlacements.length > 0
        ? serializeBmfText({
            font: currentFont,
            glyphs: selectedPlacements.map((placement): BmfGlyphData => {
              const glyph = glyphs.find((glyphItem) => glyphItem.codePoint === placement.codePoint);

              return {
                placement,
                glyph: {
                  codePoint: placement.codePoint,
                  xoffset: (glyph?.xoffset ?? 0) + placement.trimX,
                  yoffset: (glyph?.yoffset ?? 0) + placement.trimY,
                  xadvance: glyph?.xadvance ?? placement.width,
                },
              };
            }),
            atlasWidth,
            atlasHeight,
            atlasFilename,
          })
        : '',
    [currentFont, selectedPlacements, glyphs, atlasWidth, atlasHeight, atlasFilename],
  );

  // Scroll textarea to top when content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = 0;
    }
  }, [fntText]);

  async function handleCopy(): Promise<void> {
    if (!fntText) {
      return;
    }

    setCopying(true);

    try {
      await navigator.clipboard.writeText(fntText);
      setCopied(true);
      setTimeout(() => setCopied(false), TOAST_DURATION_MS);
    } finally {
      setCopying(false);
    }
  }

  async function handleExportZip(): Promise<void> {
    if (!atlasImageData || !fntText) {
      return;
    }

    setExporting(true);

    try {
      const pngBlob = await atlasImageDataToPngBlob(atlasImageData);
      const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
      const zip = zipSync({
        [`${baseName}.fnt`]: strToU8(fntText),
        [atlasFilename]: pngBytes,
      });

      download(new Blob([zip], { type: 'application/zip' }), `${baseName}.zip`);
      addToast(`Exported ${baseName}.zip`, 'success');
    } catch {
      addToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }

  function handleExportJson(): void {
    if (!currentFont) {
      return;
    }

    const json = exportPortableFont(currentFont, glyphs);

    download(new Blob([json], { type: 'application/json' }), `${baseName}.bmffont.json`);
    addToast(`Exported ${baseName}.bmffont.json`, 'success');
  }

  const canExport = !!atlasImageData && !!fntText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export — {currentFont?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <GlyphSelection />

          {/* .fnt preview */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">{baseName}.fnt</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => {
                void handleCopy();
              }}
              disabled={!fntText || copying}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Clipboard className="h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <textarea
            ref={textareaRef}
            readOnly
            value={fntText || '(no glyphs packed yet — open the Atlas panel with Cmd+Shift+A)'}
            className="bg-muted text-muted-foreground border-border/50 min-h-0 flex-1 resize-none rounded-md border p-3 font-mono text-xs leading-relaxed outline-none"
          />
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground text-xs">
            {selectedPlacements.length} glyphs · {atlasWidth}×{atlasHeight} atlas
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleExportJson}
              disabled={!currentFont}
            >
              <FileJson className="mr-1.5 h-3.5 w-3.5" />
              Download .json
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={() => {
                void handleExportZip();
              }}
              disabled={!canExport || exporting}
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download .zip
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
