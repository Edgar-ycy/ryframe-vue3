import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { receiptBinding } from '../contract-tests/frontend-native-binding.mjs'
import { consumerFixture } from './consumer-context-fixture.mjs'

function selectedFixture(t) {
  const value = consumerFixture(t)
  value.value.frontend_root = process.cwd()
  value.save()
  return { ...value, selected: receiptBinding(['--consumer-context', value.file]) }
}

test('正式上下文固定原生工具、独立参数、stdin 和后端 cwd，不派生解释器', (t) => {
  const value = selectedFixture(t)
  const inventories = { frontend_inventories: [], backend_inventories: [] }
  let calls = 0
  const result = value.selected.invoke(value.frontend, inventories, (executable, args, options) => {
    calls += 1
    assert.equal(executable, value.executable)
    assert.deepEqual(args, ['__frontend-build-contract', '--frontend-dir', value.frontend])
    assert.equal(options.cwd, value.backend)
    assert.deepEqual(JSON.parse(options.input), inventories)
    assert.equal(options.encoding, 'utf8')
    assert.equal(options.windowsHide, true)
    assert.equal(options.maxBuffer, 4 * 1024 * 1024)
    return { status: 0, stdout: '{}', stderr: '' }
  })
  assert.equal(calls, 1)
  assert.equal(result.status, 0)
})

test('绑定输入漂移在派发前拒绝；派发中漂移覆盖返回成功且不重放', (t) => {
  const value = selectedFixture(t)
  const input = { frontend_inventories: [], backend_inventories: [] }
  const files = [
    value.file,
    value.binding,
    value.executable,
    path.join(value.backend, 'xtask/src/main.rs'),
    path.join(value.backend, 'config/tools.toml'),
  ]
  let calls = 0
  for (const file of files) {
    const original = fs.readFileSync(file)
    const before = receiptBinding(['--consumer-context', value.file])
    try {
      fs.appendFileSync(file, ' ')
      assert.throws(() =>
        before.invoke(value.frontend, input, () => {
          calls += 1
        }),
      )
      assert.equal(calls, 0)
    } finally {
      fs.writeFileSync(file, original)
    }
    const during = receiptBinding(['--consumer-context', value.file])
    let duringCalls = 0
    try {
      assert.throws(() =>
        during.invoke(value.frontend, input, () => {
          duringCalls += 1
          fs.appendFileSync(file, ' ')
          return { status: 0, stdout: '{}', stderr: '' }
        }),
      )
      assert.equal(duringCalls, 1)
    } finally {
      fs.writeFileSync(file, original)
    }
  }
})

test('过大 stdin 在派发前拒绝，输出超限不接受截断结果也不重放', (t) => {
  const value = selectedFixture(t)
  let calls = 0
  const input = {
    frontend_inventories: ['x'.repeat(16 * 1024 * 1024)],
    backend_inventories: [],
  }
  assert.throws(
    () =>
      value.selected.invoke(value.frontend, input, () => {
        calls += 1
      }),
    /输入超过 16 MiB/u,
  )
  assert.equal(calls, 0)
  assert.throws(
    () =>
      value.selected.invoke(
        value.frontend,
        { frontend_inventories: [], backend_inventories: [] },
        () => {
          calls += 1
          return { error: { code: 'ENOBUFS' }, status: null, stdout: '{', stderr: '' }
        },
      ),
    /不采信部分输出/u,
  )
  assert.equal(calls, 1)
})
