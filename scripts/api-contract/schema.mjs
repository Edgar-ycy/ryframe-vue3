const c1StringPathIdOperationIds = new Set([
  'delete_system_configs_by_id',
  'delete_system_depts_by_id',
  'delete_system_dict_data_by_id',
  'delete_system_dict_types_by_id',
  'delete_system_menus_by_id',
  'delete_system_notices_by_id',
  'delete_system_perms_by_id',
  'delete_system_posts_by_id',
  'delete_system_roles_by_id',
  'delete_system_users_by_id',
  'get_system_configs_by_id',
  'get_system_depts_by_id',
  'get_system_menus_by_id',
  'get_system_notices_by_id',
  'get_system_perms_by_id',
  'get_system_posts_by_id',
  'get_system_roles_by_id',
  'get_system_roles_by_id_permissions',
  'get_system_users_by_id',
  'post_system_notices_by_id_publish_message',
  'post_system_users_by_id_password_reset_requests',
  'put_system_configs_by_id',
  'put_system_depts_by_id',
  'put_system_dict_data_by_id',
  'put_system_dict_types_by_id',
  'put_system_menus_by_id',
  'put_system_notices_by_id',
  'put_system_perms_by_id',
  'put_system_posts_by_id',
  'put_system_roles_by_id',
  'put_system_roles_by_id_data_scope',
  'put_system_roles_by_id_permissions',
  'put_system_users_by_id',
  'put_system_users_by_id_roles',
  'put_system_users_by_id_status',
])

function validateIdentityParameter(
  operationId,
  parameter,
  location,
  operationsById,
  resolveLocalReference,
  errors,
) {
  const schema = resolveLocalReference(parameter.schema, `${location}.schema`)
  if (!schema || typeof schema !== 'object') {
    errors.push(`${location}: identity parameter schema is missing`)
    return
  }
  if (parameter.name.endsWith('_ids')) {
    if (
      schema.type !== 'array' ||
      schema.items?.type !== 'string' ||
      schema.items?.format === 'int64'
    ) {
      errors.push(`${location}: *_ids parameters must use an array of string items`)
    }
  } else if (schema.type !== 'string' || schema.format === 'int64') {
    errors.push(`${location}: id and *_id parameters must use string transport`)
  }
  if (parameter.in === 'path' && parameter.required !== true) {
    errors.push(`${location}: path identity parameter must be required`)
  }
  if (
    parameter.in === 'path' &&
    !operationsById.get(operationId)?.path.includes(`{${parameter.name}}`)
  ) {
    errors.push(`${location}: path identity parameter has no matching path placeholder`)
  }
}

function validateIdentityParameters(operationsById, resolveLocalReference, errors) {
  if (c1StringPathIdOperationIds.size !== 35) {
    errors.push(
      `C1 string path ID manifest must contain 35 operationIds, ` +
        `found ${c1StringPathIdOperationIds.size}`,
    )
  }
  let pathIdentityParameterCount = 0
  const pathIdentityOperationIds = new Set()
  for (const [operationId, entry] of operationsById) {
    for (const [index, rawParameter] of entry.parameters.entries()) {
      const parameter = resolveLocalReference(rawParameter, `${operationId}.parameters[${index}]`)
      if (
        !parameter ||
        !['path', 'query'].includes(parameter.in) ||
        typeof parameter.name !== 'string' ||
        !/(^id$|_id$|_ids$)/u.test(parameter.name)
      ) {
        continue
      }
      const location = `${operationId}.${parameter.in}.${parameter.name}`
      validateIdentityParameter(
        operationId,
        parameter,
        location,
        operationsById,
        resolveLocalReference,
        errors,
      )
      if (parameter.in === 'path') {
        pathIdentityParameterCount += 1
        pathIdentityOperationIds.add(operationId)
      }
    }
  }
  if (pathIdentityParameterCount < 35) {
    errors.push(
      `expected at least 35 path identity parameters, found ${pathIdentityParameterCount}`,
    )
  }
  for (const operationId of c1StringPathIdOperationIds) {
    if (!pathIdentityOperationIds.has(operationId)) {
      errors.push(`${operationId}: required string path ID guard target is missing`)
    }
  }
}

function validateIdFields(schema, location, errors) {
  if (!schema || typeof schema !== 'object') return
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const propertyTypes = Array.isArray(property.type) ? property.type : [property.type]
    if (/(^id$|_id$)/.test(name) && !propertyTypes.includes('string')) {
      errors.push(`${location}.${name}: ID fields must use string transport`)
    }
    if (
      /_ids$/.test(name) &&
      (!propertyTypes.includes('array') || property.items?.type !== 'string')
    ) {
      errors.push(`${location}.${name}: ID list fields must use string items`)
    }
    validateIdFields(property, `${location}.${name}`, errors)
  }
  for (const [index, branch] of (schema.allOf ?? []).entries()) {
    validateIdFields(branch, `${location}.allOf[${index}]`, errors)
  }
}

/** 校验 ID 传输字段和路径身份参数。 */
export function validateSchemaContracts({
  errors,
  operationsById,
  resolveLocalReference,
  schemas,
}) {
  validateIdentityParameters(operationsById, resolveLocalReference, errors)
  for (const [name, schema] of Object.entries(schemas)) {
    validateIdFields(schema, `components.schemas.${name}`, errors)
  }
}
