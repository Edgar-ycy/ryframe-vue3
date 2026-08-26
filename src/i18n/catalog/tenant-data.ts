import { tenantDataEnUSMessages } from './tenant-data/en-US'
import { tenantDataZhCNMessages } from './tenant-data/zh-CN'

export const tenantDataMessages = {
  'zh-CN': tenantDataZhCNMessages,
  'en-US': tenantDataEnUSMessages,
} as const

export const messageCatalog = tenantDataMessages
