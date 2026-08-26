import { monitorJobsEnUSMessages } from './monitor-jobs/en-US'
import { monitorJobsZhCNMessages } from './monitor-jobs/zh-CN'

export const monitorJobsMessages = {
  'zh-CN': monitorJobsZhCNMessages,
  'en-US': monitorJobsEnUSMessages,
} as const

export const messageCatalog = monitorJobsMessages
