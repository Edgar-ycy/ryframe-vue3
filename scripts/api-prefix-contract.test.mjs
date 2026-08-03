import assert from 'node:assert/strict'
import test from 'node:test'

import {
  apiPrefixContractViolation,
  requireApiPrefixContract,
} from './api-prefix-contract.mjs'

test('接受结构严格且受支持的 API 前缀扩展', () => {
  const contract = { version: 1, value: '/api/v1' }
  assert.equal(apiPrefixContractViolation(contract), null)
  assert.equal(requireApiPrefixContract(contract, 'test contract'), contract)
})

test('拒绝缺失、漂移或携带兼容字段的 API 前缀扩展', () => {
  for (const contract of [
    undefined,
    { version: 2, value: '/api/v1' },
    { version: 1, value: 'api/v1' },
    { version: 1, value: '/api/v0' },
    { version: 1, value: '/api/v1', legacy: true },
  ]) {
    assert.notEqual(apiPrefixContractViolation(contract), null)
    assert.throws(
      () => requireApiPrefixContract(contract, 'test contract'),
      /invalid x-ryframe-api-prefix/,
    )
  }
})
