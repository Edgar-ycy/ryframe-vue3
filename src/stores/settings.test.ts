import { describe, expect, it } from 'vitest'
import { parseThemeColor } from './settings'

describe('theme color parsing', () => {
  it('normalizes alpha-enabled hex colors without producing invalid channels', () => {
    expect(parseThemeColor('#6366f180')).toMatchObject({
      red: 99,
      green: 102,
      blue: 241,
      alpha: 128 / 255,
      css: 'rgba(99, 102, 241, 0.502)',
    })
    expect(parseThemeColor('#abc')).toMatchObject({
      red: 170,
      green: 187,
      blue: 204,
      alpha: 1,
      css: '#aabbcc',
    })
  })

  it('supports rgba picker values and rejects malformed values', () => {
    expect(parseThemeColor('rgba(10, 20, 30, 0.25)')).toMatchObject({
      red: 10,
      green: 20,
      blue: 30,
      alpha: 0.25,
      css: 'rgba(10, 20, 30, 0.25)',
    })
    expect(parseThemeColor('#12')).toBeUndefined()
    expect(parseThemeColor('rgba(1, 2, 300, 1)')).toBeUndefined()
  })
})
