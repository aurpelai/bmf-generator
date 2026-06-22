import Dexie, { type EntityTable } from 'dexie';

import type { Font, Glyph, Layer } from '@/core/font';
import { makeBaseLayerFromBitmap } from '@/core/font/layers';

interface FontFile {
  id: string;
  data: ArrayBuffer;
  filename: string;
  createdAt: number;
}

// v1 records carried a single flat bitmap at the top level. v2 wraps that
// bitmap in a single base layer. The legacy top-level fields are read here
// via a loosely-typed view because the `Glyph` interface no longer declares
// them — they only exist on records persisted before the schema change.
interface LegacyV1Fields {
  pixels: Uint8Array;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
}

export function upgradeGlyphV1ToV2(record: Glyph & { id: string }): void {
  const legacy = record as unknown as LegacyV1Fields;

  record.layers = [
    makeBaseLayerFromBitmap({
      pixels: legacy.pixels,
      width: legacy.width,
      height: legacy.height,
      xoffset: legacy.xoffset,
      yoffset: legacy.yoffset,
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
    //
    // v6 finalises the layers-only Glyph shape: the legacy top-level
    // `pixels`/`width`/`height`/`xoffset`/`yoffset`/`xadvance` fields are
    // dropped, and the `bmf` sub-object becomes the only source of BMF
    // metadata. The migration backfills `bmf` from the legacy fields if a
    // record predates PR 1's `bmf` introduction.
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

    this.version(6)
      .stores({ glyphs: '[fontId+codePoint], fontId, id' })
      .upgrade(async (transaction) => {
        await transaction
          .table<Glyph & { id: string }>('glyphs')
          .toCollection()
          .modify((record) => {
            const legacy = record as unknown as Partial<LegacyV1Fields>;

            if (!record.bmf) {
              record.bmf = {
                xoffset: legacy.xoffset ?? 0,
                yoffset: legacy.yoffset ?? 0,
                xadvance: legacy.xadvance ?? 0,
              };
            }

            delete legacy.pixels;
            delete legacy.width;
            delete legacy.height;
            delete legacy.xoffset;
            delete legacy.yoffset;
            delete legacy.xadvance;
          });
      });
  }
}

export const db = new BmfDatabase();
