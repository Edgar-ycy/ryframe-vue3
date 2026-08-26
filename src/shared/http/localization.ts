export interface HttpLocalizationAdapter {
  translate(key: string, values?: Record<string, unknown>): string
  getLocale(): string
}

const fallbackAdapter: HttpLocalizationAdapter = {
  translate: (key) => key,
  getLocale: () => 'zh-CN',
}

let localization = fallbackAdapter

/** 由应用启动层注入本地化能力，HTTP 基础设施不感知具体 i18n 实现。 */
export function configureHttpLocalization(adapter: HttpLocalizationAdapter): void {
  localization = adapter
}

export function httpTranslate(key: string, values?: Record<string, unknown>): string {
  return localization.translate(key, values)
}

export function getHttpLocale(): string {
  return localization.getLocale()
}
