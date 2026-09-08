import { getApplicationLocale, setApplicationLocale } from '@/i18n'
import { useSettingsStore } from '@/stores/settings'
import {
  createDefaultSettings,
  SKIN_COLOR_MAP,
  type ColorTheme,
  type ComponentSize,
  type SettingsState,
  type ShellServerSettings,
} from '@/stores/settings/model'
import { parseThemeColor } from '@/stores/settings/theme'
import { applyComponentSize, applyTheme, applyThemeColor } from './domAdapter'
import { loadSettings, saveSettings } from './persistence'

type SettingsStore = ReturnType<typeof useSettingsStore>

const initializedDefaults = new WeakMap<SettingsStore, SettingsState>()

function settingsStore(): SettingsStore {
  return useSettingsStore()
}

function persistSettings(store: SettingsStore): void {
  saveSettings(store.$state)
}

function requireInitialized(store: SettingsStore, action: string): void {
  if (!initializedDefaults.has(store)) throw new Error(`${action}前必须先初始化设置`)
}

/** 读取持久化设置并一次性发布内存、DOM 与语言投影。 */
export function initializeSettings(): void {
  const store = settingsStore()
  if (initializedDefaults.has(store)) return
  const defaults = createDefaultSettings(getApplicationLocale())
  const settings = loadSettings(defaults)
  store.$patch(settings)
  applyTheme(settings.theme)
  applyThemeColor(settings.themeColor)
  applyComponentSize(settings.componentSize)
  setApplicationLocale(settings.locale, { persist: false })
  initializedDefaults.set(store, defaults)
}

export function setTheme(theme: ColorTheme): void {
  const store = settingsStore()
  requireInitialized(store, '修改设置')
  if (store.theme === theme) return
  store.theme = theme
  applyTheme(theme)
  persistSettings(store)
}

export function setThemeColor(color: string): void {
  const parsed = parseThemeColor(color)
  if (!parsed) return
  const store = settingsStore()
  requireInitialized(store, '修改设置')
  if (store.themeColor === parsed.css) return
  store.themeColor = parsed.css
  applyThemeColor(parsed.css)
  persistSettings(store)
}

export function setComponentSize(size: ComponentSize): void {
  const store = settingsStore()
  requireInitialized(store, '修改设置')
  if (store.componentSize === size) return
  store.componentSize = size
  applyComponentSize(size)
  persistSettings(store)
}

export function setLocale(locale: SettingsState['locale']): void {
  const store = settingsStore()
  requireInitialized(store, '修改设置')
  if (store.locale === locale) return
  store.locale = locale
  setApplicationLocale(locale)
  persistSettings(store)
}

export function toggleTagsView(): void {
  const store = settingsStore()
  requireInitialized(store, '修改设置')
  store.tagsView = !store.tagsView
  persistSettings(store)
}

export function toggleSidebarLogo(): void {
  const store = settingsStore()
  requireInitialized(store, '修改设置')
  store.sidebarLogo = !store.sidebarLogo
  persistSettings(store)
}

export function resetSettings(): void {
  const store = settingsStore()
  const defaults = initializedDefaults.get(store)
  if (!defaults) throw new Error('重置设置前必须先初始化设置')
  const previous = { ...store.$state }
  const keys = Object.keys(defaults) as Array<keyof SettingsState>
  if (keys.every((key) => previous[key] === defaults[key])) return
  store.$patch({ ...defaults })
  if (previous.theme !== store.theme) applyTheme(store.theme)
  if (previous.themeColor !== store.themeColor) applyThemeColor(store.themeColor)
  if (previous.componentSize !== store.componentSize) applyComponentSize(store.componentSize)
  if (previous.locale !== store.locale) setApplicationLocale(store.locale)
  persistSettings(store)
}

export function applyServerSettings(settings: ShellServerSettings): void {
  const store = settingsStore()
  requireInitialized(store, '应用服务端设置')
  let changed = false

  const theme =
    settings.sideTheme === 'theme-dark'
      ? 'dark'
      : settings.sideTheme === 'theme-light'
        ? 'light'
        : undefined
  if (theme && theme !== store.theme) {
    store.theme = theme
    applyTheme(theme)
    changed = true
  }

  const color = settings.skinName ? SKIN_COLOR_MAP[settings.skinName] : undefined
  if (color && color !== store.themeColor) {
    store.themeColor = color
    applyThemeColor(color)
    changed = true
  }

  if (changed) persistSettings(store)
}
