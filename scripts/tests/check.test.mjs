import assert from 'node:assert/strict'
import test from 'node:test'
import { parseArguments } from '../check.mjs'

test('默认检查与完整消费者检查入口都可用', () => {
  assert.deepEqual(parseArguments([]), { full: false, stage: 'contract' })
  assert.deepEqual(parseArguments(['--full']), { full: true, stage: 'full' })
  assert.deepEqual(parseArguments(['--stage', 'contract']), { full: false, stage: 'contract' })
})

test('完整检查不能与显式阶段混用，并拒绝缺失或未知参数', () => {
  for (const args of [
    ['--full', '--stage', 'contract'],
    ['--stage', 'contract', '--full'],
  ]) {
    assert.throws(() => parseArguments(args), /--full 不能与 --stage 同时使用/)
  }
  assert.throws(() => parseArguments(['--stage']), /--stage 缺少值/)
  assert.throws(() => parseArguments(['--unknown']), /未知参数/)
})
