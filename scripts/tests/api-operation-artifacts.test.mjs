import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  createOperationCallers,
  generatedOperationArtifactPaths,
  renderOperationCallers,
} from '../api-artifacts.mjs'
import { schemaDomainForPath } from '../openapi-schema-domains.mjs'

const document = JSON.parse(
  await readFile(new URL('../../openapi/openapi.json', import.meta.url), 'utf8'),
)

test('API 前缀内每个 operation 恰由一个分域 caller 拥有', () => {
  const operations = createOperationCallers(document)
  const callers = [...operations.values()].flat()
  const prefix = document['x-ryframe-api-prefix'].value
  const expected = Object.entries(document.paths)
    .filter(([routePath]) => routePath === prefix || routePath.startsWith(`${prefix}/`))
    .flatMap(([routePath, pathItem]) =>
      ['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace'].flatMap((method) => {
        const operation = pathItem[method]
        return operation
          ? [
              {
                domain: schemaDomainForPath(routePath, prefix),
                method,
                operationId: operation.operationId,
                path: routePath.slice(prefix.length) || '/',
              },
            ]
          : []
      }),
    )
    .sort((left, right) => left.operationId.localeCompare(right.operationId))
  const actual = [...operations].flatMap(([domain, values]) =>
    values.map(({ method, operationId, path }) => ({ domain, method, operationId, path })),
  )
  actual.sort((left, right) => left.operationId.localeCompare(right.operationId))

  assert.deepEqual(actual, expected)
  assert.equal(new Set(callers.map((operation) => operation.operationId)).size, callers.length)
  assert.equal(
    callers.find((operation) => operation.operationId === 'post_auth_login')?.binder,
    'bindJsonOperation',
  )
  assert.equal(
    callers.find((operation) => operation.operationId === 'post_common_upload')?.binder,
    'bindMultipartOperation',
  )
  assert.equal(
    callers.find((operation) => operation.operationId === 'get_monitor_metrics')?.binder,
    'bindTextOperation',
  )
  assert.equal(
    callers.find((operation) => operation.operationId === 'get_common_file_download')?.binder,
    'bindBlobOperation',
  )
})

test('operation 产物固定为五个领域文件且重复渲染零差异', () => {
  assert.deepEqual(generatedOperationArtifactPaths, [
    'src/api/generated/operations/core.ts',
    'src/api/generated/operations/system.ts',
    'src/api/generated/operations/platform.ts',
    'src/api/generated/operations/monitor.ts',
    'src/api/generated/operations/agent.ts',
  ])
  const first = renderOperationCallers(document)
  const second = renderOperationCallers(document)
  assert.deepEqual(first, second)
  assert.deepEqual([...first.keys()], generatedOperationArtifactPaths)
  const exported = [...first.values()].flatMap((source) => [
    ...source.matchAll(/^export const ([A-Za-z_][A-Za-z0-9_]*) =/gmu),
  ])
  assert.equal(exported.length, [...createOperationCallers(document).values()].flat().length)
  assert.equal(new Set(exported.map((match) => match[1])).size, exported.length)
})

test('旧 operation 聚合文件不再作为兼容入口存在', async () => {
  await assert.rejects(access(new URL('../../src/api/generated/operations.ts', import.meta.url)))
  const ownership = JSON.parse(
    await readFile(new URL('../../src/api/generated/ownership.json', import.meta.url), 'utf8'),
  )
  assert.ok(!ownership.files.includes('src/api/generated/operations.ts'))
})

test('请求或成功响应媒体类型不唯一时生成失败', () => {
  const ambiguousRequest = structuredClone(document)
  ambiguousRequest.paths['/api/v1/auth/login'].post.requestBody.content['multipart/form-data'] = {
    schema: { type: 'object' },
  }
  assert.throws(() => createOperationCallers(ambiguousRequest), /请求媒体类型不唯一/u)

  const ambiguousResponse = structuredClone(document)
  ambiguousResponse.paths['/api/v1/version'].get.responses['200'].content['text/plain'] = {
    schema: { type: 'string' },
  }
  assert.throws(() => createOperationCallers(ambiguousResponse), /成功响应媒体类型必须唯一/u)
})
