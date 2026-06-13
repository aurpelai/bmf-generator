import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GLYPH_SETS } from '@/core/project/glyphSets'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 1 | 2 | 3

const ATLAS_SIZES = [256, 512, 1024, 2048]

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(f: File) {
    setFile(f)
    setFontName(f.name.replace(/\.[^.]+$/, ''))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  function handleClose() {
    onOpenChange(false)
    setTimeout(() => {
      setStep(1)
      setFile(null)
      setFontName('')
    }, 200)
  }

  const stepTitles: Record<Step, string> = {
    1: 'Import font — Upload',
    2: 'Import font — Size & glyphs',
    3: 'Import font — Preview',
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
                <Input
                  id="wi-fontname"
                  value={fontName}
                  onChange={(e) => setFontName(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="wi-fontsize">Font size (px)</Label>
                <Input
                  id="wi-fontsize"
                  type="number"
                  min={4}
                  max={256}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="wi-atlas">Atlas size</Label>
                <select
                  id="wi-atlas"
                  className="bg-input border-border text-foreground h-9 rounded-md border px-3 text-sm"
                  value={atlasSize}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAtlasSize(Number(e.target.value))}
                >
                  {ATLAS_SIZES.map((s) => (
                    <option key={s} value={s}>{s} × {s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="wi-glyphset">Glyph set</Label>
              <select
                id="wi-glyphset"
                className="bg-input border-border text-foreground h-9 rounded-md border px-3 text-sm"
                value={glyphSetId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGlyphSetId(e.target.value)}
              >
                {GLYPH_SETS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
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
            <div className="text-muted-foreground bg-muted flex h-40 items-center justify-center rounded-md text-sm">
              Glyph preview will appear here after rasterisation is implemented (Phase 3).
            </div>
            <p className="text-muted-foreground text-xs">
              Font: <span className="text-foreground font-mono">{file?.name}</span> ·{' '}
              {fontSize}px ·{' '}
              {GLYPH_SETS.find((s) => s.id === glyphSetId)?.label} ·{' '}
              {atlasSize}×{atlasSize} atlas
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as Step)}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={step === 1 && !file}
            >
              Next
            </Button>
          ) : (
            <Button disabled>
              Import (coming in Phase 3)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
