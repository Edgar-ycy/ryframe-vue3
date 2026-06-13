import request from '@/api/request'

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
  parent_id?: number | string
  menu_type: string
  path?: string
  component?: string
  query?: string
  perms?: string
  icon?: string
  is_frame?: boolean
  is_cache?: boolean
  sort?: number
  visible?: boolean
  status?: string
  remark?: string
}

/** 菜单树 */
export function getMenuTree()                { return request({ url: `${BASE}/tree`, method: 'get' }) }
/** 菜单列表（分页） */
export function listMenu(params?: MenuQuery)  { return request({ url: `${BASE}/list`, method: 'get', params }) }
/** 菜单列表（不分页） */
export function listMenuNoPage(params?: MenuQuery) { return request({ url: `${BASE}/listNoPage`, method: 'get', params }) }
export function getMenu(id: number | string)            { return request({ url: `${BASE}/${id}`, method: 'get' }) }
export function createMenu(data: MenuForm)     { return request({ url: BASE, method: 'post', data }) }
export function updateMenu(id: number | string, data: Partial<MenuForm>) { return request({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteMenu(id: number | string)         { return request({ url: `${BASE}/${id}`, method: 'delete' }) }

// ---- 动态菜单 ----

/** 后端返回的菜单树节点（兼容不同后端版本字段名） */
export interface MenuTreeNode {
  /** id 为 number|string，后端 Snowflake ID 序列化为字符串避免 JS 精度丢失 */
  id: number | string
  /** 菜单名称（后端可能返回 name 或 menu_name） */
  menu_name?: string
  name?: string
  parent_id: number | string | null
  order_num?: number
  /** 排序号（后端可能返回 sort 或 order_num） */
  sort?: number
  path: string
  component: string
  query?: string
  is_frame?: string
  is_cache?: string
  /** M=目录, C=菜单, F=按钮（DB NOT NULL，必填。若缺失则从 component 字段推断） */
  menu_type?: string
  /** 是否可见（后端可能返回 boolean 或字符串 '0'/'1'） */
  visible?: boolean | string
  status: string
  perms?: string
  icon: string
  remark?: string
  children?: MenuTreeNode[]
}

/**
 * 获取当前用户的菜单树（用于动态构建路由和侧边栏）
 * 后端根据 token 中的用户身份，从数据库查询其角色拥有的菜单，组装成树返回
 */
export function getUserMenus() {
  return request<MenuTreeNode[]>({
    url: `${BASE}/user-tree`,
    method: 'get',
  })
}


