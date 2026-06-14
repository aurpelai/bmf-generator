import { describe, expect, it } from 'vitest';

import { parseBmfText } from './parse';

const SAMPLE_FNT = `\
info face="TestFont" size=32 bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=1,1,1,1 spacing=1,1 outline=0
common lineHeight=36 base=28 scaleW=512 scaleH=512 pages=1 packed=0 alphaChnl=0 redChnl=4 greenChnl=4 blueChnl=4
page id=0 file="TestFont.png"
chars count=2
char id=65 x=4 y=8 width=10 height=14 xoffset=0 yoffset=4 xadvance=11 page=0 chnl=15
char id=66 x=14 y=8 width=9 height=14 xoffset=1 yoffset=4 xadvance=11 page=0 chnl=15
`;

describe('parseBmfText', () => {
  it('parses face name and size from info line', () => {
    const result = parseBmfText(SAMPLE_FNT);

    expect(result.info.face).toBe('TestFont');
    expect(result.info.size).toBe(32);
  });

  it('parses padding and spacing from info line', () => {
    const result = parseBmfText(SAMPLE_FNT);

    expect(result.info.padding).toEqual({ top: 1, right: 1, bottom: 1, left: 1 });
    expect(result.info.spacing).toEqual({ x: 1, y: 1 });
  });

  it('parses lineHeight, base, and atlas dimensions from common line', () => {
    const result = parseBmfText(SAMPLE_FNT);

    expect(result.common.lineHeight).toBe(36);
    expect(result.common.base).toBe(28);
    expect(result.common.scaleW).toBe(512);
    expect(result.common.scaleH).toBe(512);
  });

  it('parses atlas filename from page line', () => {
    const result = parseBmfText(SAMPLE_FNT);

    expect(result.atlasFilename).toBe('TestFont.png');
  });

  it('parses all char entries', () => {
    const result = parseBmfText(SAMPLE_FNT);

    expect(result.chars).toHaveLength(2);
  });

  it('parses char fields correctly', () => {
    const result = parseBmfText(SAMPLE_FNT);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const char = result.chars.find((bmfChar) => bmfChar.id === 65)!; // test: asserted defined on next line

    expect(char).toBeDefined();
    expect(char.x).toBe(4);
    expect(char.y).toBe(8);
    expect(char.width).toBe(10);
    expect(char.height).toBe(14);
    expect(char.xoffset).toBe(0);
    expect(char.yoffset).toBe(4);
    expect(char.xadvance).toBe(11);
  });

  it('throws on missing info line', () => {
    expect(() =>
      parseBmfText('common lineHeight=36 base=28 scaleW=512 scaleH=512 pages=1 packed=0'),
    ).toThrow('Missing info line');
  });

  it('throws on missing common line', () => {
    expect(() =>
      parseBmfText(
        'info face="X" size=32 bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=0,0 outline=0',
      ),
    ).toThrow('Missing common line');
  });

  it('handles blank lines and Windows line endings', () => {
    const crlf = SAMPLE_FNT.replace(/\n/g, '\r\n');
    const result = parseBmfText(crlf);

    expect(result.chars).toHaveLength(2);
  });
});
