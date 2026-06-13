import { useEffect, useState } from 'react'
import { ArrowLeft, Download, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { getGlyphsForProject } from '@/db/glyphs'
import { GlyphList } from './glyph-list/GlyphList'
import { PixelEditor } from './pixel-editor/PixelEditor'
import { EditorToolbar } from './toolbar/EditorToolbar'
import { RightPanel } from './RightPanel'
import { ExportDialog } from '@/features/export/ExportDialog'

export function EditorScreen() {
  const [exportOpen, setExportOpen] = useState(false)

  const currentProject = useStore((s) => s.currentProject)
  const setView = useStore((s) => s.setView)
  const setGlyphs = useStore((s) => s.setGlyphs)
  const setActiveTool = useStore((s) => s.setActiveTool)
  const showGrid = useStore((s) => s.showGrid)
  const setShowGridFn = useStore((s) => s.setShowGrid)

  // Load glyphs from IndexedDB whenever the active project changes
  useEffect(() => {
    if (!currentProject) return
    getGlyphsForProject(currentProject.id).then(setGlyphs)
  }, [currentProject?.id])

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key.toLowerCase()) {
        case 'b': setActiveTool('pencil'); break
        case 'e': setActiveTool('eraser'); break
        case 'g': setShowGridFn(!showGrid); break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showGrid])

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="border-border flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('home')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <FileType className="text-muted-foreground h-4 w-4" />
        <span className="text-sm font-medium">{currentProject?.name ?? 'Untitled'}</span>
        <span className="text-muted-foreground text-xs">
          {currentProject?.settings.fontSize}px · {currentProject?.glyphs.length} glyphs
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Auto-saved</span>
          <Button size="sm" className="h-7 text-xs" onClick={() => setExportOpen(true)}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </header>

      {/* Editor workspace */}
      <div className="flex flex-1 overflow-hidden">
        <GlyphList />

        <div className="flex flex-1 flex-col overflow-hidden">
          <EditorToolbar />
          <PixelEditor />
        </div>

        <RightPanel />
      </div>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  )
}
