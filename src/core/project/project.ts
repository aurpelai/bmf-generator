import { type FontSettings, type Project, defaultFontSettings } from './types'

export function createProject(name: string, settings?: Partial<FontSettings>): Project {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: name.trim() || 'Untitled',
    createdAt: now,
    updatedAt: now,
    settings: { ...defaultFontSettings(), ...settings },
    glyphs: [],
  }
}

export function updateProject(project: Project, changes: Partial<Omit<Project, 'id' | 'createdAt'>>): Project {
  return { ...project, ...changes, updatedAt: Date.now() }
}

export function serializeProject(project: Project): string {
  return JSON.stringify(project)
}

export function deserializeProject(raw: string): Project {
  const data = JSON.parse(raw) as Project
  if (!data.id || !data.name || !data.settings) {
    throw new Error('Invalid project data')
  }
  return data
}
