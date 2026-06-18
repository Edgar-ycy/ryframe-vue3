import request from '@/api/request'

const BASE = '/system/users'

export interface UserQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  username?: string
  phone?: string
  status?: string
  dept_id?: number | string
}

export interface UserForm {
  [key: string]: any
  username: string
  nickname: string
  email?: string
  phone?: string
  status?: string
  dept_id?: number | string
  role_ids?: (number | string)[]
  remark?: string
}

export interface PasswordResetRequestResult {
  request_id: string
  reset_token: string
  reset_url: string
  expires_at: string
}

/** 分页查询用户列表 */
export function listUser(params: UserQuery) {
  return request({ url: `${BASE}/list`, method: 'get', params })
}

/** 查询用户详情 */
export function getUser(id: number | string) {
  return request({ url: `${BASE}/${id}`, method: 'get' })
}

/** 创建用户 */
export function createUser(data: UserForm) {
  return request({ url: BASE, method: 'post', data })
}

/** 更新用户 */
export function updateUser(id: number | string, data: Partial<UserForm>) {
  return request({ url: `${BASE}/${id}`, method: 'put', data })
}

/** 删除用户 */
export function deleteUser(id: number | string) {
  return request({ url: `${BASE}/${id}`, method: 'delete' })
}

/** 发起密码重置请求（管理员操作） */
export function requestPasswordReset(userId: number | string, data: { reason: string }) {
  return request<PasswordResetRequestResult>({
    url: `${BASE}/${userId}/password-reset-requests`,
    method: 'post',
    data,
  })
}

/** 修改用户状态 */
export function changeUserStatus(data: { user_id: number | string; status: string }) {
  return request({ url: `${BASE}/changeStatus`, method: 'put', data })
}

/** 批量删除用户 */
export function batchDeleteUser(ids: (number | string)[]) {
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
  return request({ url: `${BASE}/import`, method: 'post', data })
}
