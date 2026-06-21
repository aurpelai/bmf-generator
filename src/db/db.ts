import Dexie, { type EntityTable } from 'dexie';

import type { Font, Glyph, Layer } from '@/core/font';
import { makeBaseLayerFromBitmap } from '@/core/font/layers';

interface FontFile {
  id: string;
  data: ArrayBuffer;
  filename: string;
  createdAt: number;
}

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

export function upgradeGlyphV2ToV3(record: Glyph & { id: string }): void {
  record.layers = record.layers.map((layer, index) => {
    const next = { ...layer, colorIndex: index };

    delete (next as Layer & { color?: string }).color;

    return next;
  });
}

class BmfDatabase extends Dexie {
  fonts!: EntityTable<Font, 'id'>;
  glyphs!: EntityTable<Glyph & { id: string }, 'id'>;
  fontFiles!: EntityTable<FontFile, 'id'>;

  constructor() {
    super('bmf-generator');

    // v1–v3 schema strings are historical and must not change — Dexie replays
    // them to upgrade browsers that landed on those versions.
    this.version(1).stores({
      projects: 'id, updatedAt',
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

    this.version(3)
      .stores({
        projects: 'id, updatedAt',
        glyphs: '[projectId+codePoint], projectId, id',
        fontFiles: 'id',
      })
      .upgrade((transaction) =>
        transaction
          .table<Glyph & { id: string }>('glyphs')
          .toCollection()
          .modify((record) => upgradeGlyphV2ToV3(record)),
      );

    // The `glyphs` store needs a new compound primary key (`[fontId+codePoint]`
    // instead of `[projectId+codePoint]`), and Dexie cannot rename a primary
    // key in place. v4 stashes the records into a temporary store and drops
    // `glyphs`; v5 recreates `glyphs` with the new key and restores the records
    // with the field rewritten. Both versions are required — Dexie processes
    // them sequentially even when a user jumps from v3 straight to v5.
    this.version(4)
      .stores({
        projects: null,
        fonts: 'id, updatedAt',
        glyphs: null,
        glyphsTmp: 'id',
        fontFiles: 'id',
      })
      .upgrade(async (transaction) => {
        const oldFonts = await transaction.table('projects').toArray();

        if (oldFonts.length > 0) {
          await transaction.table('fonts').bulkAdd(oldFonts);
        }

        const oldGlyphs = await transaction
          .table<Glyph & { id: string; projectId?: string }>('glyphs')
          .toArray();

        if (oldGlyphs.length > 0) {
          const rewritten = oldGlyphs.map((record) => {
            const { projectId, ...rest } = record;

            return { ...rest, fontId: projectId ?? record.fontId };
          });

          await transaction.table('glyphsTmp').bulkAdd(rewritten);
        }
      });

    this.version(5)
      .stores({
        glyphs: '[fontId+codePoint], fontId, id',
        glyphsTmp: null,
      })
      .upgrade(async (transaction) => {
        const stashed = await transaction.table<Glyph & { id: string }>('glyphsTmp').toArray();

        if (stashed.length > 0) {
          await transaction.table('glyphs').bulkAdd(stashed);
        }
      });
  }
}

export const db = new BmfDatabase();
