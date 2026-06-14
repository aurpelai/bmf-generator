import type { StateCreator } from 'zustand';

import type { Project } from '@/core/project';

export interface ProjectSlice {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  updateCurrentProject: (changes: Partial<Omit<Project, 'id' | 'createdAt'>>) => void;
}

export const createProjectSlice: StateCreator<ProjectSlice> = (set) => ({
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),
  updateCurrentProject: (changes) =>
    set((state) => ({
      currentProject: state.currentProject
        ? { ...state.currentProject, ...changes, updatedAt: Date.now() }
        : null,
    })),
});
