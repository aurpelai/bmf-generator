import { ArrowLeft, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'

export function EditorScreen() {
  const currentProject = useStore((s) => s.currentProject)
  const setView = useStore((s) => s.setView)

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="border-border flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setView('home')}
        >
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

      {/* Editor placeholder */}
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        Editor workspace coming in Phase 3 & 4.
      </div>
    </div>
  )
}
