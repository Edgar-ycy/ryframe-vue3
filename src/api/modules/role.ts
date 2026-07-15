import request from '@/api/request'

const BASE = '/system/roles'
const ASSIGN_BASE = '/system/role'

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
  remark?: string
}

export function listRole(params: RoleQuery)    { return request({ url: `${BASE}/list`, method: 'get', params }) }
export function listRoleNoPage(params?: RoleQuery) { return request({ url: `${BASE}/listNoPage`, method: 'get', params }) }
export function exportRole(params?: any)  { return request({ url: `${BASE}/export`, method: 'get', params, responseType: 'blob' }) }
export function getRole(id: number | string)           { return request({ url: `${BASE}/${id}`, method: 'get' }) }
export function createRole(data: RoleForm)    { return request({ url: BASE, method: 'post', data }) }
export function updateRole(id: number | string, data: Partial<RoleForm>) { return request({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteRole(id: number | string)        { return request({ url: `${BASE}/${id}`, method: 'delete' }) }
export function batchDeleteRole(ids: (number | string)[]) { return request({ url: `${BASE}/batch/${ids.join(',')}`, method: 'delete' }) }

/** 分配权限 */
export function assignPerm(roleId: number | string, permIds: (number | string)[]) {
  return request({
    url: `${ASSIGN_BASE}/assign-perm`,
    method: 'post',
    data: { role_id: String(roleId), perm_ids: permIds.map(String) },
  })
}

/** 分配自定义数据权限部门 */
export function assignDept(roleId: number | string, deptIds: (number | string)[]) {
  return request({
    url: `${ASSIGN_BASE}/assign-dept`,
    method: 'post',
    data: { role_id: String(roleId), dept_ids: deptIds.map(String) },
  })
}

/** 更新角色数据权限范围 */
export function updateRoleDataScope(roleId: number | string, dataScope: string) {
  return request({
    url: `${ASSIGN_BASE}/update-data-scope`,
    method: 'post',
    data: { role_id: String(roleId), data_scope: dataScope },
  })
}
