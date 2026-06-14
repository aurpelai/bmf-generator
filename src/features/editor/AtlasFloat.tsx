import { Loader2, RefreshCw, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAtlas } from '@/hooks/useAtlas';
import { useStore } from '@/store';

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);

    return () => clearTimeout(timer);
  }, [value, ms]);

  return debounced;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export const AtlasFloat = ({ open, onClose }: Props): React.JSX.Element => {
  const [packing, setPacking] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentProject = useStore((state) => state.currentProject);
  const glyphs = useStore((state) => state.glyphs);
  const atlasImageData = useStore((state) => state.atlasImageData);
  const atlasWidth = useStore((state) => state.atlasWidth);
  const atlasHeight = useStore((state) => state.atlasHeight);
  const atlasEfficiency = useStore((state) => state.atlasEfficiency);
  const setAtlasResult = useStore((state) => state.setAtlasResult);
  const exportSelection = useStore((state) => state.exportSelection);

  const { packAtlas } = useAtlas();

  const selectedGlyphs =
    exportSelection === null
      ? glyphs
      : glyphs.filter((glyph) => exportSelection.has(glyph.codePoint));

  const debouncedSelected = useDebounce(selectedGlyphs, 800);

  async function runPack(glyphsToPack = selectedGlyphs): Promise<void> {
    if (!currentProject || glyphsToPack.length === 0) {
      return;
    }

    setPacking(true);

    try {
      const {
        placements,
        atlasImageData: imageData,
        atlasWidth: packedWidth,
        atlasHeight: packedHeight,
        efficiency,
        unpacked,
      } = await packAtlas(glyphsToPack, currentProject.settings.padding.top);

       
      if (unpacked.length > 0) {
        console.warn(`${unpacked.length} glyphs did not fit in atlas`);
      }

      setAtlasResult(placements, imageData, packedWidth, packedHeight, efficiency);
    } finally {
      setPacking(false);
    }
  }

  useEffect(() => {
    if (glyphs.length > 0 && !atlasImageData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void runPack(glyphs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyphs.length]);

  useEffect(() => {
    if (debouncedSelected.length > 0 && atlasImageData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void runPack(debouncedSelected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSelected]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !atlasImageData) {
      return;
    }

    canvas.width = atlasWidth;
    canvas.height = atlasHeight;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    canvas.getContext('2d')!.putImageData(atlasImageData, 0, 0); // canvas is non-null (checked above)
  }, [atlasImageData, atlasWidth, atlasHeight]);

  return (
    <div
      className={`border-border/50 bg-popover absolute top-12 right-3 z-40 w-56 rounded-xl border shadow-lg transition-opacity ${
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="border-border/50 flex h-8 items-center justify-between border-b px-3">
        <span className="text-xs font-medium">Atlas</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {packing ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Packing…
          </div>
        ) : atlasImageData ? (
          <>
            <div className="bg-muted border-border/50 overflow-hidden rounded border">
              <canvas
                ref={canvasRef}
                style={{
                  imageRendering: 'pixelated',
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />
            </div>
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>
                {atlasWidth}×{atlasHeight} · {Math.round(atlasEfficiency * 100)}% used
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => {
                  void runPack();
                }}
                disabled={packing}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground flex items-center justify-center py-4 text-xs">
            No glyphs to pack yet.
          </div>
        )}
      </div>
    </div>
  );
};
