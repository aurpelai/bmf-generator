import Dexie, { type EntityTable } from 'dexie'
import type { Project, Glyph } from '@/core/project'

interface FontFile {
  id: string
  data: ArrayBuffer
  filename: string
  createdAt: number
}

class BmfDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>
  glyphs!: EntityTable<Glyph & { id: string }, 'id'>
  fontFiles!: EntityTable<FontFile, 'id'>

  constructor() {
    super('bmf-generator')

    this.version(1).stores({
      projects: 'id, updatedAt',
      // compound key: one glyph record per (projectId, codePoint) pair
      glyphs: '[projectId+codePoint], projectId, id',
      fontFiles: 'id',
    })
  }
}

export const db = new BmfDatabase()
