import type { Glyph } from '@/core/font/types';

import { db } from './db';

export async function saveGlyphs(glyphs: Glyph[]): Promise<void> {
  const records = glyphs.map((glyph) => ({
    ...glyph,
    id: `${glyph.fontId}:${glyph.codePoint}`,
  }));

  await db.glyphs.bulkPut(records);
}

export async function getGlyphsForFont(fontId: string): Promise<Glyph[]> {
  return db.glyphs.where('fontId').equals(fontId).toArray();
}

export async function deleteGlyph(fontId: string, codePoint: number): Promise<void> {
  await db.glyphs.delete(`${fontId}:${codePoint}`);
}

export async function saveFontFile(id: string, data: ArrayBuffer, filename: string): Promise<void> {
  await db.fontFiles.put({ id, data, filename, createdAt: Date.now() });
}

export async function getFontFile(id: string): Promise<ArrayBuffer | null> {
  const record = await db.fontFiles.get(id);

  return record?.data ?? null;
}
