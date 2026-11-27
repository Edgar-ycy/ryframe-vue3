import { requirePermissionCatalog } from './permission-catalog-contract.ts'
import { requireField, type CrudField } from './crud-field-contract.ts'
import {
  getProperty,
  hasKey,
  requireExactKeys,
  requireLabels,
  requireRecord,
  requireString,
  requireStringRecord,
  type Labels,
} from './crud-contract-format.ts'

export interface CrudResource {
  name: string
  fields: readonly CrudField[]
  route: { key: string; path: string }
  menu: { labels: Labels }
}

interface OperationLocation {
  method: string
  path: string
}

type SeenResources = Record<
  'menuKeys' | 'names' | 'paths' | 'routeKeys' | 'routePaths',
  Set<string>
>

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
const actionKeys = ['create', 'delete', 'list', 'read', 'update'] as const
const httpMethods = ['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace']
const snakeIdentifierPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u
const kebabIdentifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const operationPattern = /^[A-Za-z_][A-Za-z0-9_]*$/u

function isStrictPermission(value: string): boolean {
  const segments = value.split(':')
  return segments.length === 3 && segments.every((segment) => kebabIdentifierPattern.test(segment))
}

function requirePermission(
  value: unknown,
  location: string,
  permissionCodes: ReadonlySet<string>,
): string {
  const permission = requireString(value, location)
  if (!isStrictPermission(permission)) {
    throw new Error(`${location}: 必须是三段小写 kebab-case 权限码`)
  }
  if (!permissionCodes.has(permission)) {
    throw new Error(`${location}: 权限 ${permission} 不在 x-ryframe-permission-catalog 中`)
  }
  return permission
}

function requirePermissionActions(
  value: unknown,
  location: string,
  permissionCodes: ReadonlySet<string>,
): void {
  requireExactKeys(value, actionKeys, location)
  for (const action of actionKeys) {
    requirePermission(value[action], `${location}.${action}`, permissionCodes)
  }
}

function requireExtensionPermissions(
  value: unknown,
  location: string,
  permissionCodes: ReadonlySet<string>,
): void {
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
    if (actionKeys.some((action) => name === action)) {
      throw new Error(`${location}.${name}: 扩展权限名不能覆盖标准 CRUD 动作`)
    }
    requirePermission(permissions[name], `${location}.${name}`, permissionCodes)
  }
}

function operationLocations(document: unknown): Map<string, OperationLocation> {
  const result = new Map<string, OperationLocation>()
  for (const [routePath, pathItem] of Object.entries(getProperty(document, 'paths') ?? {})) {
    for (const method of httpMethods) {
      const operationId = getProperty(getProperty(pathItem, method), 'operationId')
      if (typeof operationId !== 'string') continue
      if (result.has(operationId)) throw new Error(`OpenAPI operationId 重复：${operationId}`)
      result.set(operationId, { method, path: routePath })
    }
  }
  return result
}

function requireOperation(
  operationMap: ReadonlyMap<string, OperationLocation>,
  operationId: string,
  expected: OperationLocation,
  location: string,
): void {
  const actual = operationMap.get(operationId)
  if (!actual) throw new Error(`${location}: OpenAPI 中不存在 operationId ${operationId}`)
  if (actual.method !== expected.method || actual.path !== expected.path) {
    throw new Error(
      `${location}: ${operationId} 应映射为 ${expected.method.toUpperCase()} ${expected.path}`,
    )
  }
}

