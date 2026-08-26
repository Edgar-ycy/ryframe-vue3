import { isDeepStrictEqual } from 'node:util'

const requiredQueryOperationIds = new Set([
  'get_auth_captcha_generate',
  'get_auth_captcha_image',
  'get_common_file_download',
  'get_agent_v1_directory_departments',
  'get_agent_v1_directory_posts',
  'get_agent_v1_directory_users',
  'get_agent_v1_reference_dictionaries_by_type_code',
  'get_monitor_jobs',
  'get_monitor_retention_runs',
  'get_monitor_schedules',
  'get_monitor_schedules_by_id_executions',
  'get_platform_tenants_page',
  'get_platform_data_targets',
  'get_platform_product_plans',
  'get_system_config_packages',
  'get_system_config_transfers',
  'get_system_config_transfers_by_id_items',
  'get_system_service_access_audits',
  'get_system_service_accounts',
  'get_system_service_delegations',
  'get_system_configs',
  'get_system_depts',
  'get_system_dict_data',
  'get_system_dict_types',
  'get_system_loginlogs',
  'get_system_menus',
  'get_system_messages',
  'get_system_notices',
  'get_system_online',
  'get_system_operlogs',
  'get_system_perms_tree',
  'get_system_posts',
  'get_system_roles',
  'get_system_roles_options',
  'get_system_users',
  'get_system_user_imports',
  'get_system_user_imports_by_id_rows',
  'get_system_users_options',
])
const c1PaginatedOperationIds = new Set([
  'get_agent_v1_directory_departments',
  'get_agent_v1_directory_posts',
  'get_agent_v1_directory_users',
  'get_agent_v1_reference_dictionaries_by_type_code',
  'get_monitor_jobs',
  'get_monitor_retention_runs',
  'get_monitor_schedules',
  'get_monitor_schedules_by_id_executions',
  'get_platform_tenants_page',
  'get_platform_data_targets',
  'get_platform_product_plans',
  'get_system_config_packages',
  'get_system_config_transfers',
  'get_system_config_transfers_by_id_items',
  'get_system_service_access_audits',
  'get_system_service_accounts',
  'get_system_service_delegations',
  'get_system_configs',
  'get_system_depts',
  'get_system_dict_types',
  'get_system_loginlogs',
  'get_system_menus',
  'get_system_notices',
  'get_system_online',
  'get_system_operlogs',
  'get_system_posts',
  'get_system_roles',
  'get_system_user_imports',
  'get_system_user_imports_by_id_rows',
  'get_system_users',
])
const c1OptionOperationContracts = new Map([
  ['get_system_roles_options', '/api/v1/system/roles/options'],
  ['get_system_users_options', '/api/v1/system/users/options'],
])
const c1RemovedUnboundedListPaths = new Set([
  '/api/v1/system/configs/all',
  '/api/v1/system/depts/all',
  '/api/v1/system/dict/types/all',
  '/api/v1/system/loginlogs/all',
  '/api/v1/system/menus/all',
  '/api/v1/system/notices/all',
  '/api/v1/system/online/all',
  '/api/v1/system/operlogs/all',
  '/api/v1/system/posts/all',
  '/api/v1/system/roles/all',
  '/api/v1/system/users/all',
])
// 参数必须出现在契约中，但调用方可以省略，由运行时分页配置补全默认值。
// page_size 与 limit 的静态 maximum 必须留空，避免伪造可被 TOML 改写的运行时上限。
const c1PaginationParameterContracts = new Map([
  ['page', { type: 'integer', minimum: 1, maximum: undefined }],
  ['page_size', { type: 'integer', minimum: 1, maximum: undefined }],
])
// 平台租户容量页固定将单页上限收紧为 100，不受通用分页配置放宽。
const fixedPaginationPageSizeMaximums = new Map([
  ['get_agent_v1_directory_departments', 100],
  ['get_agent_v1_directory_posts', 100],
  ['get_agent_v1_directory_users', 100],
  ['get_agent_v1_reference_dictionaries_by_type_code', 100],
  ['get_platform_tenants_page', 100],
  ['get_platform_data_targets', 100],
  ['get_platform_product_plans', 100],
])
const c1OptionParameterContracts = new Map([
  ['q', { type: 'string', minLength: undefined, maxLength: 64 }],
  ['limit', { type: 'integer', minimum: 1, maximum: undefined }],
])

function displayContractValue(value) {
  return value === undefined ? '<absent>' : JSON.stringify(value)
}

function createQueryParametersResolver(operationsById, resolveLocalReference, errors) {
  const queryParametersByOperationId = new Map()
  return function queryParametersFor(operationId, entry) {
    if (queryParametersByOperationId.has(operationId)) {
      return queryParametersByOperationId.get(operationId)
    }

    const parameters = new Map()
    for (const [index, rawParameter] of entry.parameters.entries()) {
      const parameter = resolveLocalReference(rawParameter, `${operationId}.parameters[${index}]`)
      if (parameter?.in !== 'query') continue
      if (typeof parameter.name !== 'string' || parameter.name.length === 0) {
        errors.push(`${operationId}.parameters[${index}]: query parameter is missing a name`)
        continue
      }
      if (parameters.has(parameter.name)) {
        errors.push(`${operationId}: duplicate query parameter ${parameter.name}`)
        continue
      }
      parameters.set(parameter.name, parameter)
    }
    queryParametersByOperationId.set(operationId, parameters)
    return parameters
  }
}

