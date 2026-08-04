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
  return `${generatedHeader}export const operationManifest = ${JSON.stringify(manifest, null, 2)} as const

export type OperationManifest = typeof operationManifest
export type OperationId = keyof OperationManifest
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

export async function buildApiArtifacts(root) {
  const contractPath = path.join(root, 'openapi/openapi.json')
  const document = JSON.parse(await readFile(contractPath, 'utf8'))
  const schema = generatedHeader
    + astToString(await openapiTS(pathToFileURL(contractPath)))

  return new Map([
    ['src/api/generated/schema.ts', schema],
    ['src/api/generated/operations.ts', renderOperationManifest(document)],
    ['src/api/generated/permissions.ts', renderPermissionCatalog(document)],
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
