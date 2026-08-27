import { readFile } from 'node:fs/promises'
import path from 'node:path'

import openapiTS, { astToString } from 'openapi-typescript'

import { requireApiPrefixContract } from './api-prefix-contract.mjs'
import { requireCrudResourceCatalog } from './crud-resource-contract.mjs'
import { requirePermissionCatalog } from './permission-catalog-contract.mjs'
import {
  createSchemaDomainDocuments,
  renderSchemaIndex,
  schemaDomainForPath,
  schemaDomainNames,
} from './openapi-schema-domains.mjs'

export const ownershipManifestPath = 'src/api/generated/ownership.json'
export const generatedOperationArtifactPaths = Object.freeze([
  'src/api/generated/operations/core.ts',
  'src/api/generated/operations/system.ts',
  'src/api/generated/operations/platform.ts',
  'src/api/generated/operations/monitor.ts',
  'src/api/generated/operations/agent.ts',
])
export const generatedArtifactPaths = Object.freeze([
  'src/api/generated/schema/core.ts',
  'src/api/generated/schema/system.ts',
  'src/api/generated/schema/platform.ts',
  'src/api/generated/schema/monitor.ts',
  'src/api/generated/schema/agent.ts',
  'src/api/generated/schema/index.ts',
  ...generatedOperationArtifactPaths,
  'src/api/generated/permissions.ts',
  'src/api/generated/menuRoutes.ts',
  'src/api/generated/crudResources.ts',
  'src/shared/security/passwordPolicy.generated.json',
  'src/shared/markdown/noticePolicy.generated.json',
  'src/shared/config/apiPrefix.generated.json',
  'src/api/generated/ownership.json',
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

function classifyOperationBinder(operation, location) {
  const requestMediaTypes = Object.keys(operation.requestBody?.content ?? {})
  if (requestMediaTypes.length > 1) {
    throw new Error(`${location} 请求媒体类型不唯一：${requestMediaTypes.join(', ')}`)
  }
  if (operation.requestBody && requestMediaTypes.length === 0) {
    throw new Error(`${location} 请求体缺少媒体类型`)
  }

  const responseMediaTypes = new Set()
  for (const [status, response] of Object.entries(operation.responses ?? {})) {
    if (!/^2\d\d$/u.test(status)) continue
    for (const mediaType of Object.keys(response?.content ?? {})) responseMediaTypes.add(mediaType)
  }
  if (responseMediaTypes.size !== 1) {
    throw new Error(
      `${location} 成功响应媒体类型必须唯一，实际为：${[...responseMediaTypes].join(', ') || '无'}`,
    )
  }

  const [requestMediaType] = requestMediaTypes
  const [responseMediaType] = responseMediaTypes
  if (requestMediaType === 'multipart/form-data') {
    if (responseMediaType !== 'application/json') {
      throw new Error(`${location} multipart 请求只支持 JSON 成功响应`)
    }
    return 'bindMultipartOperation'
  }
  if (requestMediaType && requestMediaType !== 'application/json') {
    throw new Error(`${location} 不支持请求媒体类型：${requestMediaType}`)
  }
  if (responseMediaType === 'application/json') return 'bindJsonOperation'
  if (responseMediaType === 'text/plain') return 'bindTextOperation'
  return 'bindBlobOperation'
}

export function createOperationCallers(document) {
  const apiPrefix = requireApiPrefixContract(
    document?.['x-ryframe-api-prefix'],
    'openapi/openapi.json',
  ).value
  const operations = new Map(schemaDomainNames.map((domain) => [domain, []]))
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
      if (typeof operationId !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(operationId)) {
        throw new Error(`${method.toUpperCase()} ${routePath} 缺少合法 operationId`)
      }
      if (operationIds.has(operationId)) {
        throw new Error(`OpenAPI 存在重复 operationId：${operationId}`)
      }
      operationIds.add(operationId)
      const domain = schemaDomainForPath(routePath, apiPrefix)
      const location = `${method.toUpperCase()} ${routePath} (${operationId})`
      operations.get(domain).push({
        binder: classifyOperationBinder(operation, location),
        method,
        operationId,
        path: requestPath,
      })
    }
  }

  for (const domain of schemaDomainNames) {
    operations.get(domain).sort((left, right) => compareText(left.operationId, right.operationId))
  }
  return operations
}

