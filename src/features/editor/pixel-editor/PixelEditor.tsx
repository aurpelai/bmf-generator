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
    if (!canvas || !g || g.width === 0 || g.height === 0) return

    const zoom = stateRef.current.zoomLevel
    const grid = stateRef.current.showGrid
    canvas.width = g.width * zoom
    canvas.height = g.height * zoom
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Pixels
    for (let y = 0; y < g.height; y++) {
      for (let x = 0; x < g.width; x++) {
        const v = g.pixels[y * g.width + x]
        if (v > 0) {
          const alpha = v / 255
          ctx.fillStyle = `rgba(255,255,255,${alpha})`
          ctx.fillRect(x * zoom, y * zoom, zoom, zoom)
        }
      }
    }

    // Guide lines: baseline and cap-height
    if (project) {
      const { base } = project.settings
      // baseline: pixels below top of cell = base + yoffset
      const baselineY = (g.yoffset + base) * zoom
      // cap-height: approximate at ~70% of fontSize above baseline
      const capHeight = Math.round(project.settings.fontSize * 0.7)
      const capY = baselineY - capHeight * zoom

      ctx.save()
      // Baseline — amber
      if (baselineY >= 0 && baselineY <= canvas.height) {
        ctx.strokeStyle = 'rgba(251,191,36,0.5)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(0, baselineY + 0.5)
        ctx.lineTo(canvas.width, baselineY + 0.5)
        ctx.stroke()
      }
      // Cap-height — cyan
      if (capY >= 0 && capY <= canvas.height) {
        ctx.strokeStyle = 'rgba(34,211,238,0.4)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(0, capY + 0.5)
        ctx.lineTo(canvas.width, capY + 0.5)
        ctx.stroke()
      }
      ctx.restore()
    }

    // Grid overlay
    if (grid && zoom >= 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1
      ctx.setLineDash([])
      for (let x = 0; x <= g.width; x++) {
        ctx.beginPath()
        ctx.moveTo(x * zoom + 0.5, 0)
        ctx.lineTo(x * zoom + 0.5, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y <= g.height; y++) {
        ctx.beginPath()
        ctx.moveTo(0, y * zoom + 0.5)
        ctx.lineTo(canvas.width, y * zoom + 0.5)
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
    if (!canvas || !g) return -1
    const rect = canvas.getBoundingClientRect()
    const zoom = stateRef.current.zoomLevel
    const px = Math.floor((e.clientX - rect.left) / zoom)
    const py = Math.floor((e.clientY - rect.top) / zoom)
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

  if (!glyph) {
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
      <canvas
        ref={canvasRef}
        style={{ imageRendering: 'pixelated', cursor: activeTool === 'eraser' ? 'cell' : 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </div>
  )
}
