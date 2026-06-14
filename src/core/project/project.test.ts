import { describe, expect, it } from 'vitest';

import { createProject, deserializeProject, serializeProject, updateProject } from './project';
import { defaultFontSettings } from './types';

describe('createProject', () => {
  it('creates a project with a uuid id', () => {
    const project = createProject('My Font');

    expect(project.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('trims the name', () => {
    const project = createProject('  My Font  ');

    expect(project.name).toBe('My Font');
  });

  it('falls back to "Untitled" for empty name', () => {
    const project = createProject('');

    expect(project.name).toBe('Untitled');
  });

  it('applies default font settings', () => {
    const project = createProject('Test');

    expect(project.settings).toEqual(defaultFontSettings());
  });

  it('merges custom settings', () => {
    const project = createProject('Test', { fontSize: 16 });

    expect(project.settings.fontSize).toBe(16);
    expect(project.settings.lineHeight).toBe(defaultFontSettings().lineHeight);
  });

  it('starts with no glyphs', () => {
    const project = createProject('Test');

    expect(project.glyphs).toEqual([]);
  });
});

describe('updateProject', () => {
  it('updates fields and bumps updatedAt', () => {
    const project = createProject('Test');
    const before = project.updatedAt;
    const updated = updateProject(project, { name: 'New Name' });

    expect(updated.name).toBe('New Name');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(before);
    expect(updated.id).toBe(project.id);
  });

  it('does not mutate the original', () => {
    const project = createProject('Test');

    updateProject(project, { name: 'Changed' });
    expect(project.name).toBe('Test');
  });
});

describe('serialize/deserialize', () => {
  it('round-trips a project through JSON', () => {
    const project = createProject('Round Trip');
    const restored = deserializeProject(serializeProject(project));

    expect(restored).toEqual(project);
  });

  it('throws on invalid data', () => {
    expect(() => deserializeProject('{}')).toThrow();
  });
});