function requireResource(
  resource: unknown,
  index: number,
  operationMap: ReadonlyMap<string, OperationLocation>,
  permissionCodes: ReadonlySet<string>,
  seen: SeenResources,
): asserts resource is CrudResource {
  const location = `x-ryframe-crud-resources.resources[${index}]`
  requireExactKeys(resource, resourceKeys, location)
  const name = requireString(resource.name, `${location}.name`, /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u)
  if (seen.names.has(name)) throw new Error(`${location}.name: 资源名重复 ${name}`)
  seen.names.add(name)
  const module = requireString(resource.module, `${location}.module`, snakeIdentifierPattern)
  if (!['system', 'business'].includes(module)) {
    throw new Error(`${location}.module: flat_crud v1 仅支持 system 或 business`)
  }
  if (resource.profile !== 'flat_crud') throw new Error(`${location}.profile: 只支持 flat_crud`)
  if (resource.storage !== 'control_row' && resource.storage !== 'tenant_data') {
    throw new Error(`${location}.storage: 不支持的存储类型`)
  }
  requireLabels(resource.labels, `${location}.labels`)

  const api = resource.api
  requireExactKeys(api, ['operations', 'path'], `${location}.api`)
  const apiPath = requireString(
    api.path,
    `${location}.api.path`,
    new RegExp(`^/api/v1/${module}/[a-z0-9_-]+(?:/[a-z0-9_-]+)*$`, 'u'),
  )
  if (seen.paths.has(apiPath)) throw new Error(`${location}.api.path: API 路径重复 ${apiPath}`)
  seen.paths.add(apiPath)
  const operations = api.operations
  requireStringRecord(operations, actionKeys, `${location}.api.operations`, operationPattern)

  const accessKeys = ['permissions']
  const access = resource.access
  if (hasKey(access, 'capability')) accessKeys.push('capability')
  if (hasKey(access, 'owner_field')) accessKeys.push('owner_field')
  if (hasKey(access, 'system_tenant_only')) {
    accessKeys.push('system_tenant_only')
    if (getProperty(access, 'system_tenant_only') !== true || resource.storage !== 'control_row') {
      throw new Error(`${location}.access.system_tenant_only: 必须是控制库全局业务的 true 标志`)
    }
  }
  requireExactKeys(access, accessKeys, `${location}.access`)
  if ('capability' in access) {
    requireString(access.capability, `${location}.access.capability`, /^[a-z0-9_.-]+$/u)
  }
  requirePermissionActions(access.permissions, `${location}.access.permissions`, permissionCodes)
  requireExtensionPermissions(
    resource.extension_permissions,
    `${location}.extension_permissions`,
    permissionCodes,
  )

  const menu = resource.menu
  requireExactKeys(menu, ['icon', 'key', 'labels', 'order', 'parent'], `${location}.menu`)
  const menuKey = requireString(menu.key, `${location}.menu.key`, /^[A-Za-z0-9_.-]+$/u)
  requireString(menu.parent, `${location}.menu.parent`, /^[A-Za-z0-9_.-]+$/u)
  if (menu.icon !== null) {
    requireString(menu.icon, `${location}.menu.icon`, /^[A-Za-z0-9_.-]+$/u)
  }
  if (typeof menu.order !== 'number' || !Number.isInteger(menu.order) || menu.order < 0) {
    throw new Error(`${location}.menu.order: 必须是非负整数`)
  }
  requireLabels(menu.labels, `${location}.menu.labels`)
  if (seen.menuKeys.has(menuKey)) {
    throw new Error(`${location}.menu.key: 菜单键重复 ${menuKey}`)
  }
  seen.menuKeys.add(menuKey)

  const route = resource.route
  requireExactKeys(route, ['key', 'path'], `${location}.route`)
  const routeKey = requireString(route.key, `${location}.route.key`, /^[A-Za-z0-9_.-]+$/u)
  const routePath = requireString(route.path, `${location}.route.path`, /^\/[A-Za-z0-9_/-]+$/u)
  if (seen.routeKeys.has(routeKey)) {
    throw new Error(`${location}.route.key: 路由键重复 ${routeKey}`)
  }
  if (seen.routePaths.has(routePath)) {
    throw new Error(`${location}.route.path: 路由路径重复 ${routePath}`)
  }
  seen.routeKeys.add(routeKey)
  seen.routePaths.add(routePath)

  if (!Array.isArray(resource.fields) || resource.fields.length === 0) {
    throw new Error(`${location}.fields: 至少需要一个 UI 安全字段`)
  }
  const fields: readonly unknown[] = resource.fields
  const fieldNames = new Set<string>()
  let previousOrder = -1
  for (const [fieldIndex, field] of fields.entries()) {
    const fieldLocation = `${location}.fields[${fieldIndex}]`
    requireField(field, fieldLocation)
    if (fieldNames.has(field.name))
      throw new Error(`${fieldLocation}.name: 字段名重复 ${field.name}`)
    if (field.order <= previousOrder)
      throw new Error(`${fieldLocation}.order: 字段顺序必须严格递增`)
    fieldNames.add(field.name)
    previousOrder = field.order
  }
  if ('owner_field' in access) {
    const ownerField = requireString(
      access.owner_field,
      `${location}.access.owner_field`,
      snakeIdentifierPattern,
    )
    const field = fields.find((candidate) => getProperty(candidate, 'name') === ownerField)
    if (!field || getProperty(field, 'value_type') !== 'i64') {
      throw new Error(`${location}.access.owner_field: 必须引用 i64 字段`)
    }
  }

  const detailPath = `${apiPath}/{id}`
  for (const [action, method, path] of [
    ['create', 'post', apiPath],
    ['list', 'get', apiPath],
    ['read', 'get', detailPath],
    ['update', 'put', detailPath],
    ['delete', 'delete', detailPath],
  ] as const) {
    requireOperation(
      operationMap,
      operations[action],
      { method, path },
      `${location}.api.operations.${action}`,
    )
  }
}

function requireResources(
  resources: readonly unknown[],
  operationMap: ReadonlyMap<string, OperationLocation>,
  permissionCodes: ReadonlySet<string>,
): asserts resources is readonly CrudResource[] {
  const seen: SeenResources = {
    menuKeys: new Set(),
    names: new Set(),
    paths: new Set(),
    routeKeys: new Set(),
    routePaths: new Set(),
  }
  let previousName = ''
  for (const [index, resource] of resources.entries()) {
    requireResource(resource, index, operationMap, permissionCodes, seen)
    if (index > 0 && resource.name <= previousName) {
      throw new Error('x-ryframe-crud-resources.resources: 资源必须按 name 严格排序')
    }
    previousName = resource.name
  }
}

export function requireCrudResourceCatalog(
  value: unknown,
  document: unknown,
): readonly CrudResource[] {
  requireExactKeys(value, ['resources', 'version'], 'x-ryframe-crud-resources')
  if (value.version !== 1 || !Array.isArray(value.resources) || value.resources.length === 0) {
    throw new Error('x-ryframe-crud-resources: 必须是 version=1 且包含非空 resources 数组')
  }
  const permissionCodes = new Set(
    requirePermissionCatalog(getProperty(document, 'x-ryframe-permission-catalog'), 'OpenAPI'),
  )
  const operationMap = operationLocations(document)
  const resources: readonly unknown[] = value.resources
  requireResources(resources, operationMap, permissionCodes)
  return resources
}
