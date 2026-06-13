import { useEffect } from 'react'
import { ArrowLeft, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { getGlyphsForProject } from '@/db/glyphs'
import { RightPanel } from './RightPanel'

export function EditorScreen() {
  const currentProject = useStore((s) => s.currentProject)
  const setView = useStore((s) => s.setView)
  const glyphs = useStore((s) => s.glyphs)
  const setGlyphs = useStore((s) => s.setGlyphs)

  // Load glyphs from IndexedDB when editor opens (e.g. after page refresh)
  useEffect(() => {
    if (!currentProject || glyphs.length > 0) return
    getGlyphsForProject(currentProject.id).then(setGlyphs)
  }, [currentProject?.id])

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
        <div className="ml-auto">
          <span className="text-muted-foreground text-xs">Auto-saved</span>
        </div>
      </header>

      {/* Editor workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Centre placeholder — replaced in Phase 4 */}
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          {glyphs.length > 0
            ? `${glyphs.length} glyphs loaded — pixel editor coming in Phase 4.`
            : 'No glyphs loaded.'}
        </div>

        <RightPanel />
      </div>
    </div>
  )
}
