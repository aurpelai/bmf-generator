import { useState, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GLYPH_SETS } from '@/core/project/glyphSets'
import { IMPORT_PRESETS, filterCodePointsByPreset } from '@/store/exportSlice'
import type { ImportPreset } from '@/store/exportSlice'
import { createProject, makeBlankGlyph } from '@/core/project'
import { saveProject } from '@/db/projects'
import { saveFontFile, saveGlyphs } from '@/db/glyphs'
import { useRasterize } from '@/hooks/useRasterize'
import { useStore } from '@/store'
import type { Glyph } from '@/core/project/types'
import type { RasterizedGlyph } from '@/core/font/rasterize'
import { parseBmfText } from '@/core/bmf/parse'
import type { BmfParseResult } from '@/core/bmf/parse'
import { DropZone, FontMetricsFields, GlyphPreviewStep, GlyphSetSelect, PaddingFields, SpacingFields, WizardFooter } from './import-shared'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 1 | 2 | 3
type FontFormat = 'ttf' | 'bmf'

const ATLAS_SIZES = [256, 512, 1024, 2048]

// --- BMF atlas slicing helpers ---

type AtlasMode = 'alpha' | 'rgb-white-on-black' | 'rgb-black-on-white'

function detectAtlasMode(data: Uint8ClampedArray, width: number, height: number): AtlasMode {
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i]
    if (a !== 0 && a !== 255) return 'alpha'
  }
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + width - 1) * 4,
  ]
  const avgCornerRed = corners.reduce((s, i) => s + data[i], 0) / corners.length
  return avgCornerRed >= 128 ? 'rgb-black-on-white' : 'rgb-white-on-black'
}

function sliceGlyphsFromAtlas(
  imageData: ImageData,
  chars: BmfParseResult['chars'],
  projectId: string,
): Glyph[] {
  const { data, width: atlasW, height: atlasH } = imageData
  const mode = detectAtlasMode(data, atlasW, atlasH)
  return chars.map((c) => {
    if (c.width === 0 || c.height === 0) {
      return {
        codePoint: c.id, projectId,
        pixels: new Uint8Array(0), width: 0, height: 0,
        xoffset: c.xoffset, yoffset: c.yoffset, xadvance: c.xadvance, isDirty: false,
      }
    }
    const pixels = new Uint8Array(c.width * c.height)
    for (let row = 0; row < c.height; row++) {
      for (let col = 0; col < c.width; col++) {
        const atlasIdx = ((c.y + row) * atlasW + (c.x + col)) * 4
        const v = mode === 'alpha'
          ? data[atlasIdx + 3]
          : mode === 'rgb-black-on-white'
            ? 255 - data[atlasIdx]
            : data[atlasIdx]
        pixels[row * c.width + col] = v
      }
    }
    return {
      codePoint: c.id, projectId, pixels,
      width: c.width, height: c.height,
      xoffset: c.xoffset, yoffset: c.yoffset, xadvance: c.xadvance, isDirty: false,
    }
  })
}

// --- Wizard component ---

