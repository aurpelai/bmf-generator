import { describe, expect, it } from 'vitest';

import { makeBlankGlyph } from './glyphs';
import { exportPortableProject, importPortableProject } from './portable';
import { createProject } from './project';
import type { Glyph } from './types';

function inkedGlyph(projectId: string, codePoint: number, bytes: number[]): Glyph {
  const glyph = makeBlankGlyph(projectId, codePoint, 4, 4);

  glyph.pixels.set(bytes);

  return glyph;
}

describe('portable project round-trip', () => {
  it('preserves project fields through export → import', () => {
    const project = createProject('Round Trip');
    const glyphs: Glyph[] = [makeBlankGlyph(project.id, 0x41, 4, 4)];

    const json = exportPortableProject(project, glyphs);
    const restored = importPortableProject(json);

    expect(restored.project).toEqual(project);
  });

  it('preserves glyph pixel bytes', () => {
    const project = createProject('Pixels');
    const pattern = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160];
    const glyphs: Glyph[] = [inkedGlyph(project.id, 0x41, pattern)];

    const restored = importPortableProject(exportPortableProject(project, glyphs));

    expect(Array.from(restored.glyphs[0].pixels)).toEqual(pattern);
  });

  it('restores pixels as Uint8Array, not a plain array', () => {
    const project = createProject('Type');
    const glyphs: Glyph[] = [makeBlankGlyph(project.id, 0x41, 4, 4)];

    const restored = importPortableProject(exportPortableProject(project, glyphs));

    expect(restored.glyphs[0].pixels).toBeInstanceOf(Uint8Array);
  });

  it('handles bytes across the full 0–255 range', () => {
    const project = createProject('Range');
    const bytes = Array.from({ length: 16 }, (_value, index) => index * 17); // 0, 17, 34, … 255
    const glyphs: Glyph[] = [inkedGlyph(project.id, 0x41, bytes)];

    const restored = importPortableProject(exportPortableProject(project, glyphs));

    expect(Array.from(restored.glyphs[0].pixels)).toEqual(bytes);
  });

  it('preserves multiple glyphs in order', () => {
    const project = createProject('Order');
    const glyphs: Glyph[] = [
      makeBlankGlyph(project.id, 0x41, 4, 4),
      makeBlankGlyph(project.id, 0x42, 4, 4),
      makeBlankGlyph(project.id, 0x43, 4, 4),
    ];

    const restored = importPortableProject(exportPortableProject(project, glyphs));

    expect(restored.glyphs.map((glyph) => glyph.codePoint)).toEqual([0x41, 0x42, 0x43]);
  });
});

describe('importPortableProject error handling', () => {
  it('throws on unsupported version', () => {
    const bundle = JSON.stringify({ version: 2, project: { id: 'x' }, glyphs: [] });

    expect(() => importPortableProject(bundle)).toThrow('Unsupported project version: 2');
  });

  it('throws when the project bundle is missing a project id', () => {
    const bundle = JSON.stringify({ version: 1, project: {}, glyphs: [] });

    expect(() => importPortableProject(bundle)).toThrow('Invalid project bundle');
  });
});
