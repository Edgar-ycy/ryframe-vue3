/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

export const menuRouteCatalog = [
  {
    "defaultName": "业务管理",
    "routeKey": "business",
    "titleKey": "business"
  },
  {
    "defaultName": "设备管理",
    "routeKey": "business.device",
    "titleKey": "device"
  },
  {
    "defaultName": "首页",
    "routeKey": "home",
    "titleKey": "dashboard"
  },
  {
    "defaultName": "系统监控",
    "routeKey": "monitor",
    "titleKey": "systemMonitor"
  },
  {
    "defaultName": "缓存监控",
    "routeKey": "monitor.cache",
    "titleKey": "cache"
  },
  {
    "defaultName": "连接池监控",
    "routeKey": "monitor.db-pool",
    "titleKey": "dbPoolMonitor"
  },
  {
    "defaultName": "后台任务",
    "routeKey": "monitor.jobs",
    "titleKey": "jobs"
  },
  {
    "defaultName": "在线用户",
    "routeKey": "monitor.online",
    "titleKey": "online"
  },
  {
    "defaultName": "运维总览",
    "routeKey": "monitor.overview",
    "titleKey": "overview"
  },
  {
    "defaultName": "数据保留",
    "routeKey": "monitor.retention",
    "titleKey": "retention"
  },
  {
    "defaultName": "运行时监控",
    "routeKey": "monitor.runtime",
    "titleKey": "runtimeMonitor"
  },
  {
    "defaultName": "定时任务",
    "routeKey": "monitor.schedules",
    "titleKey": "schedules"
  },
  {
    "defaultName": "服务监控",
    "routeKey": "monitor.server",
    "titleKey": "server"
  },
  {
    "defaultName": "平台管理",
    "routeKey": "platform",
    "titleKey": "platform"
  },
  {
    "defaultName": "配置迁移",
    "routeKey": "platform.config-transfer",
    "titleKey": "configTransfer"
  },
  {
    "defaultName": "数据目标",
    "routeKey": "platform.data-targets",
    "titleKey": "dataTargets"
  },
  {
    "defaultName": "产品套餐",
    "routeKey": "platform.product-plans",
    "titleKey": "productPlans"
  },
  {
    "defaultName": "租户管理",
    "routeKey": "platform.tenant",
    "titleKey": "tenant"
  },
  {
    "defaultName": "系统管理",
    "routeKey": "system",
    "titleKey": "system"
  },
  {
    "defaultName": "权限诊断",
    "routeKey": "system.authorization-diagnostics",
    "titleKey": "authorizationDiagnostics"
  },
  {
    "defaultName": "参数设置",
    "routeKey": "system.config",
    "titleKey": "config"
  },
  {
    "defaultName": "部门管理",
    "routeKey": "system.dept",
    "titleKey": "dept"
  },
  {
    "defaultName": "字典管理",
    "routeKey": "system.dict",
    "titleKey": "dict"
  },
  {
    "defaultName": "登录日志",
    "routeKey": "system.logininfor",
    "titleKey": "loginlog"
  },
  {
    "defaultName": "菜单管理",
    "routeKey": "system.menu",
    "titleKey": "menu"
  },
  {
    "defaultName": "通知公告",
    "routeKey": "system.notice",
    "titleKey": "notice"
  },
  {
    "defaultName": "操作日志",
    "routeKey": "system.operlog",
    "titleKey": "operlog"
  },
  {
    "defaultName": "权限管理",
    "routeKey": "system.perm",
    "titleKey": "permission"
  },
  {
    "defaultName": "岗位管理",
    "routeKey": "system.post",
    "titleKey": "post"
  },
  {
    "defaultName": "角色管理",
    "routeKey": "system.role",
    "titleKey": "role"
  },
  {
    "defaultName": "用户管理",
    "routeKey": "system.user",
    "titleKey": "user"
  }
] as const

export type MenuRouteKey = typeof menuRouteCatalog[number]['routeKey']

export const navigationRouteTitleKeys: Readonly<Record<string, string>> = Object.freeze({
  "business": "business",
  "business.device": "device",
  "home": "dashboard",
  "monitor": "systemMonitor",
  "monitor.cache": "cache",
  "monitor.db-pool": "dbPoolMonitor",
  "monitor.jobs": "jobs",
  "monitor.online": "online",
  "monitor.overview": "overview",
  "monitor.retention": "retention",
  "monitor.runtime": "runtimeMonitor",
  "monitor.schedules": "schedules",
  "monitor.server": "server",
  "platform": "platform",
  "platform.config-transfer": "configTransfer",
  "platform.data-targets": "dataTargets",
  "platform.product-plans": "productPlans",
  "platform.tenant": "tenant",
  "system": "system",
  "system.authorization-diagnostics": "authorizationDiagnostics",
  "system.config": "config",
  "system.dept": "dept",
  "system.dict": "dict",
  "system.logininfor": "loginlog",
  "system.menu": "menu",
  "system.notice": "notice",
  "system.operlog": "operlog",
  "system.perm": "permission",
  "system.post": "post",
  "system.role": "role",
  "system.user": "user"
})

export const navigationResourceDefaultNames = Object.freeze({
  "device": "设备管理",
  "notice": "通知公告",
  "post": "岗位管理"
})

export const navigationResourceNames = Object.freeze({
  "device": "Devices",
  "notice": "Notices",
  "post": "Posts"
})
