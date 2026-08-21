/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

export const menuRouteCatalog = [
  {
    "defaultName": "首页",
    "routeKey": "home",
    "titleKey": "dashboard"
  },
  {
    "defaultName": "系统管理",
    "routeKey": "system",
    "titleKey": "system"
  },
  {
    "defaultName": "系统监控",
    "routeKey": "monitor",
    "titleKey": "systemMonitor"
  },
  {
    "defaultName": "平台管理",
    "routeKey": "platform",
    "titleKey": "platform"
  },
  {
    "defaultName": "用户管理",
    "routeKey": "system.user",
    "titleKey": "user"
  },
  {
    "defaultName": "角色管理",
    "routeKey": "system.role",
    "titleKey": "role"
  },
  {
    "defaultName": "菜单管理",
    "routeKey": "system.menu",
    "titleKey": "menu"
  },
  {
    "defaultName": "部门管理",
    "routeKey": "system.dept",
    "titleKey": "dept"
  },
  {
    "defaultName": "岗位管理",
    "routeKey": "system.post",
    "titleKey": "post"
  },
  {
    "defaultName": "字典管理",
    "routeKey": "system.dict",
    "titleKey": "dict"
  },
  {
    "defaultName": "参数设置",
    "routeKey": "system.config",
    "titleKey": "config"
  },
  {
    "defaultName": "配置迁移",
    "routeKey": "system.config-transfer",
    "titleKey": "configTransfer"
  },
  {
    "defaultName": "服务账号",
    "routeKey": "system.service-accounts",
    "titleKey": "serviceAccounts"
  },
  {
    "defaultName": "产品套餐",
    "routeKey": "platform.product-plans",
    "titleKey": "productPlans"
  },
  {
    "defaultName": "数据目标",
    "routeKey": "platform.data-targets",
    "titleKey": "dataTargets"
  },
  {
    "defaultName": "租户管理",
    "routeKey": "platform.tenant",
    "titleKey": "tenant"
  },
  {
    "defaultName": "通知公告",
    "routeKey": "system.notice",
    "titleKey": "notice"
  },
  {
    "defaultName": "权限管理",
    "routeKey": "system.perm",
    "titleKey": "permission"
  },
  {
    "defaultName": "权限诊断",
    "routeKey": "system.authorization-diagnostics",
    "titleKey": "authorizationDiagnostics"
  },
  {
    "defaultName": "操作日志",
    "routeKey": "system.operlog",
    "titleKey": "operlog"
  },
  {
    "defaultName": "登录日志",
    "routeKey": "system.logininfor",
    "titleKey": "loginlog"
  },
  {
    "defaultName": "在线用户",
    "routeKey": "monitor.online",
    "titleKey": "online"
  },
  {
    "defaultName": "服务监控",
    "routeKey": "monitor.server",
    "titleKey": "server"
  },
  {
    "defaultName": "运行时监控",
    "routeKey": "monitor.runtime",
    "titleKey": "runtimeMonitor"
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
    "defaultName": "定时任务",
    "routeKey": "monitor.schedules",
    "titleKey": "schedules"
  },
  {
    "defaultName": "数据保留",
    "routeKey": "monitor.retention",
    "titleKey": "retention"
  },
  {
    "defaultName": "运维总览",
    "routeKey": "monitor.overview",
    "titleKey": "overview"
  }
] as const

export type MenuRouteKey = typeof menuRouteCatalog[number]['routeKey']

export const navigationRouteTitleKeys: Readonly<Record<string, string>> = Object.freeze({
  "home": "dashboard",
  "首页": "dashboard",
  "system": "system",
  "系统管理": "system",
  "monitor": "systemMonitor",
  "系统监控": "systemMonitor",
  "platform": "platform",
  "平台管理": "platform",
  "system.user": "user",
  "用户管理": "user",
  "system.role": "role",
  "角色管理": "role",
  "system.menu": "menu",
  "菜单管理": "menu",
  "system.dept": "dept",
  "部门管理": "dept",
  "system.post": "post",
  "岗位管理": "post",
  "system.dict": "dict",
  "字典管理": "dict",
  "system.config": "config",
  "参数设置": "config",
  "system.config-transfer": "configTransfer",
  "配置迁移": "configTransfer",
  "system.service-accounts": "serviceAccounts",
  "服务账号": "serviceAccounts",
  "platform.product-plans": "productPlans",
  "产品套餐": "productPlans",
  "platform.data-targets": "dataTargets",
  "数据目标": "dataTargets",
  "platform.tenant": "tenant",
  "租户管理": "tenant",
  "system.notice": "notice",
  "通知公告": "notice",
  "system.perm": "permission",
  "权限管理": "permission",
  "system.authorization-diagnostics": "authorizationDiagnostics",
  "权限诊断": "authorizationDiagnostics",
  "system.operlog": "operlog",
  "操作日志": "operlog",
  "system.logininfor": "loginlog",
  "登录日志": "loginlog",
  "monitor.online": "online",
  "在线用户": "online",
  "monitor.server": "server",
  "服务监控": "server",
  "monitor.runtime": "runtimeMonitor",
  "运行时监控": "runtimeMonitor",
  "monitor.cache": "cache",
  "缓存监控": "cache",
  "monitor.db-pool": "dbPoolMonitor",
  "连接池监控": "dbPoolMonitor",
  "monitor.jobs": "jobs",
  "后台任务": "jobs",
  "monitor.schedules": "schedules",
  "定时任务": "schedules",
  "monitor.retention": "retention",
  "数据保留": "retention",
  "monitor.overview": "overview",
  "运维总览": "overview"
})
