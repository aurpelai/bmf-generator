import { describe, expect, it } from 'vitest';

import { effectiveThreshold } from './threshold';

describe('effectiveThreshold', () => {
  it('falls back to font setting when glyph has no override', () => {
    expect(effectiveThreshold({ alphaThreshold: undefined }, { alphaThreshold: 128 })).toBe(128);
  });

  it('uses the glyph override when set', () => {
    expect(effectiveThreshold({ alphaThreshold: 50 }, { alphaThreshold: 128 })).toBe(50);
  });

  it('treats override 0 as a real override, not a fallback trigger', () => {
    expect(effectiveThreshold({ alphaThreshold: 0 }, { alphaThreshold: 128 })).toBe(0);
  });

  it('treats override 255 as a real override', () => {
    expect(effectiveThreshold({ alphaThreshold: 255 }, { alphaThreshold: 64 })).toBe(255);
  });
});
