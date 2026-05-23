import request from '@/api/request'

const BASE = '/system/depts'

export interface DeptQuery {
  [key: string]: any
  dept_name?: string
  status?: string
}

export interface DeptForm {
  [key: string]: any
  parent_id: number
  dept_name: string
  order_num?: number
  leader?: string
  phone?: string
  email?: string
  status: string
}

export function listDept(params?: DeptQuery)  { return request({ url: `${BASE}/listNoPage`, method: 'get', params }) }
export function getDept(id: number)            { return request({ url: `${BASE}/${id}`, method: 'get' }) }
export function createDept(data: DeptForm)     { return request({ url: BASE, method: 'post', data }) }
export function updateDept(id: number, data: Partial<DeptForm>) { return request({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteDept(id: number)         { return request({ url: `${BASE}/${id}`, method: 'delete' }) }
