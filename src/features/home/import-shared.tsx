import { useRef, useEffect, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GLYPH_SETS } from '@/core/project/glyphSets'

// Minimal shape needed by GlyphThumbnail — satisfied by both Glyph and RasterizedGlyph
export interface GlyphPreviewData {
  codePoint: number
  pixels: Uint8Array
  width: number
  height: number
}

export function GlyphThumbnail({ glyph }: { glyph: GlyphPreviewData }) {
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

export function DropZone({
  label,
  accept,
  file,
  onFile,
  hint,
}: {
  label: string
  accept: string
  file: File | null
  onFile: (f: File) => void
  hint?: string
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={`flex h-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-5 text-sm transition-colors ${
        dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="text-muted-foreground h-4 w-4" />
      {file
        ? <span className="text-foreground font-medium truncate max-w-full px-2">{file.name}</span>
        : (
          <>
            <span className="text-muted-foreground">{label}</span>
            {hint && <span className="text-muted-foreground mt-1 text-xs">{hint}</span>}
          </>
        )}
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

export function GlyphPreviewStep({
  loading,
  loadingMessage,
  error,
  glyphs,
  summary,
}: {
  loading: boolean
  loadingMessage: string
  error: string | null
  glyphs: GlyphPreviewData[]
  summary: React.ReactNode
}) {
  return (
    <div className="grid gap-4 py-2">
      {loading ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingMessage}
        </div>
      ) : error ? (
        <div className="text-destructive flex h-40 items-center justify-center text-sm">
          {error}
        </div>
      ) : (
        <div className="max-h-52 overflow-y-auto">
          <div className="flex flex-wrap gap-1">
            {glyphs.map((g) => (
              <GlyphThumbnail key={g.codePoint} glyph={g} />
            ))}
          </div>
        </div>
      )}
      <p className="text-muted-foreground text-xs">{summary}</p>
    </div>
  )
}

export function GlyphSetSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <select
      id={id}
      className="bg-input border-border text-foreground h-8 rounded-md border px-3 text-sm"
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
    >
      <optgroup label="Standard sets">
        {GLYPH_SETS.filter((s) => !s.custom).map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </optgroup>
      <optgroup label="Custom sets">
        {GLYPH_SETS.filter((s) => s.custom).map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </optgroup>
    </select>
  )
}

export function PaddingFields({
  top, right, bottom, left,
  onTopChange, onRightChange, onBottomChange, onLeftChange,
}: {
  top: number; right: number; bottom: number; left: number
  onTopChange: (v: number) => void
  onRightChange: (v: number) => void
  onBottomChange: (v: number) => void
  onLeftChange: (v: number) => void
}) {
  const fields = [
    ['Top', top, onTopChange],
    ['Right', right, onRightChange],
    ['Bottom', bottom, onBottomChange],
    ['Left', left, onLeftChange],
  ] as const

  return (
    <div className="grid gap-1.5">
      <Label>Padding</Label>
      <div className="grid grid-cols-4 gap-2">
        {fields.map(([label, val, set]) => (
          <div key={label} className="grid gap-1">
            <span className="text-muted-foreground text-[10px]">{label}</span>
            <Input type="number" min={0} max={16} value={val}
              onChange={(e) => set(Number(e.target.value))} />
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">Extra transparent pixels around each glyph in the atlas — useful for effects like drop shadows or outlines.</p>
    </div>
  )
}

export function SpacingFields({
  x, y, onXChange, onYChange,
}: {
  x: number; y: number
  onXChange: (v: number) => void
  onYChange: (v: number) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label>Spacing</Label>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <span className="text-muted-foreground text-[10px]">Horizontal</span>
          <Input type="number" min={0} max={16} value={x}
            onChange={(e) => onXChange(Number(e.target.value))} />
        </div>
        <div className="grid gap-1">
          <span className="text-muted-foreground text-[10px]">Vertical</span>
          <Input type="number" min={0} max={16} value={y}
            onChange={(e) => onYChange(Number(e.target.value))} />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">Gap between glyphs when packed into the atlas.</p>
    </div>
  )
}

export function FontMetricsFields({
  fontSize, lineHeight, base, capHeight,
  onFontSizeChange, onLineHeightChange, onBaseChange, onCapHeightChange,
}: {
  fontSize: number; lineHeight: number; base: number; capHeight: number
  onFontSizeChange: (v: number) => void
  onLineHeightChange: (v: number) => void
  onBaseChange: (v: number) => void
  onCapHeightChange: (v: number) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label>Font metrics</Label>
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <div className="grid gap-1">
          <span className="text-muted-foreground text-[10px]">Font size</span>
          <Input type="number" min={4} max={256} value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-1">
            <span className="text-muted-foreground text-[10px]">Line height</span>
            <Input type="number" min={1} value={lineHeight}
              onChange={(e) => onLineHeightChange(Number(e.target.value))} />
          </div>
          <div className="grid gap-1">
            <span className="text-muted-foreground text-[10px]">Baseline</span>
            <Input type="number" min={0} value={base}
              onChange={(e) => onBaseChange(Math.min(Number(e.target.value), lineHeight))} />
          </div>
          <div className="grid gap-1">
            <span className="text-muted-foreground text-[10px]">Cap height</span>
            <Input type="number" min={0} value={capHeight}
              onChange={(e) => onCapHeightChange(Math.min(Number(e.target.value), lineHeight))} />
          </div>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Font size sets the target pixel height. Line height is the total height of one text row. Baseline is where characters sit within the line. Cap height is the height of a capital letter, shown as a guide in the editor.
      </p>
    </div>
  )
}

export function WizardFooter({
  step,
  totalSteps,
  onClose,
  onBack,
  onNext,
  onConfirm,
  nextDisabled,
  backDisabled,
  confirmDisabled,
  confirming,
  confirmLabel = 'Import',
  confirmingLabel = 'Importing…',
}: {
  step: number
  totalSteps: number
  onClose: () => void
  onBack: () => void
  onNext: () => void
  onConfirm: () => void
  nextDisabled?: boolean
  backDisabled?: boolean
  confirmDisabled?: boolean
  confirming?: boolean
  confirmLabel?: string
  confirmingLabel?: string
}) {
  return (
    <DialogFooter className="gap-2">
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      {step > 1 && (
        <Button variant="outline" onClick={onBack} disabled={backDisabled}>
          Back
        </Button>
      )}
      {step < totalSteps ? (
        <Button onClick={onNext} disabled={nextDisabled}>
          Next
        </Button>
      ) : (
        <Button onClick={onConfirm} disabled={confirmDisabled}>
          {confirming
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{confirmingLabel}</>
            : confirmLabel}
        </Button>
      )}
    </DialogFooter>
  )
}
