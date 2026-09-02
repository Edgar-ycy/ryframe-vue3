import type { Component } from 'vue'

export interface RouteProjectionMeta {
  title?: string
  icon?: string
  hidden?: boolean
  affix?: boolean
  alwaysShow?: boolean
  permission?: string
  activeMenu?: string
  noCache?: boolean
  sort?: number
  isFrame?: boolean
  buttonPerms?: readonly string[]
  requiresPermission?: boolean
  requiresMultiTenancy?: boolean
  requiredCapabilities?: readonly string[]
}

export type RouteProjectionComponent = Component | (() => Promise<Component>)

/** Store 只保存与路由实现无关的可访问页面投影。 */
export interface RouteProjection {
  path: string
  name?: string | symbol
  redirect?: string
  component?: RouteProjectionComponent
  meta?: RouteProjectionMeta
  children?: RouteProjection[]
}
