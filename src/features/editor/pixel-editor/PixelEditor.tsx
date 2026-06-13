import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '@/store'
import { saveGlyphs } from '@/db/glyphs'
import type { Glyph } from '@/core/project/types'

const MIN_ZOOM = 2
const MAX_ZOOM = 32

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function PixelEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const glyphs = useStore((s) => s.glyphs)
  const selectedCodePoint = useStore((s) => s.selectedCodePoint)
  const activeTool = useStore((s) => s.activeTool)
  const zoomLevel = useStore((s) => s.zoomLevel)
  const showGrid = useStore((s) => s.showGrid)
  const setZoomLevel = useStore((s) => s.setZoomLevel)
  const upsertGlyph = useStore((s) => s.upsertGlyph)
  const pushUndo = useStore((s) => s.pushUndo)
  const currentProject = useStore((s) => s.currentProject)

  const glyph = glyphs.find((g) => g.codePoint === selectedCodePoint) ?? null

  const stateRef = useRef({ glyph, activeTool, zoomLevel, showGrid, isDrawing: false, lastPixel: -1 })
  stateRef.current.glyph = glyph
  stateRef.current.activeTool = activeTool
  stateRef.current.zoomLevel = zoomLevel
  stateRef.current.showGrid = showGrid

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const g = stateRef.current.glyph
    const project = currentProject
    if (!canvas || !project) return

    const zoom = stateRef.current.zoomLevel
    const grid = stateRef.current.showGrid
    const { fontSize, lineHeight, base } = project.settings

    // Cell occupies [0, fontSize) × [0, lineHeight) in cell-space.
    // Glyph pixels start at (xoffset, yoffset) in cell-space.
    // originX/Y shift cell-space so all content fits on a positive canvas.
    const glyphRight = g ? g.xoffset + g.width : 0
    const glyphBottom = g ? g.yoffset + g.height : 0
    const originX = Math.min(0, g ? g.xoffset : 0)
    const originY = Math.min(0, g ? g.yoffset : 0)
    const canvasCols = Math.max(fontSize, glyphRight) - originX
    const canvasRows = Math.max(lineHeight, glyphBottom) - originY

    canvas.width = canvasCols * zoom
    canvas.height = canvasRows * zoom
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Cell background — subtle distinction from overflow area
    const cellX = -originX * zoom
    const cellY = -originY * zoom
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    ctx.fillRect(cellX, cellY, fontSize * zoom, lineHeight * zoom)

    // Glyph pixels — dimmed outside the cell
    if (g && g.width > 0 && g.height > 0) {
      for (let py = 0; py < g.height; py++) {
        for (let px = 0; px < g.width; px++) {
          const v = g.pixels[py * g.width + px]
          if (v === 0) continue
          const cx = (g.xoffset + px - originX) * zoom
          const cy = (g.yoffset + py - originY) * zoom
          const inCell =
            g.xoffset + px >= 0 && g.xoffset + px < fontSize &&
            g.yoffset + py >= 0 && g.yoffset + py < lineHeight
          const alpha = (v / 255) * (inCell ? 1 : 0.35)
          ctx.fillStyle = `rgba(255,255,255,${alpha})`
          ctx.fillRect(cx, cy, zoom, zoom)
        }
      }
    }

    // Guide lines: baseline and cap-height
    {
      const baselineY = (base - originY) * zoom
      const capHeight = Math.round(fontSize * 0.7)
      const capY = Math.max(0, baselineY - capHeight * zoom)

      ctx.save()
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      // Baseline — amber
      ctx.strokeStyle = 'rgba(251,191,36,0.5)'
      ctx.beginPath()
      ctx.moveTo(0, baselineY + 0.5)
      ctx.lineTo(canvas.width, baselineY + 0.5)
      ctx.stroke()
      // Cap-height — cyan
      ctx.strokeStyle = 'rgba(34,211,238,0.4)'
      ctx.beginPath()
      ctx.moveTo(0, capY + 0.5)
      ctx.lineTo(canvas.width, capY + 0.5)
      ctx.stroke()
      ctx.restore()
    }

    // Cell boundary
    {
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1
      ctx.setLineDash([])
      ctx.strokeRect(cellX + 0.5, cellY + 0.5, fontSize * zoom - 1, lineHeight * zoom - 1)
      ctx.restore()
    }

    // Grid overlay (cell area only)
    if (grid && zoom >= 4 && g) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1
      ctx.setLineDash([])
      for (let x = 0; x <= fontSize; x++) {
        ctx.beginPath()
        ctx.moveTo(cellX + x * zoom + 0.5, cellY)
        ctx.lineTo(cellX + x * zoom + 0.5, cellY + lineHeight * zoom)
        ctx.stroke()
      }
      for (let y = 0; y <= lineHeight; y++) {
        ctx.beginPath()
        ctx.moveTo(cellX, cellY + y * zoom + 0.5)
        ctx.lineTo(cellX + fontSize * zoom, cellY + y * zoom + 0.5)
        ctx.stroke()
      }
    }
  }, [currentProject])

  useEffect(() => {
    drawCanvas()
  }, [glyph, zoomLevel, showGrid, drawCanvas])

  function pixelIndexFromEvent(e: React.PointerEvent): number {
    const canvas = canvasRef.current
    const g = stateRef.current.glyph
    const project = currentProject
    if (!canvas || !g || !project) return -1
    const rect = canvas.getBoundingClientRect()
    const zoom = stateRef.current.zoomLevel
    // canvas coords → cell-space coords
    const originX = Math.min(0, g.xoffset)
    const originY = Math.min(0, g.yoffset)
    const cellCol = Math.floor((e.clientX - rect.left) / zoom) + originX
    const cellRow = Math.floor((e.clientY - rect.top) / zoom) + originY
    // cell-space → glyph pixel coords
    const px = cellCol - g.xoffset
    const py = cellRow - g.yoffset
    if (px < 0 || py < 0 || px >= g.width || py >= g.height) return -1
    return py * g.width + px
  }

  function applyPaint(idx: number) {
    const g = stateRef.current.glyph
    if (!g || idx < 0 || idx === stateRef.current.lastPixel) return
    stateRef.current.lastPixel = idx
    const tool = stateRef.current.activeTool
    const newPixels = new Uint8Array(g.pixels)
    newPixels[idx] = tool === 'pencil' ? 255 : 0
    const updated: Glyph = { ...g, pixels: newPixels, isDirty: true }
    upsertGlyph(updated)
    saveGlyphs([updated])
    drawCanvas()
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!stateRef.current.glyph) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pushUndo(stateRef.current.glyph.codePoint, new Uint8Array(stateRef.current.glyph.pixels))
    stateRef.current.isDrawing = true
    stateRef.current.lastPixel = -1
    applyPaint(pixelIndexFromEvent(e))
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!stateRef.current.isDrawing) return
    applyPaint(pixelIndexFromEvent(e))
  }

  function onPointerUp() {
    stateRef.current.isDrawing = false
    stateRef.current.lastPixel = -1
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 1 : -1
    setZoomLevel(clamp(zoomLevel + delta, MIN_ZOOM, MAX_ZOOM))
  }

  // No project open at all
  if (!currentProject) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-muted-foreground text-sm">Select a glyph to edit</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 items-center justify-center overflow-auto bg-[#111]"
      onWheel={onWheel}
    >
      {!glyph ? (
        <span className="text-muted-foreground text-sm">Select a glyph to edit</span>
      ) : (
        <canvas
          ref={canvasRef}
          style={{ imageRendering: 'pixelated', cursor: activeTool === 'eraser' ? 'cell' : 'crosshair' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      )}
    </div>
  )
}
