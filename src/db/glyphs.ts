import type { Glyph } from '@/core/font/types';

import { db } from './db';

export async function saveGlyphs(glyphs: Glyph[]): Promise<void> {
  const records = glyphs.map((glyph) => ({
    ...glyph,
    id: `${glyph.fontId}:${glyph.codePoint}`,
  }));

  await db.glyphs.bulkPut(records);
}

// Records persisted before PR 1 lack the `bmf` sub-object. Synthesise it from
// the legacy top-level fields so the in-memory shape is always complete.
// PR 2 introduces a v6 DB migration that does this on disk and lets us drop
// this defensive normalisation.
function normaliseBmf(record: Glyph): Glyph {
  if (record.bmf) {
    return record;
  }

  return {
    ...record,
    bmf: { xoffset: record.xoffset, yoffset: record.yoffset, xadvance: record.xadvance },
  };
}

export async function getGlyphsForFont(fontId: string): Promise<Glyph[]> {
  const records = await db.glyphs.where('fontId').equals(fontId).toArray();

  return records.map(normaliseBmf);
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
