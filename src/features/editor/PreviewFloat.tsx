import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store'

interface Props {
  open: boolean
  onClose: () => void
}

const DEFAULT_TEXT = 'Hello World'

export function PreviewFloat({ open, onClose }: Props) {
  const [text, setText] = useState(DEFAULT_TEXT)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const glyphs = useStore((s) => s.glyphs)
  const currentProject = useStore((s) => s.currentProject)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentProject) return

    const { lineHeight, base, spacing } = currentProject.settings
    const glyphMap = new Map(glyphs.map((g) => [g.codePoint, g]))

    const codePoints = [...text].map((ch) => ch.codePointAt(0)!)

    // Compute total width
    let totalWidth = 0
    for (const cp of codePoints) {
      const g = glyphMap.get(cp)
      totalWidth += g ? g.xadvance + spacing.x : Math.round(currentProject.settings.fontSize * 0.5)
    }
    totalWidth = Math.max(totalWidth, 1)

    canvas.width = totalWidth
    canvas.height = lineHeight

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, totalWidth, lineHeight)

    let x = 0
    for (const cp of codePoints) {
      const g = glyphMap.get(cp)
      if (!g || g.width === 0 || g.height === 0) {
        // Placeholder box for missing/blank glyphs
        const advance = g ? g.xadvance : Math.round(currentProject.settings.fontSize * 0.5)
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.strokeRect(x + 0.5, base - currentProject.settings.fontSize * 0.7 + 0.5, advance - 2, currentProject.settings.fontSize * 0.7 - 1)
        x += advance + spacing.x
        continue
      }

      const destX = x + g.xoffset
      const destY = base + g.yoffset

      // Blit glyph pixels row by row
      const imageData = ctx.createImageData(g.width, g.height)
      for (let i = 0; i < g.pixels.length; i++) {
        const v = g.pixels[i]
        imageData.data[i * 4 + 0] = 255
        imageData.data[i * 4 + 1] = 255
        imageData.data[i * 4 + 2] = 255
        imageData.data[i * 4 + 3] = v
      }

      // Use offscreen canvas to blit with putImageData then drawImage (putImageData ignores canvas transforms)
      const offscreen = document.createElement('canvas')
      offscreen.width = g.width
      offscreen.height = g.height
      offscreen.getContext('2d')!.putImageData(imageData, 0, 0)
      ctx.drawImage(offscreen, destX, destY)

      x += g.xadvance + spacing.x
    }
  }, [text, glyphs, currentProject])

  return (
    <div
      className={`fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-border/50 bg-popover shadow-lg transition-opacity ${
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      style={{ width: 480 }}
    >
      <div className="flex h-8 items-center justify-between border-b border-border/50 px-3">
        <span className="text-xs font-medium">Preview</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex flex-col gap-3 p-3">
        <Input
          className="h-7 text-xs"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type preview text…"
        />
        <div className="bg-muted flex items-center justify-center overflow-hidden rounded border border-border/50 p-2">
          {currentProject ? (
            <canvas
              ref={canvasRef}
              style={{ imageRendering: 'pixelated', maxWidth: '100%', height: 'auto', display: 'block' }}
            />
          ) : (
            <span className="text-muted-foreground text-xs">No project open.</span>
          )}
        </div>
      </div>
    </div>
  )
}
