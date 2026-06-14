import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, FileType, HelpCircle, ImageIcon, Settings, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { getGlyphsForProject } from '@/db/glyphs'
import { saveGlyphs } from '@/db/glyphs'
import { GlyphList } from './glyph-list/GlyphList'
import { PixelEditor } from './pixel-editor/PixelEditor'
import { EditorToolbar } from './toolbar/EditorToolbar'
import { SettingsDialog } from './SettingsDialog'
import { AtlasFloat } from './AtlasFloat'
import { PreviewFloat } from './PreviewFloat'
import { ExportDialog } from '@/features/export/ExportDialog'
import { HelpOverlay } from './HelpOverlay'
import type { EditorTool } from '@/store/editorSlice'

export function EditorScreen() {
  const [exportOpen, setExportOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [atlasOpen, setAtlasOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [glyphListCollapsed, setGlyphListCollapsed] = useState(false)
  const [glyphListWidth, setGlyphListWidth] = useState(192)
  const draggingRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const d = draggingRef.current
      if (!d) return
      const clientX = e.clientX
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const delta = clientX - d.startX
        const w = d.startWidth + delta
        if (w < 80) { setGlyphListCollapsed(true); draggingRef.current = null }
        else setGlyphListWidth(Math.min(400, Math.max(120, w)))
      })
    }
    function onMouseUp() {
      draggingRef.current = null
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, [])

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

      // Ctrl+Shift+S — settings
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        setSettingsOpen((v) => !v)
        return
      }

      // Ctrl+S is a no-op (auto-saved) but prevent browser save dialog
      if (ctrl && e.key === 's') {
        e.preventDefault()
        return
      }

      // Ctrl+Shift+A — toggle atlas
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setAtlasOpen((v) => !v)
        return
      }

      // Ctrl+Shift+P — toggle preview
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setPreviewOpen((v) => !v)
        return
      }

      // Cmd+' — toggle all non-editor elements
      if (ctrl && e.key === "'") {
        e.preventDefault()
        const anyVisible = !glyphListCollapsed || atlasOpen || previewOpen
        if (anyVisible) {
          setGlyphListCollapsed(true)
          setAtlasOpen(false)
          setPreviewOpen(false)
        } else {
          setGlyphListCollapsed(false)
          setAtlasOpen(true)
          setPreviewOpen(true)
        }
        return
      }

      if (isTyping(e)) return

      // Tool switching
      switch (e.key.toLowerCase()) {
        case 'b': setActiveTool('pencil'); break
        case 'e': setActiveTool('eraser'); break
        case 'm': setActiveTool('move'); break
        case 'z': setActiveTool('zoom'); break
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
  }, [showGrid, activeTool, selectedCodePoint, glyphs, glyphListCollapsed, atlasOpen, previewOpen])

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
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Atlas (Cmd+Shift+A)" onClick={() => setAtlasOpen((v) => !v)}>
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Preview (Cmd+Shift+P)" onClick={() => setPreviewOpen((v) => !v)}>
            <Type className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Settings (Cmd+Shift+S)" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
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
        <GlyphList
          collapsed={glyphListCollapsed}
          onCollapse={() => setGlyphListCollapsed(!glyphListCollapsed)}
          width={glyphListCollapsed ? 40 : glyphListWidth}
        />

        {/* Left drag handle */}
        {!glyphListCollapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize glyph list"
            className="hover:bg-primary/40 w-1 shrink-0 cursor-col-resize transition-colors"
            onMouseDown={(e) => {
              e.preventDefault()
              draggingRef.current = { startX: e.clientX, startWidth: glyphListWidth }
            }}
            onDoubleClick={() => setGlyphListCollapsed(true)}
          />
        )}

        <div className="relative flex flex-1 flex-col overflow-hidden">
          <EditorToolbar />
          <PixelEditor />
          <AtlasFloat open={atlasOpen} onClose={() => setAtlasOpen(false)} />
          <PreviewFloat open={previewOpen} onClose={() => setPreviewOpen(false)} />
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <HelpOverlay open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}
