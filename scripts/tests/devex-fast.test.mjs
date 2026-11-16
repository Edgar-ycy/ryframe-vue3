import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { devexFastTasks, parseDevexFastArguments } from '../devex-fast.mjs'

const root = path.resolve('devex-plan-input')
const cacheRoot = path.join(root, '.local-tests', 'profile')
const logicalTasks = [
  'format',
  'source-size',
  'imports',
  'api-operation-policy',
  'api-artifacts',
  'eslint',
  'stylelint',
  'typecheck-app',
  'unit',
]

test('两侧计划覆盖同一九项，当前导入检查同时覆盖 operation 规则', () => {
  const baseline = devexFastTasks({ root, arm: 'b0', cacheRoot })
  const candidate = devexFastTasks({ root, arm: 'b1', cacheRoot })
  assert.equal(baseline.length, 9)
  assert.equal(candidate.length, 8)
  for (const tasks of [baseline, candidate]) {
    assert.deepEqual(
      tasks.flatMap((task) => task.covers),
      logicalTasks,
    )
    assert.deepEqual(tasks.find((task) => task.id === 'stylelint').pnpm, [
      'exec',
      'stylelint',
      'src/**/*.{css,scss,vue}',
      '--max-warnings=0',
      '--cache',
      '--cache-location',
      path.join(cacheRoot, 'stylelint', 'cache'),
    ])
  }
  assert.deepEqual(
    baseline.find((task) => task.id === 'source-size'),
    candidate.find((task) => task.id === 'source-size'),
  )
  assert.deepEqual(baseline.find((task) => task.id === 'api-operation-policy').node, [
    'scripts/check-api-operation-usage.mjs',
  ])
})

test('计划参数可复用，拒绝重复选项及测量工作树之外的缓存', () => {
  const args = ['--root', root, '--arm', 'b0', '--cache-root', cacheRoot, '--plan']
  assert.equal(parseDevexFastArguments(args).plan, true)
  assert.throws(() => parseDevexFastArguments([...args, '--arm', 'b1']), /重复/)
  assert.throws(
    () => parseDevexFastArguments(['--root', root, '--arm', 'b0', '--cache-root', root]),
    /缓存目录/,
  )
})
