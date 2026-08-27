import type { ApiSchema, OperationQuery } from '@/api/contract'
import {
  get_system_user_imports,
  get_system_user_imports_by_id,
  get_system_user_imports_by_id_report,
  get_system_user_imports_by_id_rows,
  post_system_user_imports,
  post_system_user_imports_by_id_cancel,
} from '@/api/generated/operations/system'

export type UserImportQuery = OperationQuery<'get_system_user_imports'>
export type UserImportRowQuery = OperationQuery<'get_system_user_imports_by_id_rows'>
export type UserImportJob = ApiSchema<'UserImportJobVo'>
export type UserImportRow = ApiSchema<'UserImportRowVo'>

/** 创建异步用户导入任务；文件内容不会进入普通 JSON 请求或日志。 */
export function createUserImport(file: File, idempotencyKey: string) {
  const data = new FormData()
  data.append('file', file)
  return post_system_user_imports({
    data,
    headers: { 'Idempotency-Key': idempotencyKey },
    timeout: 120_000,
  })
}

/** 分页查询当前租户的导入历史。 */
export function listUserImports(params: UserImportQuery, signal?: AbortSignal) {
  return get_system_user_imports({ params, signal })
}

/** 查询单个导入任务的最新进度。 */
export function getUserImport(id: string, signal?: AbortSignal) {
  return get_system_user_imports_by_id({ path: { id }, signal })
}

/** 请求在下一个批次边界取消导入。 */
export function cancelUserImport(id: string) {
  return post_system_user_imports_by_id_cancel({ data: {}, path: { id } })
}

/** 分页查询失败和跳过的行结果。 */
export function listUserImportRows(id: string, params: UserImportRowQuery, signal?: AbortSignal) {
  return get_system_user_imports_by_id_rows({
    path: { id },
    params,
    signal,
  })
}

/** 下载私有 Excel 错误报告。 */
export function downloadUserImportReport(id: string, signal?: AbortSignal) {
  return get_system_user_imports_by_id_report({
    path: { id },
    signal,
  })
}
