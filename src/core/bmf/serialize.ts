import type { BmfGlyphMetadata, Font, GlyphPlacement } from '../font/types';

export interface BmfGlyphData {
  placement: GlyphPlacement;
  codePoint: number;
  bmf: BmfGlyphMetadata;
}

export interface BmfSerializeInput {
  font: Font;
  glyphs: BmfGlyphData[];
  atlasWidth: number;
  atlasHeight: number;
  atlasFilename: string;
}

export function serializeBmfText(input: BmfSerializeInput): string {
  const { font, glyphs, atlasWidth, atlasHeight, atlasFilename } = input;
  const { settings, name } = font;
  const lines: string[] = [];

  lines.push(
    `info face="${name}" size=${settings.fontSize} bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1` +
      ` padding=${settings.padding.top},${settings.padding.right},${settings.padding.bottom},${settings.padding.left}` +
      ` spacing=${settings.spacing.x},${settings.spacing.y} outline=0`,
  );

  lines.push(
    `common lineHeight=${settings.lineHeight} base=${settings.base}` +
      ` scaleW=${atlasWidth} scaleH=${atlasHeight} pages=1 packed=0` +
      ` alphaChnl=0 redChnl=4 greenChnl=4 blueChnl=4`,
  );

  lines.push(`page id=0 file="${atlasFilename}"`);
  lines.push(`chars count=${glyphs.length}`);

  for (const { placement: p, bmf } of glyphs) {
    lines.push(
      `char id=${p.codePoint}` +
        ` x=${p.x} y=${p.y} width=${p.width} height=${p.height}` +
        ` xoffset=${bmf.xoffset} yoffset=${bmf.yoffset} xadvance=${bmf.xadvance}` +
        ` page=0 chnl=15`,
    );
  }

  return lines.join('\n') + '\n';
}
