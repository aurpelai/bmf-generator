import React from 'react';

import type { GlyphPreset } from '@/store';
import { useStore } from '@/store';
import { GLYPH_NAMES } from '@/utils/glyphs';

const PRESETS: Array<{ id: GlyphPreset; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'letters', label: 'Letters' },
  { id: 'letters-digits', label: 'Letters & digits' },
  { id: 'digits', label: 'Digits' },
  { id: 'custom', label: 'Custom' },
];

export const GlyphSelection = (): React.JSX.Element => {
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
          const char = GLYPH_NAMES[glyph.codePoint] ?? String.fromCodePoint(glyph.codePoint);

          return (
            <button
              key={glyph.codePoint}
              title={`U+${glyph.codePoint.toString(16).toUpperCase().padStart(4, '0')} ${char}`}
              onClick={() => toggleExportGlyph(glyph.codePoint, allCodePoints)}
              className={`flex h-6 min-w-6 items-center justify-center rounded px-1 text-[11px] transition-all ${
                selected
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground opacity-30'
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
