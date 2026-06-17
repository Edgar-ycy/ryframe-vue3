import request from '@/api/request'

const BASE = '/system/permissions'
const ROLE_BASE = '/system/roles'

export interface PermissionTreeNode {
  id: number | string
  name: string
  code: string
  parent_id?: number | string | null
  perm_type?: 'api' | 'menu' | string
  icon?: string | null
  sort?: number
  status?: string
  children?: PermissionTreeNode[]
}

export interface PermissionForm {
  name: string
  code: string
  parent_id?: number | string | null
  perm_type: 'api' | 'menu' | string
  icon?: string | null
  sort?: number
  status?: string
}

export interface PermissionSyncReport {
  scanned: number
  existing: number
  created: number
  missing: string[]
}

export function getPermissionTree(params?: { perm_type?: string }) {
  return request<PermissionTreeNode[]>({
    url: `${BASE}/tree`,
    method: 'get',
    params,
  })
}

export function getPermission(id: number | string) {
  return request<PermissionTreeNode>({
    url: `${BASE}/${id}`,
    method: 'get',
  })
}

export function createPermission(data: PermissionForm) {
  return request<PermissionTreeNode>({
    url: BASE,
    method: 'post',
    data,
  })
}

export function updatePermission(id: number | string, data: Partial<PermissionForm>) {
  return request<PermissionTreeNode>({
    url: `${BASE}/${id}`,
    method: 'put',
    data,
  })
}

export function deletePermission(id: number | string) {
  return request({
    url: `${BASE}/${id}`,
    method: 'delete',
  })
}

export function syncApiPermissions() {
  return request<PermissionSyncReport>({
    url: `${BASE}/sync`,
    method: 'post',
  })
}

export function getRolePermissions(roleId: number | string) {
  return request<string[]>({
    url: `${ROLE_BASE}/${roleId}/permissions`,
    method: 'get',
  })
}
