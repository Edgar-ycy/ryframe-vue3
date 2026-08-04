import assert from 'node:assert/strict'
import test from 'node:test'

import { requirePermissionCatalog } from './permission-catalog-contract.mjs'

test('接受按字典序排列且唯一的权限目录', () => {
  assert.deepEqual(
    requirePermissionCatalog(
      { version: 1, codes: ['system:user:list', 'tenant:list'] },
      '测试契约',
    ),
    ['system:user:list', 'tenant:list'],
  )
})

test('拒绝空目录、非法权限码、重复项和非规范顺序', () => {
  for (const catalog of [
    { version: 1, codes: [] },
    { version: 1, codes: ['System:User:List'] },
    { version: 1, codes: ['tenant:list', 'tenant:list'] },
    { version: 1, codes: ['tenant:list', 'system:user:list'] },
  ]) {
    assert.throws(
      () => requirePermissionCatalog(catalog, '测试契约'),
      /权限目录/u,
    )
  }
})
