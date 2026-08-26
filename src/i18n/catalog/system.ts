import { systemEnUSMessages } from './system/en-US'
import { systemZhCNMessages } from './system/zh-CN'

export const systemMessages = {
  'zh-CN': systemZhCNMessages,
  'en-US': systemEnUSMessages,
} as const

export const messageCatalog = systemMessages
