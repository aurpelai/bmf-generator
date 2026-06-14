import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GLYPH_SETS } from '@/core/project/glyphSets'
import { createProject, initializeGlyphs } from '@/core/project'
import { saveProject, saveGlyphs } from '@/db'
import { useStore } from '@/store'
import { GlyphSetSelect, PaddingFields, SpacingFields, WizardFooter } from './import-shared'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 1 | 2

export function NewFontWizard({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>(1)

  // Step 1
  const [name, setName] = useState('')
  const [glyphSetId, setGlyphSetId] = useState(GLYPH_SETS[0].id)

  // Step 2
  const [fontSize, setFontSize] = useState(32)
  const [paddingTop, setPaddingTop] = useState(1)
  const [paddingRight, setPaddingRight] = useState(1)
  const [paddingBottom, setPaddingBottom] = useState(1)
  const [paddingLeft, setPaddingLeft] = useState(1)
  const [spacingX, setSpacingX] = useState(1)
  const [spacingY, setSpacingY] = useState(1)
  const [creating, setCreating] = useState(false)

  const setCurrentProject = useStore((s) => s.setCurrentProject)
  const setGlyphs = useStore((s) => s.setGlyphs)
  const setView = useStore((s) => s.setView)

  async function handleCreate() {
    setCreating(true)
    try {
      const glyphSet = GLYPH_SETS.find((s) => s.id === glyphSetId) ?? GLYPH_SETS[0]
      const project = createProject(name || 'Untitled', {
        fontSize,
        padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft },
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
    } finally {
      setCreating(false)
    }
  }

  function handleClose() {
    onOpenChange(false)
    setTimeout(() => {
      setStep(1)
      setName('')
      setGlyphSetId(GLYPH_SETS[0].id)
      setFontSize(32)
      setPaddingTop(1); setPaddingRight(1); setPaddingBottom(1); setPaddingLeft(1)
      setSpacingX(1); setSpacingY(1)
    }, 200)
  }

  const stepTitles: Record<Step, string> = {
    1: 'New font — Name & glyphs',
    2: 'New font — Settings',
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{stepTitles[step]}</DialogTitle>
          <p className="text-muted-foreground text-xs">Step {step} of 2</p>
        </DialogHeader>

        {step === 1 && (
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="nf-name">Font name</Label>
              <Input
                id="nf-name"
                placeholder="Untitled"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setStep(2)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nf-glyphset">Glyph set</Label>
              <GlyphSetSelect id="nf-glyphset" value={glyphSetId} onChange={setGlyphSetId} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="nf-fontsize">Font size (px)</Label>
              <Input
                id="nf-fontsize"
                type="number"
                min={4}
                max={256}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </div>
            <PaddingFields
              top={paddingTop} right={paddingRight} bottom={paddingBottom} left={paddingLeft}
              onTopChange={setPaddingTop} onRightChange={setPaddingRight}
              onBottomChange={setPaddingBottom} onLeftChange={setPaddingLeft}
            />
            <SpacingFields x={spacingX} y={spacingY} onXChange={setSpacingX} onYChange={setSpacingY} />
          </div>
        )}

        <WizardFooter
          step={step}
          totalSteps={2}
          onClose={handleClose}
          onBack={() => setStep(1)}
          onNext={() => setStep(2)}
          onConfirm={handleCreate}
          backDisabled={creating}
          confirmDisabled={creating}
          confirming={creating}
          confirmLabel="Create font"
          confirmingLabel="Creating…"
        />
      </DialogContent>
    </Dialog>
  )
}
