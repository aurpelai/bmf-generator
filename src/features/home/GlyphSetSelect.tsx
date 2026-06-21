import React from 'react';

import { GLYPH_SETS } from '@/core/font/glyphSets';

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
