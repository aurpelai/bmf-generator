import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store'
import { useAtlas } from '@/hooks/useAtlas'
import { saveProject } from '@/db'

type Tab = 'atlas' | 'settings'

// Debounce helper
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

const PRESETS: Array<{ id: import('@/store').GlyphPreset; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'letters', label: 'Letters' },
  { id: 'letters-digits', label: 'Letters & digits' },
  { id: 'digits', label: 'Digits' },
  { id: 'custom', label: 'Custom' },
]

function GlyphSelection() {
  const glyphs = useStore((s) => s.glyphs)
  const exportSelection = useStore((s) => s.exportSelection)
  const exportPreset = useStore((s) => s.exportPreset)
  const setExportPreset = useStore((s) => s.setExportPreset)
  const toggleExportGlyph = useStore((s) => s.toggleExportGlyph)
  const allCodePoints = glyphs.map((g) => g.codePoint)

  return (
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
      <div className="flex flex-wrap gap-0.5 pt-0.5">
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
    </div>
  )
}

function SettingsTab() {
  const currentProject = useStore((s) => s.currentProject)
  const updateCurrentProject = useStore((s) => s.updateCurrentProject)

  const s = currentProject?.settings
  const [name, setName] = useState(currentProject?.name ?? '')
  const [fontSize, setFontSize] = useState(s?.fontSize ?? 32)
  const [lineHeight, setLineHeight] = useState(s?.lineHeight ?? 36)
  const [base, setBase] = useState(s?.base ?? 28)
  const [capHeight, setCapHeight] = useState(s?.capHeight ?? 22)
  const [paddingTop, setPaddingTop] = useState(s?.padding.top ?? 1)
  const [paddingRight, setPaddingRight] = useState(s?.padding.right ?? 1)
  const [paddingBottom, setPaddingBottom] = useState(s?.padding.bottom ?? 1)
  const [paddingLeft, setPaddingLeft] = useState(s?.padding.left ?? 1)
  const [spacingX, setSpacingX] = useState(s?.spacing.x ?? 1)
  const [spacingY, setSpacingY] = useState(s?.spacing.y ?? 1)

  useEffect(() => {
    if (!currentProject) return
    setName(currentProject.name)
    const s = currentProject.settings
    setFontSize(s.fontSize)
    setLineHeight(s.lineHeight)
    setBase(s.base)
    setCapHeight(s.capHeight)
    setPaddingTop(s.padding.top)
    setPaddingRight(s.padding.right)
    setPaddingBottom(s.padding.bottom)
    setPaddingLeft(s.padding.left)
    setSpacingX(s.spacing.x)
    setSpacingY(s.spacing.y)
  }, [currentProject?.id])

  if (!currentProject) return null

  function commit(changes: Parameters<typeof updateCurrentProject>[0]) {
    updateCurrentProject(changes)
    saveProject({ ...currentProject!, ...changes, updatedAt: Date.now() })
  }

  function commitSettings(partial: Partial<NonNullable<typeof currentProject>['settings']>) {
    commit({ settings: { ...currentProject!.settings, ...partial } })
  }

  function liveSettings(partial: Partial<NonNullable<typeof currentProject>['settings']>) {
    updateCurrentProject({ settings: { ...currentProject!.settings, ...partial } })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-3">
      <div className="grid gap-1">
        <Label htmlFor="rp-name" className="text-[10px]">Font name</Label>
        <Input
          id="rp-name"
          className="h-7 text-xs"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => commit({ name })}
          onKeyDown={(e) => e.key === 'Enter' && commit({ name })}
        />
      </div>

      {/* Font metrics */}
      <div className="grid gap-2">
        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">Font metrics</span>
        <div className="grid gap-1">
          <Label htmlFor="rp-fontsize" className="text-[10px]">Font size</Label>
          <Input
            id="rp-fontsize"
            type="number"
            className="h-7 text-xs"
            value={fontSize}
            onChange={(e) => { setFontSize(Number(e.target.value)); liveSettings({ fontSize: Number(e.target.value) }) }}
            onBlur={() => commitSettings({ fontSize })}
            onKeyDown={(e) => e.key === 'Enter' && commitSettings({ fontSize })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="rp-lineheight" className="text-[10px]">Line height</Label>
          <Input
            id="rp-lineheight"
            type="number"
            className="h-7 text-xs"
            value={lineHeight}
            onChange={(e) => { setLineHeight(Number(e.target.value)); liveSettings({ lineHeight: Number(e.target.value) }) }}
            onBlur={() => commitSettings({ lineHeight })}
            onKeyDown={(e) => e.key === 'Enter' && commitSettings({ lineHeight })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="rp-base" className="text-[10px]">Baseline</Label>
          <Input
            id="rp-base"
            type="number"
            className="h-7 text-xs"
            value={base}
            onChange={(e) => { const v = Math.min(Number(e.target.value), lineHeight); setBase(v); liveSettings({ base: v }) }}
            onBlur={() => commitSettings({ base: Math.min(base, lineHeight) })}
            onKeyDown={(e) => e.key === 'Enter' && commitSettings({ base: Math.min(base, lineHeight) })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="rp-capheight" className="text-[10px]">Cap height</Label>
          <Input
            id="rp-capheight"
            type="number"
            className="h-7 text-xs"
            value={capHeight}
            onChange={(e) => { const v = Math.min(Number(e.target.value), lineHeight); setCapHeight(v); liveSettings({ capHeight: v }) }}
            onBlur={() => commitSettings({ capHeight: Math.min(capHeight, lineHeight) })}
            onKeyDown={(e) => e.key === 'Enter' && commitSettings({ capHeight: Math.min(capHeight, lineHeight) })}
          />
        </div>
      </div>

      {/* Padding */}
      <div className="grid gap-2">
        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">Padding</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="rp-pad-top" className="text-[10px]">Top</Label>
            <Input id="rp-pad-top" type="number" className="h-7 text-xs" value={paddingTop}
              onChange={(e) => setPaddingTop(Number(e.target.value))}
              onBlur={() => commitSettings({ padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft } })}
              onKeyDown={(e) => e.key === 'Enter' && commitSettings({ padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft } })} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rp-pad-right" className="text-[10px]">Right</Label>
            <Input id="rp-pad-right" type="number" className="h-7 text-xs" value={paddingRight}
              onChange={(e) => setPaddingRight(Number(e.target.value))}
              onBlur={() => commitSettings({ padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft } })}
              onKeyDown={(e) => e.key === 'Enter' && commitSettings({ padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft } })} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rp-pad-bottom" className="text-[10px]">Bottom</Label>
            <Input id="rp-pad-bottom" type="number" className="h-7 text-xs" value={paddingBottom}
              onChange={(e) => setPaddingBottom(Number(e.target.value))}
              onBlur={() => commitSettings({ padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft } })}
              onKeyDown={(e) => e.key === 'Enter' && commitSettings({ padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft } })} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rp-pad-left" className="text-[10px]">Left</Label>
            <Input id="rp-pad-left" type="number" className="h-7 text-xs" value={paddingLeft}
              onChange={(e) => setPaddingLeft(Number(e.target.value))}
              onBlur={() => commitSettings({ padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft } })}
              onKeyDown={(e) => e.key === 'Enter' && commitSettings({ padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft } })} />
          </div>
        </div>
      </div>

      {/* Spacing */}
      <div className="grid gap-2">
        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">Spacing</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="rp-spacingx" className="text-[10px]">X</Label>
            <Input
              id="rp-spacingx"
              type="number"
              className="h-7 text-xs"
              value={spacingX}
              onChange={(e) => setSpacingX(Number(e.target.value))}
              onBlur={() => commitSettings({ spacing: { x: spacingX, y: spacingY } })}
              onKeyDown={(e) => e.key === 'Enter' && commitSettings({ spacing: { x: spacingX, y: spacingY } })}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rp-spacingy" className="text-[10px]">Y</Label>
            <Input
              id="rp-spacingy"
              type="number"
              className="h-7 text-xs"
              value={spacingY}
              onChange={(e) => setSpacingY(Number(e.target.value))}
              onBlur={() => commitSettings({ spacing: { x: spacingX, y: spacingY } })}
              onKeyDown={(e) => e.key === 'Enter' && commitSettings({ spacing: { x: spacingX, y: spacingY } })}
            />
          </div>
        </div>
      </div>

      {/* Glyph selection */}
      <GlyphSelection />
    </div>
  )
}

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

  const { packAtlas } = useAtlas()

  // Glyphs to pack: selection or all
  const selectedGlyphs = exportSelection === null
    ? glyphs
    : glyphs.filter((g) => exportSelection.has(g.codePoint))

  const debouncedSelected = useDebounce(selectedGlyphs, 800)

  async function runPack(glyphsToPack = selectedGlyphs) {
    if (!currentProject || glyphsToPack.length === 0) return
    setPacking(true)
    try {
      const { placements, atlasImageData: imageData, atlasWidth, atlasHeight, efficiency, unpacked } = await packAtlas(
        glyphsToPack,
        currentProject.settings.padding.top,
      )
      if (unpacked.length > 0) console.warn(`${unpacked.length} glyphs did not fit in atlas`)
      setAtlasResult(placements, imageData, atlasWidth, atlasHeight, efficiency)
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

export function RightPanel({ onCollapse, width }: { onCollapse: () => void; width: number }) {
  const [tab, setTab] = useState<Tab>('atlas')

  const tabClass = (t: Tab) =>
    `cursor-pointer self-stretch flex items-center px-3 text-xs font-medium transition-colors ${
      tab === t
        ? 'text-foreground border-b-2 border-primary -mb-px'
        : 'text-muted-foreground hover:text-foreground'
    }`

  return (
    <div className="border-border flex h-full shrink-0 flex-col border-l" style={{ width }}>
      <div className="border-border flex h-9 shrink-0 items-end border-b">
        <Button
          variant="ghost"
          size="icon"
          className="ml-2 h-6 w-6 self-center"
          title="Collapse panel"
          aria-label="Collapse panel"
          aria-expanded={true}
          onClick={onCollapse}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <div role="tablist" aria-label="Panel tabs" className="flex self-stretch">
          <button role="tab" aria-selected={tab === 'atlas'} aria-controls="rightpanel-atlas" id="tab-atlas" className={tabClass('atlas')} onClick={() => setTab('atlas')}>Atlas</button>
          <button role="tab" aria-selected={tab === 'settings'} aria-controls="rightpanel-settings" id="tab-settings" className={tabClass('settings')} onClick={() => setTab('settings')}>Settings</button>
        </div>
      </div>
      {tab === 'atlas' && <AtlasTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}
