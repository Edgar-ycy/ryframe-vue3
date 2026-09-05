import { defineStore } from 'pinia'
import { createDefaultSettings, type SettingsState } from './settings/model'

export type {
  ColorTheme,
  ComponentSize,
  SettingsState,
  ShellServerSettings,
} from './settings/model'
export { parseThemeColor, resolveReadableThemeColor } from './settings/theme'

/** 只保存界面设置的内存投影；持久化和运行时副作用由 app coordinator 负责。 */
export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => createDefaultSettings('zh-CN'),
})
