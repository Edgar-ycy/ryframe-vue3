import { requirePermissionCatalog } from './permission-catalog-contract.mjs'

const resourceKeys = [
  'access',
  'api',
  'extension_permissions',
  'fields',
  'labels',
  'menu',
  'module',
  'name',
  'profile',
  'route',
  'storage',
]
const fieldKeys = [
  'enum_values',
  'labels',
  'name',
  'nullable',
  'order',
  'usage',
  'validation',
  'value_type',
  'widget',
  'wire_type',
]
const actionKeys = ['create', 'delete', 'list', 'read', 'update']
const usageKeys = [
  'create',
  'create_optional',
  'filter',
  'list',
  'read',
  'sort',
  'update',
  'update_optional',
]
const optionalUsageKeys = ['filter_exact', 'sort_desc']
const validationKeys = ['max_length', 'maximum', 'min_length', 'minimum', 'required']
const optionalValidationKeys = ['max_utf8_bytes', 'min_utf8_bytes']
const valueTypes = new Set(['bool', 'date', 'date_time', 'decimal', 'i32', 'i64', 'json', 'string'])
const editableWidgets = new Set(['number', 'select', 'text'])
const widgets = new Set([
  'date',
  'date_time',
  'hidden',
  'number',
  'select',
  'switch',
  'text',
  'textarea',
])
const httpMethods = ['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace']
const snakeIdentifierPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u
const kebabIdentifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const operationPattern = /^[A-Za-z_][A-Za-z0-9_]*$/u
const i64Minimum = -9223372036854775808n
const i64Maximum = 9223372036854775807n

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requireRecord(value, location) {
  if (!isRecord(value)) throw new Error(`${location}: 必须是对象`)
  return value
}

