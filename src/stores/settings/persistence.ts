import { normalizeLocale } from '@/i18n'
import type { SettingsState } from './model'
import { parseThemeColor } from './theme'

const STORAGE_KEY = 'ryframe_settings'
const SETTINGS_SCHEMA_VERSION = 1

export function loadSettings(defaults: SettingsState): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('schema_version' in parsed) ||
      parsed.schema_version !== SETTINGS_SCHEMA_VERSION ||
      !('settings' in parsed) ||
      typeof parsed.settings !== 'object' ||
      parsed.settings === null
    ) {
      return { ...defaults }
    }

    const value = parsed.settings as Partial<Record<keyof SettingsState, unknown>>
    const theme = value.theme === 'light' || value.theme === 'dark' ? value.theme : defaults.theme
    const themeColor =
      typeof value.themeColor === 'string'
        ? (parseThemeColor(value.themeColor)?.css ?? defaults.themeColor)
        : defaults.themeColor
    const componentSize = ['large', 'default', 'small'].includes(String(value.componentSize))
      ? (value.componentSize as SettingsState['componentSize'])
      : defaults.componentSize
    const locale =
      typeof value.locale === 'string'
        ? (normalizeLocale(value.locale) ?? defaults.locale)
        : defaults.locale

    return {
      theme,
      themeColor,
      componentSize,
      locale,
      tagsView: typeof value.tagsView === 'boolean' ? value.tagsView : defaults.tagsView,
      sidebarLogo:
        typeof value.sidebarLogo === 'boolean' ? value.sidebarLogo : defaults.sidebarLogo,
    }
  } catch {
    return { ...defaults }
  }
}

export function saveSettings(state: SettingsState): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ schema_version: SETTINGS_SCHEMA_VERSION, settings: state }),
  )
}
