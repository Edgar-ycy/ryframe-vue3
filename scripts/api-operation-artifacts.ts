import { requireApiPrefixContract } from './api-prefix-contract.ts'
import { getProperty } from './crud-contract-format.ts'
import { schemaDomainForPath, schemaDomainNames } from './openapi-schema-domains.ts'

const httpMethods = ['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace'] as const
const infrastructurePaths = new Set(['/livez', '/readyz'])
const blobResponseMediaTypes = new Set([
  'application/octet-stream',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'image/png',
])

type HttpMethod = (typeof httpMethods)[number]
type SchemaDomain = (typeof schemaDomainNames)[number]
type Binder =
  'bindBlobOperation' | 'bindJsonOperation' | 'bindMultipartOperation' | 'bindTextOperation'

interface OperationCaller {
  binder: Binder
  method: HttpMethod
  operationId: string
  path: string
}

function compareText(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function classifyOperationBinder(operation: unknown, location: string): Binder {
  const requestBody = getProperty(operation, 'requestBody')
  const requestMediaTypes = Object.keys(getProperty(requestBody, 'content') ?? {})
  if (requestMediaTypes.length > 1) {
    throw new Error(`${location} 请求媒体类型不唯一：${requestMediaTypes.join(', ')}`)
  }
  if (requestBody && requestMediaTypes.length === 0) {
    throw new Error(`${location} 请求体缺少媒体类型`)
  }

  const responseMediaTypes = new Set<string>()
  for (const [status, response] of Object.entries(getProperty(operation, 'responses') ?? {})) {
    if (!/^2\d\d$/u.test(status)) continue
    for (const mediaType of Object.keys(getProperty(response, 'content') ?? {}))
      responseMediaTypes.add(mediaType)
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
  if (blobResponseMediaTypes.has(responseMediaType)) return 'bindBlobOperation'
  throw new Error(`${location} 不支持成功响应媒体类型：${responseMediaType}`)
}

export function createOperationCallers(document: unknown): Map<SchemaDomain, OperationCaller[]> {
  const apiPrefix = requireApiPrefixContract(
    getProperty(document, 'x-ryframe-api-prefix'),
    'openapi/openapi.json',
  ).value
  const operations: Record<SchemaDomain, OperationCaller[]> = {
    core: [],
    system: [],
    platform: [],
    monitor: [],
  }
  const operationIds = new Set<string>()

  for (const [routePath, pathItem] of Object.entries(getProperty(document, 'paths') ?? {})) {
    if (routePath !== apiPrefix && !routePath.startsWith(`${apiPrefix}/`)) {
      if (infrastructurePaths.has(routePath)) continue
      throw new Error(`OpenAPI 路径 ${routePath} 不属于已声明的 API 前缀 ${apiPrefix}`)
    }
    const requestPath = routePath.slice(apiPrefix.length) || '/'
    for (const method of httpMethods) {
      const operation = getProperty(pathItem, method)
      if (!operation) continue
      const operationId = getProperty(operation, 'operationId')
      if (typeof operationId !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(operationId)) {
        throw new Error(`${method.toUpperCase()} ${routePath} 缺少合法 operationId`)
      }
      if (operationIds.has(operationId)) {
        throw new Error(`OpenAPI 存在重复 operationId：${operationId}`)
      }
      operationIds.add(operationId)
      const domain = schemaDomainForPath(routePath, apiPrefix)
      const location = `${method.toUpperCase()} ${routePath} (${operationId})`
      operations[domain].push({
        binder: classifyOperationBinder(operation, location),
        method,
        operationId,
        path: requestPath,
      })
    }
  }

  return new Map(
    schemaDomainNames.map((domain) => [
      domain,
      operations[domain].sort((left, right) => compareText(left.operationId, right.operationId)),
    ]),
  )
}

export function renderOperationCallers(
  document: unknown,
  generatedHeader: string,
): Map<string, string> {
  const operations = createOperationCallers(document)
  return new Map(
    [...operations].map(([domain, domainOperations]) => {
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
