import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store'
import { saveProject } from '@/db'
import { FontMetricsFields, PaddingFields, SpacingFields } from '@/features/home/import-shared'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: Props) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Font Settings</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="sd-name">Font name</Label>
            <Input
              id="sd-name"
              className="h-8 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => commit({ name })}
              onKeyDown={(e) => e.key === 'Enter' && commit({ name })}
            />
          </div>

          <FontMetricsFields
            fontSize={fontSize}
            lineHeight={lineHeight}
            base={base}
            capHeight={capHeight}
            onFontSizeChange={(v) => setFontSize(v)}
            onLineHeightChange={(v) => { setLineHeight(v); commitSettings({ lineHeight: v }) }}
            onBaseChange={(v) => { setBase(v); commitSettings({ base: v }) }}
            onCapHeightChange={(v) => { setCapHeight(v); commitSettings({ capHeight: v }) }}
          />

          <PaddingFields
            top={paddingTop} right={paddingRight} bottom={paddingBottom} left={paddingLeft}
            onTopChange={(v) => { setPaddingTop(v); commitSettings({ padding: { top: v, right: paddingRight, bottom: paddingBottom, left: paddingLeft } }) }}
            onRightChange={(v) => { setPaddingRight(v); commitSettings({ padding: { top: paddingTop, right: v, bottom: paddingBottom, left: paddingLeft } }) }}
            onBottomChange={(v) => { setPaddingBottom(v); commitSettings({ padding: { top: paddingTop, right: paddingRight, bottom: v, left: paddingLeft } }) }}
            onLeftChange={(v) => { setPaddingLeft(v); commitSettings({ padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: v } }) }}
          />

          <SpacingFields
            x={spacingX} y={spacingY}
            onXChange={(v) => { setSpacingX(v); commitSettings({ spacing: { x: v, y: spacingY } }) }}
            onYChange={(v) => { setSpacingY(v); commitSettings({ spacing: { x: spacingX, y: v } }) }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
