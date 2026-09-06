import { createI18n } from 'vue-i18n'
import { menuRouteCatalog, navigationResourceNames } from '@/api/generated/menuRoutes'
import { messages, navigationTitleKeys } from './messages'

export type AppLocale = keyof typeof messages

const DEFAULT_LOCALE: AppLocale = 'zh-CN'
const LOCALE_STORAGE_KEY = 'ryframe_locale'

export function normalizeLocale(value: unknown): AppLocale | undefined {
  if (value === 'zh-CN' || value === 'en-US') return value
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().replace('_', '-').toLowerCase()
  if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-hans') return 'zh-CN'
  if (normalized === 'en' || normalized === 'en-us' || normalized === 'en-gb') return 'en-US'
  return undefined
}

function storedLocale(): AppLocale | undefined {
  if (typeof localStorage === 'undefined') return undefined
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
  } catch {
    return undefined
  }
}

function browserLocale(): AppLocale | undefined {
  if (typeof navigator === 'undefined') return undefined
  for (const value of navigator.languages ?? [navigator.language]) {
    const locale = normalizeLocale(value)
    if (locale) return locale
  }
  return normalizeLocale(navigator.language)
}

function initialLocale(): AppLocale {
  return storedLocale() ?? browserLocale() ?? DEFAULT_LOCALE
}

function applyDocumentLocale(locale: AppLocale): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
}

const initial = initialLocale()
applyDocumentLocale(initial)

export const i18n = createI18n({
  legacy: false,
  locale: initial,
  fallbackLocale: DEFAULT_LOCALE,
  messages,
  missingWarn: false,
  fallbackWarn: false,
})

export function getApplicationLocale(): AppLocale {
  return normalizeLocale(i18n.global.locale.value) ?? DEFAULT_LOCALE
}

interface SetApplicationLocaleOptions {
  persist?: boolean
}

export function setApplicationLocale(
  locale: AppLocale,
  options: SetApplicationLocaleOptions = {},
): void {
  i18n.global.locale.value = locale
  applyDocumentLocale(locale)
  if (options.persist === false) return
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    return
  }
}

export function translate(key: string, values?: Record<string, unknown>): string {
  return values ? i18n.global.t(key, values) : i18n.global.t(key)
}

function navigationFallback(title: string, defaultTitle: unknown): string {
  if (typeof defaultTitle === 'string' && defaultTitle !== title) return defaultTitle
  return menuRouteCatalog.find((menu) => menu.routeKey === title)?.defaultName ?? title
}

export function translateNavigationTitle(title: unknown, defaultTitle?: unknown): string {
  if (typeof title !== 'string') return ''
  const fallback = navigationFallback(title, defaultTitle)
  const key = navigationTitleKeys[title]
  if (key) {
    const resourceNames = navigationResourceNames[key as keyof typeof navigationResourceNames]
    if (resourceNames) {
      return getApplicationLocale() === 'zh-CN' ? fallback : resourceNames
    }
    const translated = translate(`navigation.${key}`)
    if (translated !== `navigation.${key}`) return translated
  }
  return fallback
}

export function formatLocalizedDate(value: string): string {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return value
  return new Intl.DateTimeFormat(getApplicationLocale(), {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(timestamp)
}

/** 将可空日期统一显示为本地化时间或占位符。 */
export function formatOptionalLocalizedDate(value: string | null | undefined): string {
  return value ? formatLocalizedDate(value) : '—'
}
