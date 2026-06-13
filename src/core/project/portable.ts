import type { Project, Glyph } from './types'

export interface PortableProject {
  version: 1
  project: Project
  // Pixels serialized as base64 strings to survive JSON round-trip
  glyphs: Array<Omit<Glyph, 'pixels'> & { pixels: string }>
}

function toBase64(buf: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i])
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return buf
}

export function exportPortableProject(project: Project, glyphs: Glyph[]): string {
  const portable: PortableProject = {
    version: 1,
    project,
    glyphs: glyphs.map((g) => ({ ...g, pixels: toBase64(g.pixels) })),
  }
  return JSON.stringify(portable, null, 2)
}

export function importPortableProject(json: string): { project: Project; glyphs: Glyph[] } {
  const data = JSON.parse(json) as PortableProject
  if (data.version !== 1) throw new Error(`Unsupported project version: ${data.version}`)
  if (!data.project?.id) throw new Error('Invalid project bundle: missing project data')
  const glyphs: Glyph[] = data.glyphs.map((g) => ({
    ...g,
    pixels: fromBase64(g.pixels),
  }))
  return { project: data.project, glyphs }
}
