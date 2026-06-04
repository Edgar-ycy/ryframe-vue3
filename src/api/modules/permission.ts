import request from '@/api/request'

const BASE = '/system/permissions'

export interface PermissionTreeNode {
  id: number
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
