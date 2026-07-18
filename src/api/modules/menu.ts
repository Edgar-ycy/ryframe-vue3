import request from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id } from '@/shared/http/types'

export type MenuType = ApiSchema<'MenuType'>
export type MenuTreeNode = Omit<ApiSchema<'MenuTreeNode'>, 'children' | 'menu_type'> & {
  children: MenuTreeNode[]
  menu_type: MenuType
}
export type MenuRecord = ApiSchema<'MenuVo'>

const BASE = '/system/menus'

export type MenuQuery = OperationQuery<'get_system_menus'>
type MenuAllQuery = OperationQuery<'get_system_menus_all'>
export type MenuCreateInput = OperationJsonBody<'post_system_menus'>
export type MenuUpdateInput = OperationJsonBody<'put_system_menus_by_id'>

export function getMenuTree() {
  return request<MenuTreeNode[]>({ url: `${BASE}/tree`, method: 'get' })
}

export function listMenu(params?: MenuQuery) {
  return request<MenuRecord[]>({ url: BASE, method: 'get', params })
}

export function listMenuNoPage(params?: MenuAllQuery) {
  return request<MenuRecord[]>({
    url: `${BASE}/all`, method: 'get', params: stripPagination(params),
  })
}

export function getMenu(id: Id) {
  return request<MenuRecord>({ url: `${BASE}/${id}`, method: 'get' })
}

export function createMenu(data: MenuCreateInput) {
  return request<MenuRecord>({ url: BASE, method: 'post', data })
}

export function updateMenu(id: Id, data: MenuUpdateInput) {
  return request<MenuRecord>({ url: `${BASE}/${id}`, method: 'put', data })
}

export function deleteMenu(id: Id) {
  return request<void>({ url: `${BASE}/${id}`, method: 'delete' })
}

export function getUserMenus(options?: { skipAuthRefresh?: boolean }) {
  return request<MenuTreeNode[]>({
    url: `${BASE}/current`,
    method: 'get',
    skipAuthRefresh: options?.skipAuthRefresh,
  })
}
