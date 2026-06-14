import { Loader2 } from 'lucide-react';
import React from 'react';

import type { GlyphPreviewData } from './GlyphThumbnail';
import { GlyphThumbnail } from './GlyphThumbnail';

export type { GlyphPreviewData };

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
