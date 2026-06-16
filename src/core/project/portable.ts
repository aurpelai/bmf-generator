import { makeBaseLayerFromBitmap } from './layers';
import type { Glyph, Project } from './types';

export interface PortableProject {
  version: 1;
  project: Project;
  // Pixels serialized as base64 strings to survive JSON round-trip.
  // Layers are intentionally not serialized in v1 — they're reconstructed from the legacy bitmap on import.
  glyphs: Array<Omit<Glyph, 'pixels' | 'layers'> & { pixels: string }>;
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
    glyphs: glyphs.map((glyph) => {
      // Drop `layers` from the serialized payload; v1 portable bundles store the legacy bitmap shape only.
      const rest: Omit<Glyph, 'pixels' | 'layers'> = {
        codePoint: glyph.codePoint,
        projectId: glyph.projectId,
        width: glyph.width,
        height: glyph.height,
        xoffset: glyph.xoffset,
        yoffset: glyph.yoffset,
        xadvance: glyph.xadvance,
        isDirty: glyph.isDirty,
        alphaThreshold: glyph.alphaThreshold,
      };

      return { ...rest, pixels: toBase64(glyph.pixels) };
    }),
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

  const glyphs: Glyph[] = data.glyphs.map((glyph) => {
    const pixels = fromBase64(glyph.pixels);

    return {
      ...glyph,
      pixels,
      layers: [
        makeBaseLayerFromBitmap({
          pixels,
          width: glyph.width,
          height: glyph.height,
          xoffset: glyph.xoffset,
          yoffset: glyph.yoffset,
        }),
      ],
    };
  });

  return { project: data.project, glyphs };
}
