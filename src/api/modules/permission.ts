import request from '@/api/request'

const BASE = '/system/permissions'

export interface PermissionTreeNode {
  /** id 为 number|string，后端 Snowflake ID 序列化为字符串避免 JS 精度丢失 */
  id: number | string
  name: string
  code: string
  children?: PermissionTreeNode[]
}

/** 获取权限树（用于角色权限分配） */
export function getPermissionTree() {
  return request<PermissionTreeNode[]>({
    url: `${BASE}/tree`,
    method: 'get',
  })
}
