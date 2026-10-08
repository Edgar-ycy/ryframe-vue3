import assert from 'node:assert/strict'
import test from 'node:test'
import { checkTasks, parseArguments } from '../check.mjs'

test('默认检查与完整消费者检查入口都可用', () => {
  assert.deepEqual(parseArguments([]), { full: false, stage: 'contract', plan: false })
  assert.deepEqual(parseArguments(['--full']), { full: true, stage: 'full', plan: false })
  assert.deepEqual(parseArguments(['--stage', 'contract']), {
    full: false,
    stage: 'contract',
    plan: false,
  })
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
  assert.throws(() => parseArguments(['--stage', 'missing']), /未知检查阶段/)
})

test('计划与执行共用任务图，完整门禁包含静态、类型、覆盖率和构建', () => {
  assert.deepEqual(parseArguments(['--full', '--plan']), { full: true, stage: 'full', plan: true })
  assert.deepEqual(checkTasks('full'), ['contract', 'static', 'unit', 'build'].flatMap(checkTasks))
  assert.equal(
    checkTasks('full').some((task) => task.name === 'browser-smoke'),
    false,
  )
  assert.equal(checkTasks('browser')[0].name, 'browser-smoke')
  assert.throws(() => checkTasks('missing'), /未知检查阶段/)
})
