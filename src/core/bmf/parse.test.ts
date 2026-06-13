import { describe, it, expect } from 'vitest'
import { parseBmfText } from './parse'

const SAMPLE_FNT = `\
info face="TestFont" size=32 bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=1,1,1,1 spacing=1,1 outline=0
common lineHeight=36 base=28 scaleW=512 scaleH=512 pages=1 packed=0 alphaChnl=0 redChnl=4 greenChnl=4 blueChnl=4
page id=0 file="TestFont.png"
chars count=2
char id=65 x=4 y=8 width=10 height=14 xoffset=0 yoffset=4 xadvance=11 page=0 chnl=15
char id=66 x=14 y=8 width=9 height=14 xoffset=1 yoffset=4 xadvance=11 page=0 chnl=15
`

describe('parseBmfText', () => {
  it('parses face name and size from info line', () => {
    const r = parseBmfText(SAMPLE_FNT)
    expect(r.info.face).toBe('TestFont')
    expect(r.info.size).toBe(32)
  })

  it('parses padding and spacing from info line', () => {
    const r = parseBmfText(SAMPLE_FNT)
    expect(r.info.padding).toEqual({ top: 1, right: 1, bottom: 1, left: 1 })
    expect(r.info.spacing).toEqual({ x: 1, y: 1 })
  })

  it('parses lineHeight, base, and atlas dimensions from common line', () => {
    const r = parseBmfText(SAMPLE_FNT)
    expect(r.common.lineHeight).toBe(36)
    expect(r.common.base).toBe(28)
    expect(r.common.scaleW).toBe(512)
    expect(r.common.scaleH).toBe(512)
  })

  it('parses atlas filename from page line', () => {
    const r = parseBmfText(SAMPLE_FNT)
    expect(r.atlasFilename).toBe('TestFont.png')
  })

  it('parses all char entries', () => {
    const r = parseBmfText(SAMPLE_FNT)
    expect(r.chars).toHaveLength(2)
  })

  it('parses char fields correctly', () => {
    const r = parseBmfText(SAMPLE_FNT)
    const a = r.chars.find((c) => c.id === 65)!
    expect(a).toBeDefined()
    expect(a.x).toBe(4)
    expect(a.y).toBe(8)
    expect(a.width).toBe(10)
    expect(a.height).toBe(14)
    expect(a.xoffset).toBe(0)
    expect(a.yoffset).toBe(4)
    expect(a.xadvance).toBe(11)
  })

  it('throws on missing info line', () => {
    expect(() => parseBmfText('common lineHeight=36 base=28 scaleW=512 scaleH=512 pages=1 packed=0')).toThrow(
      'Missing info line',
    )
  })

  it('throws on missing common line', () => {
    expect(() =>
      parseBmfText('info face="X" size=32 bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=0,0 outline=0'),
    ).toThrow('Missing common line')
  })

  it('handles blank lines and Windows line endings', () => {
    const crlf = SAMPLE_FNT.replace(/\n/g, '\r\n')
    const r = parseBmfText(crlf)
    expect(r.chars).toHaveLength(2)
  })
})
