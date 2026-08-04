import assert from 'node:assert/strict'
import test from 'node:test'

import { apiVersionContractViolation } from './api-version-contract.mjs'

test('接受 package.json 与 OpenAPI 完全一致的版本', () => {
  assert.equal(
    apiVersionContractViolation(
      { version: '0.6.0' },
      { info: { version: '0.6.0' } },
    ),
    null,
  )
})

test('拒绝 package.json 与 OpenAPI 不一致的版本', () => {
  assert.match(
    apiVersionContractViolation(
      { version: '0.6.0' },
      { info: { version: '0.5.1' } },
    ),
    /does not equal/,
  )
})

test('拒绝缺失或空白的 package.json 版本', () => {
  for (const version of [undefined, '', ' 0.6.0 ']) {
    assert.match(
      apiVersionContractViolation(
        { version },
        { info: { version: '0.6.0' } },
      ),
      /package\.json version/,
    )
  }
})

test('拒绝缺失或空白的 OpenAPI 版本', () => {
  for (const version of [undefined, '', ' 0.6.0 ']) {
    assert.match(
      apiVersionContractViolation(
        { version: '0.6.0' },
        { info: { version } },
      ),
      /OpenAPI info\.version/,
    )
  }
})
