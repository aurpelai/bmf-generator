import { useEffect, useState, useRef } from 'react'
import { Plus, Upload, FolderOpen, Pencil, Trash2, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getAllProjects, saveProject, deleteProject } from '@/db'
import { useStore } from '@/store'
import type { Project } from '@/core/project'
import { NewProjectDialog } from './NewProjectDialog'
import { FontImportWizard } from './FontImportWizard'
import { BmfImportDialog } from './BmfImportDialog'
import { DeleteProjectDialog } from './DeleteProjectDialog'

export function HomeScreen() {
  const [projects, setProjects] = useState<Project[]>([])
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [bmfImportOpen, setBmfImportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const setCurrentProject = useStore((s) => s.setCurrentProject)
  const setView = useStore((s) => s.setView)

  async function loadProjects() {
    setProjects(await getAllProjects())
  }

  useEffect(() => { loadProjects() }, [])

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus()
  }, [renamingId])

  function openProject(project: Project) {
    setCurrentProject(project)
    setView('editor')
  }

  function startRename(project: Project, e: React.MouseEvent) {
    e.stopPropagation()
    setRenamingId(project.id)
    setRenameValue(project.name)
  }

  async function commitRename(project: Project) {
    const name = renameValue.trim() || project.name
    const updated = { ...project, name, updatedAt: Date.now() }
    await saveProject(updated)
    setRenamingId(null)
    loadProjects()
  }

  async function handleDelete(project: Project) {
    await deleteProject(project.id)
    setDeleteTarget(null)
    loadProjects()
  }

  function formatDate(ts: number) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(ts)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="border-border flex h-12 items-center gap-3 border-b px-4">
        <FileType className="text-muted-foreground h-4 w-4" />
        <span className="text-sm font-medium">BMF Generator</span>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {/* Actions */}
        <div className="mb-8 flex gap-3">
          <Button onClick={() => setNewProjectOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New blank project
          </Button>
          <Button variant="outline" onClick={() => setBmfImportOpen(true)}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Load existing project
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import font
          </Button>
        </div>

        <Separator className="mb-6" />

        {/* Project list */}
        {projects.length === 0 ? (
          <div className="text-muted-foreground py-16 text-center text-sm">
            <p>No projects yet.</p>
            <p className="mt-1">Create a blank project or import a font file to get started.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            <h2 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
              Recent projects
            </h2>
            {projects.map((project) => (
              <div
                key={project.id}
                className="border-border bg-card hover:bg-accent group flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors"
                onClick={() => openProject(project)}
              >
                <div className="min-w-0 flex-1">
                  {renamingId === project.id ? (
                    <input
                      ref={renameInputRef}
                      className="bg-input text-foreground w-full rounded px-1 py-0.5 text-sm outline-none"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(project)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(project)
                        if (e.key === 'Escape') setRenamingId(null)
                        e.stopPropagation()
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p className="truncate text-sm font-medium">{project.name}</p>
                  )}
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {project.settings.fontSize}px · {project.glyphs.length} glyphs · {formatDate(project.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => startRename(project, e)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(project) }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
      <FontImportWizard open={importOpen} onOpenChange={setImportOpen} />
      <BmfImportDialog open={bmfImportOpen} onOpenChange={(o) => { setBmfImportOpen(o); if (!o) loadProjects() }} />
      {deleteTarget && (
        <DeleteProjectDialog
          projectName={deleteTarget.name}
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </div>
  )
}
