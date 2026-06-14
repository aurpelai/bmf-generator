import { useRef, useEffect, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'

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
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</>
            : 'Import'}
        </Button>
      )}
    </DialogFooter>
  )
}
