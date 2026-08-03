import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isCoverageSource,
  validateCoverageScope,
} from './coverage-contract.mjs'

test('只把生产 TypeScript 模块识别为覆盖率来源', () => {
  assert.equal(isCoverageSource('src/app/session/sessionCoordinator.ts'), true)
  assert.equal(isCoverageSource('src/app/session/sessionCoordinator.test.ts'), false)
  assert.equal(isCoverageSource('src/env.d.ts'), false)
  assert.equal(isCoverageSource('src/views/profile/index.vue'), false)
})

test('接受版本正确、排序且完整的覆盖率清单', () => {
  const files = ['src/a.ts', 'src/b.ts']
  assert.deepEqual(validateCoverageScope({ schemaVersion: 1, files }, files), [])
})

test('拒绝遗漏、越界、重复和未排序的覆盖率清单', () => {
  const errors = validateCoverageScope({
    schemaVersion: 1,
    files: ['src/b.ts', 'src/a.test.ts', 'src/b.ts'],
  }, ['src/a.ts'])
  const message = errors.join('\n')
  assert.match(message, /duplicate coverage entries/u)
  assert.match(message, /normalized production TypeScript paths/u)
  assert.match(message, /must remain sorted/u)
  assert.match(message, /src\/a\.ts: critical module is missing/u)
  assert.match(message, /src\/b\.ts: coverage scope entry is not classified/u)
})

test('拒绝未知版本和非数组清单', () => {
  const errors = validateCoverageScope({ schemaVersion: 2, files: null }, [])
  assert.equal(errors.length, 2)
})
