import { describe, it, expect } from 'vitest'
import { createProject, updateProject, serializeProject, deserializeProject } from './project'
import { defaultFontSettings } from './types'

describe('createProject', () => {
  it('creates a project with a uuid id', () => {
    const p = createProject('My Font')
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('trims the name', () => {
    const p = createProject('  My Font  ')
    expect(p.name).toBe('My Font')
  })

  it('falls back to "Untitled" for empty name', () => {
    const p = createProject('')
    expect(p.name).toBe('Untitled')
  })

  it('applies default font settings', () => {
    const p = createProject('Test')
    expect(p.settings).toEqual(defaultFontSettings())
  })

  it('merges custom settings', () => {
    const p = createProject('Test', { fontSize: 16 })
    expect(p.settings.fontSize).toBe(16)
    expect(p.settings.lineHeight).toBe(defaultFontSettings().lineHeight)
  })

  it('starts with no glyphs', () => {
    const p = createProject('Test')
    expect(p.glyphs).toEqual([])
  })
})

describe('updateProject', () => {
  it('updates fields and bumps updatedAt', () => {
    const p = createProject('Test')
    const before = p.updatedAt
    const updated = updateProject(p, { name: 'New Name' })
    expect(updated.name).toBe('New Name')
    expect(updated.updatedAt).toBeGreaterThanOrEqual(before)
    expect(updated.id).toBe(p.id)
  })

  it('does not mutate the original', () => {
    const p = createProject('Test')
    updateProject(p, { name: 'Changed' })
    expect(p.name).toBe('Test')
  })
})

describe('serialize/deserialize', () => {
  it('round-trips a project through JSON', () => {
    const p = createProject('Round Trip')
    const restored = deserializeProject(serializeProject(p))
    expect(restored).toEqual(p)
  })

  it('throws on invalid data', () => {
    expect(() => deserializeProject('{}')).toThrow()
  })
})
