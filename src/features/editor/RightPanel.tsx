import { useEffect, useRef, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { useAtlas } from '@/hooks/useAtlas'

type Tab = 'metrics' | 'atlas'

export function RightPanel() {
  const [tab, setTab] = useState<Tab>('atlas')
  const [packing, setPacking] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const currentProject = useStore((s) => s.currentProject)
  const glyphs = useStore((s) => s.glyphs)
  const atlasImageData = useStore((s) => s.atlasImageData)
  const atlasWidth = useStore((s) => s.atlasWidth)
  const atlasHeight = useStore((s) => s.atlasHeight)
  const atlasEfficiency = useStore((s) => s.atlasEfficiency)
  const setAtlasResult = useStore((s) => s.setAtlasResult)

  const { packAtlas } = useAtlas()

  async function runPack() {
    if (!currentProject || glyphs.length === 0) return
    setPacking(true)
    try {
      const { placements, atlasImageData: imageData, efficiency, unpacked } = await packAtlas(
        glyphs,
        currentProject.settings.fontSize <= 16 ? 256 : 512,
        currentProject.settings.fontSize <= 16 ? 256 : 512,
        currentProject.settings.padding.top,
      )
      if (unpacked.length > 0) {
        console.warn(`${unpacked.length} glyphs did not fit in atlas`)
      }
      const size = currentProject.settings.fontSize <= 16 ? 256 : 512
      setAtlasResult(placements, imageData, size, size, efficiency)
    } finally {
      setPacking(false)
    }
  }

  // Auto-pack when glyphs first load
  useEffect(() => {
    if (glyphs.length > 0 && !atlasImageData) {
      runPack()
    }
  }, [glyphs.length])

  // Render atlas ImageData onto canvas when it changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !atlasImageData) return
    canvas.width = atlasWidth
    canvas.height = atlasHeight
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(atlasImageData, 0, 0)
  }, [atlasImageData, atlasWidth, atlasHeight])

  const tabClass = (t: Tab) =>
    `px-3 py-1.5 text-xs font-medium transition-colors ${
      tab === t
        ? 'text-foreground border-b-2 border-primary'
        : 'text-muted-foreground hover:text-foreground'
    }`

  return (
    <div className="border-border flex h-full w-64 shrink-0 flex-col border-l">
      {/* Tab bar */}
      <div className="border-border flex border-b">
        <button className={tabClass('metrics')} onClick={() => setTab('metrics')}>Metrics</button>
        <button className={tabClass('atlas')} onClick={() => setTab('atlas')}>Atlas</button>
      </div>

      {tab === 'metrics' && (
        <div className="text-muted-foreground flex flex-1 items-center justify-center p-4 text-xs">
          Select a glyph to edit its metrics.
        </div>
      )}

      {tab === 'atlas' && (
        <div className="flex flex-1 flex-col gap-3 overflow-auto p-3">
          {packing ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-xs">
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
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={runPack} disabled={packing}>
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
      )}
    </div>
  )
}
