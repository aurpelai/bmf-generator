import { db } from './db'
import type { Project } from '@/core/project'

export async function getAllProjects(): Promise<Project[]> {
  return db.projects.orderBy('updatedAt').reverse().toArray()
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id)
}

export async function saveProject(project: Project): Promise<void> {
  await db.projects.put(project)
}

export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', [db.projects, db.glyphs], async () => {
    await db.projects.delete(id)
    await db.glyphs.where('projectId').equals(id).delete()
  })
}
