import { readFile } from 'node:fs/promises'
import path from 'node:path'

import openapiTS, { astToString, type OpenAPI3 } from 'openapi-typescript'

import { requireApiPrefixContract } from './api-prefix-contract.ts'
import { renderOperationCallers } from './api-operation-artifacts.ts'
import { getProperty } from './crud-contract-format.ts'
import { requireCrudResourceCatalog } from './crud-resource-contract.ts'
import { requirePermissionCatalog } from './permission-catalog-contract.ts'
import { artifactPaths } from './api-artifact-manifest.ts'
import { createSchemaDomainDocuments, renderSchemaIndex } from './openapi-schema-domains.ts'

export const ownershipManifestPath = 'src/api/generated/ownership.json'
export const generatedArtifactPaths = artifactPaths
export const generatedOperationArtifactPaths = Object.freeze(
  artifactPaths.filter((file) => file.startsWith('src/api/generated/operations/')),
)

const generatedHeader = `/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

`

function canonicalJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function renderPermissionCatalog(document: unknown): string {
  const codes = requirePermissionCatalog(
    getProperty(document, 'x-ryframe-permission-catalog'),
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

interface MenuRoute {
  defaultName: string
  icon: string | null
  routeKey: string
  titleKey: string
}

function requireMenuRouteCatalog(value: unknown, location: string): MenuRoute[] {
  const routes =
    value && typeof value === 'object' && getProperty(value, 'version') === 3
      ? getProperty(value, 'routes')
      : undefined
  if (!Array.isArray(routes)) {
    throw new Error(`${location}: 菜单路由契约必须是 version=3 的对象`)
  }
  const routeKeys = new Set<string>()
  const titleKeys = new Set<string>()
  return routes.map((route: unknown, index) => {
    const routeKey = getProperty(route, 'route_key')
    const defaultName = getProperty(route, 'name')
    const titleKey = getProperty(route, 'title_key')
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
    const icon = getProperty(route, 'icon') ?? null
    if (icon !== null && (typeof icon !== 'string' || !/^[A-Z][A-Za-z0-9]*$/u.test(icon))) {
      throw new Error(`${location}.routes[${index}]: icon 无效`)
    }
    if (routeKeys.has(routeKey)) throw new Error(`${location}: route_key 重复：${routeKey}`)
    if (titleKeys.has(titleKey)) throw new Error(`${location}: title_key 重复：${titleKey}`)
    routeKeys.add(routeKey)
    titleKeys.add(titleKey)
    return { defaultName, icon, routeKey, titleKey }
  })
}

export function renderMenuRouteCatalog(document: unknown): string {
  const routes = requireMenuRouteCatalog(
    getProperty(document, 'x-ryframe-menu-routes'),
    'openapi/openapi.json.x-ryframe-menu-routes',
  )
  const titleKeys = Object.fromEntries(routes.map((route) => [route.routeKey, route.titleKey]))
  const resourceDefaultNames: Record<string, string> = {}
  const resourceNames: Record<string, string> = {}
  for (const resource of requireCrudResourceCatalog(
    getProperty(document, 'x-ryframe-crud-resources'),
    document,
  )) {
    const route = routes.find((candidate) => candidate.routeKey === resource.route.key)
    if (!route) throw new Error(`生成资源 ${resource.name} 缺少菜单路由声明`)
    resourceDefaultNames[route.titleKey] = route.defaultName
    resourceNames[route.titleKey] = resource.menu.labels.en
  }
  return `${generatedHeader}export const menuRouteCatalog = ${JSON.stringify(routes, null, 2)} as const

export type MenuRouteKey = typeof menuRouteCatalog[number]['routeKey']

export const navigationRouteTitleKeys: Readonly<Record<string, string>> = Object.freeze(${JSON.stringify(titleKeys, null, 2)})

export const navigationResourceDefaultNames = Object.freeze(${JSON.stringify(resourceDefaultNames, null, 2)})

export const navigationResourceNames = Object.freeze(${JSON.stringify(resourceNames, null, 2)})
`
}

export function renderCrudResourceCatalog(document: unknown): string {
  const resources = requireCrudResourceCatalog(
    getProperty(document, 'x-ryframe-crud-resources'),
    document,
  )
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

export async function buildApiArtifacts(root: string): Promise<Map<string, string>> {
  const contractPath = path.join(root, 'openapi/openapi.json')
  const document: Parameters<typeof createSchemaDomainDocuments>[0] = JSON.parse(
    await readFile(contractPath, 'utf8'),
  )
  const apiPrefix = requireApiPrefixContract(
    getProperty(document, 'x-ryframe-api-prefix'),
    'openapi/openapi.json',
  ).value
  const domainDocuments = createSchemaDomainDocuments(document, apiPrefix)
  const schemaArtifacts: [string, string][] = []
  for (const [domain, domainDocument] of domainDocuments) {
    // 原分域对象交由 openapi-typescript 执行 schema 校验，保留它的诊断。
    const schema = domainDocument as typeof domainDocument & OpenAPI3
    schemaArtifacts.push([
      `src/api/generated/schema/${domain}.ts`,
      generatedHeader + astToString(await openapiTS(schema)),
    ])
  }
  schemaArtifacts.push(['src/api/generated/schema/index.ts', renderSchemaIndex(generatedHeader)])
  const operationArtifacts = renderOperationCallers(document, generatedHeader)

  return new Map<string, string>([
    ...schemaArtifacts,
    ...operationArtifacts,
    ['src/api/generated/permissions.ts', renderPermissionCatalog(document)],
    ['src/api/generated/menuRoutes.ts', renderMenuRouteCatalog(document)],
    ['src/api/generated/crudResources.ts', renderCrudResourceCatalog(document)],
    [
      'src/shared/security/passwordPolicy.generated.json',
      canonicalJson(getProperty(document, 'x-ryframe-password-policy')),
    ],
    [
      'src/shared/markdown/noticePolicy.generated.json',
      canonicalJson(getProperty(document, 'x-ryframe-notice-policy')),
    ],
    [
      'src/shared/config/apiPrefix.generated.json',
      canonicalJson(getProperty(document, 'x-ryframe-api-prefix')),
    ],
    [
      ownershipManifestPath,
      canonicalJson({
        version: 1,
        generator: 'scripts/generate-api-artifacts.ts',
        files: [...generatedArtifactPaths].sort(),
      }),
    ],
  ])
}
