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
  "system.user": "user",
  "用户管理": "user"
})

export const navigationRouteFallbackNames: Readonly<Record<string, Readonly<Record<'zh-CN' | 'en-US', string>>>> = Object.freeze({
  "home": {
    "en-US": "首页",
    "zh-CN": "首页"
  },
  "首页": {
    "en-US": "首页",
    "zh-CN": "首页"
  },
  "monitor": {
    "en-US": "系统监控",
    "zh-CN": "系统监控"
  },
  "系统监控": {
    "en-US": "系统监控",
    "zh-CN": "系统监控"
  },
  "monitor.cache": {
    "en-US": "缓存监控",
    "zh-CN": "缓存监控"
  },
  "缓存监控": {
    "en-US": "缓存监控",
    "zh-CN": "缓存监控"
  },
  "monitor.db-pool": {
    "en-US": "连接池监控",
    "zh-CN": "连接池监控"
  },
  "连接池监控": {
    "en-US": "连接池监控",
    "zh-CN": "连接池监控"
  },
  "monitor.jobs": {
    "en-US": "后台任务",
    "zh-CN": "后台任务"
  },
  "后台任务": {
    "en-US": "后台任务",
    "zh-CN": "后台任务"
  },
  "monitor.online": {
    "en-US": "在线用户",
    "zh-CN": "在线用户"
  },
  "在线用户": {
    "en-US": "在线用户",
    "zh-CN": "在线用户"
  },
  "monitor.overview": {
    "en-US": "运维总览",
    "zh-CN": "运维总览"
  },
  "运维总览": {
    "en-US": "运维总览",
    "zh-CN": "运维总览"
  },
  "monitor.retention": {
    "en-US": "数据保留",
    "zh-CN": "数据保留"
  },
  "数据保留": {
    "en-US": "数据保留",
    "zh-CN": "数据保留"
  },
  "monitor.runtime": {
    "en-US": "运行时监控",
    "zh-CN": "运行时监控"
  },
  "运行时监控": {
    "en-US": "运行时监控",
    "zh-CN": "运行时监控"
  },
  "monitor.schedules": {
    "en-US": "定时任务",
    "zh-CN": "定时任务"
  },
  "定时任务": {
    "en-US": "定时任务",
    "zh-CN": "定时任务"
  },
  "monitor.server": {
    "en-US": "服务监控",
    "zh-CN": "服务监控"
  },
  "服务监控": {
    "en-US": "服务监控",
    "zh-CN": "服务监控"
  },
  "platform": {
    "en-US": "平台管理",
    "zh-CN": "平台管理"
  },
  "平台管理": {
    "en-US": "平台管理",
    "zh-CN": "平台管理"
  },
  "platform.data-targets": {
    "en-US": "数据目标",
    "zh-CN": "数据目标"
  },
  "数据目标": {
    "en-US": "数据目标",
    "zh-CN": "数据目标"
  },
  "platform.product-plans": {
    "en-US": "产品套餐",
    "zh-CN": "产品套餐"
  },
  "产品套餐": {
    "en-US": "产品套餐",
    "zh-CN": "产品套餐"
  },
  "platform.tenant": {
    "en-US": "租户管理",
    "zh-CN": "租户管理"
  },
  "租户管理": {
    "en-US": "租户管理",
    "zh-CN": "租户管理"
  },
  "system": {
    "en-US": "系统管理",
    "zh-CN": "系统管理"
  },
  "系统管理": {
    "en-US": "系统管理",
    "zh-CN": "系统管理"
  },
  "system.authorization-diagnostics": {
    "en-US": "权限诊断",
    "zh-CN": "权限诊断"
  },
  "权限诊断": {
    "en-US": "权限诊断",
    "zh-CN": "权限诊断"
  },
  "system.config": {
    "en-US": "参数设置",
    "zh-CN": "参数设置"
  },
  "参数设置": {
    "en-US": "参数设置",
    "zh-CN": "参数设置"
  },
  "system.config-transfer": {
    "en-US": "配置迁移",
    "zh-CN": "配置迁移"
  },
  "配置迁移": {
    "en-US": "配置迁移",
    "zh-CN": "配置迁移"
  },
  "system.dept": {
    "en-US": "部门管理",
    "zh-CN": "部门管理"
  },
  "部门管理": {
    "en-US": "部门管理",
    "zh-CN": "部门管理"
  },
  "system.dict": {
    "en-US": "字典管理",
    "zh-CN": "字典管理"
  },
  "字典管理": {
    "en-US": "字典管理",
    "zh-CN": "字典管理"
  },
  "system.logininfor": {
    "en-US": "登录日志",
    "zh-CN": "登录日志"
  },
  "登录日志": {
    "en-US": "登录日志",
    "zh-CN": "登录日志"
  },
  "system.menu": {
    "en-US": "菜单管理",
    "zh-CN": "菜单管理"
  },
  "菜单管理": {
    "en-US": "菜单管理",
    "zh-CN": "菜单管理"
  },
  "system.notice": {
    "en-US": "Notices",
    "zh-CN": "通知公告"
  },
  "通知公告": {
    "en-US": "Notices",
    "zh-CN": "通知公告"
  },
  "system.operlog": {
    "en-US": "操作日志",
    "zh-CN": "操作日志"
  },
  "操作日志": {
    "en-US": "操作日志",
    "zh-CN": "操作日志"
  },
  "system.perm": {
    "en-US": "权限管理",
    "zh-CN": "权限管理"
  },
  "权限管理": {
    "en-US": "权限管理",
    "zh-CN": "权限管理"
  },
  "system.post": {
    "en-US": "Posts",
    "zh-CN": "岗位管理"
  },
  "岗位管理": {
    "en-US": "Posts",
    "zh-CN": "岗位管理"
  },
  "system.role": {
    "en-US": "角色管理",
    "zh-CN": "角色管理"
  },
  "角色管理": {
    "en-US": "角色管理",
    "zh-CN": "角色管理"
  },
  "system.user": {
    "en-US": "用户管理",
    "zh-CN": "用户管理"
  },
  "用户管理": {
    "en-US": "用户管理",
    "zh-CN": "用户管理"
  }
})
