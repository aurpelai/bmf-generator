import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseBmfText } from '@/core/bmf/parse'
import { createProject } from '@/core/project'
import { saveProject, saveGlyphs } from '@/db'
import { useStore } from '@/store'
import type { Glyph } from '@/core/project/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DropZone({
  label,
  accept,
  file,
  onFile,
}: {
  label: string
  accept: string
  file: File | null
  onFile: (f: File) => void
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-5 text-sm transition-colors ${
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
        : <span className="text-muted-foreground">{label}</span>}
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

function sliceGlyphsFromAtlas(
  imageData: ImageData,
  chars: Array<{ id: number; x: number; y: number; width: number; height: number; xoffset: number; yoffset: number; xadvance: number }>,
  projectId: string,
): Glyph[] {
  const { data, width: atlasW } = imageData
  return chars.map((c) => {
    if (c.width === 0 || c.height === 0) {
      return {
        codePoint: c.id,
        projectId,
        pixels: new Uint8Array(0),
        width: 0,
        height: 0,
        xoffset: c.xoffset,
        yoffset: c.yoffset,
        xadvance: c.xadvance,
        isDirty: false,
      }
    }
    const pixels = new Uint8Array(c.width * c.height)
    for (let row = 0; row < c.height; row++) {
      for (let col = 0; col < c.width; col++) {
        const atlasIdx = ((c.y + row) * atlasW + (c.x + col)) * 4
        // Use alpha channel — BMF atlases typically store coverage in alpha
        // Fall back to red channel for fully opaque white-on-black atlases
        const alpha = data[atlasIdx + 3]
        const red = data[atlasIdx]
        pixels[row * c.width + col] = alpha > 0 ? alpha : red
      }
    }
    return {
      codePoint: c.id,
      projectId,
      pixels,
      width: c.width,
      height: c.height,
      xoffset: c.xoffset,
      yoffset: c.yoffset,
      xadvance: c.xadvance,
      isDirty: false,
    }
  })
}

export function BmfImportDialog({ open, onOpenChange }: Props) {
  const [fntFile, setFntFile] = useState<File | null>(null)
  const [pngFile, setPngFile] = useState<File | null>(null)
  const [projectName, setProjectName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const setCurrentProject = useStore((s) => s.setCurrentProject)
  const setGlyphs = useStore((s) => s.setGlyphs)
  const setView = useStore((s) => s.setView)

  function handleFntFile(f: File) {
    setFntFile(f)
    setError(null)
    if (!projectName) setProjectName(f.name.replace(/\.fnt$/i, ''))
  }

  async function handleImport() {
    if (!fntFile || !pngFile) return
    setError(null)
    setImporting(true)
    try {
      // Parse .fnt
      const fntText = await fntFile.text()
      const parsed = parseBmfText(fntText)

      // Load atlas PNG into ImageData via a canvas
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

      // Build project
      const name = projectName.trim() || parsed.info.face || 'Imported Font'
      const project = createProject(name, {
        sourceFontId: null,
        fontSize: parsed.info.size,
        padding: parsed.info.padding,
        spacing: parsed.info.spacing,
        lineHeight: parsed.common.lineHeight,
        base: parsed.common.base,
      })
      project.glyphs = parsed.chars.map((c) => c.id)

      // Slice glyph pixels from atlas
      const glyphs = sliceGlyphsFromAtlas(imageData, parsed.chars, project.id)

      await saveProject(project)
      await saveGlyphs(glyphs)

      setCurrentProject(project)
      setGlyphs(glyphs)
      setView('editor')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  function handleClose() {
    onOpenChange(false)
    setTimeout(() => {
      setFntFile(null)
      setPngFile(null)
      setProjectName('')
      setError(null)
    }, 200)
  }

  const canImport = !!fntFile && !!pngFile && !importing

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Load existing BMF project</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Font descriptor</Label>
              <DropZone label="Drop .fnt file" accept=".fnt" file={fntFile} onFile={handleFntFile} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Atlas image</Label>
              <DropZone label="Drop .png file" accept=".png,.jpg,.webp" file={pngFile} onFile={setPngFile} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="bmf-name" className="text-xs">Project name</Label>
            <Input
              id="bmf-name"
              placeholder="Imported from .fnt face name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-destructive text-xs">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!canImport}>
            {importing ? 'Importing…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
