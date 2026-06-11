import request from '@/api/request'

const BASE = '/system/depts'

export interface DeptQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  name?: string
  status?: string
}

export interface DeptForm {
  [key: string]: any
  parent_id?: number | string
  name: string
  sort?: number
  status?: string
}

/** 部门树 */
export function getDeptTree()             { return request({ url: `${BASE}/tree`, method: 'get' }) }
/** 部门列表（分页） */
export function listDept(params?: DeptQuery) { return request({ url: `${BASE}/list`, method: 'get', params }) }
/** 部门列表（不分页） */
export function listDeptNoPage(params?: DeptQuery) { return request({ url: `${BASE}/listNoPage`, method: 'get', params }) }
export function getDept(id: number | string)            { return request({ url: `${BASE}/${id}`, method: 'get' }) }
export function createDept(data: DeptForm)     { return request({ url: BASE, method: 'post', data }) }
export function updateDept(id: number | string, data: Partial<DeptForm>) { return request({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteDept(id: number | string)         { return request({ url: `${BASE}/${id}`, method: 'delete' }) }
