import { defaultFontSettings, type Project } from '@/core/project';

import { db } from './db';

function hydrateProject(project: Project): Project {
  // Backfill fields added after the initial schema so projects created before
  // the change keep loading cleanly.
  if (project.settings.alphaThreshold === undefined) {
    return {
      ...project,
      settings: { ...project.settings, alphaThreshold: defaultFontSettings().alphaThreshold },
    };
  }

  return project;
}

export async function getAllProjects(): Promise<Project[]> {
  const projects = await db.projects.orderBy('updatedAt').reverse().toArray();

  return projects.map(hydrateProject);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const project = await db.projects.get(id);

  return project ? hydrateProject(project) : project;
}

export async function saveProject(project: Project): Promise<void> {
  await db.projects.put(project);
}

export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', [db.projects, db.glyphs], async () => {
    await db.projects.delete(id);
    await db.glyphs.where('projectId').equals(id).delete();
  });
}
