import request from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import type { Id, PageResponse } from '@/shared/http/types'

export type MenuType = ApiSchema<'MenuType'>
export type MenuTreeNode = Omit<ApiSchema<'MenuTreeNode'>, 'children' | 'menu_type'> & {
  children: MenuTreeNode[]
  menu_type: MenuType
}
export type MenuRecord = ApiSchema<'MenuVo'>

const BASE = '/system/menus'

export type MenuQuery = OperationQuery<'get_system_menus'>
export type MenuCreateInput = OperationJsonBody<'post_system_menus'>
export type MenuUpdateInput = OperationJsonBody<'put_system_menus_by_id'>

export function getMenuTree(signal?: AbortSignal) {
  return request<MenuTreeNode[]>({ url: `${BASE}/tree`, method: 'get', signal })
}

export function listMenu(params?: MenuQuery, signal?: AbortSignal) {
  return request<PageResponse<MenuRecord>>({ url: BASE, method: 'get', params, signal })
}

export function getMenu(id: Id, signal?: AbortSignal) {
  return request<MenuRecord>({ url: `${BASE}/${id}`, method: 'get', signal })
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
