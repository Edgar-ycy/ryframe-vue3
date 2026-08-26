import { platformOperationsEnUSMessages } from './platform-operations/en-US'
import { platformOperationsZhCNMessages } from './platform-operations/zh-CN'

export const platformOperationsMessages = {
  'zh-CN': platformOperationsZhCNMessages,
  'en-US': platformOperationsEnUSMessages,
} as const

export const messageCatalog = platformOperationsMessages
