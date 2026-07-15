export type Id = number | string

export interface ApiResponse<T = any> {
  code: number
  msg: string
  data?: T
  rows?: T extends any[] ? T : any[]
  total?: number
}

export interface PageQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  keyword?: string
}

export interface PageResponse<T> {
  rows: T[]
  total: number
}

export interface UserInfo {
  id: Id
  tenant_id?: string
  tenant_name?: string
  username: string
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
  roles?: string[]
  perms?: string[]
}

export interface LoginResult {
  access_token: string
  refresh_token?: string
  token_type?: 'Bearer'
  expires_in?: number
  user_info?: UserInfo
}

export interface MenuTreeNode {
  id: Id
  parent_id?: Id | null
  name: string
  menu_type?: 'M' | 'C' | 'F' | string
  perm_id?: Id | null
  perm_code?: string | null
  route_key?: string | null
  icon?: string
  visible?: boolean | string | number
  status?: string | number
  sort: number
  remark?: string
  children?: MenuTreeNode[]
}
