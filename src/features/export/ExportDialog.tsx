import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Clipboard, Download, FileJson, Loader2 } from 'lucide-react'
import { zipSync, strToU8 } from 'fflate'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { serializeBmfText } from '@/core/bmf'
import { exportPortableProject } from '@/core/project'
import type { BmfGlyphData } from '@/core/bmf'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function atlasImageDataToPngBlob(imageData: ImageData): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  canvas.getContext('2d')!.putImageData(imageData, 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to encode atlas as PNG'))
    }, 'image/png')
  })
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'font'
}

export function ExportDialog({ open, onOpenChange }: Props) {
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentProject = useStore((s) => s.currentProject)
  const glyphs = useStore((s) => s.glyphs)
  const atlasPlacements = useStore((s) => s.atlasPlacements)
  const addToast = useStore((s) => s.addToast)
  const atlasImageData = useStore((s) => s.atlasImageData)
  const atlasWidth = useStore((s) => s.atlasWidth)
  const atlasHeight = useStore((s) => s.atlasHeight)
  const exportSelection = useStore((s) => s.exportSelection)

  const baseName = currentProject ? safeName(currentProject.name) : 'font'
  const atlasFilename = `${baseName}.png`

  // Only include placements that are in the current selection
  const selectedPlacements = exportSelection === null
    ? atlasPlacements
    : atlasPlacements.filter((p) => exportSelection.has(p.codePoint))

  const fntText = useMemo(() => currentProject && selectedPlacements.length > 0
    ? serializeBmfText({
        project: currentProject,
        glyphs: selectedPlacements.map((p): BmfGlyphData => {
          const g = glyphs.find((g) => g.codePoint === p.codePoint)
          return {
            placement: p,
            glyph: {
              codePoint: p.codePoint,
              xoffset: (g?.xoffset ?? 0) + p.trimX,
              yoffset: (g?.yoffset ?? 0) + p.trimY,
              xadvance: g?.xadvance ?? p.width,
            },
          }
        }),
        atlasWidth,
        atlasHeight,
        atlasFilename,
      })
    : '', [currentProject, selectedPlacements, glyphs, atlasWidth, atlasHeight, atlasFilename])

  // Scroll textarea to top when content changes
  useEffect(() => {
    if (textareaRef.current) textareaRef.current.scrollTop = 0
  }, [fntText])

  async function handleCopy() {
    if (!fntText) return
    setCopying(true)
    try {
      await navigator.clipboard.writeText(fntText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } finally {
      setCopying(false)
    }
  }

  async function handleExportZip() {
    if (!atlasImageData || !fntText) return
    setExporting(true)
    try {
      const pngBlob = await atlasImageDataToPngBlob(atlasImageData)
      const pngBytes = new Uint8Array(await pngBlob.arrayBuffer())
      const zip = zipSync({
        [`${baseName}.fnt`]: strToU8(fntText),
        [atlasFilename]: pngBytes,
      })
      download(new Blob([zip], { type: 'application/zip' }), `${baseName}.zip`)
      addToast(`Exported ${baseName}.zip`, 'success')
    } catch {
      addToast('Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }

  function handleExportJson() {
    if (!currentProject) return
    const json = exportPortableProject(currentProject, glyphs)
    download(new Blob([json], { type: 'application/json' }), `${baseName}.bmffont.json`)
    addToast(`Exported ${baseName}.bmffont.json`, 'success')
  }

  const canExport = !!atlasImageData && !!fntText

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export — {currentProject?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {/* .fnt preview */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">{baseName}.fnt</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleCopy}
              disabled={!fntText || copying}
            >
              {copied
                ? <><Check className="h-3 w-3" />Copied</>
                : <><Clipboard className="h-3 w-3" />Copy</>}
            </Button>
          </div>
          <textarea
            ref={textareaRef}
            readOnly
            value={fntText || '(no glyphs packed yet — open the Atlas tab and pack first)'}
            className="bg-muted text-muted-foreground min-h-0 flex-1 resize-none rounded-md border border-border/50 p-3 font-mono text-xs leading-relaxed outline-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-muted-foreground text-xs">
            {selectedPlacements.length} glyphs · {atlasWidth}×{atlasHeight} atlas
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={handleExportJson} disabled={!currentProject}>
              <FileJson className="mr-1.5 h-3.5 w-3.5" />
              Save font file
            </Button>
            <Button onClick={handleExportZip} disabled={!canExport || exporting}>
              {exporting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Exporting…</>
                : <><Download className="mr-2 h-4 w-4" />Download .zip</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
