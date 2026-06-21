import { describe, expect, it } from 'vitest';

import { createFont, deserializeFont, serializeFont, updateFont } from './font';
import { defaultFontSettings } from './types';

describe('createFont', () => {
  it('creates a font with a uuid id', () => {
    const font = createFont('My Font');

    expect(font.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('trims the name', () => {
    const font = createFont('  My Font  ');

    expect(font.name).toBe('My Font');
  });

  it('falls back to "Untitled" for empty name', () => {
    const font = createFont('');

    expect(font.name).toBe('Untitled');
  });

  it('applies default font settings', () => {
    const font = createFont('Test');

    expect(font.settings).toEqual(defaultFontSettings());
  });

  it('merges custom settings', () => {
    const font = createFont('Test', { fontSize: 16 });

    expect(font.settings.fontSize).toBe(16);
    expect(font.settings.lineHeight).toBe(defaultFontSettings().lineHeight);
  });

  it('starts with no glyphs', () => {
    const font = createFont('Test');

    expect(font.glyphs).toEqual([]);
  });
});

describe('updateFont', () => {
  it('updates fields and bumps updatedAt', () => {
    const font = createFont('Test');
    const before = font.updatedAt;
    const updated = updateFont(font, { name: 'New Name' });

    expect(updated.name).toBe('New Name');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(before);
    expect(updated.id).toBe(font.id);
  });

  it('does not mutate the original', () => {
    const font = createFont('Test');

    updateFont(font, { name: 'Changed' });
    expect(font.name).toBe('Test');
  });
});

describe('serialize/deserialize', () => {
  it('round-trips a font through JSON', () => {
    const font = createFont('Round Trip');
    const restored = deserializeFont(serializeFont(font));

    expect(restored).toEqual(font);
  });

  it('throws on invalid data', () => {
    expect(() => deserializeFont('{}')).toThrow();
  });
});
