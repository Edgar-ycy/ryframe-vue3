import type { ColorTheme, ComponentSize } from './model'
import { DEFAULT_THEME_COLOR } from './model'
import { hslToHex, parseThemeColor, resolveReadableThemeColor, rgbToHsl } from './theme'

export function applyThemeColor(color: string): void {
  const parsed = parseThemeColor(color) ?? parseThemeColor(DEFAULT_THEME_COLOR)!
  const { red, green, blue, css } = parsed
  const [hue, saturation, lightness] = rgbToHsl(red, green, blue)
  const style = document.documentElement.style

  style.setProperty('--el-color-primary', css)
  style.setProperty('--color-primary', css)
  style.setProperty('--color-primary-readable', resolveReadableThemeColor(css))
  style.setProperty('--color-primary-rgb', `${red}, ${green}, ${blue}`)

  for (let index = 3; index <= 9; index += 1) {
    const lightnessVariant = Math.min(lightness + (index - 3) * 6.5, 95)
    style.setProperty(
      `--el-color-primary-light-${index}`,
      hslToHex(hue, saturation, lightnessVariant),
    )
  }

  const darkColor = hslToHex(hue, Math.min(saturation + 8, 100), Math.max(lightness - 8, 8))
  style.setProperty('--el-color-primary-dark-2', darkColor)
  style.setProperty('--color-primary-dark', darkColor)
  style.setProperty(
    '--color-primary-light',
    hslToHex(hue, Math.max(saturation - 4, 0), Math.min(lightness + 10, 95)),
  )
  style.setProperty(
    '--sidebar-bg',
    `linear-gradient(180deg, hsl(${hue}, 25%, 20%) 0%, hsl(${hue}, 20%, 14%) 100%)`,
  )
  style.setProperty('--sidebar-item-hover-bg', `rgba(${red}, ${green}, ${blue}, 0.12)`)
  style.setProperty(
    '--sidebar-item-active-bg',
    `linear-gradient(135deg, rgba(${red}, ${green}, ${blue}, 0.25) 0%, rgba(${red}, ${green}, ${blue}, 0.20) 100%)`,
  )
  style.setProperty('--tag-active-bg', `rgba(${red}, ${green}, ${blue}, 0.1)`)
  style.setProperty('--tag-active-bg-dark', `rgba(${red}, ${green}, ${blue}, 0.2)`)
  style.setProperty('--table-row-hover-bg', `rgba(${red}, ${green}, ${blue}, 0.05)`)
}

export function applyTheme(theme: ColorTheme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.setAttribute('data-theme', theme)
}

export function applyComponentSize(size: ComponentSize): void {
  document.documentElement.setAttribute('data-size', size)
}
