import { useStore } from '@/store'
import { cn } from '@/lib/utils'

function GlyphThumbnail({ pixels, width, height }: { pixels: Uint8Array; width: number; height: number }) {
  const size = 28

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${width} ${height}`}
      style={{ imageRendering: 'pixelated' }}
      className="shrink-0"
    >
      {Array.from(pixels).map((v, i) => {
        if (v < 32) return null
        const x = i % width
        const y = Math.floor(i / width)
        const alpha = Math.round((v / 255) * 100) / 100
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={1}
            height={1}
            fill={`rgba(255,255,255,${alpha})`}
          />
        )
      })}
    </svg>
  )
}

export function GlyphList() {
  const glyphs = useStore((s) => s.glyphs)
  const currentProject = useStore((s) => s.currentProject)
  const selectedCodePoint = useStore((s) => s.selectedCodePoint)
  const setSelectedCodePoint = useStore((s) => s.setSelectedCodePoint)

  if (!currentProject) return null

  return (
    <div className="border-border flex h-full w-48 shrink-0 flex-col border-r">
      <div className="border-border flex h-9 shrink-0 items-center border-b px-3">
        <span className="text-muted-foreground text-xs font-medium">
          Glyphs ({glyphs.length})
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {glyphs.map((glyph) => {
          const char = String.fromCodePoint(glyph.codePoint)
          const isSelected = glyph.codePoint === selectedCodePoint
          return (
            <button
              key={glyph.codePoint}
              onClick={() => setSelectedCodePoint(glyph.codePoint)}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left transition-colors',
                isSelected
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted',
              )}
            >
              <div className="bg-background/30 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border/40">
                {glyph.width > 0 && glyph.height > 0 ? (
                  <GlyphThumbnail
                    pixels={glyph.pixels}
                    width={glyph.width}
                    height={glyph.height}
                  />
                ) : (
                  <span className="text-muted-foreground text-xs">?</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">{char}</div>
                <div className="text-muted-foreground text-[10px]">
                  U+{glyph.codePoint.toString(16).toUpperCase().padStart(4, '0')}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
