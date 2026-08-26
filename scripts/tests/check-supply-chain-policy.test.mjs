import assert from 'node:assert/strict'
import test from 'node:test'

import {
  evaluateLicenseReport,
  normalizeLicenseReport,
  validatePolicy,
} from '../check-supply-chain-policy.mjs'
import { validateSbom } from '../generate-sbom.mjs'

const now = new Date('2026-08-20T00:00:00.000Z')

function policy(overrides = {}) {
  return {
    schema_version: 1,
    allowed_licenses: ['Apache-2.0', 'MIT'],
    exceptions: [],
    ...overrides,
  }
}

test('规范化许可证报告并展开版本', () => {
  assert.deepEqual(
    normalizeLicenseReport({
      MIT: [{ name: 'b', versions: ['2.0.0', '1.0.0'] }],
      'Apache-2.0': [{ name: 'a', version: '3.0.0' }],
    }),
    [
      { license: 'Apache-2.0', name: 'a', version: '3.0.0' },
      { license: 'MIT', name: 'b', version: '1.0.0' },
      { license: 'MIT', name: 'b', version: '2.0.0' },
    ],
  )
})

test('允许由已批准许可证组成的 SPDX 表达式', () => {
  assert.deepEqual(
    evaluateLicenseReport(
      policy(),
      {
        '(MIT OR Apache-2.0)': [{ name: 'safe', versions: ['1.0.0'] }],
      },
      now,
    ),
    [],
  )
})

test('未批准许可证必须使用精确且未过期的例外', () => {
  const approved = policy({
    exceptions: [
      {
        package: 'legacy',
        version: '1.2.3',
        license: 'Custom-1.0',
        reason: '等待依赖替换',
        owner: 'platform/security',
        expires: '2026-09-01',
      },
    ],
  })
  assert.deepEqual(
    evaluateLicenseReport(
      approved,
      {
        'Custom-1.0': [{ name: 'legacy', versions: ['1.2.3'] }],
      },
      now,
    ),
    [],
  )
  assert.match(
    evaluateLicenseReport(
      policy(),
      {
        'Custom-1.0': [{ name: 'legacy', versions: ['1.2.3'] }],
      },
      now,
    )[0],
    /未允许/u,
  )
})

test('过期、字段缺失和未使用例外均失败', () => {
  const expired = policy({
    exceptions: [
      {
        package: 'legacy',
        version: '1.2.3',
        license: 'Custom-1.0',
        reason: '等待依赖替换',
        owner: 'invalid owner',
        expires: '2026-08-20',
      },
    ],
  })
  const validation = validatePolicy(expired, now)
  assert(validation.some((error) => error.includes('owner')))
  assert(validation.some((error) => error.includes('晚于')))

  const unused = policy({
    exceptions: [
      {
        package: 'legacy',
        version: '1.2.3',
        license: 'Custom-1.0',
        reason: '等待依赖替换',
        owner: '@security',
        expires: '2026-09-01',
      },
    ],
  })
  assert(
    evaluateLicenseReport(
      unused,
      {
        MIT: [{ name: 'safe', versions: ['1.0.0'] }],
      },
      now,
    ).some((error) => error.includes('未使用')),
  )
})

test('CycloneDX 生成物必须使用固定规范和项目名', () => {
  assert.deepEqual(
    validateSbom({
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      components: [],
      metadata: { component: { name: 'ryframe-vue3' } },
    }),
    [],
  )
  assert.equal(validateSbom({}).length, 4)
})