function requireExactKeys(value, expected, location) {
  const actual = Object.keys(requireRecord(value, location)).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${location}: 字段必须精确为 ${wanted.join(', ')}`)
  }
}

function requireString(value, location, pattern) {
  if (
    typeof value !== 'string' ||
    value.trim() !== value ||
    value.length === 0 ||
    (pattern && !pattern.test(value))
  ) {
    throw new Error(`${location}: 字符串格式无效`)
  }
  return value
}

function requireLabels(value, location) {
  requireExactKeys(value, ['en', 'zh_cn'], location)
  requireString(value.zh_cn, `${location}.zh_cn`)
  requireString(value.en, `${location}.en`)
}

function requireActions(value, location, pattern) {
  requireExactKeys(value, actionKeys, location)
  for (const action of actionKeys) requireString(value[action], `${location}.${action}`, pattern)
}

function isStrictPermission(value) {
  const segments = typeof value === 'string' ? value.split(':') : []
  return segments.length === 3 && segments.every((segment) => kebabIdentifierPattern.test(segment))
}

function requirePermission(value, location, permissionCodes) {
  const permission = requireString(value, location)
  if (!isStrictPermission(permission)) {
    throw new Error(`${location}: 必须是三段小写 kebab-case 权限码`)
  }
  if (!permissionCodes.has(permission)) {
    throw new Error(`${location}: 权限 ${permission} 不在 x-ryframe-permission-catalog 中`)
  }
  return permission
}

function requirePermissionActions(value, location, permissionCodes) {
  requireExactKeys(value, actionKeys, location)
  for (const action of actionKeys) {
    requirePermission(value[action], `${location}.${action}`, permissionCodes)
  }
}

function requireExtensionPermissions(value, location, permissionCodes) {
  const permissions = requireRecord(value, location)
  const names = Object.keys(permissions)
  const sortedNames = [...names].sort()
  if (names.some((name, index) => name !== sortedNames[index])) {
    throw new Error(`${location}: 扩展权限必须按名称字典序排列`)
  }
  for (const name of names) {
    if (!snakeIdentifierPattern.test(name)) {
      throw new Error(`${location}.${name}: 扩展权限名必须是小写 snake_case`)
    }
    if (actionKeys.includes(name)) {
      throw new Error(`${location}.${name}: 扩展权限名不能覆盖标准 CRUD 动作`)
    }
    requirePermission(permissions[name], `${location}.${name}`, permissionCodes)
  }
}

function operationLocations(document) {
  const result = new Map()
  for (const [routePath, pathItem] of Object.entries(document?.paths ?? {})) {
    for (const method of httpMethods) {
      const operationId = pathItem?.[method]?.operationId
      if (typeof operationId !== 'string') continue
      if (result.has(operationId)) throw new Error(`OpenAPI operationId 重复：${operationId}`)
      result.set(operationId, { method, path: routePath })
    }
  }
  return result
}

function requireOperation(operationMap, operationId, expected, location) {
  const actual = operationMap.get(operationId)
  if (!actual) throw new Error(`${location}: OpenAPI 中不存在 operationId ${operationId}`)
  if (actual.method !== expected.method || actual.path !== expected.path) {
    throw new Error(
      `${location}: ${operationId} 应映射为 ${expected.method.toUpperCase()} ${expected.path}`,
    )
  }
}

function requireField(field, location) {
  requireExactKeys(field, fieldKeys, location)
  requireString(field.name, `${location}.name`, /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u)
  if (!valueTypes.has(field.value_type)) throw new Error(`${location}.value_type: 不支持的字段类型`)
  if (!valueTypes.has(field.wire_type)) throw new Error(`${location}.wire_type: 不支持的传输类型`)
  if (
    field.wire_type !== field.value_type &&
    !(field.value_type === 'i64' && field.wire_type === 'string')
  ) {
    throw new Error(`${location}.wire_type: 只允许 i64 使用 string 传输`)
  }
  if (typeof field.nullable !== 'boolean') throw new Error(`${location}.nullable: 必须是布尔值`)
  if (!Number.isInteger(field.order) || field.order < 0) {
    throw new Error(`${location}.order: 必须是非负整数`)
  }
  if (!widgets.has(field.widget)) throw new Error(`${location}.widget: 不支持的控件类型`)
  requireLabels(field.labels, `${location}.labels`)

  const presentUsageKeys = optionalUsageKeys.filter((key) => key in field.usage)
  requireExactKeys(field.usage, [...usageKeys, ...presentUsageKeys], `${location}.usage`)
  for (const key of [...usageKeys, ...presentUsageKeys]) {
    if (typeof field.usage[key] !== 'boolean')
      throw new Error(`${location}.usage.${key}: 必须是布尔值`)
  }
  const presentValidationKeys = optionalValidationKeys.filter((key) => key in field.validation)
  requireExactKeys(
    field.validation,
    [...validationKeys, ...presentValidationKeys],
    `${location}.validation`,
  )
  if (typeof field.validation.required !== 'boolean') {
    throw new Error(`${location}.validation.required: 必须是布尔值`)
  }
  for (const key of ['min_length', 'max_length']) {
    const boundary = field.validation[key]
    if (boundary !== null && (!Number.isSafeInteger(boundary) || boundary < 0)) {
      throw new Error(`${location}.validation.${key}: 必须是非负安全整数或 null`)
    }
  }
  for (const key of optionalValidationKeys) {
    const boundary = field.validation[key]
    if (boundary !== undefined && (!Number.isSafeInteger(boundary) || boundary < 0)) {
      throw new Error(`${location}.validation.${key}: 必须是非负安全整数`)
    }
  }
  for (const key of ['minimum', 'maximum']) {
    const boundary = field.validation[key]
    if (boundary !== null && !Number.isSafeInteger(boundary)) {
      throw new Error(`${location}.validation.${key}: 必须是安全整数或 null`)
    }
  }
  const validation = field.validation
  if (
    validation.min_length !== null &&
    validation.max_length !== null &&
    validation.min_length > validation.max_length
  ) {
    throw new Error(`${location}.validation: min_length 不能大于 max_length`)
  }
  if (
    validation.minimum !== null &&
    validation.maximum !== null &&
    validation.minimum > validation.maximum
  ) {
    throw new Error(`${location}.validation: minimum 不能大于 maximum`)
  }
  if (
    validation.min_utf8_bytes !== undefined &&
    validation.max_utf8_bytes !== undefined &&
    validation.min_utf8_bytes > validation.max_utf8_bytes
  ) {
    throw new Error(`${location}.validation: min_utf8_bytes 不能大于 max_utf8_bytes`)
  }
  if (
    (validation.min_length !== null || validation.max_length !== null) &&
    field.value_type !== 'string'
  ) {
    throw new Error(`${location}.validation: 长度约束只能用于 string 字段`)
  }
  if (
    (validation.minimum !== null || validation.maximum !== null) &&
    !['i32', 'i64'].includes(field.value_type)
  ) {
    throw new Error(`${location}.validation: 数值范围只能用于 i32/i64 字段`)
  }
  if (
    (validation.min_utf8_bytes !== undefined || validation.max_utf8_bytes !== undefined) &&
    field.value_type !== 'string'
  ) {
    throw new Error(`${location}.validation: UTF-8 字节约束只能用于 string 字段`)
  }
  if (validation.required && field.nullable) {
    throw new Error(`${location}: nullable 与 validation.required=true 冲突`)
  }

  const usage = field.usage
  if (usage.create_optional && !usage.create) {
    throw new Error(`${location}.usage: create_optional 只能用于 create 字段`)
  }
  if (usage.update_optional && !usage.update) {
    throw new Error(`${location}.usage: update_optional 只能用于 update 字段`)
  }
  if (usage.filter_exact && (!usage.filter || field.value_type !== 'string')) {
    throw new Error(`${location}.usage: filter_exact 只能用于 string 筛选字段`)
  }
  if (usage.sort_desc && !usage.sort) {
    throw new Error(`${location}.usage: sort_desc 只能用于默认排序字段`)
  }
  if (field.nullable && usage.update_optional) {
    throw new Error(`${location}.usage: nullable 与 update_optional 无法表达明确更新语义`)
  }
  const editable = usage.create || usage.update
  if (editable && !editableWidgets.has(field.widget)) {
    throw new Error(`${location}.widget: flat_crud v1 可编辑字段只支持 text、number、select`)
  }
  if (editable && !(usage.read || usage.list)) {
    throw new Error(`${location}.usage: 可编辑字段必须同时出现在 read 或 list 视图`)
  }

  const enumValues = requireRecord(field.enum_values, `${location}.enum_values`)
  for (const [value, labels] of Object.entries(enumValues)) {
    requireEnumKey(value, field.value_type, `${location}.enum_values 的键`)
    requireLabels(labels, `${location}.enum_values.${value}`)
  }
  if (field.widget !== 'select' && Object.keys(enumValues).length > 0) {
    throw new Error(`${location}: enum_values 只能配合 select 控件`)
  }
  if (field.widget === 'select' && Object.keys(enumValues).length === 0) {
    throw new Error(`${location}: select 控件必须声明有限枚举`)
  }
}

function requireCanonicalInteger(value, minimum, maximum, location) {
  if (!/^-?(?:0|[1-9][0-9]*)$/u.test(value) || value === '-0') {
    throw new Error(`${location}: 必须是规范十进制整数`)
  }
  const parsed = BigInt(value)
  if (parsed < minimum || parsed > maximum) {
    throw new Error(`${location}: 超出字段整数范围`)
  }
}

function requireEnumKey(value, valueType, location) {
  requireString(value, location)
  if (valueType === 'string') return
  if (valueType === 'bool') {
    if (!['false', 'true'].includes(value))
      throw new Error(`${location}: bool 枚举仅支持 false/true`)
    return
  }
  if (valueType === 'i32') {
    requireCanonicalInteger(value, -2147483648n, 2147483647n, location)
    return
  }
  if (valueType === 'i64') {
    requireCanonicalInteger(value, i64Minimum, i64Maximum, location)
    return
  }
  throw new Error(`${location}: ${valueType} 字段不支持 flat_crud v1 枚举`)
}

function requireResource(resource, index, operationMap, permissionCodes, seen) {
  const location = `x-ryframe-crud-resources.resources[${index}]`
  requireExactKeys(resource, resourceKeys, location)
  const name = requireString(resource.name, `${location}.name`, /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u)
  if (seen.names.has(name)) throw new Error(`${location}.name: 资源名重复 ${name}`)
  seen.names.add(name)
  requireString(resource.module, `${location}.module`, snakeIdentifierPattern)
  if (resource.module !== 'system')
    throw new Error(`${location}.module: flat_crud v1 仅支持 system`)
  if (resource.profile !== 'flat_crud') throw new Error(`${location}.profile: 只支持 flat_crud`)
  if (!['control_row', 'tenant_data'].includes(resource.storage)) {
    throw new Error(`${location}.storage: 不支持的存储类型`)
  }
  requireLabels(resource.labels, `${location}.labels`)

  requireExactKeys(resource.api, ['operations', 'path'], `${location}.api`)
  const apiPath = requireString(
    resource.api.path,
    `${location}.api.path`,
    /^\/api\/v1\/system\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/u,
  )
  if (seen.paths.has(apiPath)) throw new Error(`${location}.api.path: API 路径重复 ${apiPath}`)
  seen.paths.add(apiPath)
  requireActions(resource.api.operations, `${location}.api.operations`, operationPattern)

  const accessKeys = ['capability', 'permissions']
  if ('owner_field' in resource.access) accessKeys.push('owner_field')
  requireExactKeys(resource.access, accessKeys, `${location}.access`)
  requireString(resource.access.capability, `${location}.access.capability`, /^[a-z0-9_.-]+$/u)
  requirePermissionActions(
    resource.access.permissions,
    `${location}.access.permissions`,
    permissionCodes,
  )
  requireExtensionPermissions(
    resource.extension_permissions,
    `${location}.extension_permissions`,
    permissionCodes,
  )

  requireExactKeys(resource.menu, ['icon', 'key', 'labels', 'order', 'parent'], `${location}.menu`)
  requireString(resource.menu.key, `${location}.menu.key`, /^[A-Za-z0-9_.-]+$/u)
  requireString(resource.menu.parent, `${location}.menu.parent`, /^[A-Za-z0-9_.-]+$/u)
  if (resource.menu.icon !== null) {
    requireString(resource.menu.icon, `${location}.menu.icon`, /^[A-Za-z0-9_.-]+$/u)
  }
  if (!Number.isInteger(resource.menu.order) || resource.menu.order < 0) {
    throw new Error(`${location}.menu.order: 必须是非负整数`)
  }
  requireLabels(resource.menu.labels, `${location}.menu.labels`)
  if (seen.menuKeys.has(resource.menu.key)) {
    throw new Error(`${location}.menu.key: 菜单键重复 ${resource.menu.key}`)
  }
  seen.menuKeys.add(resource.menu.key)

  requireExactKeys(resource.route, ['key', 'path'], `${location}.route`)
  requireString(resource.route.key, `${location}.route.key`, /^[A-Za-z0-9_.-]+$/u)
  requireString(resource.route.path, `${location}.route.path`, /^\/[A-Za-z0-9_/-]+$/u)
  if (seen.routeKeys.has(resource.route.key)) {
    throw new Error(`${location}.route.key: 路由键重复 ${resource.route.key}`)
  }
  if (seen.routePaths.has(resource.route.path)) {
    throw new Error(`${location}.route.path: 路由路径重复 ${resource.route.path}`)
  }
  seen.routeKeys.add(resource.route.key)
  seen.routePaths.add(resource.route.path)

  if (!Array.isArray(resource.fields) || resource.fields.length === 0) {
    throw new Error(`${location}.fields: 至少需要一个 UI 安全字段`)
  }
  const fieldNames = new Set()
  let previousOrder = -1
  for (const [fieldIndex, field] of resource.fields.entries()) {
    const fieldLocation = `${location}.fields[${fieldIndex}]`
    requireField(field, fieldLocation)
    if (fieldNames.has(field.name))
      throw new Error(`${fieldLocation}.name: 字段名重复 ${field.name}`)
    if (field.order <= previousOrder)
      throw new Error(`${fieldLocation}.order: 字段顺序必须严格递增`)
    fieldNames.add(field.name)
    previousOrder = field.order
  }
  if ('owner_field' in resource.access) {
    const ownerField = requireString(
      resource.access.owner_field,
      `${location}.access.owner_field`,
      snakeIdentifierPattern,
    )
    const field = resource.fields.find((candidate) => candidate.name === ownerField)
    if (!field || field.value_type !== 'i64') {
      throw new Error(`${location}.access.owner_field: 必须引用 i64 字段`)
    }
  }

  const operations = resource.api.operations
  requireOperation(
    operationMap,
    operations.create,
    { method: 'post', path: apiPath },
    `${location}.api.operations.create`,
  )
  requireOperation(
    operationMap,
    operations.list,
    { method: 'get', path: apiPath },
    `${location}.api.operations.list`,
  )
  const detailPath = `${apiPath}/{id}`
  requireOperation(
    operationMap,
    operations.read,
    { method: 'get', path: detailPath },
    `${location}.api.operations.read`,
  )
  requireOperation(
    operationMap,
    operations.update,
    { method: 'put', path: detailPath },
    `${location}.api.operations.update`,
  )
  requireOperation(
    operationMap,
    operations.delete,
    { method: 'delete', path: detailPath },
    `${location}.api.operations.delete`,
  )
}

export function requireCrudResourceCatalog(value, document) {
  requireExactKeys(value, ['resources', 'version'], 'x-ryframe-crud-resources')
  if (value.version !== 1 || !Array.isArray(value.resources) || value.resources.length === 0) {
    throw new Error('x-ryframe-crud-resources: 必须是 version=1 且包含非空 resources 数组')
  }
  const permissionCodes = new Set(
    requirePermissionCatalog(document?.['x-ryframe-permission-catalog'], 'OpenAPI'),
  )
  const operationMap = operationLocations(document)
  const seen = {
    menuKeys: new Set(),
    names: new Set(),
    paths: new Set(),
    routeKeys: new Set(),
    routePaths: new Set(),
  }
  let previousName = ''
  for (const [index, resource] of value.resources.entries()) {
    requireResource(resource, index, operationMap, permissionCodes, seen)
    if (index > 0 && resource.name <= previousName) {
      throw new Error('x-ryframe-crud-resources.resources: 资源必须按 name 严格排序')
    }
    previousName = resource.name
  }
  return value.resources
}
