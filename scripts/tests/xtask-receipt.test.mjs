import assert from 'node:assert/strict'
import test from 'node:test'
import { parseXtaskJsonReceipt } from '../xtask-receipt.mjs'

test('接受前后执行日志之间的唯一对象', () => {
  assert.deepEqual(
    parseXtaskJsonReceipt('Compiling xtask\n执行 fixture\n{"state":"ok"}\n✓ 0.1s\n'),
    { state: 'ok' },
  )
})

for (const [label, stdout] of [
  ['缺少 JSON', 'Compiling xtask\n执行 fixture\n'],
  ['多个 JSON', '{"first":true}\n{"second":true}\n'],
  ['数组', '[{"state":"ok"}]\n'],
  ['尾随破损', '{"state":"ok"}\n{"unfinished"\n'],
]) {
  test(`拒绝${label}`, () => {
    assert.throws(() => parseXtaskJsonReceipt(stdout))
  })
}
