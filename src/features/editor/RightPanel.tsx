import { ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveProject } from '@/db';
import { useAtlas } from '@/hooks/useAtlas';
import type { GlyphPreset } from '@/store';
import { useStore } from '@/store';

type Tab = 'atlas' | 'settings';

// Debounce helper
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);

    return () => clearTimeout(timer);
  }, [value, ms]);

  return debounced;
}

const PRESETS: Array<{ id: GlyphPreset; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'letters', label: 'Letters' },
  { id: 'letters-digits', label: 'Letters & digits' },
  { id: 'digits', label: 'Digits' },
  { id: 'custom', label: 'Custom' },
];

const GlyphSelection = (): React.JSX.Element => {
  const glyphs = useStore((state) => state.glyphs);
  const exportSelection = useStore((state) => state.exportSelection);
  const exportPreset = useStore((state) => state.exportPreset);
  const setExportPreset = useStore((state) => state.setExportPreset);
  const toggleExportGlyph = useStore((state) => state.toggleExportGlyph);
  const allCodePoints = glyphs.map((glyph) => glyph.codePoint);

  return (
    <div className="grid gap-1.5">
      <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
        Glyph selection
      </span>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setExportPreset(preset.id, allCodePoints)}
            className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
              exportPreset === preset.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-0.5 pt-0.5">
        {glyphs.map((glyph) => {
          const selected = exportSelection === null || exportSelection.has(glyph.codePoint);
          const char = String.fromCodePoint(glyph.codePoint);

          return (
            <button
              key={glyph.codePoint}
              title={`U+${glyph.codePoint.toString(16).toUpperCase().padStart(4, '0')} ${char}`}
              onClick={() => toggleExportGlyph(glyph.codePoint, allCodePoints)}
              className={`flex h-6 w-6 items-center justify-center rounded text-[11px] transition-colors ${
                selected ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground/30'
              }`}
            >
              {char}
            </button>
          );
        })}
      </div>
      <div className="text-muted-foreground text-[10px]">
        {exportSelection === null ? glyphs.length : exportSelection.size} / {glyphs.length} glyphs
        selected
      </div>
    </div>
  );
};

