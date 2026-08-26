import { navigationRouteTitleKeys } from '@/api/generated/menuRoutes'
import { coreMessages } from './catalog/core'
import { accountMessages } from './catalog/account'
import { exportJobMessages } from './catalog/export-jobs'
import { monitorJobsMessages } from './catalog/monitor-jobs'
import { monitorToolsMessages } from './catalog/monitor-tools'
import { shellMessages } from './catalog/shell'
import { systemMessages } from './catalog/system'

export const messageCatalogs = [
  coreMessages,
  shellMessages,
  accountMessages,
  exportJobMessages,
  monitorToolsMessages,
  monitorJobsMessages,
  systemMessages,
] as const

export const messages = {
  'zh-CN': {
    ...shellMessages['zh-CN'],
    ...accountMessages['zh-CN'],
    ...exportJobMessages['zh-CN'],
    ...monitorToolsMessages['zh-CN'],
    ...monitorJobsMessages['zh-CN'],
    ...systemMessages['zh-CN'],
    monitor: {
      ...monitorToolsMessages['zh-CN'].monitor,
      ...monitorJobsMessages['zh-CN'].monitor,
    },
    ...coreMessages['zh-CN'],
  },
  'en-US': {
    ...shellMessages['en-US'],
    ...accountMessages['en-US'],
    ...exportJobMessages['en-US'],
    ...monitorToolsMessages['en-US'],
    ...monitorJobsMessages['en-US'],
    ...systemMessages['en-US'],
    monitor: {
      ...monitorToolsMessages['en-US'].monitor,
      ...monitorJobsMessages['en-US'].monitor,
    },
    ...coreMessages['en-US'],
  },
} as const

export const navigationTitleKeys: Readonly<Record<string, string>> = Object.freeze({
  ...navigationRouteTitleKeys,
  登录: 'login',
  重置密码: 'resetPassword',
  个人中心: 'profile',
  我的导出: 'exports',
  监控管理: 'monitor',
  运行监控: 'runtime',
  数据库连接池: 'dbPool',
  重定向: 'redirect',
  无权限: 'unauthorized',
  禁止访问: 'forbidden',
  页面不存在: 'notFound',
  服务器错误: 'serverError',
})