export function renderOperationCallers(document) {
  const operations = createOperationCallers(document)
  return new Map(
    schemaDomainNames.map((domain) => {
      const domainOperations = operations.get(domain)
      const binders = [...new Set(domainOperations.map((operation) => operation.binder))].sort(
        compareText,
      )
      const imports = `import { ${binders.join(', ')} } from '@/api/operationRequest'`
      const callers = domainOperations
        .map(
          ({ binder, method, operationId, path: requestPath }) =>
            `export const ${operationId} = ${binder}(${JSON.stringify({ operationId, method, path: requestPath })})`,
        )
        .join('\n')
      return [
        `src/api/generated/operations/${domain}.ts`,
        `${generatedHeader}${imports}\n\n${callers}\n`,
      ]
    }),
  )
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
    if (typeof routeKey !== 'string' || !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u.test(routeKey)) {
      throw new Error(`${location}.routes[${index}]: route_key 无效`)
    }
    if (
      typeof defaultName !== 'string' ||
      defaultName.trim() !== defaultName ||
      defaultName.length === 0 ||
      [...defaultName].length > 64
    ) {
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
  const titleKeys = Object.fromEntries(
    routes.flatMap((route) => [
      [route.routeKey, route.titleKey],
      [route.defaultName, route.titleKey],
    ]),
  )
  return `${generatedHeader}export const menuRouteCatalog = ${JSON.stringify(routes, null, 2)} as const

export type MenuRouteKey = typeof menuRouteCatalog[number]['routeKey']

export const navigationRouteTitleKeys: Readonly<Record<string, string>> = Object.freeze(${JSON.stringify(titleKeys, null, 2)})
`
}

export function renderCrudResourceCatalog(document) {
  const resources = requireCrudResourceCatalog(document?.['x-ryframe-crud-resources'], document)
  const resourcesByName = resources
    .map((resource, index) => `  ${JSON.stringify(resource.name)}: crudResourceCatalog[${index}],`)
    .join('\n')
  return `${generatedHeader}export const crudResourceCatalog = ${JSON.stringify(resources, null, 2)} as const

export type CrudResourceDescriptor = typeof crudResourceCatalog[number]
export type CrudResourceName = CrudResourceDescriptor['name']

export const crudResourceCatalogByName = {
${resourcesByName}
} as const satisfies Readonly<Record<CrudResourceName, CrudResourceDescriptor>>

export type CrudResourceDescriptorByName<Name extends CrudResourceName> =
  typeof crudResourceCatalogByName[Name]

export function findCrudResource<Name extends CrudResourceName>(
  name: Name,
): CrudResourceDescriptorByName<Name> {
  return crudResourceCatalogByName[name]
}
`
}

export async function buildApiArtifacts(root) {
  const contractPath = path.join(root, 'openapi/openapi.json')
  const document = JSON.parse(await readFile(contractPath, 'utf8'))
  const apiPrefix = requireApiPrefixContract(
    document?.['x-ryframe-api-prefix'],
    'openapi/openapi.json',
  ).value
  const domainDocuments = createSchemaDomainDocuments(document, apiPrefix)
  const schemaArtifacts = []
  for (const [domain, domainDocument] of domainDocuments) {
    schemaArtifacts.push([
      `src/api/generated/schema/${domain}.ts`,
      generatedHeader + astToString(await openapiTS(domainDocument)),
    ])
  }
  schemaArtifacts.push(['src/api/generated/schema/index.ts', renderSchemaIndex(generatedHeader)])
  const operationArtifacts = renderOperationCallers(document)

  return new Map([
    ...schemaArtifacts,
    ...operationArtifacts,
    ['src/api/generated/permissions.ts', renderPermissionCatalog(document)],
    ['src/api/generated/menuRoutes.ts', renderMenuRouteCatalog(document)],
    ['src/api/generated/crudResources.ts', renderCrudResourceCatalog(document)],
    [
      'src/shared/security/passwordPolicy.generated.json',
      canonicalJson(document['x-ryframe-password-policy']),
    ],
    [
      'src/shared/markdown/noticePolicy.generated.json',
      canonicalJson(document['x-ryframe-notice-policy']),
    ],
    ['src/shared/config/apiPrefix.generated.json', canonicalJson(document['x-ryframe-api-prefix'])],
    [
      ownershipManifestPath,
      canonicalJson({
        version: 1,
        generator: 'scripts/generate-api-artifacts.mjs',
        files: [...generatedArtifactPaths].sort(compareText),
      }),
    ],
  ])
}
