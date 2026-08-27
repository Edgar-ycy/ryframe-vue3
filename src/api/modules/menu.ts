import {
  delete_system_menus_by_id,
  get_system_menus,
  get_system_menus_by_id,
  get_system_menus_tree,
  post_system_menus,
  put_system_menus_by_id,
} from '@/api/generated/operations/system'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import type { Id } from '@/shared/http/types'

export type MenuType = ApiSchema<'MenuType'>
export type MenuTreeNode = Omit<ApiSchema<'MenuTreeNode'>, 'children' | 'menu_type'> & {
  children: MenuTreeNode[]
  menu_type: MenuType
}
export type MenuRecord = ApiSchema<'MenuVo'>

export type MenuQuery = OperationQuery<'get_system_menus'>
export type MenuCreateInput = OperationJsonBody<'post_system_menus'>
export type MenuUpdateInput = OperationJsonBody<'put_system_menus_by_id'>

export function getMenuTree(signal?: AbortSignal) {
  return get_system_menus_tree({ signal })
}

export function listMenu(params?: MenuQuery, signal?: AbortSignal) {
  return get_system_menus({ params, signal })
}

export function getMenu(id: Id, signal?: AbortSignal) {
  return get_system_menus_by_id({ path: { id }, signal })
}

export function createMenu(data: MenuCreateInput) {
  return post_system_menus({ data })
}

export function updateMenu(id: Id, data: MenuUpdateInput) {
  return put_system_menus_by_id({ path: { id }, data })
}

export function deleteMenu(id: Id) {
  return delete_system_menus_by_id({ path: { id } })
}
