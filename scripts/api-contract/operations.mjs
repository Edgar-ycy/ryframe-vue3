const bodylessWriteAllowlist = new Set([
  // 这些操作的语义完全由路径、身份或请求头决定，后端不接收 JSON 请求体。
  'post_auth_logout',
  'post_auth_refresh',
  'post_auth_ws_ticket',
  'post_monitor_jobs_by_id_retry',
  'post_monitor_schedules_by_id_run',
  'post_platform_product_plans_by_plan_id_versions_by_version_publish',
  'post_platform_product_plans_by_plan_id_versions_by_version_retire',
  'post_platform_tenant_data_migrations_by_migration_id_cancel',
  'post_platform_tenant_data_migrations_by_migration_id_finalize',
  'post_system_config_packages',
  'post_system_perms_sync',
  'post_system_notices_by_id_publish_message',
  'put_system_messages_by_id_read',
  'put_system_messages_read_all',
])

const methods = new Set(['get', 'post', 'put', 'patch', 'delete'])

/** 收集并校验所有 HTTP operation 的基础协议。 */
export function collectOperationContractState(document, errors) {
  const paths = Object.entries(document.paths ?? {})
  const operationIds = new Set()
  const queryOperationIds = new Set()
  const operationsById = new Map()
  let operationCount = 0

  for (const [path, pathItem] of paths) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!methods.has(method)) continue
      operationCount += 1

      const operationId = operation.operationId
      if (!operationId) errors.push(`${method.toUpperCase()} ${path}: missing operationId`)
      else if (operationIds.has(operationId)) errors.push(`${operationId}: duplicate operationId`)
      else operationIds.add(operationId)

      const successResponses = Object.entries(operation.responses ?? {})
        .filter(([status]) => /^2\d\d$/.test(status))
      if (successResponses.length === 0) {
        errors.push(`${operationId}: missing 2xx response`)
      }
      for (const [status, response] of successResponses) {
        const content = Object.values(response.content ?? {})
        if (content.length === 0 || content.some(media => !media.schema)) {
          errors.push(`${operationId}: ${status} response is missing a content schema`)
        }
      }

      if (['post', 'put', 'patch'].includes(method)
        && !operation.requestBody
        && !bodylessWriteAllowlist.has(operationId)) {
        errors.push(`${operationId}: write operation is missing requestBody`)
      }

      const parameters = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]
      if (operationId && parameters.some(parameter => parameter.in === 'query')) {
        queryOperationIds.add(operationId)
      }
      if (operationId && !operationsById.has(operationId)) {
        operationsById.set(operationId, { method, operation, parameters, path })
      }
    }
  }

  return {
    operationCount,
    operationsById,
    paths,
    queryOperationIds,
    schemas: document.components?.schemas ?? {},
  }
}
