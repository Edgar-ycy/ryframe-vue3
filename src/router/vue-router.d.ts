import type { PermissionCode } from '@/api/generated/permissions'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    hidden?: boolean
    affix?: boolean
    alwaysShow?: boolean
    permission?: PermissionCode
    activeMenu?: string
    noCache?: boolean
    sort?: number
    isFrame?: boolean
    buttonPerms?: readonly PermissionCode[]
    requiresPermission?: boolean
    requiresMultiTenancy?: boolean
    requiredCapabilities?: readonly string[]
  }
}
