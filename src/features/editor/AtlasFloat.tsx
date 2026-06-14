import { useEffect, useRef, useState } from 'react'
import { Loader2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { useAtlas } from '@/hooks/useAtlas'

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

interface Props {
  open: boolean
  onClose: () => void
}

export function AtlasFloat({ open, onClose }: Props) {
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

  useEffect(() => {
    if (glyphs.length > 0 && !atlasImageData) runPack(glyphs)
  }, [glyphs.length])

  useEffect(() => {
    if (debouncedSelected.length > 0 && atlasImageData) runPack(debouncedSelected)
  }, [debouncedSelected])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !atlasImageData) return
    canvas.width = atlasWidth
    canvas.height = atlasHeight
    canvas.getContext('2d')!.putImageData(atlasImageData, 0, 0)
  }, [atlasImageData, atlasWidth, atlasHeight])

  return (
    <div
      className={`absolute top-12 right-3 z-40 w-56 rounded-xl border border-border/50 bg-popover shadow-lg transition-opacity ${
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="flex h-8 items-center justify-between border-b border-border/50 px-3">
        <span className="text-xs font-medium">Atlas</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex flex-col gap-3 p-3">
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
          <div className="text-muted-foreground flex items-center justify-center py-4 text-xs">
            No glyphs to pack yet.
          </div>
        )}
      </div>
    </div>
  )
}
