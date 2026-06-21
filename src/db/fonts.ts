import { defaultFontSettings, type Font } from '@/core/font';

import { db } from './db';

function hydrateFont(font: Font): Font {
  if (font.settings.alphaThreshold === undefined) {
    return {
      ...font,
      settings: { ...font.settings, alphaThreshold: defaultFontSettings().alphaThreshold },
    };
  }

  return font;
}

export async function getAllFonts(): Promise<Font[]> {
  const fonts = await db.fonts.orderBy('updatedAt').reverse().toArray();

  return fonts.map(hydrateFont);
}

export async function getFont(id: string): Promise<Font | undefined> {
  const font = await db.fonts.get(id);

  return font ? hydrateFont(font) : font;
}

export async function saveFont(font: Font): Promise<void> {
  await db.fonts.put(font);
}

export async function deleteFont(id: string): Promise<void> {
  await db.transaction('rw', [db.fonts, db.glyphs], async () => {
    await db.fonts.delete(id);
    await db.glyphs.where('fontId').equals(id).delete();
  });
}
