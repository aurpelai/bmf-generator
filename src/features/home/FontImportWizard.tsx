import { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { GLYPH_SETS } from '@/core/project/glyphSets'
import { createProject } from '@/core/project'
import { saveProject } from '@/db/projects'
import { saveFontFile, saveGlyphs } from '@/db/glyphs'
import { useRasterize } from '@/hooks/useRasterize'
import { useStore } from '@/store'
import type { Glyph } from '@/core/project/types'
import type { RasterizedGlyph } from '@/core/font/rasterize'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 1 | 2 | 3

const ATLAS_SIZES = [256, 512, 1024, 2048]

function GlyphThumbnail({ glyph }: { glyph: RasterizedGlyph }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || glyph.width === 0 || glyph.height === 0) return
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.createImageData(glyph.width, glyph.height)
    for (let i = 0; i < glyph.pixels.length; i++) {
      const v = glyph.pixels[i]
      imageData.data[i * 4 + 0] = v
      imageData.data[i * 4 + 1] = v
      imageData.data[i * 4 + 2] = v
      imageData.data[i * 4 + 3] = v
    }
    ctx.putImageData(imageData, 0, 0)
  }, [glyph])

  if (glyph.width === 0 || glyph.height === 0) {
    return <div className="bg-muted flex h-8 w-8 items-center justify-center rounded text-xs opacity-30">·</div>
  }

  return (
    <div className="bg-muted flex h-8 w-8 items-center justify-center overflow-hidden rounded">
      <canvas
        ref={canvasRef}
        width={glyph.width}
        height={glyph.height}
        style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  )
}

