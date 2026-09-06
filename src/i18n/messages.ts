import { navigationRouteTitleKeys } from '@/api/generated/menuRoutes'
import { coreMessages } from './catalog/core'
import { exportJobMessages } from './catalog/export-jobs'
import { shellMessages } from './catalog/shell'

export const initialMessageCatalogs = [coreMessages, shellMessages, exportJobMessages] as const

export const messages = {
  'zh-CN': {
    ...shellMessages['zh-CN'],
    ...exportJobMessages['zh-CN'],
    ...coreMessages['zh-CN'],
  },
  'en-US': {
    ...shellMessages['en-US'],
    ...exportJobMessages['en-US'],
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