export function ImportWizard({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [format, setFormat] = useState<FontFormat | null>(null)

  // Step 1 — upload
  const [ttfFile, setTtfFile] = useState<File | null>(null)
  const [fntFile, setFntFile] = useState<File | null>(null)
  const [pngFile, setPngFile] = useState<File | null>(null)
  const [projectName, setProjectName] = useState('')
  const [importPreset, setImportPreset] = useState<ImportPreset>('all')
  const [nameError, setNameError] = useState('')

  // Step 2 — settings (shared, BMF pre-populates from parsed .fnt)
  const [fontSize, setFontSize] = useState(32)
  const [lineHeight, setLineHeight] = useState(Math.round(32 * 1.2))
  const [base, setBase] = useState(Math.round(32 * 0.8))
  const [capHeight, setCapHeight] = useState(Math.round(32 * 0.7))
  const [atlasSize, setAtlasSize] = useState(512)
  const [glyphSetId, setGlyphSetId] = useState(GLYPH_SETS[0].id)
  const [paddingTop, setPaddingTop] = useState(1)
  const [paddingRight, setPaddingRight] = useState(1)
  const [paddingBottom, setPaddingBottom] = useState(1)
  const [paddingLeft, setPaddingLeft] = useState(1)
  const [spacingX, setSpacingX] = useState(1)
  const [spacingY, setSpacingY] = useState(1)

  // Expected atlas filename read from .fnt (for the PNG drop zone hint)
  const [expectedAtlasFilename, setExpectedAtlasFilename] = useState<string | null>(null)

  // Step 3 — preview / processing
  const [processing, setProcessing] = useState(false)
  const [processError, setProcessError] = useState<string | null>(null)
  const [previewGlyphs, setPreviewGlyphs] = useState<(Glyph | RasterizedGlyph)[]>([])
  const [confirming, setConfirming] = useState(false)

  // Refs to carry data across steps without re-triggering effects
  const ttfBufferRef = useRef<ArrayBuffer | null>(null)
  const ttfMetricsRef = useRef({ lineHeight: 0, base: 0, capHeight: 0 })
  const bmfParsedRef = useRef<BmfParseResult | null>(null)
  const bmfImageDataRef = useRef<ImageData | null>(null)

  const { rasterize } = useRasterize()
  const setCurrentProject = useStore((s) => s.setCurrentProject)
  const setStoreGlyphs = useStore((s) => s.setGlyphs)
  const setView = useStore((s) => s.setView)

  // --- Step 1 file handlers ---

  function handleFirstFile(f: File) {
    if (/\.fnt$/i.test(f.name)) {
      handleFntFile(f)
    } else if (/\.(ttf|otf|woff2?)$/i.test(f.name)) {
      setTtfFile(f)
      setFormat('ttf')
      if (!projectName) setProjectName(f.name.replace(/\.[^.]+$/, ''))
      const reader = new FileReader()
      reader.onload = (e) => { ttfBufferRef.current = e.target?.result as ArrayBuffer }
      reader.readAsArrayBuffer(f)
    }
    // Silently ignore unrecognised files (e.g. accidentally dropping a .png)
  }

  function handleFntFile(f: File) {
    setFntFile(f)
    setFormat('bmf')
    if (!projectName) setProjectName(f.name.replace(/\.fnt$/i, ''))
    // Read the atlas filename from the .fnt so we can hint it on the PNG drop zone
    f.text().then((text) => {
      try {
        const parsed = parseBmfText(text)
        bmfParsedRef.current = parsed
        setExpectedAtlasFilename(parsed.atlasFilename)
      } catch {
        // Ignore parse errors at this point; they'll surface at the preview step
      }
    })
  }

  // --- Step 1 → 2 transition: parse BMF early to pre-populate settings ---

  async function goToSettings() {
    if (!projectName.trim()) {
      setNameError('Font name is required')
      return
    }
    if (format === 'bmf' && fntFile) {
      try {
        // May already be parsed eagerly when the .fnt was dropped
        const parsed = bmfParsedRef.current ?? parseBmfText(await fntFile.text())
        bmfParsedRef.current = parsed
        setFontSize(parsed.info.size)
        setLineHeight(parsed.common.lineHeight)
        setBase(parsed.common.base)
        setCapHeight(Math.round(parsed.common.base * 0.7 / 0.8))
        setAtlasSize(closestAtlasSize(parsed.common.scaleW))
        setPaddingTop(parsed.info.padding.top)
        setPaddingRight(parsed.info.padding.right)
        setPaddingBottom(parsed.info.padding.bottom)
        setPaddingLeft(parsed.info.padding.left)
        setSpacingX(parsed.info.spacing.x)
        setSpacingY(parsed.info.spacing.y)
      } catch {
        // Non-fatal: leave defaults, error will surface at preview step
      }
    }
    setStep(2)
  }

  // --- Step 2 → 3 transition: rasterise or slice ---

  const runProcessing = useCallback(async () => {
    setProcessing(true)
    setProcessError(null)
    try {
      if (format === 'ttf') {
        if (!ttfBufferRef.current) throw new Error('No font buffer')
        const glyphSet = GLYPH_SETS.find((s) => s.id === glyphSetId) ?? GLYPH_SETS[0]
        const codePoints = filterCodePointsByPreset(importPreset, glyphSet.codePoints)
        const bufferCopy = ttfBufferRef.current.slice(0)
        const result = await rasterize(bufferCopy, codePoints, fontSize)
        setPreviewGlyphs(result.glyphs)
        ttfMetricsRef.current = { lineHeight: result.lineHeight, base: result.base, capHeight: result.capHeight }
      } else {
        if (!fntFile || !pngFile) throw new Error('Missing files')
        // Re-use already-parsed .fnt if available, otherwise parse now
        const parsed = bmfParsedRef.current ?? parseBmfText(await fntFile.text())
        bmfParsedRef.current = parsed

        const pngUrl = URL.createObjectURL(pngFile)
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image()
          el.onload = () => resolve(el)
          el.onerror = () => reject(new Error('Failed to load atlas image'))
          el.src = pngUrl
        })
        URL.revokeObjectURL(pngUrl)

        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        bmfImageDataRef.current = imageData

        const allCodePoints = parsed.chars.map((c) => c.id)
        const filteredCodePoints = filterCodePointsByPreset(importPreset, allCodePoints)
        const filteredSet = new Set(filteredCodePoints)
        const preview = sliceGlyphsFromAtlas(
          imageData, parsed.chars.filter((c) => filteredSet.has(c.id)), 'preview',
        )
        setPreviewGlyphs(preview)
      }
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Processing failed')
    } finally {
      setProcessing(false)
    }
  }, [format, glyphSetId, importPreset, fontSize, fntFile, pngFile, rasterize])

  async function goToPreview() {
    setStep(3)
    await runProcessing()
  }

  // --- Confirm ---

  async function handleConfirm() {
    setConfirming(true)
    try {
      const glyphSet = GLYPH_SETS.find((s) => s.id === glyphSetId) ?? GLYPH_SETS[0]
      const padding = { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft }
      const spacing = { x: spacingX, y: spacingY }

      if (format === 'ttf') {
        if (!ttfBufferRef.current || previewGlyphs.length === 0) return
        const fontId = crypto.randomUUID()
        const filteredCodePoints = filterCodePointsByPreset(importPreset, glyphSet.codePoints)
        const project = createProject(projectName || 'Untitled', {
          sourceFontId: fontId, fontSize, padding, spacing,
          lineHeight,
          base,
          capHeight,
        })
        project.glyphs = filteredCodePoints
        const glyphs: Glyph[] = (previewGlyphs as RasterizedGlyph[]).map((rg) => ({
          codePoint: rg.codePoint, projectId: project.id,
          pixels: rg.pixels, width: rg.width, height: rg.height,
          xoffset: rg.xoffset, yoffset: rg.yoffset, xadvance: rg.xadvance, isDirty: false,
        }))
        await saveFontFile(fontId, ttfBufferRef.current, ttfFile!.name)
        await saveProject(project)
        await saveGlyphs(glyphs)
        setCurrentProject(project)
        setStoreGlyphs(glyphs)
      } else {
        if (!bmfParsedRef.current || !bmfImageDataRef.current) return
        const parsed = bmfParsedRef.current
        const imageData = bmfImageDataRef.current
        const name = projectName.trim() || parsed.info.face || 'Imported Font'
        const project = createProject(name, {
          sourceFontId: null, fontSize, padding, spacing,
          lineHeight,
          base,
          capHeight,
        })
        project.glyphs = glyphSet.codePoints
        const allFntCodePoints = parsed.chars.map((c) => c.id)
        const filteredCodePoints = filterCodePointsByPreset(importPreset, allFntCodePoints)
        const filteredSet = new Set(filteredCodePoints)
        const importedGlyphs = sliceGlyphsFromAtlas(
          imageData, parsed.chars.filter((c) => filteredSet.has(c.id)), project.id,
        )
        const importedSet = new Set(importedGlyphs.map((g) => g.codePoint))
        const blankGlyphs = glyphSet.codePoints
          .filter((cp) => !importedSet.has(cp))
          .map((cp) => makeBlankGlyph(project.id, cp, fontSize, parsed.common.lineHeight))
        const allGlyphs = [...importedGlyphs, ...blankGlyphs]
        await saveProject(project)
        await saveGlyphs(allGlyphs)
        setCurrentProject(project)
        setStoreGlyphs(allGlyphs)
      }

      setView('editor')
      onOpenChange(false)
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setConfirming(false)
    }
  }

  // --- Reset ---

  function handleClose() {
    onOpenChange(false)
    setTimeout(() => {
      setStep(1)
      setFormat(null)
      setTtfFile(null)
      setFntFile(null)
      setPngFile(null)
      setProjectName('')
      setNameError('')
      setImportPreset('all')
      setFontSize(32)
      setLineHeight(Math.round(32 * 1.2))
      setBase(Math.round(32 * 0.8))
      setCapHeight(Math.round(32 * 0.7))
      setAtlasSize(512)
      setGlyphSetId(GLYPH_SETS[0].id)
      setPaddingTop(1); setPaddingRight(1); setPaddingBottom(1); setPaddingLeft(1)
      setSpacingX(1); setSpacingY(1)
      setExpectedAtlasFilename(null)
      setPreviewGlyphs([])
      setProcessError(null)
      ttfBufferRef.current = null
      bmfParsedRef.current = null
      bmfImageDataRef.current = null
    }, 200)
  }

  // --- Derived state ---

  const step1Valid = format === 'ttf' ? !!ttfFile : !!(fntFile && pngFile)

  const stepTitles: Record<Step, string> = {
    1: 'Import Font — Upload',
    2: 'Import Font — Settings',
    3: 'Import Font — Preview',
  }

  const primaryFileName = format === 'ttf' ? ttfFile?.name : fntFile?.name
  const previewSummary = (
    <>
      <span className="text-foreground font-mono">{primaryFileName}</span>{' · '}
      {fontSize}px{' · '}
      {GLYPH_SETS.find((s) => s.id === glyphSetId)?.label}
      {importPreset !== 'all' && <>{' · '}{IMPORT_PRESETS.find((p) => p.id === importPreset)?.label}</>}
      {format === 'ttf' && <>{' · '}{atlasSize}×{atlasSize} atlas</>}
    </>
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="bg-popover z-10 -mx-4 px-4 -mt-4 pt-4 pb-4">
          <DialogTitle>{stepTitles[step]}</DialogTitle>
          <p className="text-muted-foreground text-xs">Step {step} of 3</p>
        </DialogHeader>

        {step === 1 && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-2 pb-4">
            {format === 'bmf' ? (
              <div className="flex items-stretch gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label className="text-xs">Font descriptor</Label>
                  <DropZone label="Drop .fnt file" accept=".fnt" file={fntFile} onFile={handleFntFile} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label className="text-xs">Atlas image</Label>
                  <DropZone
                    label="Drop .png file"
                    accept=".png,.jpg,.webp"
                    file={pngFile}
                    onFile={setPngFile}
                    hint={expectedAtlasFilename ?? undefined}
                  />
                </div>
              </div>
            ) : (
              <DropZone
                label="Drop a font file here"
                accept=".ttf,.otf,.woff,.woff2,.fnt"
                file={ttfFile}
                onFile={handleFirstFile}
                hint="TTF, OTF, WOFF, WOFF2 · or drop a .fnt for BMF import"
              />
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="imp-preset">Glyphs to import</Label>
              <select id="imp-preset"
                className="bg-input border-border text-foreground h-8 rounded-md border px-3 text-sm"
                value={importPreset}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setImportPreset(e.target.value as ImportPreset)}
              >
                {IMPORT_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="imp-name">Font name</Label>
              <Input id="imp-name" value={projectName} placeholder="Untitled"
                className={nameError ? 'border-destructive' : ''}
                onChange={(e) => { setProjectName(e.target.value); if (e.target.value.trim()) setNameError('') }} />
              {nameError && <p className="text-destructive text-xs">{nameError}</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-2 pb-4">
            <div className="grid gap-1.5">
              <Label htmlFor="imp-atlas">Atlas size</Label>
              <select id="imp-atlas"
                className="bg-input border-border text-foreground h-8 rounded-md border px-3 text-sm"
                value={atlasSize}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAtlasSize(Number(e.target.value))}>
                {ATLAS_SIZES.map((s) => <option key={s} value={s}>{s} × {s}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="imp-glyphset">Glyph set</Label>
              <GlyphSetSelect id="imp-glyphset" value={glyphSetId} onChange={setGlyphSetId} />
            </div>
            <FontMetricsFields
              fontSize={fontSize} lineHeight={lineHeight} base={base} capHeight={capHeight}
              onFontSizeChange={setFontSize} onLineHeightChange={setLineHeight} onBaseChange={setBase} onCapHeightChange={setCapHeight}
            />
            <PaddingFields
              top={paddingTop} right={paddingRight} bottom={paddingBottom} left={paddingLeft}
              onTopChange={setPaddingTop} onRightChange={setPaddingRight}
              onBottomChange={setPaddingBottom} onLeftChange={setPaddingLeft}
            />
            <SpacingFields x={spacingX} y={spacingY} onXChange={setSpacingX} onYChange={setSpacingY} />
          </div>
        )}

        {step === 3 && (
          <GlyphPreviewStep
            loading={processing}
            loadingMessage={format === 'ttf' ? 'Rasterising glyphs…' : 'Loading glyphs…'}
            error={processError}
            glyphs={previewGlyphs}
            summary={previewSummary}
          />
        )}

        <WizardFooter
          step={step}
          totalSteps={3}
          onClose={handleClose}
          onBack={() => setStep((s) => (s - 1) as Step)}
          onNext={() => step === 1 ? goToSettings() : goToPreview()}
          onConfirm={handleConfirm}
          nextDisabled={step === 1 && !step1Valid}
          backDisabled={processing || confirming}
          confirmDisabled={processing || previewGlyphs.length === 0 || !!processError || confirming}
          confirming={confirming}
        />
      </DialogContent>
    </Dialog>
  )
}

function closestAtlasSize(w: number): number {
  return ATLAS_SIZES.reduce((prev, cur) => Math.abs(cur - w) < Math.abs(prev - w) ? cur : prev)
}
