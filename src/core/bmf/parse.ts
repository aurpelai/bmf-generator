export interface BmfInfoLine {
  face: string
  size: number
  padding: { top: number; right: number; bottom: number; left: number }
  spacing: { x: number; y: number }
}

export interface BmfCommonLine {
  lineHeight: number
  base: number
  scaleW: number
  scaleH: number
}

export interface BmfCharLine {
  id: number
  x: number
  y: number
  width: number
  height: number
  xoffset: number
  yoffset: number
  xadvance: number
}

export interface BmfParseResult {
  info: BmfInfoLine
  common: BmfCommonLine
  atlasFilename: string
  chars: BmfCharLine[]
}

function parseFields(line: string): Record<string, string> {
  const fields: Record<string, string> = {}
  // Match key=value and key="quoted value"
  const re = /(\w+)=("([^"]*)"|(\S+))/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    fields[m[1]] = m[3] ?? m[4]
  }
  return fields
}

function int(fields: Record<string, string>, key: string, fallback = 0): number {
  const v = parseInt(fields[key] ?? '', 10)
  return isNaN(v) ? fallback : v
}

export function parseBmfText(text: string): BmfParseResult {
  let info: BmfInfoLine | null = null
  let common: BmfCommonLine | null = null
  let atlasFilename = 'atlas.png'
  const chars: BmfCharLine[] = []

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('info ')) {
      const f = parseFields(line)
      const [pt, pr, pb, pl] = (f.padding ?? '0,0,0,0').split(',').map(Number)
      const [sx, sy] = (f.spacing ?? '0,0').split(',').map(Number)
      info = {
        face: f.face ?? 'Unknown',
        size: int(f, 'size', 32),
        padding: { top: pt ?? 0, right: pr ?? 0, bottom: pb ?? 0, left: pl ?? 0 },
        spacing: { x: sx ?? 0, y: sy ?? 0 },
      }
    } else if (line.startsWith('common ')) {
      const f = parseFields(line)
      common = {
        lineHeight: int(f, 'lineHeight'),
        base: int(f, 'base'),
        scaleW: int(f, 'scaleW', 512),
        scaleH: int(f, 'scaleH', 512),
      }
    } else if (line.startsWith('page ')) {
      const f = parseFields(line)
      if (f.file) atlasFilename = f.file
    } else if (line.startsWith('char ')) {
      const f = parseFields(line)
      chars.push({
        id: int(f, 'id'),
        x: int(f, 'x'),
        y: int(f, 'y'),
        width: int(f, 'width'),
        height: int(f, 'height'),
        xoffset: int(f, 'xoffset'),
        yoffset: int(f, 'yoffset'),
        xadvance: int(f, 'xadvance'),
      })
    }
  }

  if (!info) throw new Error('Missing info line in .fnt file')
  if (!common) throw new Error('Missing common line in .fnt file')

  return { info, common, atlasFilename, chars }
}