function validateC1QueryParameter(
  operationId,
  parameters,
  parameterName,
  expectedSchema,
  resolveLocalReference,
  errors,
) {
  const parameter = parameters.get(parameterName)
  if (!parameter) {
    errors.push(`${operationId}: required C1 query parameter ${parameterName} is missing`)
    return
  }
  if (parameter.required !== false) {
    errors.push(
      `${operationId}.${parameterName}: parameter must remain optional with runtime defaults`,
    )
  }
  const schema = resolveLocalReference(parameter.schema, `${operationId}.${parameterName}.schema`)
  if (!schema || typeof schema !== 'object') {
    errors.push(`${operationId}.${parameterName}: query parameter schema is missing`)
    return
  }
  for (const [keyword, expected] of Object.entries(expectedSchema)) {
    if (schema[keyword] !== expected) {
      errors.push(
        `${operationId}.${parameterName}: expected ${keyword}=` +
          `${displayContractValue(expected)}, found ${displayContractValue(schema[keyword])}`,
      )
    }
  }
}

function validateRoleOptionPurpose(operationId, parameters, resolveLocalReference, errors) {
  const parameter = parameters.get('purpose')
  if (!parameter) {
    errors.push(`${operationId}: required role option purpose is missing`)
    return
  }
  if (parameter.required !== true) {
    errors.push(`${operationId}.purpose: parameter must remain required`)
  }
  const schema = resolveLocalReference(parameter.schema, `${operationId}.purpose.schema`)
  if (
    schema?.type !== 'string' ||
    !isDeepStrictEqual(schema.enum, ['user_assignment', 'service_account_assignment'])
  ) {
    errors.push(`${operationId}.purpose: role option purpose enum is invalid`)
  }
}

/** 校验受控分页、候选项查询及被删除的无上限列表。 */
export function validatePaginationContracts({
  document,
  errors,
  operationsById,
  queryOperationIds,
  resolveLocalReference,
}) {
  const queryParametersFor = createQueryParametersResolver(
    operationsById,
    resolveLocalReference,
    errors,
  )
  if (c1PaginatedOperationIds.size !== 30) {
    errors.push(
      `C1 pagination manifest must contain 30 operationIds, found ${c1PaginatedOperationIds.size}`,
    )
  }
  if (c1OptionOperationContracts.size !== 2) {
    errors.push(
      `C1 options manifest must contain 2 operationIds, found ${c1OptionOperationContracts.size}`,
    )
  }

  for (const operationId of c1PaginatedOperationIds) {
    const entry = operationsById.get(operationId)
    if (!entry) {
      errors.push(`${operationId}: required C1 pagination operation is missing`)
      continue
    }
    const parameters = queryParametersFor(operationId, entry)
    for (const [parameterName, expectedSchema] of c1PaginationParameterContracts) {
      const fixedMaximum =
        parameterName === 'page_size' ? fixedPaginationPageSizeMaximums.get(operationId) : undefined
      validateC1QueryParameter(
        operationId,
        parameters,
        parameterName,
        fixedMaximum === undefined ? expectedSchema : { ...expectedSchema, maximum: fixedMaximum },
        resolveLocalReference,
        errors,
      )
    }
  }

  for (const [operationId, expectedPath] of c1OptionOperationContracts) {
    const entry = operationsById.get(operationId)
    if (!entry) {
      errors.push(`${operationId}: required C1 options operation is missing`)
      continue
    }
    if (entry.method !== 'get' || entry.path !== expectedPath) {
      errors.push(`${operationId}: options operation must remain GET ${expectedPath}`)
    }
    const parameters = queryParametersFor(operationId, entry)
    const isRoleOptions = operationId === 'get_system_roles_options'
    const expectedNames = isRoleOptions ? ['limit', 'purpose', 'q'] : ['limit', 'q']
    if (!isDeepStrictEqual([...parameters.keys()].sort(), expectedNames)) {
      errors.push(`${operationId}: options query parameters do not match the exact manifest`)
    }
    for (const [parameterName, expectedSchema] of c1OptionParameterContracts) {
      validateC1QueryParameter(
        operationId,
        parameters,
        parameterName,
        expectedSchema,
        resolveLocalReference,
        errors,
      )
    }
    if (isRoleOptions)
      validateRoleOptionPurpose(operationId, parameters, resolveLocalReference, errors)
  }

  // 新增分页或 options 操作不能绕过按 operationId 维护的精确清单。
  for (const [operationId, entry] of operationsById) {
    const parameters = queryParametersFor(operationId, entry)
    const hasPaginationParameter = parameters.has('page') || parameters.has('page_size')
    if (hasPaginationParameter && !c1PaginatedOperationIds.has(operationId)) {
      errors.push(`${operationId}: pagination operation is missing from the C1 manifest`)
    }
    if (entry.path.endsWith('/options') && !c1OptionOperationContracts.has(operationId)) {
      errors.push(`${operationId}: options operation is missing from the C1 manifest`)
    }
  }

  // C1 已删除无上限列表，并只为受控候选项保留 `/options`；不允许旧路径回流。
  if (c1RemovedUnboundedListPaths.size !== 11) {
    errors.push(
      `C1 removed path manifest must contain 11 entries, found ${c1RemovedUnboundedListPaths.size}`,
    )
  }
  for (const path of c1RemovedUnboundedListPaths) {
    if (document.paths?.[path]) errors.push(`${path}: removed unbounded list path returned`)
  }
  for (const operationId of requiredQueryOperationIds) {
    if (!queryOperationIds.has(operationId)) {
      errors.push(`${operationId}: required bounded query operation is missing`)
    }
  }
}
