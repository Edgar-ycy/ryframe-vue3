import request from '@/api/request'

const BASE = '/system/roles'

export interface RoleQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  name?: string
  code?: string
  status?: string
}

export interface RoleForm {
  [key: string]: any
  name: string
  code: string
  sort?: number
  status?: string
  data_scope?: string
  menu_ids?: number[]
  remark?: string
}

export function listRole(params: RoleQuery)    { return request({ url: `${BASE}/list`, method: 'get', params }) }
export function listRoleNoPage(params?: RoleQuery) { return request({ url: `${BASE}/listNoPage`, method: 'get', params }) }
export function exportRole(params?: any)  { return request({ url: `${BASE}/export`, method: 'get', params, responseType: 'blob' }) }
export function getRole(id: number)           { return request({ url: `${BASE}/${id}`, method: 'get' }) }
export function createRole(data: RoleForm)    { return request({ url: BASE, method: 'post', data }) }
export function updateRole(id: number, data: Partial<RoleForm>) { return request({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteRole(id: number)        { return request({ url: `${BASE}/${id}`, method: 'delete' }) }
export function batchDeleteRole(ids: number[]) { return request({ url: `${BASE}/batch/${ids.join(',')}`, method: 'delete' }) }

/** 分配权限 */
export function assignPermissions(roleId: number, data: { perm_ids: number[] }) {
  return request({ url: `${BASE}/${roleId}/permissions`, method: 'put', data })
}

/** 分配菜单 */
export function assignMenus(roleId: number, data: { menu_ids: number[] }) {
  return request({ url: `${BASE}/${roleId}/menus`, method: 'put', data })
}

/** 设置数据权限 */
export function setDataScope(roleId: number, data: { data_scope: string; dept_ids?: number[] }) {
  return request({ url: `${BASE}/${roleId}/data-scope`, method: 'put', data })
}
