import { db } from './db'
import type { Glyph } from '@/core/project/types'

export async function saveGlyphs(glyphs: Glyph[]): Promise<void> {
  const records = glyphs.map((g) => ({ ...g, id: `${g.projectId}:${g.codePoint}` }))
  await db.glyphs.bulkPut(records)
}

export async function getGlyphsForProject(projectId: string): Promise<Glyph[]> {
  return db.glyphs.where('projectId').equals(projectId).toArray()
}

export async function saveFontFile(id: string, data: ArrayBuffer, filename: string): Promise<void> {
  await db.fontFiles.put({ id, data, filename, createdAt: Date.now() })
}

export async function getFontFile(id: string): Promise<ArrayBuffer | null> {
  const record = await db.fontFiles.get(id)
  return record?.data ?? null
}
