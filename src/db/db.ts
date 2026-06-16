import Dexie, { type EntityTable } from 'dexie';

import type { Glyph, Project } from '@/core/project';
import { makeBaseLayerFromBitmap } from '@/core/project/layers';

interface FontFile {
  id: string;
  data: ArrayBuffer;
  filename: string;
  createdAt: number;
}

/**
 * v1→v2 per-record upgrade: derive layers[0] from the legacy bitmap fields.
 * Legacy pixels/width/height/xoffset/yoffset are intentionally preserved so a
 * one-shot rollback to v1 remains safe.
 *
 * Exported for unit testing without spinning up a real IndexedDB.
 */
export function upgradeGlyphV1ToV2(record: Glyph & { id: string }): void {
  record.layers = [
    makeBaseLayerFromBitmap({
      pixels: record.pixels,
      width: record.width,
      height: record.height,
      xoffset: record.xoffset,
      yoffset: record.yoffset,
    }),
  ];
}

class BmfDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  glyphs!: EntityTable<Glyph & { id: string }, 'id'>;
  fontFiles!: EntityTable<FontFile, 'id'>;

  constructor() {
    super('bmf-generator');

    this.version(1).stores({
      projects: 'id, updatedAt',
      // compound key: one glyph record per (projectId, codePoint) pair
      glyphs: '[projectId+codePoint], projectId, id',
      fontFiles: 'id',
    });

    this.version(2)
      .stores({
        projects: 'id, updatedAt',
        glyphs: '[projectId+codePoint], projectId, id',
        fontFiles: 'id',
      })
      .upgrade((transaction) =>
        transaction
          .table<Glyph & { id: string }>('glyphs')
          .toCollection()
          .modify((record) => upgradeGlyphV1ToV2(record)),
      );
  }
}

export const db = new BmfDatabase();
