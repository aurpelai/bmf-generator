# bmf-generator

A frontend-only tool for authoring BMF (AngelCode) bitmap fonts. The user creates a font, populates it with glyphs (rasterised from a TTF/OTF or hand-drawn), and exports a `.fnt` descriptor plus a PNG atlas.

## Language

### Font & data

**Font**:
The top-level artefact the user is authoring — what eventually exports as a `.fnt` + atlas pair. Holds font-wide settings and an ordered list of glyph code points. Persisted in IndexedDB.
_Avoid_: Project, document.

**Font Settings**:
Font-wide BMF metrics (`fontSize`, `padding`, `spacing`, `lineHeight`, `base`, `capHeight`, `alphaThreshold`) plus the optional `sourceFontId` linking to an uploaded TTF/OTF.
_Avoid_: Config, options, metrics.

**Source Font**:
A user-uploaded TTF/OTF used to rasterise glyphs. Optional — a font can be drawn from scratch without one. Referenced by `FontSettings.sourceFontId`; the blob itself lives in the `FontFile` store, an implementation detail of how the file is persisted.
_Avoid_: Upload, font file.

**Code Point**:
A Unicode scalar identifying a glyph within a font. The canonical identifier across the editor, storage, and export — BMF's `char id` is the same number.
_Avoid_: Char, character, char code.

**Glyph**:
The editable artefact for one code point: its layer stack plus BMF per-glyph fields (`xoffset`, `yoffset`, `xadvance`). One per code point per font.
_Avoid_: Char (reserved for the BMF output line), character, symbol.

**Layer**:
One bitmap inside a glyph's stack, with its own offset, visibility, lock, and editor tint. Flattened into a single bitmap at export time. `layers[0]` is the base layer.
_Avoid_: Bitmap (ambiguous), pixel buffer, image.

**Glyph Set**:
A named preset of code points (e.g. "ASCII Printable", "Letters & digits") the user picks from when seeding a font's glyph list. Sets marked `custom` can be edited after selection.
_Avoid_: Charset (reserved for BMF's `info charset=…` field), preset, range.

### Pixel model

**Pixel**:
An 8-bit greyscale value (0–255) in a layer's `Uint8Array`. Ink-vs-background is decided per glyph by comparing against `alphaThreshold`.
_Avoid_: Sample, intensity.

**Alpha Threshold**:
The cutoff (0–255) above which a pixel counts as ink for trimming, rendering, and export. Font-wide default in Font Settings; per-glyph override on `Glyph.alphaThreshold`.
_Avoid_: Cutoff, ink threshold.

**Ink**:
A pixel that passes the alpha threshold. Used informally — there is no `ink` field; "ink pixels" means "pixels ≥ threshold".

**Cell**:
A single square in the pixel-editor grid at the current zoom. The editor canvas is sized in cells; each layer is rendered into it at the layer's own `xoffset`/`yoffset`.

### Pipeline

**Rasterize**:
Convert a Source Font into greyscale bitmaps for a font's code points. Produces `RasterizedGlyph` records that seed glyph base layers.
_Avoid_: Render (reserved for the editor canvas), draw, bake.

**Flatten**:
Composite a glyph's visible layers into one bitmap (max-blend, union bbox). The export pipeline always operates on the flattened result, never on raw layers.
_Avoid_: Merge, composite, collapse.

**Trim**:
Crop a flattened glyph to its ink bbox before packing. The cropped pixels are recorded as `trimX`/`trimY` on the `GlyphPlacement` and folded back into `xoffset`/`yoffset` at serialise time.
_Avoid_: Crop (informal only — code uses `trim`).

**Pack**:
Place trimmed glyph bitmaps into a single rectangular atlas using MaxRects. Produces `GlyphPlacement`s and the chosen `atlasWidth`/`atlasHeight`.
_Avoid_: Layout, arrange.

### Export artefacts

**Atlas**:
The PNG image holding all packed glyph bitmaps. Referenced from the descriptor's `page` line. A font always exports exactly one atlas page.
_Avoid_: Sheet, sprite sheet, page (page is BMF's term for the file reference, not the image itself).

**Placement**:
A glyph's rect inside the atlas (`x`, `y`, `width`, `height`) plus its `trimX`/`trimY`. Drives both the atlas blit and the `char` line in the descriptor.
_Avoid_: Rect, region, slot.

**Descriptor**:
The `.fnt` text file in BMF/AngelCode format — `info`, `common`, `page`, `chars`, and per-glyph `char` lines. Paired with the atlas PNG to make a usable bitmap font.
_Avoid_: Manifest, fnt file (use "descriptor" or ".fnt" explicitly).

**Char (BMF)**:
The `char id=… x=… y=… …` line in the descriptor. Use only when talking about the output text format; for the in-memory editable artefact use **Glyph**.

**Portable Font**:
A self-contained JSON export of a font plus its glyphs, used for sharing/importing fonts between browsers. Distinct from the BMF export (which produces `.fnt` + PNG).
_Avoid_: Backup, dump, save file.
