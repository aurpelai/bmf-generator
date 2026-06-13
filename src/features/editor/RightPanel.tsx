import { useEffect, useRef, useState } from 'react'
import { Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store'
import { useAtlas } from '@/hooks/useAtlas'
import { useRasterize } from '@/hooks/useRasterize'
import { getFontFile, saveGlyphs } from '@/db'
import type { Glyph } from '@/core/project/types'

type Tab = 'metrics' | 'atlas'

// Debounce helper
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

function MetricsTab() {
  const glyphs = useStore((s) => s.glyphs)
  const selectedCodePoint = useStore((s) => s.selectedCodePoint)
  const upsertGlyph = useStore((s) => s.upsertGlyph)
  const currentProject = useStore((s) => s.currentProject)
  const { rasterize } = useRasterize()
  const [resetting, setResetting] = useState(false)

  const glyph = glyphs.find((g) => g.codePoint === selectedCodePoint) ?? null

  // Local numeric state so inputs feel responsive
  const [xoffset, setXoffset] = useState(glyph?.xoffset ?? 0)
  const [yoffset, setYoffset] = useState(glyph?.yoffset ?? 0)
  const [xadvance, setXadvance] = useState(glyph?.xadvance ?? 0)

  // Sync local state when selected glyph changes
  useEffect(() => {
    setXoffset(glyph?.xoffset ?? 0)
    setYoffset(glyph?.yoffset ?? 0)
    setXadvance(glyph?.xadvance ?? 0)
  }, [glyph?.codePoint])

  function commitMetric(field: 'xoffset' | 'yoffset' | 'xadvance', value: number) {
    if (!glyph) return
    const updated: Glyph = { ...glyph, [field]: value }
    upsertGlyph(updated)
    saveGlyphs([updated])
  }

  async function handleResetToFont() {
    if (!glyph || !currentProject?.settings.sourceFontId) return
    setResetting(true)
    try {
      const buf = await getFontFile(currentProject.settings.sourceFontId)
      if (!buf) return
      const result = await rasterize(buf, [glyph.codePoint], currentProject.settings.fontSize)
      const rg = result.glyphs[0]
      if (!rg) return
      const updated: Glyph = {
        ...glyph,
        pixels: rg.pixels,
        width: rg.width,
        height: rg.height,
        xoffset: rg.xoffset,
        yoffset: rg.yoffset,
        xadvance: rg.xadvance,
        isDirty: false,
      }
      upsertGlyph(updated)
      await saveGlyphs([updated])
      setXoffset(rg.xoffset)
      setYoffset(rg.yoffset)
      setXadvance(rg.xadvance)
    } finally {
      setResetting(false)
    }
  }

  // In-context preview: render "Ag<char>Ag" at a small size onto a canvas
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || !glyph) return
    const SCALE = 2
    const cellW = glyph.width || (currentProject?.settings.fontSize ?? 16)
    const cellH = glyph.height || (currentProject?.settings.lineHeight ?? 20)
    canvas.width = cellW * SCALE
    canvas.height = cellH * SCALE
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (glyph.width === 0 || glyph.height === 0) return
    // Draw pixels scaled up by SCALE
    for (let y = 0; y < glyph.height; y++) {
      for (let x = 0; x < glyph.width; x++) {
        const v = glyph.pixels[y * glyph.width + x]
        if (v > 0) {
          ctx.fillStyle = `rgba(255,255,255,${v / 255})`
          ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE)
        }
      }
    }
  }, [glyph])

  if (!glyph) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-4 text-xs">
        Select a glyph to edit its metrics.
      </div>
    )
  }

  const hasSourceFont = !!currentProject?.settings.sourceFontId

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-3">
      {/* Glyph identity */}
      <div className="flex items-center gap-2">
        <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-border/40">
          <canvas
            ref={previewCanvasRef}
            style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }}
          />
        </div>
        <div>
          <div className="text-sm font-medium">{String.fromCodePoint(glyph.codePoint)}</div>
          <div className="text-muted-foreground font-mono text-[10px]">
            U+{glyph.codePoint.toString(16).toUpperCase().padStart(4, '0')}
            {glyph.isDirty && <span className="text-amber-400 ml-1">edited</span>}
          </div>
        </div>
      </div>

      {/* Size (read-only) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Width</Label>
          <div className="text-muted-foreground mt-0.5 font-mono text-xs">{glyph.width}px</div>
        </div>
        <div>
          <Label className="text-[10px]">Height</Label>
          <div className="text-muted-foreground mt-0.5 font-mono text-xs">{glyph.height}px</div>
        </div>
      </div>

      {/* Editable metrics */}
      <div className="grid gap-2">
        <div className="grid gap-1">
          <Label htmlFor="rp-xoffset" className="text-[10px]">X Offset</Label>
          <Input
            id="rp-xoffset"
            type="number"
            className="h-7 text-xs"
            value={xoffset}
            onChange={(e) => setXoffset(Number(e.target.value))}
            onBlur={() => commitMetric('xoffset', xoffset)}
            onKeyDown={(e) => e.key === 'Enter' && commitMetric('xoffset', xoffset)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="rp-yoffset" className="text-[10px]">Y Offset</Label>
          <Input
            id="rp-yoffset"
            type="number"
            className="h-7 text-xs"
            value={yoffset}
            onChange={(e) => setYoffset(Number(e.target.value))}
            onBlur={() => commitMetric('yoffset', yoffset)}
            onKeyDown={(e) => e.key === 'Enter' && commitMetric('yoffset', yoffset)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="rp-xadvance" className="text-[10px]">X Advance</Label>
          <Input
            id="rp-xadvance"
            type="number"
            className="h-7 text-xs"
            value={xadvance}
            onChange={(e) => setXadvance(Number(e.target.value))}
            onBlur={() => commitMetric('xadvance', xadvance)}
            onKeyDown={(e) => e.key === 'Enter' && commitMetric('xadvance', xadvance)}
          />
        </div>
      </div>

      {/* Reset to font */}
      {hasSourceFont && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={handleResetToFont}
          disabled={resetting}
        >
          {resetting
            ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Resetting…</>
            : <><RotateCcw className="mr-1.5 h-3 w-3" />Reset to font</>}
        </Button>
      )}
    </div>
  )
}

