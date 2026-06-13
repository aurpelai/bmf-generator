import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useStore } from '@/store'
import type { Glyph } from '@/core/project'
import { cn } from '@/lib/utils'
import { makeBlankGlyph } from '@/core/project'
import { saveGlyphs } from '@/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

function glyphSortKey(cp: number): [number, number] {
  const ch = String.fromCodePoint(cp)
  if (/^\p{Lu}$/u.test(ch)) return [0, cp] // uppercase letters
  if (/^\p{Ll}$/u.test(ch)) return [1, cp] // lowercase letters
  if (cp >= 0x30 && cp <= 0x39) return [2, cp] // digits 0-9
  return [3, cp]                              // everything else
}

function sortGlyphs(glyphs: Glyph[]): Glyph[] {
  return [...glyphs].sort((a, b) => {
    const [ga, ia] = glyphSortKey(a.codePoint)
    const [gb, ib] = glyphSortKey(b.codePoint)
    return ga !== gb ? ga - gb : ia - ib
  })
}

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

function AddGlyphDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (codePoint: number) => void
}) {
  const [value, setValue] = useState('')

  function resolve(): number | null {
    const trimmed = value.trim()
    if (!trimmed) return null
    // Single character
    if ([...trimmed].length === 1) return trimmed.codePointAt(0)!
    // U+XXXX or 0xXXXX or plain hex/decimal
    const hexMatch = trimmed.match(/^(?:U\+|0x)?([0-9a-fA-F]+)$/)
    if (hexMatch) return parseInt(hexMatch[1], 16)
    const dec = parseInt(trimmed, 10)
    return isNaN(dec) ? null : dec
  }

  function handleAdd() {
    const cp = resolve()
    if (cp === null || cp < 0 || cp > 0x10ffff) return
    onAdd(cp)
    setValue('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setValue('') }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Add glyph</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-1">
          <Input
            autoFocus
            placeholder="A  or  U+0041  or  65"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <p className="text-muted-foreground text-xs">
            Enter a character, U+XXXX code point, or decimal number.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={resolve() === null}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function GlyphList({ collapsed, onCollapse, width }: { collapsed: boolean; onCollapse: () => void; width: number }) {
  const [addOpen, setAddOpen] = useState(false)

  const glyphs = useStore((s) => s.glyphs)
  const currentProject = useStore((s) => s.currentProject)
  const selectedCodePoint = useStore((s) => s.selectedCodePoint)
  const setSelectedCodePoint = useStore((s) => s.setSelectedCodePoint)
  const upsertGlyph = useStore((s) => s.upsertGlyph)
  const updateCurrentProject = useStore((s) => s.updateCurrentProject)

  const sortedGlyphs = useMemo(() => sortGlyphs(glyphs), [glyphs])

  if (!currentProject) return null

  async function handleAddGlyph(codePoint: number) {
    if (!currentProject) return
    if (glyphs.some((g) => g.codePoint === codePoint)) {
      setSelectedCodePoint(codePoint)
      return
    }
    const { fontSize, lineHeight } = currentProject.settings
    const glyph = makeBlankGlyph(currentProject.id, codePoint, fontSize, lineHeight)
    await saveGlyphs([glyph])
    upsertGlyph(glyph)
    // Add code point to project metadata if not already listed
    if (!currentProject.glyphs.includes(codePoint)) {
      updateCurrentProject({ glyphs: [...currentProject.glyphs, codePoint] })
    }
    setSelectedCodePoint(codePoint)
  }

  if (collapsed) {
    return (
      <div className="border-border flex h-full shrink-0 flex-col border-r" style={{ width }}>
        <div className="border-border flex h-9 shrink-0 items-center justify-center border-b">
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Expand glyph list" onClick={onCollapse}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sortedGlyphs.map((glyph) => {
            const isSelected = glyph.codePoint === selectedCodePoint
            return (
              <button
                key={glyph.codePoint}
                onClick={() => setSelectedCodePoint(glyph.codePoint)}
                title={`U+${glyph.codePoint.toString(16).toUpperCase().padStart(4, '0')}`}
                className={cn(
                  'flex w-full cursor-pointer items-center justify-center py-1.5 transition-colors',
                  isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                )}
              >
                <div className="bg-background/30 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border/40">
                  {glyph.width > 0 && glyph.height > 0 ? (
                    <GlyphThumbnail pixels={glyph.pixels} width={glyph.width} height={glyph.height} />
                  ) : (
                    <span className="text-muted-foreground text-xs">?</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        <AddGlyphDialog open={addOpen} onOpenChange={setAddOpen} onAdd={handleAddGlyph} />
      </div>
    )
  }

  return (
    <div className="border-border flex h-full shrink-0 flex-col border-r" style={{ width }}>
      <div className="border-border flex h-9 shrink-0 items-center justify-between border-b px-2 pl-3">
        <span className="text-muted-foreground text-xs font-medium">
          Glyphs ({glyphs.length})
        </span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Add glyph" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Collapse glyph list" onClick={onCollapse}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sortedGlyphs.map((glyph) => {
          const char = String.fromCodePoint(glyph.codePoint)
          const isSelected = glyph.codePoint === selectedCodePoint
          return (
            <button
              key={glyph.codePoint}
              onClick={() => setSelectedCodePoint(glyph.codePoint)}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left transition-colors',
                isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
              )}
            >
              <div className="bg-background/30 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border/40">
                {glyph.width > 0 && glyph.height > 0 ? (
                  <GlyphThumbnail pixels={glyph.pixels} width={glyph.width} height={glyph.height} />
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

      <AddGlyphDialog open={addOpen} onOpenChange={setAddOpen} onAdd={handleAddGlyph} />
    </div>
  )
}