const SettingsTab = (): React.JSX.Element | null => {
  const currentProject = useStore((state) => state.currentProject);
  const updateCurrentProject = useStore((state) => state.updateCurrentProject);

  const initialSettings = currentProject?.settings;
  const [name, setName] = useState(currentProject?.name ?? '');
  const [fontSize, setFontSize] = useState(initialSettings?.fontSize ?? 32);
  const [lineHeight, setLineHeight] = useState(initialSettings?.lineHeight ?? 36);
  const [base, setBase] = useState(initialSettings?.base ?? 28);
  const [capHeight, setCapHeight] = useState(initialSettings?.capHeight ?? 22);
  const [paddingTop, setPaddingTop] = useState(initialSettings?.padding.top ?? 1);
  const [paddingRight, setPaddingRight] = useState(initialSettings?.padding.right ?? 1);
  const [paddingBottom, setPaddingBottom] = useState(initialSettings?.padding.bottom ?? 1);
  const [paddingLeft, setPaddingLeft] = useState(initialSettings?.padding.left ?? 1);
  const [spacingX, setSpacingX] = useState(initialSettings?.spacing.x ?? 1);
  const [spacingY, setSpacingY] = useState(initialSettings?.spacing.y ?? 1);

  useEffect(() => {
    if (!currentProject) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(currentProject.name);
    const settings = currentProject.settings;

    setFontSize(settings.fontSize);
    setLineHeight(settings.lineHeight);
    setBase(settings.base);
    setCapHeight(settings.capHeight);
    setPaddingTop(settings.padding.top);
    setPaddingRight(settings.padding.right);
    setPaddingBottom(settings.padding.bottom);
    setPaddingLeft(settings.padding.left);
    setSpacingX(settings.spacing.x);
    setSpacingY(settings.spacing.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id]);

  if (!currentProject) {
    return null;
  }

  function commit(changes: Parameters<typeof updateCurrentProject>[0]): void {
    updateCurrentProject(changes);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    void saveProject({ ...currentProject!, ...changes, updatedAt: Date.now() }); // non-null: guarded above
  }

  function commitSettings(partial: Partial<NonNullable<typeof currentProject>['settings']>): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    commit({ settings: { ...currentProject!.settings, ...partial } }); // non-null: guarded above
  }

  function liveSettings(partial: Partial<NonNullable<typeof currentProject>['settings']>): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    updateCurrentProject({ settings: { ...currentProject!.settings, ...partial } }); // non-null: guarded above
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-3">
      <div className="grid gap-1">
        <Label htmlFor="rp-name" className="text-[10px]">
          Font name
        </Label>
        <Input
          id="rp-name"
          className="h-7 text-xs"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => commit({ name })}
          onKeyDown={(event) => event.key === 'Enter' && commit({ name })}
        />
      </div>

      {/* Font metrics */}
      <div className="grid gap-2">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Font metrics
        </span>
        <div className="grid gap-1">
          <Label htmlFor="rp-fontsize" className="text-[10px]">
            Font size
          </Label>
          <Input
            id="rp-fontsize"
            type="number"
            className="h-7 text-xs"
            value={fontSize}
            onChange={(event) => {
              setFontSize(Number(event.target.value));
              liveSettings({ fontSize: Number(event.target.value) });
            }}
            onBlur={() => commitSettings({ fontSize })}
            onKeyDown={(event) => event.key === 'Enter' && commitSettings({ fontSize })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="rp-lineheight" className="text-[10px]">
            Line height
          </Label>
          <Input
            id="rp-lineheight"
            type="number"
            className="h-7 text-xs"
            value={lineHeight}
            onChange={(event) => {
              setLineHeight(Number(event.target.value));
              liveSettings({ lineHeight: Number(event.target.value) });
            }}
            onBlur={() => commitSettings({ lineHeight })}
            onKeyDown={(event) => event.key === 'Enter' && commitSettings({ lineHeight })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="rp-base" className="text-[10px]">
            Baseline
          </Label>
          <Input
            id="rp-base"
            type="number"
            className="h-7 text-xs"
            value={base}
            onChange={(event) => {
              const value = Math.min(Number(event.target.value), lineHeight);

              setBase(value);
              liveSettings({ base: value });
            }}
            onBlur={() => commitSettings({ base: Math.min(base, lineHeight) })}
            onKeyDown={(event) =>
              event.key === 'Enter' && commitSettings({ base: Math.min(base, lineHeight) })
            }
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="rp-capheight" className="text-[10px]">
            Cap height
          </Label>
          <Input
            id="rp-capheight"
            type="number"
            className="h-7 text-xs"
            value={capHeight}
            onChange={(event) => {
              const value = Math.min(Number(event.target.value), lineHeight);

              setCapHeight(value);
              liveSettings({ capHeight: value });
            }}
            onBlur={() => commitSettings({ capHeight: Math.min(capHeight, lineHeight) })}
            onKeyDown={(event) =>
              event.key === 'Enter' &&
              commitSettings({ capHeight: Math.min(capHeight, lineHeight) })
            }
          />
        </div>
      </div>

      {/* Padding */}
      <div className="grid gap-2">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Padding
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="rp-pad-top" className="text-[10px]">
              Top
            </Label>
            <Input
              id="rp-pad-top"
              type="number"
              className="h-7 text-xs"
              value={paddingTop}
              onChange={(event) => setPaddingTop(Number(event.target.value))}
              onBlur={() =>
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
              onKeyDown={(event) =>
                event.key === 'Enter' &&
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rp-pad-right" className="text-[10px]">
              Right
            </Label>
            <Input
              id="rp-pad-right"
              type="number"
              className="h-7 text-xs"
              value={paddingRight}
              onChange={(event) => setPaddingRight(Number(event.target.value))}
              onBlur={() =>
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
              onKeyDown={(event) =>
                event.key === 'Enter' &&
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rp-pad-bottom" className="text-[10px]">
              Bottom
            </Label>
            <Input
              id="rp-pad-bottom"
              type="number"
              className="h-7 text-xs"
              value={paddingBottom}
              onChange={(event) => setPaddingBottom(Number(event.target.value))}
              onBlur={() =>
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
              onKeyDown={(event) =>
                event.key === 'Enter' &&
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rp-pad-left" className="text-[10px]">
              Left
            </Label>
            <Input
              id="rp-pad-left"
              type="number"
              className="h-7 text-xs"
              value={paddingLeft}
              onChange={(event) => setPaddingLeft(Number(event.target.value))}
              onBlur={() =>
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
              onKeyDown={(event) =>
                event.key === 'Enter' &&
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Spacing */}
      <div className="grid gap-2">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Spacing
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="rp-spacingx" className="text-[10px]">
              X
            </Label>
            <Input
              id="rp-spacingx"
              type="number"
              className="h-7 text-xs"
              value={spacingX}
              onChange={(event) => setSpacingX(Number(event.target.value))}
              onBlur={() => commitSettings({ spacing: { x: spacingX, y: spacingY } })}
              onKeyDown={(event) =>
                event.key === 'Enter' && commitSettings({ spacing: { x: spacingX, y: spacingY } })
              }
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rp-spacingy" className="text-[10px]">
              Y
            </Label>
            <Input
              id="rp-spacingy"
              type="number"
              className="h-7 text-xs"
              value={spacingY}
              onChange={(event) => setSpacingY(Number(event.target.value))}
              onBlur={() => commitSettings({ spacing: { x: spacingX, y: spacingY } })}
              onKeyDown={(event) =>
                event.key === 'Enter' && commitSettings({ spacing: { x: spacingX, y: spacingY } })
              }
            />
          </div>
        </div>
      </div>

      {/* Glyph selection */}
      <GlyphSelection />
    </div>
  );
};

const AtlasTab = (): React.JSX.Element => {
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

  // Glyphs to pack: selection or all
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

  // Auto-pack on first load
  useEffect(() => {
    if (glyphs.length > 0 && !atlasImageData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void runPack(glyphs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyphs.length]);

  // Debounced auto-repack when pixel data or selection changes
  useEffect(() => {
    if (debouncedSelected.length > 0 && atlasImageData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void runPack(debouncedSelected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSelected]);

  // Render atlas ImageData onto canvas when it changes
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
    <div className="flex flex-1 flex-col gap-3 overflow-auto p-3">
      {/* Atlas preview */}
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
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-xs">
          No glyphs to pack yet.
        </div>
      )}
    </div>
  );
};

export const RightPanel = ({
  onCollapse,
  width,
}: {
  onCollapse: () => void;
  width: number;
}): React.JSX.Element => {
  const [tab, setTab] = useState<Tab>('atlas');

  const tabClass = (targetTab: Tab): string =>
    `cursor-pointer self-stretch flex items-center px-3 text-xs font-medium transition-colors ${
      tab === targetTab
        ? 'text-foreground border-b-2 border-primary -mb-px'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="border-border flex h-full shrink-0 flex-col border-l" style={{ width }}>
      <div className="border-border flex h-9 shrink-0 items-end border-b">
        <Button
          variant="ghost"
          size="icon"
          className="ml-2 h-6 w-6 self-center"
          title="Collapse panel"
          aria-label="Collapse panel"
          aria-expanded={true}
          onClick={onCollapse}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <div role="tablist" aria-label="Panel tabs" className="flex self-stretch">
          <button
            role="tab"
            aria-selected={tab === 'atlas'}
            aria-controls="rightpanel-atlas"
            id="tab-atlas"
            className={tabClass('atlas')}
            onClick={() => setTab('atlas')}
          >
            Atlas
          </button>
          <button
            role="tab"
            aria-selected={tab === 'settings'}
            aria-controls="rightpanel-settings"
            id="tab-settings"
            className={tabClass('settings')}
            onClick={() => setTab('settings')}
          >
            Settings
          </button>
        </div>
      </div>
      {tab === 'atlas' && <AtlasTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
};
