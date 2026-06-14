import type { Glyph, Project } from './types';

export interface PortableProject {
  version: 1;
  project: Project;
  // Pixels serialized as base64 strings to survive JSON round-trip
  glyphs: Array<Omit<Glyph, 'pixels'> & { pixels: string }>;
}

function toBase64(buf: Uint8Array): string {
  let binary = '';

  for (let index = 0; index < buf.length; index++) {
    binary += String.fromCharCode(buf[index]);
  }

  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    buf[index] = binary.charCodeAt(index);
  }

  return buf;
}

export function exportPortableProject(project: Project, glyphs: Glyph[]): string {
  const portable: PortableProject = {
    version: 1,
    project,
    glyphs: glyphs.map((glyph) => ({ ...glyph, pixels: toBase64(glyph.pixels) })),
  };

  return JSON.stringify(portable, null, 2);
}

export function importPortableProject(json: string): { project: Project; glyphs: Glyph[] } {
  const data = JSON.parse(json) as PortableProject;

  if (data.version !== 1) {
    throw new Error(`Unsupported project version: ${String(data.version)}`);
  }

  if (!data.project?.id) {
    throw new Error('Invalid project bundle: missing project data');
  }

  const glyphs: Glyph[] = data.glyphs.map((glyph) => ({
    ...glyph,
    pixels: fromBase64(glyph.pixels),
  }));

  return { project: data.project, glyphs };
}
