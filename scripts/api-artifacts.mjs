import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import openapiTS, { astToString } from 'openapi-typescript'

import { requireApiPrefixContract } from './api-prefix-contract.mjs'
import { requirePermissionCatalog } from './permission-catalog-contract.mjs'

export const generatedArtifactPaths = Object.freeze([
  'src/api/generated/schema.ts',
  'src/api/generated/operations.ts',
  'src/api/generated/permissions.ts',
  'src/api/generated/menuRoutes.ts',
  'src/shared/security/passwordPolicy.generated.json',
  'src/shared/markdown/noticePolicy.generated.json',
  'src/shared/config/apiPrefix.generated.json',
])

const generatedHeader = `/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

`
const httpMethods = ['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace']
const infrastructurePaths = new Set(['/livez', '/readyz'])

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function compareText(left, right) {
  if (left === right) return 0
  return left < right ? -1 : 1
}

export function createOperationManifest(document) {
  const apiPrefix = requireApiPrefixContract(
    document?.['x-ryframe-api-prefix'],
    'openapi/openapi.json',
  ).value
  const operations = []
  const operationIds = new Set()

  for (const [routePath, pathItem] of Object.entries(document?.paths ?? {})) {
    if (routePath !== apiPrefix && !routePath.startsWith(`${apiPrefix}/`)) {
      if (infrastructurePaths.has(routePath)) continue
      throw new Error(`OpenAPI 路径 ${routePath} 不属于已声明的 API 前缀 ${apiPrefix}`)
    }
    const requestPath = routePath.slice(apiPrefix.length) || '/'
    for (const method of httpMethods) {
      const operation = pathItem?.[method]
      if (!operation) continue
      const operationId = operation.operationId
      if (typeof operationId !== 'string'
        || !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(operationId)) {
        throw new Error(`${method.toUpperCase()} ${routePath} 缺少合法 operationId`)
      }
      if (operationIds.has(operationId)) {
        throw new Error(`OpenAPI 存在重复 operationId：${operationId}`)
      }
      operationIds.add(operationId)
      operations.push([operationId, { method, path: requestPath }])
    }
  }

  operations.sort(([left], [right]) => compareText(left, right))
  return Object.fromEntries(operations)
}

export function renderOperationManifest(document) {
  const manifest = createOperationManifest(document)
  const operationIds = Object.keys(manifest)
  const operationIdType = operationIds.map(operationId => JSON.stringify(operationId)).join('\n  | ')
  const descriptors = Object.entries(manifest).map(([operationId, operation]) => (
    `export const ${operationId} = ${JSON.stringify({ operationId, ...operation })} as const satisfies OperationDescriptor<${JSON.stringify(operationId)}>`
  )).join('\n\n')

  return `${generatedHeader}export type OperationId =
  | ${operationIdType}

export type OperationDescriptor<Name extends OperationId = OperationId> = Readonly<{
  operationId: Name
  method: 'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put' | 'trace'
  path: string
}>

${descriptors}
`
}

export function renderPermissionCatalog(document) {
  const codes = requirePermissionCatalog(
    document?.['x-ryframe-permission-catalog'],
    'openapi/openapi.json',
  )
  return `${generatedHeader}export const permissionCatalog = ${JSON.stringify(codes, null, 2)} as const

export type PermissionCode = typeof permissionCatalog[number]

const permissionCodeSet: ReadonlySet<string> = new Set(permissionCatalog)

export function isPermissionCode(value: string): value is PermissionCode {
  return permissionCodeSet.has(value)
}
`
}

function requireMenuRouteCatalog(value, location) {
  if (!value || typeof value !== 'object' || value.version !== 2 || !Array.isArray(value.routes)) {
    throw new Error(`${location}: 菜单路由契约必须是 version=2 的对象`)
  }
  const routeKeys = new Set()
  const titleKeys = new Set()
  return value.routes.map((route, index) => {
    const routeKey = route?.route_key
    const defaultName = route?.name
    const titleKey = route?.title_key
    if (typeof routeKey !== 'string'
      || !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u.test(routeKey)) {
      throw new Error(`${location}.routes[${index}]: route_key 无效`)
    }
    if (typeof defaultName !== 'string'
      || defaultName.trim() !== defaultName
      || defaultName.length === 0
      || [...defaultName].length > 64) {
      throw new Error(`${location}.routes[${index}]: name 无效`)
    }
    if (typeof titleKey !== 'string' || !/^[A-Za-z][A-Za-z0-9]*$/u.test(titleKey)) {
      throw new Error(`${location}.routes[${index}]: title_key 无效`)
    }
    if (routeKeys.has(routeKey)) throw new Error(`${location}: route_key 重复：${routeKey}`)
    if (titleKeys.has(titleKey)) throw new Error(`${location}: title_key 重复：${titleKey}`)
    routeKeys.add(routeKey)
    titleKeys.add(titleKey)
    return { defaultName, routeKey, titleKey }
  })
}

export function renderMenuRouteCatalog(document) {
  const routes = requireMenuRouteCatalog(
    document?.['x-ryframe-menu-routes'],
    'openapi/openapi.json.x-ryframe-menu-routes',
  )
  const titleKeys = Object.fromEntries(routes.flatMap(route => [
    [route.routeKey, route.titleKey],
    [route.defaultName, route.titleKey],
  ]))
  return `${generatedHeader}export const menuRouteCatalog = ${JSON.stringify(routes, null, 2)} as const

export type MenuRouteKey = typeof menuRouteCatalog[number]['routeKey']

export const navigationRouteTitleKeys: Readonly<Record<string, string>> = Object.freeze(${JSON.stringify(titleKeys, null, 2)})
`
}

export async function buildApiArtifacts(root) {
  const contractPath = path.join(root, 'openapi/openapi.json')
  const document = JSON.parse(await readFile(contractPath, 'utf8'))
  const schema = generatedHeader
    + astToString(await openapiTS(pathToFileURL(contractPath)))

  return new Map([
    ['src/api/generated/schema.ts', schema],
    ['src/api/generated/operations.ts', renderOperationManifest(document)],
    ['src/api/generated/permissions.ts', renderPermissionCatalog(document)],
    ['src/api/generated/menuRoutes.ts', renderMenuRouteCatalog(document)],
    [
      'src/shared/security/passwordPolicy.generated.json',
      canonicalJson(document['x-ryframe-password-policy']),
    ],
    [
      'src/shared/markdown/noticePolicy.generated.json',
      canonicalJson(document['x-ryframe-notice-policy']),
    ],
    [
      'src/shared/config/apiPrefix.generated.json',
      canonicalJson(document['x-ryframe-api-prefix']),
    ],
  ])
}
