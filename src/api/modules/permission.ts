import request from '@/api/request'

const BASE = '/system/permissions'
const ROLE_BASE = '/system/roles'

export interface PermissionTreeNode {
  /** id 为 number|string，后端 Snowflake ID 序列化为字符串避免 JS 精度丢失 */
  id: number | string
  name: string
  code: string
  parent_id?: number | string | null
  perm_type?: string
  path?: string | null
  http_method?: string | null
  icon?: string | null
  sort?: number
  status?: string
  children?: PermissionTreeNode[]
}

/** 获取权限树（用于角色权限分配） */
export function getPermissionTree() {
  return request<PermissionTreeNode[]>({
    url: `${BASE}/tree`,
    method: 'get',
  })
}

/** 查询角色已分配的权限ID列表 */
export function getRolePermissions(roleId: number | string) {
  return request<string[]>({
    url: `${ROLE_BASE}/${roleId}/permissions`,
    method: 'get',
  })
}
