import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createOperationManifest,
  renderOperationManifest,
  renderPermissionCatalog,
} from './api-artifacts.mjs'

function contract(paths) {
  return {
    'x-ryframe-api-prefix': { value: '/api/v1', version: 1 },
    'x-ryframe-permission-catalog': {
      version: 1,
      codes: ['system:user:list', 'tenant:list'],
    },
    paths,
  }
}

test('按 operationId 稳定生成无前缀请求清单', () => {
  const document = contract({
    '/api/v1/users/{id}': {
      put: { operationId: 'put_users_by_id' },
    },
    '/api/v1/users': {
      get: { operationId: 'get_users' },
    },
  })

  assert.deepEqual(createOperationManifest(document), {
    get_users: { method: 'get', path: '/users' },
    put_users_by_id: { method: 'put', path: '/users/{id}' },
  })
  assert.match(renderOperationManifest(document), /export type OperationId/u)
})

test('从后端权限目录生成字面量联合类型和运行时判定器', () => {
  const generated = renderPermissionCatalog(contract({}))

  assert.match(generated, /export const permissionCatalog = \[/u)
  assert.match(generated, /export type PermissionCode/u)
  assert.match(generated, /export function isPermissionCode/u)
  assert.match(generated, /"system:user:list"/u)
})

test('拒绝前缀外路径、缺失 operationId 和重复 operationId', () => {
  assert.throws(
    () => createOperationManifest(contract({ '/outside': { get: { operationId: 'get_outside' } } })),
    /不属于已声明的 API 前缀/u,
  )
  assert.throws(
    () => createOperationManifest(contract({ '/api/v1/users': { get: {} } })),
    /缺少合法 operationId/u,
  )
  assert.throws(
    () => createOperationManifest(contract({
      '/api/v1/users': { get: { operationId: 'get_resource' } },
      '/api/v1/roles': { get: { operationId: 'get_resource' } },
    })),
    /重复 operationId/u,
  )
})
