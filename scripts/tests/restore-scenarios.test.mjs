import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { realTestSelection, restoreSpecs } from '../restore-scenarios.mjs'

test('普通 core 与 Device 保留所有故障验收，不加载恢复专属旧数据场景', () => {
  for (const fixture of ['core', 'device'])
    assert.deepEqual(realTestSelection(undefined, fixture), {
      testIgnore: ['**/restore-existing.spec.ts'],
    })
})

test('恢复完整运行正常业务和旧数据场景，明确隔离会重启进程的故障测试', () => {
  const bindings = path.resolve('.local-tests/restore-bindings.json')
  const selection = realTestSelection(bindings, 'core')
  assert.deepEqual(selection, { testMatch: restoreSpecs })
  assert.equal(selection.testMatch.includes('**/restore-existing.spec.ts'), true)
  assert.equal(selection.testMatch.includes('**/queued-jobs.spec.ts'), false)
  assert.equal(selection.testMatch.includes('**/session-races.spec.ts'), false)
  selection.testMatch.pop()
  assert.equal(restoreSpecs.length, 11)
  assert.throws(() => realTestSelection(bindings, 'device'), /core/u)
  assert.throws(() => realTestSelection('bindings.json', 'core'), /绝对路径/u)
})
