export interface BmfInfoLine {
  face: string;
  size: number;
  padding: { top: number; right: number; bottom: number; left: number };
  spacing: { x: number; y: number };
}

export interface BmfCommonLine {
  lineHeight: number;
  base: number;
  scaleW: number;
  scaleH: number;
}

export interface BmfCharLine {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
}

export interface BmfParseResult {
  info: BmfInfoLine;
  common: BmfCommonLine;
  atlasFilename: string;
  chars: BmfCharLine[];
}

function parseFields(line: string): Record<string, string> {
  const fields: Record<string, string> = {};
  // Match key=value and key="quoted value"
  const re = /(\w+)=("([^"]*)"|(\S+))/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(line)) !== null) {
    fields[m[1]] = m[3] ?? m[4];
  }

  return fields;
}

function int(fields: Record<string, string>, key: string, fallback = 0): number {
  const value = parseInt(fields[key] ?? '', 10);

  return isNaN(value) ? fallback : value;
}

export function parseBmfText(text: string): BmfParseResult {
  let info: BmfInfoLine | null = null;
  let common: BmfCommonLine | null = null;
  let atlasFilename = 'atlas.png';
  const chars: BmfCharLine[] = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();

    if (!line) {
      continue;
    }

    if (line.startsWith('info ')) {
      const fields = parseFields(line);
      const [pt, pr, pb, pl] = (fields.padding ?? '0,0,0,0').split(',').map(Number);
      const [sx, sy] = (fields.spacing ?? '0,0').split(',').map(Number);

      info = {
        face: fields.face ?? 'Unknown',
        size: int(fields, 'size', 32),
        padding: { top: pt ?? 0, right: pr ?? 0, bottom: pb ?? 0, left: pl ?? 0 },
        spacing: { x: sx ?? 0, y: sy ?? 0 },
      };
    } else if (line.startsWith('common ')) {
      const fields = parseFields(line);

      common = {
        lineHeight: int(fields, 'lineHeight'),
        base: int(fields, 'base'),
        scaleW: int(fields, 'scaleW', 512),
        scaleH: int(fields, 'scaleH', 512),
      };
    } else if (line.startsWith('page ')) {
      const fields = parseFields(line);

      if (fields.file) {
        atlasFilename = fields.file;
      }
    } else if (line.startsWith('char ')) {
      const fields = parseFields(line);

      chars.push({
        id: int(fields, 'id'),
        x: int(fields, 'x'),
        y: int(fields, 'y'),
        width: int(fields, 'width'),
        height: int(fields, 'height'),
        xoffset: int(fields, 'xoffset'),
        yoffset: int(fields, 'yoffset'),
        xadvance: int(fields, 'xadvance'),
      });
    }
  }

  if (!info) {
    throw new Error('Missing info line in .fnt file');
  }

  if (!common) {
    throw new Error('Missing common line in .fnt file');
  }

  return { info, common, atlasFilename, chars };
}
