import { Grid2x2, Grid2x2X, Minus, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

const ZOOM_PRESETS = [2, 4, 8, 12, 16, 24, 32]

export function EditorToolbar() {
  const activeTool = useStore((s) => s.activeTool)
  const setActiveTool = useStore((s) => s.setActiveTool)
  const zoomLevel = useStore((s) => s.zoomLevel)
  const setZoomLevel = useStore((s) => s.setZoomLevel)
  const showGrid = useStore((s) => s.showGrid)
  const setShowGrid = useStore((s) => s.setShowGrid)

  function zoomIn() {
    const next = ZOOM_PRESETS.find((z) => z > zoomLevel)
    if (next) setZoomLevel(next)
  }

  function zoomOut() {
    const next = [...ZOOM_PRESETS].reverse().find((z) => z < zoomLevel)
    if (next) setZoomLevel(next)
  }

  const toolBtn = (tool: typeof activeTool, icon: React.ReactNode, title: string) => (
    <Button
      variant="ghost"
      size="icon"
      title={title}
      className={cn('h-7 w-7', activeTool === tool && 'bg-accent text-accent-foreground')}
      onClick={() => setActiveTool(tool)}
    >
      {icon}
    </Button>
  )

  return (
    <div className="border-border flex h-9 shrink-0 items-center gap-1 border-b px-2">
      {toolBtn('pencil', <Pencil className="h-3.5 w-3.5" />, 'Pencil (B)')}
      {toolBtn('eraser', <Grid2x2X className="h-3.5 w-3.5" />, 'Eraser (E)')}

      <div className="bg-border mx-1 h-5 w-px" />

      <Button variant="ghost" size="icon" className="h-7 w-7" title="Zoom out" onClick={zoomOut} disabled={zoomLevel <= ZOOM_PRESETS[0]}>
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span className="text-muted-foreground w-8 text-center text-xs">{zoomLevel}×</span>
      <Button variant="ghost" size="icon" className="h-7 w-7" title="Zoom in" onClick={zoomIn} disabled={zoomLevel >= ZOOM_PRESETS[ZOOM_PRESETS.length - 1]}>
        <Plus className="h-3.5 w-3.5" />
      </Button>

      <div className="bg-border mx-1 h-5 w-px" />

      <Button
        variant="ghost"
        size="icon"
        title="Toggle grid (G)"
        className={cn('h-7 w-7', showGrid && 'bg-accent text-accent-foreground')}
        onClick={() => setShowGrid(!showGrid)}
      >
        <Grid2x2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
