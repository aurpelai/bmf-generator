import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GLYPH_SETS } from '@/core/project/glyphSets'
import { createProject, initializeGlyphs } from '@/core/project'
import { saveProject, saveGlyphs } from '@/db'
import { useStore } from '@/store'
import { FontMetricsFields, GlyphSetSelect, PaddingFields, SpacingFields, WizardFooter } from './import-shared'

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
  const [lineHeight, setLineHeight] = useState(Math.round(32 * 1.2))
  const [base, setBase] = useState(Math.round(32 * 0.8))
  const [capHeight, setCapHeight] = useState(Math.round(32 * 0.7))
  const [paddingTop, setPaddingTop] = useState(1)
  const [paddingRight, setPaddingRight] = useState(1)
  const [paddingBottom, setPaddingBottom] = useState(1)
  const [paddingLeft, setPaddingLeft] = useState(1)
  const [spacingX, setSpacingX] = useState(1)
  const [spacingY, setSpacingY] = useState(1)
  const [creating, setCreating] = useState(false)
  const [nameError, setNameError] = useState('')

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
        lineHeight,
        base,
        capHeight,
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

  function handleNext() {
    if (!name.trim()) {
      setNameError('Font name is required')
      return
    }
    setStep(2)
  }

  function handleClose() {
    onOpenChange(false)
    setTimeout(() => {
      setStep(1)
      setName('')
      setNameError('')
      setGlyphSetId(GLYPH_SETS[0].id)
      setFontSize(32)
      setLineHeight(Math.round(32 * 1.2))
      setBase(Math.round(32 * 0.8))
      setCapHeight(Math.round(32 * 0.7))
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
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="bg-popover z-10 -mx-4 px-4 -mt-4 pt-4 pb-4">
          <DialogTitle>{stepTitles[step]}</DialogTitle>
          <p className="text-muted-foreground text-xs">Step {step} of 2</p>
        </DialogHeader>

        {step === 1 && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-2 pb-4">
            <div className="grid gap-1.5">
              <Label htmlFor="nf-name">Font name</Label>
              <Input
                id="nf-name"
                placeholder="Untitled"
                value={name}
                className={nameError ? 'border-destructive' : ''}
                onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              />
              {nameError && <p className="text-destructive text-xs">{nameError}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nf-glyphset">Glyph set</Label>
              <GlyphSetSelect id="nf-glyphset" value={glyphSetId} onChange={setGlyphSetId} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-2 pb-4">
            <FontMetricsFields
              fontSize={fontSize} lineHeight={lineHeight} base={base} capHeight={capHeight}
              onFontSizeChange={(s) => {
                setFontSize(s)
                setLineHeight(Math.round(s * 1.2))
                setBase(Math.round(s * 0.8))
                setCapHeight(Math.round(s * 0.7))
              }}
              onLineHeightChange={setLineHeight} onBaseChange={setBase} onCapHeightChange={setCapHeight}
            />
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
          onNext={handleNext}
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
