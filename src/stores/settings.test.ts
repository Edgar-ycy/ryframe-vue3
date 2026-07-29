import { describe, expect, it } from 'vitest'
import { parseThemeColor, resolveReadableThemeColor } from './settings'

function relativeLuminance(color: string): number {
  const normalized = parseThemeColor(color)!
  const channel = (value: number) => {
    const scaled = value / 255
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(normalized.red) + 0.7152 * channel(normalized.green) + 0.0722 * channel(normalized.blue)
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
}

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

  it('derives readable foreground colors for custom theme colors', () => {
    for (const color of ['#4F46E5', '#EAB308', '#22C55E', '#F43F5E']) {
      expect(contrastRatio(resolveReadableThemeColor(color), '#F3F4F6')).toBeGreaterThanOrEqual(4.5)
    }
  })
})
