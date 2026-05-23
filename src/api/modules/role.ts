import request from '@/api/request'

const BASE = '/system/roles'

export interface RoleQuery {
  [key: string]: any
  page_num?: number
  page_size?: number
  role_name?: string
  role_code?: string
  status?: string
}

export interface RoleForm {
  [key: string]: any
  role_name: string
  role_code: string
  role_sort?: number
  status: string
  menu_ids?: number[]
  remark?: string
}

export function listRole(params: RoleQuery)    { return request({ url: `${BASE}/list`, method: 'get', params }) }
export function listRoleNoPage(params?: RoleQuery) { return request({ url: `${BASE}/listNoPage`, method: 'get', params }) }
export function getRole(id: number)           { return request({ url: `${BASE}/${id}`, method: 'get' }) }
export function createRole(data: RoleForm)    { return request({ url: BASE, method: 'post', data }) }
export function updateRole(id: number, data: Partial<RoleForm>) { return request({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteRole(id: number)        { return request({ url: `${BASE}/${id}`, method: 'delete' }) }
