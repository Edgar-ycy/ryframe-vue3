import request from '@/api/request'

const BASE = '/system/users'

export interface UserQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  username?: string
  phone?: string
  status?: string
  dept_id?: number
}

export interface UserForm {
  [key: string]: any
  username: string
  nickname: string
  password?: string
  email?: string
  phone?: string
  sex?: string
  status?: string
  dept_id?: number
  role_ids?: number[]
  remark?: string
}

/** 分页查询用户列表 */
export function listUser(params: UserQuery) {
  return request({ url: `${BASE}/list`, method: 'get', params })
}

/** 查询用户详情 */
export function getUser(id: number) {
  return request({ url: `${BASE}/${id}`, method: 'get' })
}

/** 创建用户 */
export function createUser(data: UserForm) {
  return request({ url: BASE, method: 'post', data })
}

/** 更新用户 */
export function updateUser(id: number, data: Partial<UserForm>) {
  return request({ url: `${BASE}/${id}`, method: 'put', data })
}

/** 删除用户 */
export function deleteUser(id: number) {
  return request({ url: `${BASE}/${id}`, method: 'delete' })
}

/** 重置密码（管理员操作） */
export function resetPassword(userId: number, data: { password: string }) {
  return request({ url: `${BASE}/${userId}/password`, method: 'put', data })
}

/** 修改用户状态 */
export function changeUserStatus(data: { user_id: number; status: string }) {
  return request({ url: `${BASE}/changeStatus`, method: 'put', data })
}

/** 批量删除用户 */
export function batchDeleteUser(ids: number[]) {
  return request({ url: `${BASE}/batch/${ids.join(',')}`, method: 'delete' })
}

/** 导出用户 */
export function exportUser(params?: any) {
  return request({ url: `${BASE}/export`, method: 'get', params, responseType: 'blob' })
}

/** 下载导入模板 */
export function downloadImportTemplate() {
  return request({ url: `${BASE}/import-template`, method: 'get', responseType: 'blob' })
}

/** 导入用户 */
export function importUser(data: FormData) {
  return request({ url: `${BASE}/import`, method: 'post', data, headers: { 'Content-Type': 'multipart/form-data' } })
}
