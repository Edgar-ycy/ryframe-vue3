export type MessageLocale = 'zh-CN' | 'en-US'
export type LocaleMessages = Record<string, unknown>
export type MessageCatalog = Readonly<Record<MessageLocale, LocaleMessages>>

export interface MessageCatalogLoader {
  readonly id: string
  load(): Promise<MessageCatalog>
}
