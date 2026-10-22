import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { capturePythonProgram } from '../consumer-context-python.mjs'
import { readConsumerContext } from '../consumer-context.mjs'
import { receiptBinding } from '../contract-tests/frontend-python-binding.mjs'
import { consumerFixture } from './consumer-context-fixture.mjs'

test('普通 Python 入口只读取身份和摘要，不执行或改写入口；控制字符和 ParentDir 拒绝', (t) => {
  const value = consumerFixture(t)
  const before = capturePythonProgram(value.python)
  assert.equal(before.link, null)
  assert.equal(before.targetPath, fs.realpathSync.native(value.python))
  assert.deepEqual(capturePythonProgram(value.python), before)
  for (const entry of [
    undefined,
    'relative',
    value.frontend,
    `${value.root}/frontend/../python.exe`,
    `${value.python}\t`,
    `${value.python}\u007f`,
    ...(process.platform === 'win32' ? ['\\implicit-drive\\python.exe'] : []),
  ])
    assert.throws(() => capturePythonProgram(entry), /python_program/u)
})

test('上下文和手动入口固定解释器身份与内容，相同路径替换或内容变化必须失败', (t) => {
  const value = consumerFixture(t)
  const context = readConsumerContext(value.file, { frontendRoot: value.frontend })
  const manual = receiptBinding(['--python', value.python, '--backend-root', value.backend])
  fs.appendFileSync(value.python, '变化')
  assert.throws(() => context.verifyUnchanged(), /python_program.*漂移/u)
  assert.throws(() => manual.verifyUnchanged(), /身份.*漂移/u)
})

test('Python 原样内容也不能通过替换 inode 冒充已选解释器', (t) => {
  const value = consumerFixture(t)
  const context = readConsumerContext(value.file, { frontendRoot: value.frontend })
  const saved = path.join(value.root, 'saved-python.exe')
  fs.renameSync(value.python, saved)
  fs.copyFileSync(saved, value.python)
  fs.chmodSync(value.python, 0o755)
  assert.throws(() => context.verifyUnchanged(), /python_program.*漂移/u)
})

test(
  'POSIX 实际 venv symlink 保留调用入口，ctx 与手动绑定均接受并复核目标',
  {
    skip: process.platform === 'win32',
  },
  (t) => {
    const value = consumerFixture(t)
    const entry = path.join(value.root, 'venv/bin/python')
    fs.mkdirSync(path.dirname(entry), { recursive: true })
    fs.symlinkSync(value.python, entry)
    value.value.python_program = entry
    value.save()
    const context = readConsumerContext(value.file, { frontendRoot: value.frontend })
    const manual = receiptBinding(['--python', entry, '--backend-root', value.backend])
    assert.equal(context.context.python_program, entry)
    assert.equal(manual.python, entry)
    assert.equal(capturePythonProgram(entry).targetPath, value.python)
    context.verifyUnchanged()
    manual.verifyUnchanged()
    const foreign = value.put('foreign-python', '外来解释器')
    fs.chmodSync(foreign, 0o755)
    fs.unlinkSync(entry)
    fs.symlinkSync(foreign, entry)
    assert.throws(() => context.verifyUnchanged(), /python_program.*漂移/u)
    assert.throws(() => manual.verifyUnchanged(), /身份.*漂移/u)
  },
)

test(
  'POSIX 实际链接拒绝不可执行目标、目录或断链，目标改写也失败',
  {
    skip: process.platform === 'win32',
  },
  (t) => {
    const value = consumerFixture(t)
    const entry = path.join(value.root, 'selected-python')
    fs.symlinkSync(value.python, entry)
    const manual = receiptBinding(['--python', entry, '--backend-root', value.backend])
    fs.appendFileSync(value.python, '替换目标内容')
    assert.throws(() => manual.verifyUnchanged(), /身份.*漂移/u)
    fs.chmodSync(value.python, 0o644)
    assert.throws(() => capturePythonProgram(entry))
    fs.unlinkSync(entry)
    fs.symlinkSync(value.frontend, entry)
    assert.throws(() => capturePythonProgram(entry))
    fs.unlinkSync(entry)
    fs.symlinkSync(path.join(value.root, 'absent'), entry)
    assert.throws(() => capturePythonProgram(entry))
  },
)
