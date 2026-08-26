import type { AppLocale } from '@/i18n'

export type ComponentSize = 'large' | 'default' | 'small'
export type ColorTheme = 'light' | 'dark'

export interface SettingsState {
  theme: ColorTheme
  themeColor: string
  componentSize: ComponentSize
  locale: AppLocale
  tagsView: boolean
  sidebarLogo: boolean
}

export interface ShellServerSettings {
  sideTheme?: string
  skinName?: string
}

export const DEFAULT_THEME_COLOR = '#4F46E5'

export const SKIN_COLOR_MAP: Readonly<Record<string, string>> = {
  'skin-blue': '#3B82F6',
  'skin-green': '#22C55E',
  'skin-purple': '#8B5CF6',
  'skin-red': '#F43F5E',
  'skin-yellow': '#EAB308',
}

export function createDefaultSettings(locale: AppLocale): SettingsState {
  return {
    theme: 'light',
    themeColor: DEFAULT_THEME_COLOR,
    componentSize: 'default',
    locale,
    tagsView: true,
    sidebarLogo: true,
  }
}
