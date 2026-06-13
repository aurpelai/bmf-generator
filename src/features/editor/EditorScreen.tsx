import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, Download, FileType, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { getGlyphsForProject } from '@/db/glyphs'
import { saveGlyphs } from '@/db/glyphs'
import { GlyphList } from './glyph-list/GlyphList'
import { PixelEditor } from './pixel-editor/PixelEditor'
import { EditorToolbar } from './toolbar/EditorToolbar'
import { RightPanel } from './RightPanel'
import { ExportDialog } from '@/features/export/ExportDialog'
import { HelpOverlay } from './HelpOverlay'
import type { EditorTool } from '@/store/editorSlice'

export function EditorScreen() {
  const [exportOpen, setExportOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [glyphListCollapsed, setGlyphListCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)

  const currentProject = useStore((s) => s.currentProject)
  const setView = useStore((s) => s.setView)
  const setGlyphs = useStore((s) => s.setGlyphs)
  const activeTool = useStore((s) => s.activeTool)
  const setActiveTool = useStore((s) => s.setActiveTool)
  const showGrid = useStore((s) => s.showGrid)
  const setShowGrid = useStore((s) => s.setShowGrid)
  const selectedCodePoint = useStore((s) => s.selectedCodePoint)
  const glyphs = useStore((s) => s.glyphs)
  const upsertGlyph = useStore((s) => s.upsertGlyph)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)

  // Track the tool to restore after Space/Alt temporary overrides
  const toolBeforeOverride = useRef<EditorTool | null>(null)

  // Load glyphs from IndexedDB whenever the active project changes
  useEffect(() => {
    if (!currentProject) return
    getGlyphsForProject(currentProject.id).then(setGlyphs)
  }, [currentProject?.id])

  // Keyboard shortcuts
  useEffect(() => {
    function isTyping(e: KeyboardEvent) {
      return e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
    }

    function onKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey

      // Undo / redo
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (selectedCodePoint == null) return
        const snapshot = undo(selectedCodePoint)
        if (!snapshot) return
        const g = glyphs.find((g) => g.codePoint === selectedCodePoint)
        if (!g) return
        const updated = { ...g, pixels: snapshot.pixels, xoffset: snapshot.xoffset, yoffset: snapshot.yoffset, isDirty: true }
        upsertGlyph(updated)
        saveGlyphs([updated])
        return
      }
      if (ctrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        if (selectedCodePoint == null) return
        const snapshot = redo(selectedCodePoint)
        if (!snapshot) return
        const g = glyphs.find((g) => g.codePoint === selectedCodePoint)
        if (!g) return
        const updated = { ...g, pixels: snapshot.pixels, xoffset: snapshot.xoffset, yoffset: snapshot.yoffset, isDirty: true }
        upsertGlyph(updated)
        saveGlyphs([updated])
        return
      }

      // Export
      if (ctrl && e.key === 'e') {
        e.preventDefault()
        setExportOpen(true)
        return
      }

      // Ctrl+S is a no-op (auto-saved) but prevent browser save dialog
      if (ctrl && e.key === 's') {
        e.preventDefault()
        return
      }

      if (isTyping(e)) return

      // Tool switching
      switch (e.key.toLowerCase()) {
        case 'b': setActiveTool('pencil'); break
        case 'e': setActiveTool('eraser'); break
        case 'm': setActiveTool('move'); break
        case 'g': setShowGrid(!showGrid); break
      }

      if (e.key === '?') { setHelpOpen(true); return }

      // Space — temporarily activate move tool
      if (e.key === ' ' && !e.repeat && activeTool !== 'move') {
        e.preventDefault()
        toolBeforeOverride.current = activeTool
        setActiveTool('move')
      }

      // Alt — invert active tool (pencil↔eraser)
      if (e.key === 'Alt' && !e.repeat) {
        if (activeTool === 'pencil') { toolBeforeOverride.current = 'pencil'; setActiveTool('eraser') }
        else if (activeTool === 'eraser') { toolBeforeOverride.current = 'eraser'; setActiveTool('pencil') }
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      // Restore tool after Space/Alt released
      if ((e.key === ' ' || e.key === 'Alt') && toolBeforeOverride.current !== null) {
        setActiveTool(toolBeforeOverride.current)
        toolBeforeOverride.current = null
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [showGrid, activeTool, selectedCodePoint, glyphs])

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
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Keyboard shortcuts (?)" onClick={() => setHelpOpen(true)}>
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => setExportOpen(true)}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </header>

      {/* Editor workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Glyph list — full or collapsed strip */}
        <GlyphList collapsed={glyphListCollapsed} onCollapse={() => setGlyphListCollapsed(!glyphListCollapsed)} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <EditorToolbar />
          <PixelEditor />
        </div>

        {/* Right panel — full or collapsed sliver */}
        {rightPanelCollapsed ? (
          <div className="border-border flex w-6 shrink-0 flex-col border-l">
            <div
              className="border-border flex h-9 shrink-0 cursor-pointer items-center justify-center border-b transition-colors hover:bg-muted"
              onClick={() => setRightPanelCollapsed(false)}
              title="Show panel"
            >
              <ChevronLeft className="text-muted-foreground h-3.5 w-3.5" />
            </div>
          </div>
        ) : (
          <RightPanel onCollapse={() => setRightPanelCollapsed(true)} />
        )}
      </div>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <HelpOverlay open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}
