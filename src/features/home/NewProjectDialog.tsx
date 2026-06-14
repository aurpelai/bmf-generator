import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GLYPH_SETS } from '@/core/project/glyphSets'
import { createProject, initializeGlyphs } from '@/core/project'
import { saveProject, saveGlyphs } from '@/db'
import { useStore } from '@/store'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewProjectDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState('')
  const [glyphSetId, setGlyphSetId] = useState(GLYPH_SETS[0].id)
  const [fontSize, setFontSize] = useState(32)
  const [paddingVal, setPaddingVal] = useState(1)
  const [spacingX, setSpacingX] = useState(1)
  const [spacingY, setSpacingY] = useState(1)

  const setCurrentProject = useStore((s) => s.setCurrentProject)
  const setGlyphs = useStore((s) => s.setGlyphs)
  const setView = useStore((s) => s.setView)

  async function handleCreate() {
    const glyphSet = GLYPH_SETS.find((s) => s.id === glyphSetId) ?? GLYPH_SETS[0]
    const project = createProject(name || 'Untitled', {
      fontSize,
      padding: { top: paddingVal, right: paddingVal, bottom: paddingVal, left: paddingVal },
      spacing: { x: spacingX, y: spacingY },
      lineHeight: Math.round(fontSize * 1.2),
      base: Math.round(fontSize * 0.8),
    })
    project.glyphs = glyphSet.codePoints
    const glyphs = initializeGlyphs(project.id, glyphSet.codePoints, fontSize, Math.round(fontSize * 1.2))
    await saveProject(project)
    await saveGlyphs(glyphs)
    setCurrentProject(project)
    setGlyphs(glyphs)
    setView('editor')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New font</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="np-name">Font name</Label>
            <Input
              id="np-name"
              placeholder="Untitled"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="np-fontsize">Font size (px)</Label>
            <Input
              id="np-fontsize"
              type="number"
              min={4}
              max={256}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="np-glyphset">Glyph set</Label>
            <select
              id="np-glyphset"
              className="bg-input border-border text-foreground h-9 rounded-md border px-3 text-sm"
              value={glyphSetId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGlyphSetId(e.target.value)}
            >
              {GLYPH_SETS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="np-padding">Padding</Label>
              <Input
                id="np-padding"
                type="number"
                min={0}
                max={16}
                value={paddingVal}
                onChange={(e) => setPaddingVal(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="np-spacingx">Spacing X</Label>
              <Input
                id="np-spacingx"
                type="number"
                min={0}
                max={16}
                value={spacingX}
                onChange={(e) => setSpacingX(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="np-spacingy">Spacing Y</Label>
              <Input
                id="np-spacingy"
                type="number"
                min={0}
                max={16}
                value={spacingY}
                onChange={(e) => setSpacingY(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create font</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
