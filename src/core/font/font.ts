import { defaultFontSettings, type Font,type FontSettings } from './types';

export function createFont(name: string, settings?: Partial<FontSettings>): Font {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    name: name.trim() || 'Untitled',
    createdAt: now,
    updatedAt: now,
    settings: { ...defaultFontSettings(), ...settings },
    glyphs: [],
  };
}

export function updateFont(
  font: Font,
  changes: Partial<Omit<Font, 'id' | 'createdAt'>>,
): Font {
  return { ...font, ...changes, updatedAt: Date.now() };
}

export function serializeFont(font: Font): string {
  return JSON.stringify(font);
}

export function deserializeFont(raw: string): Font {
  const data = JSON.parse(raw) as Font;

  if (!data.id || !data.name || !data.settings) {
    throw new Error('Invalid font data');
  }

  return data;
}