const PRESETS: Array<{ id: import('@/store').GlyphPreset; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'letters', label: 'Letters' },
  { id: 'letters-digits', label: 'Letters & digits' },
  { id: 'digits', label: 'Digits' },
  { id: 'custom', label: 'Custom' },
]

function AtlasTab() {
  const [packing, setPacking] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const currentProject = useStore((s) => s.currentProject)
  const glyphs = useStore((s) => s.glyphs)
  const atlasImageData = useStore((s) => s.atlasImageData)
  const atlasWidth = useStore((s) => s.atlasWidth)
  const atlasHeight = useStore((s) => s.atlasHeight)
  const atlasEfficiency = useStore((s) => s.atlasEfficiency)
  const setAtlasResult = useStore((s) => s.setAtlasResult)
  const exportSelection = useStore((s) => s.exportSelection)
  const exportPreset = useStore((s) => s.exportPreset)
  const setExportPreset = useStore((s) => s.setExportPreset)
  const toggleExportGlyph = useStore((s) => s.toggleExportGlyph)

  const { packAtlas } = useAtlas()

  const allCodePoints = glyphs.map((g) => g.codePoint)
  // Glyphs to pack: selection or all
  const selectedGlyphs = exportSelection === null
    ? glyphs
    : glyphs.filter((g) => exportSelection.has(g.codePoint))

  const debouncedSelected = useDebounce(selectedGlyphs, 800)

  async function runPack(glyphsToPack = selectedGlyphs) {
    if (!currentProject || glyphsToPack.length === 0) return
    setPacking(true)
    try {
      const size = currentProject.settings.fontSize <= 16 ? 256 : 512
      const { placements, atlasImageData: imageData, efficiency, unpacked } = await packAtlas(
        glyphsToPack,
        size,
        size,
        currentProject.settings.padding.top,
      )
      if (unpacked.length > 0) console.warn(`${unpacked.length} glyphs did not fit in atlas`)
      setAtlasResult(placements, imageData, size, size, efficiency)
    } finally {
      setPacking(false)
    }
  }

  // Auto-pack on first load
  useEffect(() => {
    if (glyphs.length > 0 && !atlasImageData) runPack(glyphs)
  }, [glyphs.length])

  // Debounced auto-repack when pixel data or selection changes
  useEffect(() => {
    if (debouncedSelected.length > 0 && atlasImageData) runPack(debouncedSelected)
  }, [debouncedSelected])

  // Render atlas ImageData onto canvas when it changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !atlasImageData) return
    canvas.width = atlasWidth
    canvas.height = atlasHeight
    canvas.getContext('2d')!.putImageData(atlasImageData, 0, 0)
  }, [atlasImageData, atlasWidth, atlasHeight])

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-auto p-3">
      {/* Preset selector */}
      <div className="grid gap-1.5">
        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">Glyph selection</span>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setExportPreset(p.id, allCodePoints)}
              className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
                exportPreset === p.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-glyph toggles */}
      <div className="flex flex-wrap gap-0.5">
        {glyphs.map((g) => {
          const selected = exportSelection === null || exportSelection.has(g.codePoint)
          const char = String.fromCodePoint(g.codePoint)
          return (
            <button
              key={g.codePoint}
              title={`U+${g.codePoint.toString(16).toUpperCase().padStart(4, '0')} ${char}`}
              onClick={() => toggleExportGlyph(g.codePoint, allCodePoints)}
              className={`flex h-6 w-6 items-center justify-center rounded text-[11px] transition-colors ${
                selected
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground/30'
              }`}
            >
              {char}
            </button>
          )
        })}
      </div>

      <div className="text-muted-foreground text-[10px]">
        {exportSelection === null ? glyphs.length : exportSelection.size} / {glyphs.length} glyphs selected
      </div>

      {/* Atlas preview */}
      {packing ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Packing…
        </div>
      ) : atlasImageData ? (
        <>
          <div className="bg-muted overflow-hidden rounded border border-border/50">
            <canvas
              ref={canvasRef}
              style={{ imageRendering: 'pixelated', width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>{atlasWidth}×{atlasHeight} · {Math.round(atlasEfficiency * 100)}% used</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => runPack()} disabled={packing}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </>
      ) : (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-xs">
          No glyphs to pack yet.
        </div>
      )}
    </div>
  )
}

export function RightPanel() {
  const [tab, setTab] = useState<Tab>('atlas')

  const tabClass = (t: Tab) =>
    `px-3 py-1.5 text-xs font-medium transition-colors ${
      tab === t
        ? 'text-foreground border-b-2 border-primary'
        : 'text-muted-foreground hover:text-foreground'
    }`

  return (
    <div className="border-border flex h-full w-64 shrink-0 flex-col border-l">
      <div className="border-border flex border-b">
        <button className={tabClass('metrics')} onClick={() => setTab('metrics')}>Metrics</button>
        <button className={tabClass('atlas')} onClick={() => setTab('atlas')}>Atlas</button>
      </div>
      {tab === 'metrics' ? <MetricsTab /> : <AtlasTab />}
    </div>
  )
}
