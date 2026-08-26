import { monitorToolsEnUSMessages } from './monitor-tools/en-US'
import { monitorToolsZhCNMessages } from './monitor-tools/zh-CN'

export const monitorToolsMessages = {
  'zh-CN': monitorToolsZhCNMessages,
  'en-US': monitorToolsEnUSMessages,
} as const

export const messageCatalog = monitorToolsMessages
