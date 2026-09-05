import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { sha256 } from '../restore-build.mjs'
import { evidenceFile, verifyRuntime } from '../restore-verification.mjs'

function fixture(t) {
  const local = path.resolve('.local-tests/node-unit')
  mkdirSync(local, { recursive: true })
  const root = mkdtempSync(path.join(local, 'restore-verification-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const backend = path.join(root, 'backend')
  const frontend = path.join(root, 'frontend')
  mkdirSync(path.join(backend, 'scripts'), { recursive: true })
  mkdirSync(frontend)
  const receipt = path.join(root, 'runtime.json')
  const bindings = path.join(root, 'bindings.json')
  writeFileSync(receipt, '{"kind":"restore-runtime"}')
  writeFileSync(bindings, '{"kind":"restore-bindings"}')
  return {
    input: { receipt, bindings, backend, frontend, baseURL: 'http://127.0.0.1:4174' },
    receipt,
    bindings,
  }
}

test('核验结果必须等于实际运行收据摘要并使用明确路径', (t) => {
  const value = fixture(t)
  const expected = sha256(evidenceFile(value.receipt, '收据').bytes)
  let command
  const digest = verifyRuntime(value.input, (executable, argv, options) => {
    command = { executable, argv, options }
    return JSON.stringify({ runtime_receipt_sha256: expected })
  })
  assert.equal(digest, expected)
  assert.equal(command.argv[2], path.join(value.input.backend, 'scripts/restore_runtime.py'))
  assert.equal(command.options.timeout, 60_000)
})

test('仅格式正确但不对应收据的摘要与多余输出字段均拒绝', (t) => {
  const value = fixture(t)
  assert.throws(
    () =>
      verifyRuntime(value.input, () => JSON.stringify({ runtime_receipt_sha256: 'a'.repeat(64) })),
    /实际收据内容/u,
  )
  const digest = sha256(evidenceFile(value.receipt, '收据').bytes)
  assert.throws(
    () =>
      verifyRuntime(value.input, () =>
        JSON.stringify({ runtime_receipt_sha256: digest, warning: 'ignored' }),
      ),
    /唯一有效/u,
  )
})

test('核验期间替换任一输入收据会失败关闭', (t) => {
  for (const target of ['receipt', 'bindings']) {
    const value = fixture(t)
    const digest = sha256(evidenceFile(value.receipt, '收据').bytes)
    assert.throws(
      () =>
        verifyRuntime(value.input, () => {
          writeFileSync(value[target], '{"changed":true}')
          return JSON.stringify({ runtime_receipt_sha256: digest })
        }),
      /输入收据发生变化/u,
    )
  }
})

test('相对路径、空文件和过大证据在执行核验前被拒绝', (t) => {
  const value = fixture(t)
  let calls = 0
  const execute = () => {
    calls++
    return '{}'
  }
  assert.throws(
    () => verifyRuntime({ ...value.input, receipt: 'runtime.json' }, execute),
    /绝对路径/u,
  )
  writeFileSync(value.receipt, '')
  assert.throws(() => verifyRuntime(value.input, execute), /非空普通文件/u)
  assert.equal(calls, 0)
})
