export type Id = number | string

export interface ApiResponse<T = any> {
  code: number
  data: T
  msg?: string
  message?: string
  rows?: any[]
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
  username: string
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
  roles?: string[]
  perms?: string[]
  permissions?: string[]
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
  name?: string
  menu_name?: string
  path?: string
  component?: string
  redirect?: string
  query?: string
  menu_type?: 'M' | 'C' | 'F' | string
  perms?: string
  icon?: string
  visible?: boolean | string | number
  status?: string | number
  sort?: number
  order_num?: number
  is_frame?: boolean | string | number
  is_cache?: boolean | string | number
  remark?: string
  children?: MenuTreeNode[]
}

