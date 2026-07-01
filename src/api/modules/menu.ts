import request from '@/api/request'
import type { Id, MenuTreeNode } from '@/api/types'

export type { MenuTreeNode } from '@/api/types'

const BASE = '/system/menus'

export interface MenuQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  name?: string
  status?: string
}

export interface MenuForm {
  [key: string]: any
  name: string
  parent_id?: Id
  menu_type: string
  perm_id?: Id
  route_key?: string
  icon?: string
  sort?: number
  visible?: boolean
  status?: string
  remark?: string
}

export function getMenuTree() {
  return request({ url: `${BASE}/tree`, method: 'get' })
}

export function listMenu(params?: MenuQuery) {
  return request({ url: `${BASE}/list`, method: 'get', params })
}

export function listMenuNoPage(params?: MenuQuery) {
  return request({ url: `${BASE}/listNoPage`, method: 'get', params })
}

export function getMenu(id: Id) {
  return request({ url: `${BASE}/${id}`, method: 'get' })
}

export function createMenu(data: MenuForm) {
  return request({ url: BASE, method: 'post', data })
}

export function updateMenu(id: Id, data: Partial<MenuForm>) {
  return request({ url: `${BASE}/${id}`, method: 'put', data })
}

export function deleteMenu(id: Id) {
  return request({ url: `${BASE}/${id}`, method: 'delete' })
}

export function getUserMenus() {
  return request<MenuTreeNode[]>({
    url: `/system/user/get-menus`,
    method: 'get',
  })
}
