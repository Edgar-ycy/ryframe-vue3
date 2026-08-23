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
    "defaultName": "配置迁移",
    "routeKey": "system.config-transfer",
    "titleKey": "configTransfer"
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
    "defaultName": "服务账号",
    "routeKey": "system.service-accounts",
    "titleKey": "serviceAccounts"
  },
  {
    "defaultName": "用户管理",
    "routeKey": "system.user",
    "titleKey": "user"
  }
] as const

export type MenuRouteKey = typeof menuRouteCatalog[number]['routeKey']

export const navigationRouteTitleKeys: Readonly<Record<string, string>> = Object.freeze({
  "home": "dashboard",
  "首页": "dashboard",
  "monitor": "systemMonitor",
  "系统监控": "systemMonitor",
  "monitor.cache": "cache",
  "缓存监控": "cache",
  "monitor.db-pool": "dbPoolMonitor",
  "连接池监控": "dbPoolMonitor",
  "monitor.jobs": "jobs",
  "后台任务": "jobs",
  "monitor.online": "online",
  "在线用户": "online",
  "monitor.overview": "overview",
  "运维总览": "overview",
  "monitor.retention": "retention",
  "数据保留": "retention",
  "monitor.runtime": "runtimeMonitor",
  "运行时监控": "runtimeMonitor",
  "monitor.schedules": "schedules",
  "定时任务": "schedules",
  "monitor.server": "server",
  "服务监控": "server",
  "platform": "platform",
  "平台管理": "platform",
  "platform.data-targets": "dataTargets",
  "数据目标": "dataTargets",
  "platform.product-plans": "productPlans",
  "产品套餐": "productPlans",
  "platform.tenant": "tenant",
  "租户管理": "tenant",
  "system": "system",
  "系统管理": "system",
  "system.authorization-diagnostics": "authorizationDiagnostics",
  "权限诊断": "authorizationDiagnostics",
  "system.config": "config",
  "参数设置": "config",
  "system.config-transfer": "configTransfer",
  "配置迁移": "configTransfer",
  "system.dept": "dept",
  "部门管理": "dept",
  "system.dict": "dict",
  "字典管理": "dict",
  "system.logininfor": "loginlog",
  "登录日志": "loginlog",
  "system.menu": "menu",
  "菜单管理": "menu",
  "system.notice": "notice",
  "通知公告": "notice",
  "system.operlog": "operlog",
  "操作日志": "operlog",
  "system.perm": "permission",
  "权限管理": "permission",
  "system.post": "post",
  "岗位管理": "post",
  "system.role": "role",
  "角色管理": "role",
  "system.service-accounts": "serviceAccounts",
  "服务账号": "serviceAccounts",
  "system.user": "user",
  "用户管理": "user"
})
