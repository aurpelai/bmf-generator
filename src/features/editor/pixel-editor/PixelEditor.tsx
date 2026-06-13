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
  const brushSize = useStore((s) => s.brushSize)
  const zoomLevel = useStore((s) => s.zoomLevel)
  const showGrid = useStore((s) => s.showGrid)
  const setZoomLevel = useStore((s) => s.setZoomLevel)
  const setBrushSize = useStore((s) => s.setBrushSize)
  const upsertGlyph = useStore((s) => s.upsertGlyph)
  const pushUndo = useStore((s) => s.pushUndo)
  const addToast = useStore((s) => s.addToast)
  const currentProject = useStore((s) => s.currentProject)

  const autoSaveToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveToastShown = useRef(false)

  const glyph = glyphs.find((g) => g.codePoint === selectedCodePoint) ?? null

  const stateRef = useRef({
    glyph, activeTool, brushSize, zoomLevel, showGrid,
    isDrawing: false, lastPixel: -1,
    cursorCell: null as { col: number; row: number } | null,
    moveOrigin: null as { x: number; y: number; xoffset: number; yoffset: number } | null,
    moveDelta: { dx: 0, dy: 0 },
    shiftWheelAccum: 0,
  })
  stateRef.current.glyph = glyph
  stateRef.current.activeTool = activeTool
  stateRef.current.brushSize = brushSize
  stateRef.current.zoomLevel = zoomLevel
  stateRef.current.showGrid = showGrid

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const g = stateRef.current.glyph
    const project = currentProject
    if (!canvas || !project) return

    const zoom = stateRef.current.zoomLevel
    const grid = stateRef.current.showGrid
    const { fontSize, lineHeight, base, capHeight } = project.settings

    // During a move drag the store is not updated — offsets live only in stateRef.
    // layoutXoffset/Y use the original offsets so the grid stays fixed.
    // renderXoffset/Y apply the current drag delta for pixel rendering only.
    const origin = stateRef.current.moveOrigin
    const { dx, dy } = stateRef.current.moveDelta
    const layoutXoffset = g?.xoffset ?? 0
    const layoutYoffset = g?.yoffset ?? 0
    const renderXoffset = origin ? origin.xoffset + dx : layoutXoffset
    const renderYoffset = origin ? origin.yoffset + dy : layoutYoffset

    const LABEL_GUTTER_PX = 36
    const glyphRight = g ? Math.max(layoutXoffset + g.width, renderXoffset + g.width) : 0
    const glyphBottom = g ? Math.max(layoutYoffset + g.height, renderYoffset + g.height) : 0
    const originX = Math.min(0, layoutXoffset, renderXoffset)
    const originY = Math.min(0, layoutYoffset, renderYoffset)
    const canvasCols = Math.max(fontSize, glyphRight) - originX
    const canvasRows = Math.max(lineHeight, glyphBottom) - originY

    canvas.width = canvasCols * zoom + LABEL_GUTTER_PX
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
          const cx = (renderXoffset + px - originX) * zoom
          const cy = (renderYoffset + py - originY) * zoom
          const inCell =
            renderXoffset + px >= 0 && renderXoffset + px < fontSize &&
            renderYoffset + py >= 0 && renderYoffset + py < lineHeight
          const alpha = (v / 255) * (inCell ? 1 : 0.35)
          ctx.fillStyle = `rgba(255,255,255,${alpha})`
          ctx.fillRect(cx, cy, zoom, zoom)
        }
      }
    }

    // Guide lines: baseline and cap-height
    {
      const baselineY = (base - originY) * zoom
      const capY = Math.max(0, baselineY - capHeight * zoom)
      const labelSize = Math.max(8, Math.min(11, zoom * 1.5))

      const cellRight = cellX + fontSize * zoom
      const gutterX = cellRight + 10

      ctx.save()
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      // Baseline — amber, clipped to cell width
      ctx.strokeStyle = 'rgba(251,191,36,0.5)'
      ctx.beginPath()
      ctx.moveTo(cellX, baselineY + 0.5)
      ctx.lineTo(cellRight, baselineY + 0.5)
      ctx.stroke()
      // Cap-height — cyan, clipped to cell width
      ctx.strokeStyle = 'rgba(34,211,238,0.4)'
      ctx.beginPath()
      ctx.moveTo(cellX, capY + 0.5)
      ctx.lineTo(cellRight, capY + 0.5)
      ctx.stroke()
      // Labels in the gutter, vertically centred on the line
      ctx.setLineDash([])
      ctx.font = `${labelSize}px monospace`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(251,191,36,0.7)'
      ctx.fillText('base', gutterX, baselineY + 0.5)
      ctx.fillStyle = 'rgba(34,211,238,0.6)'
      ctx.fillText('cap', gutterX, capY + 0.5)
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

    // Brush highlight — border outline of the brush footprint at the cursor
    const cursor = stateRef.current.cursorCell
    const tool = stateRef.current.activeTool
    const size = stateRef.current.brushSize
    if (cursor && g && (tool === 'pencil' || tool === 'eraser')) {
      const half = Math.floor(size / 2)
      const bx = (cursor.col - half - originX) * zoom + 0.5
      const by = (cursor.row - half - originY) * zoom + 0.5
      const bw = size * zoom - 1
      ctx.save()
      ctx.lineWidth = 1
      ctx.setLineDash([])
      ctx.strokeStyle = tool === 'pencil'
        ? 'oklch(0.45 0.09 196)'
        : 'oklch(0.45 0.12 20)'
      ctx.strokeRect(bx, by, bw, bw)
      ctx.restore()
    }
  }, [currentProject])

  useEffect(() => {
    drawCanvas()
  }, [glyph, zoomLevel, showGrid, drawCanvas])

  function cellFromEvent(e: React.PointerEvent): { col: number; row: number } | null {
    const canvas = canvasRef.current
    const g = stateRef.current.glyph
    if (!canvas || !g) return null
    const rect = canvas.getBoundingClientRect()
    const zoom = stateRef.current.zoomLevel
    const originX = Math.min(0, g.xoffset)
    const originY = Math.min(0, g.yoffset)
    return {
      col: Math.floor((e.clientX - rect.left) / zoom) + originX,
      row: Math.floor((e.clientY - rect.top) / zoom) + originY,
    }
  }

  function applyPaint(cell: { col: number; row: number } | null) {
    const g = stateRef.current.glyph
    if (!g || !cell) return
    const tool = stateRef.current.activeTool
    const size = stateRef.current.brushSize
    const half = Math.floor(size / 2)
    const newPixels = new Uint8Array(g.pixels)
    let changed = false
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const px = cell.col - half + dx - g.xoffset
        const py = cell.row - half + dy - g.yoffset
        if (px < 0 || py < 0 || px >= g.width || py >= g.height) continue
        const idx = py * g.width + px
        const val = tool === 'pencil' ? 255 : 0
        if (newPixels[idx] !== val) { newPixels[idx] = val; changed = true }
      }
    }
    if (!changed) return
    const updated: Glyph = { ...g, pixels: newPixels, isDirty: true }
    upsertGlyph(updated)
    saveGlyphs([updated])
    drawCanvas()
  }

  function onPointerDown(e: React.PointerEvent) {
    const g = stateRef.current.glyph
    if (!g) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pushUndo(g.codePoint, { pixels: new Uint8Array(g.pixels), xoffset: g.xoffset, yoffset: g.yoffset })
    stateRef.current.isDrawing = true
    stateRef.current.lastPixel = -1
    if (stateRef.current.activeTool === 'move') {
      stateRef.current.moveOrigin = { x: e.clientX, y: e.clientY, xoffset: g.xoffset, yoffset: g.yoffset };
      (e.currentTarget as HTMLCanvasElement).style.cursor = 'grabbing'
    } else {
      stateRef.current.moveOrigin = null
      applyPaint(cellFromEvent(e))
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (stateRef.current.activeTool === 'move') {
      if (!stateRef.current.isDrawing) return
      const origin = stateRef.current.moveOrigin
      if (!origin) return
      const zoom = stateRef.current.zoomLevel
      stateRef.current.moveDelta = {
        dx: Math.round((e.clientX - origin.x) / zoom),
        dy: Math.round((e.clientY - origin.y) / zoom),
      }
      drawCanvas()
    } else {
      // Always update cursor cell for highlight, paint only while drawing
      const cell = cellFromEvent(e)
      stateRef.current.cursorCell = cell
      if (stateRef.current.isDrawing) applyPaint(cell)
      drawCanvas()
    }
  }

  function onPointerLeave() {
    stateRef.current.cursorCell = null
    drawCanvas()
  }

  function onPointerUp(e: React.PointerEvent) {
    const g = stateRef.current.glyph
    let didSave = false
    if (stateRef.current.activeTool === 'move' && g && stateRef.current.moveOrigin) {
      const { xoffset, yoffset } = stateRef.current.moveOrigin
      const { dx, dy } = stateRef.current.moveDelta
      if (dx !== 0 || dy !== 0) {
        const updated: Glyph = { ...g, xoffset: xoffset + dx, yoffset: yoffset + dy, isDirty: true }
        upsertGlyph(updated)
        saveGlyphs([updated])
        didSave = true
      }
      ;(e.currentTarget as HTMLCanvasElement).style.cursor = 'grab'
    } else if (stateRef.current.isDrawing) {
      didSave = true
    }
    if (didSave && !autoSaveToastShown.current) {
      if (autoSaveToastTimer.current) clearTimeout(autoSaveToastTimer.current)
      autoSaveToastTimer.current = setTimeout(() => {
        addToast('Auto-saved')
        autoSaveToastShown.current = true
        setTimeout(() => { autoSaveToastShown.current = false }, 3000)
      }, 800)
    }
    stateRef.current.isDrawing = false
    stateRef.current.lastPixel = -1
    stateRef.current.moveOrigin = null
    stateRef.current.moveDelta = { dx: 0, dy: 0 }
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    if (e.shiftKey) {
      stateRef.current.shiftWheelAccum += e.deltaY
      const threshold = 50
      if (Math.abs(stateRef.current.shiftWheelAccum) >= threshold) {
        const step = stateRef.current.shiftWheelAccum < 0 ? 1 : -1
        setBrushSize(stateRef.current.brushSize + step)
        stateRef.current.shiftWheelAccum = 0
      }
    } else {
      const delta = e.deltaY < 0 ? 1 : -1
      setZoomLevel(clamp(zoomLevel + delta, MIN_ZOOM, MAX_ZOOM))
    }
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
          role="img"
          aria-label={`Pixel editor — ${activeTool} tool`}
          style={{ imageRendering: 'pixelated', cursor: activeTool === 'move' ? 'grab' : activeTool === 'eraser' ? 'cell' : 'crosshair' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onPointerUp={onPointerUp}
        />
      )}
    </div>
  )
}