export function FontImportWizard({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [file, setFile] = useState<File | null>(null)
  const [fontName, setFontName] = useState('')
  const [fontSize, setFontSize] = useState(32)
  const [glyphSetId, setGlyphSetId] = useState(GLYPH_SETS[0].id)
  const [paddingVal, setPaddingVal] = useState(1)
  const [spacingX, setSpacingX] = useState(1)
  const [spacingY, setSpacingY] = useState(1)
  const [atlasSize, setAtlasSize] = useState(512)
  const [dragging, setDragging] = useState(false)
  const [rasterizing, setRasterizing] = useState(false)
  const [rasterizedGlyphs, setRasterizedGlyphs] = useState<RasterizedGlyph[]>([])
  const [rasterizeError, setRasterizeError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const fontBufferRef = useRef<ArrayBuffer | null>(null)
  const fontMetricsRef = useRef({ lineHeight: 0, base: 0, capHeight: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { rasterize } = useRasterize()
  const setCurrentProject = useStore((s) => s.setCurrentProject)
  const setGlyphs = useStore((s) => s.setGlyphs)
  const setView = useStore((s) => s.setView)

  function handleFileSelect(f: File) {
    setFile(f)
    setFontName(f.name.replace(/\.[^.]+$/, ''))
    const reader = new FileReader()
    reader.onload = (e) => { fontBufferRef.current = e.target?.result as ArrayBuffer }
    reader.readAsArrayBuffer(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  const runRasterization = useCallback(async () => {
    if (!fontBufferRef.current) return
    const glyphSet = GLYPH_SETS.find((s) => s.id === glyphSetId) ?? GLYPH_SETS[0]
    setRasterizing(true)
    setRasterizeError(null)
    try {
      // Transfer a copy so the original buffer stays available for saving
      const bufferCopy = fontBufferRef.current.slice(0)
      const result = await rasterize(bufferCopy, glyphSet.codePoints, fontSize)
      setRasterizedGlyphs(result.glyphs)
      fontMetricsRef.current = { lineHeight: result.lineHeight, base: result.base, capHeight: result.capHeight }
    } catch (err) {
      setRasterizeError(err instanceof Error ? err.message : 'Rasterisation failed')
    } finally {
      setRasterizing(false)
    }
  }, [glyphSetId, fontSize, rasterize])

  async function goToPreview() {
    setStep(3)
    await runRasterization()
  }

  async function handleConfirm() {
    if (!fontBufferRef.current || rasterizedGlyphs.length === 0) return
    setConfirming(true)
    try {
      const glyphSet = GLYPH_SETS.find((s) => s.id === glyphSetId) ?? GLYPH_SETS[0]
      const fontId = crypto.randomUUID()

      const project = createProject(fontName || 'Untitled', {
        sourceFontId: fontId,
        fontSize,
        padding: { top: paddingVal, right: paddingVal, bottom: paddingVal, left: paddingVal },
        spacing: { x: spacingX, y: spacingY },
        lineHeight: fontMetricsRef.current.lineHeight || Math.round(fontSize * 1.2),
        base: fontMetricsRef.current.base || Math.round(fontSize * 0.8),
        capHeight: fontMetricsRef.current.capHeight || Math.round(fontSize * 0.7),
      })
      project.glyphs = glyphSet.codePoints

      const glyphs: Glyph[] = rasterizedGlyphs.map((rg) => ({
        codePoint: rg.codePoint,
        projectId: project.id,
        pixels: rg.pixels,
        width: rg.width,
        height: rg.height,
        xoffset: rg.xoffset,
        yoffset: rg.yoffset,
        xadvance: rg.xadvance,
        isDirty: false,
      }))

      await saveFontFile(fontId, fontBufferRef.current, file!.name)
      await saveProject(project)
      await saveGlyphs(glyphs)

      setCurrentProject(project)
      setGlyphs(glyphs)
      setView('editor')
      onOpenChange(false)
    } catch (err) {
      setRasterizeError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setConfirming(false)
    }
  }

  function handleClose() {
    onOpenChange(false)
    setTimeout(() => {
      setStep(1)
      setFile(null)
      setFontName('')
      setRasterizedGlyphs([])
      setRasterizeError(null)
      fontBufferRef.current = null
    }, 200)
  }

  const stepTitles: Record<Step, string> = {
    1: 'Import TTF/OTF — Upload',
    2: 'Import TTF/OTF — Size & glyphs',
    3: 'Import TTF/OTF — Preview',
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{stepTitles[step]}</DialogTitle>
          <p className="text-muted-foreground text-xs">Step {step} of 3</p>
        </DialogHeader>

        {step === 1 && (
          <div className="grid gap-4 py-2">
            <div
              className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-10 text-sm transition-colors ${
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <span className="text-foreground font-medium">{file.name}</span>
              ) : (
                <>
                  <span className="text-muted-foreground">Drop a font file here</span>
                  <span className="text-muted-foreground mt-1 text-xs">TTF, OTF, WOFF, WOFF2</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
              />
            </div>
            {file && (
              <div className="grid gap-1.5">
                <Label htmlFor="wi-fontname">Project name</Label>
                <Input id="wi-fontname" value={fontName} onChange={(e) => setFontName(e.target.value)} />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="wi-fontsize">Font size (px)</Label>
                <Input id="wi-fontsize" type="number" min={4} max={256} value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="wi-atlas">Atlas size</Label>
                <select id="wi-atlas"
                  className="bg-input border-border text-foreground h-9 rounded-md border px-3 text-sm"
                  value={atlasSize}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAtlasSize(Number(e.target.value))}>
                  {ATLAS_SIZES.map((s) => <option key={s} value={s}>{s} × {s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wi-glyphset">Glyph set</Label>
              <select id="wi-glyphset"
                className="bg-input border-border text-foreground h-9 rounded-md border px-3 text-sm"
                value={glyphSetId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGlyphSetId(e.target.value)}>
                {GLYPH_SETS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="wi-padding">Padding</Label>
                <Input id="wi-padding" type="number" min={0} max={16} value={paddingVal}
                  onChange={(e) => setPaddingVal(Number(e.target.value))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="wi-spacingx">Spacing X</Label>
                <Input id="wi-spacingx" type="number" min={0} max={16} value={spacingX}
                  onChange={(e) => setSpacingX(Number(e.target.value))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="wi-spacingy">Spacing Y</Label>
                <Input id="wi-spacingy" type="number" min={0} max={16} value={spacingY}
                  onChange={(e) => setSpacingY(Number(e.target.value))} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 py-2">
            {rasterizing ? (
              <div className="text-muted-foreground flex h-40 items-center justify-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Rasterising glyphs…
              </div>
            ) : rasterizeError ? (
              <div className="text-destructive flex h-40 items-center justify-center text-sm">
                {rasterizeError}
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {rasterizedGlyphs.map((g) => (
                    <GlyphThumbnail key={g.codePoint} glyph={g} />
                  ))}
                </div>
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              <span className="text-foreground font-mono">{file?.name}</span>{' · '}
              {fontSize}px{' · '}
              {GLYPH_SETS.find((s) => s.id === glyphSetId)?.label}{' · '}
              {atlasSize}×{atlasSize} atlas
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as Step)}
              disabled={rasterizing || confirming}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => step === 2 ? goToPreview() : setStep((s) => (s + 1) as Step)}
              disabled={step === 1 && !file}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={rasterizing || rasterizedGlyphs.length === 0 || !!rasterizeError || confirming}
            >
              {confirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</> : 'Import'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
