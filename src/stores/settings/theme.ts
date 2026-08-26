import { DEFAULT_THEME_COLOR } from './model'

export interface ParsedThemeColor {
  red: number
  green: number
  blue: number
  css: string
}

/** 只接受并规范化不含透明度的 `#RRGGBB` 主题色。 */
export function parseThemeColor(value: string | null | undefined): ParsedThemeColor | undefined {
  if (!value) return undefined
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim())
  if (!match) return undefined
  const hex = match[1].toUpperCase()
  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16),
    css: `#${hex}`,
  }
}

export function rgbToHsl(red: number, green: number, blue: number): [number, number, number] {
  const rf = red / 255
  const gf = green / 255
  const bf = blue / 255
  const max = Math.max(rf, gf, bf)
  const min = Math.min(rf, gf, bf)
  let hue = 0
  let saturation = 0
  const lightness = (max + min) / 2

  if (max !== min) {
    const delta = max - min
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    if (max === rf) hue = ((gf - bf) / delta + (gf < bf ? 6 : 0)) / 6
    else if (max === gf) hue = ((bf - rf) / delta + 2) / 6
    else hue = ((rf - gf) / delta + 4) / 6
  }

  return [Math.round(hue * 360), Math.round(saturation * 100), Math.round(lightness * 100)]
}

export function hslToHex(hue: number, saturation: number, lightness: number): string {
  const normalizedSaturation = saturation / 100
  const normalizedLightness = lightness / 100
  const chroma = (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const offset = normalizedLightness - chroma / 2
  let red = 0
  let green = 0
  let blue = 0

  if (hue < 60) [red, green] = [chroma, secondary]
  else if (hue < 120) [red, green] = [secondary, chroma]
  else if (hue < 180) [green, blue] = [chroma, secondary]
  else if (hue < 240) [green, blue] = [secondary, chroma]
  else if (hue < 300) [red, blue] = [secondary, chroma]
  else [red, blue] = [chroma, secondary]

  const toHex = (value: number) =>
    Math.round((value + offset) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

function relativeLuminance(red: number, green: number, blue: number): number {
  const channel = (value: number) => {
    const normalized = value / 255
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
}

function contrastRatio(foreground: ParsedThemeColor, background: [number, number, number]): number {
  const foregroundLuminance = relativeLuminance(foreground.red, foreground.green, foreground.blue)
  const backgroundLuminance = relativeLuminance(...background)
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  )
}

function findReadableThemeColor(
  hue: number,
  saturation: number,
  lightness: number,
  red: number,
  green: number,
  blue: number,
): string {
  const pageBackground: [number, number, number] = [243, 244, 246]
  const activeTagBackground: [number, number, number] = [
    Math.round(pageBackground[0] * 0.9 + red * 0.1),
    Math.round(pageBackground[1] * 0.9 + green * 0.1),
    Math.round(pageBackground[2] * 0.9 + blue * 0.1),
  ]

  for (
    let candidateLightness = Math.min(lightness, 50);
    candidateLightness >= 0;
    candidateLightness -= 1
  ) {
    const candidate = parseThemeColor(hslToHex(hue, saturation, candidateLightness))!
    if (
      contrastRatio(candidate, pageBackground) >= 4.5 &&
      contrastRatio(candidate, activeTagBackground) >= 4.5
    ) {
      return candidate.css
    }
  }

  return '#111827'
}

export function resolveReadableThemeColor(value: string): string {
  const parsed = parseThemeColor(value) ?? parseThemeColor(DEFAULT_THEME_COLOR)!
  const [hue, saturation, lightness] = rgbToHsl(parsed.red, parsed.green, parsed.blue)
  return findReadableThemeColor(hue, saturation, lightness, parsed.red, parsed.green, parsed.blue)
}
