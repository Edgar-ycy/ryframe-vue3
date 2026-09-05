import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { runTaskProcess } from '../task-process.mjs'
import { TaskRunControl } from '../task-run-control.mjs'
import { executeTaskPlan } from '../task-runner.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))

function fixture(t) {
  const parent = path.join(root, '.local-tests', 'node-unit')
  mkdirSync(parent, { recursive: true })
  const directory = mkdtempSync(path.join(parent, '直接 子进程-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const file = path.join(directory, '端口 进程.mjs')
  writeFileSync(
    file,
    `import net from 'node:net'
import { writeFileSync } from 'node:fs'
process.on('SIGTERM', () => {})
const server = net.createServer()
server.listen(0, '127.0.0.1', () => {
  console.log('stdout 就绪')
  console.error('stderr 就绪')
  writeFileSync(process.argv[2], JSON.stringify({ pid: process.pid, port: server.address().port }))
})
`,
  )
  return { directory, file }
}

async function ready(file) {
  const deadline = Date.now() + 5000
  while (!existsSync(file)) {
    assert.ok(Date.now() < deadline, '直接子进程应及时就绪')
    await delay(10)
  }
  return JSON.parse(readFileSync(file, 'utf8'))
}

async function assertReleased({ pid, port }) {
  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' })
  const server = net.createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
}

function start(file, state, control) {
  return runTaskProcess(
    { command: process.execPath, args: [file, state] },
    { cwd: path.dirname(file), env: process.env, interactive: false, control },
  )
}

test('直接子进程在中文空格路径启动，停止后保留日志、释放端口且无关进程不受影响', async (t) => {
  const { directory, file } = fixture(t)
  const controlled = new TaskRunControl({ gracePeriodMs: 30 })
  const unrelated = new TaskRunControl({ gracePeriodMs: 30 })
  const firstState = path.join(directory, '受控.json')
  const otherState = path.join(directory, '无关.json')
  const first = start(file, firstState, controlled)
  const other = start(file, otherState, unrelated)
  try {
    const [before, independent] = await Promise.all([ready(firstState), ready(otherState)])
    controlled.interrupt('SIGTERM')
    const result = await first
    assert.match(result.stdout, /stdout 就绪/u)
    assert.match(result.stderr, /stderr 就绪/u)
    await assertReleased(before)
    assert.doesNotThrow(() => process.kill(independent.pid, 0))
    assert.equal(unrelated.signal.aborted, false)
  } finally {
    controlled.interrupt('SIGINT')
    unrelated.interrupt('SIGINT')
    unrelated.interrupt('SIGINT')
    await Promise.all([first, other])
    controlled.dispose()
    unrelated.dispose()
  }
})

test('真实兄弟失败取消已登记直接子进程，等待其退出并保留真实失败码', async (t) => {
  const { directory, file } = fixture(t)
  const state = path.join(directory, '兄弟.json')
  const control = new TaskRunControl({ gracePeriodMs: 30 })
  const entries = ['server', 'failure'].map((id) => ({ id, key: id, dependencies: [] }))
  const reports = []
  await assert.rejects(
    executeTaskPlan(
      { groups: [entries, [{ id: 'later', key: 'later', dependencies: [] }]] },
      {
        control,
        execute: async (entry) => {
          if (entry.id === 'server') return start(file, state, control)
          assert.equal(entry.id, 'failure')
          await ready(state)
          return runTaskProcess(
            { command: process.execPath, args: ['-e', 'process.exit(17)'] },
            { cwd: directory, env: process.env, interactive: false, control },
          )
        },
        report: (result) => reports.push(result),
      },
    ),
    (error) => error.exitCode === 17,
  )
  await assertReleased(JSON.parse(readFileSync(state, 'utf8')))
  assert.equal(reports[0].cancelled, true)
  assert.equal(reports[1].cancelled, false)
  assert.match(reports[0].stdout, /就绪/u)
})

test('派生失败等待 close 返回错误；已经停止时不派生进程', async () => {
  const control = new TaskRunControl()
  const result = await runTaskProcess(
    { command: path.join(root, 'does-not-exist.exe'), args: [] },
    { cwd: root, env: process.env, interactive: false, control },
  )
  assert.equal(result.error.code, 'ENOENT')
  assert.notEqual(result.code, 0)
  control.interrupt('SIGINT')
  const cancelled = await runTaskProcess({}, { control })
  assert.deepEqual(cancelled, { code: 1, cancelled: true })
  control.dispose()
})

test('直接子进程 exit 时立即登记失败，仍等待 close 收齐日志，晚到中断不覆盖失败码', async () => {
  const control = new TaskRunControl()
  const stops = []
  control.register((signal) => stops.push(signal))
  const child = Object.assign(new EventEmitter(), {
    pid: 123,
    exitCode: null,
    signalCode: null,
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: () => assert.fail('已经退出的直接子进程不得再发信号'),
  })
  let completed = false
  const running = runTaskProcess({}, { control, spawnChild: () => child }).then((result) => {
    completed = true
    return result
  })
  child.exitCode = 7
  child.emit('exit', 7, null)
  assert.deepEqual(stops, ['SIGTERM'])
  assert.equal(control.exitCode, 7)
  control.interrupt('SIGINT')
  await delay(1)
  assert.equal(completed, false)
  for (const [stream, content] of [
    [child.stdout, '最后 stdout'],
    [child.stderr, '最后 stderr'],
  ]) {
    const bytes = Buffer.from(content)
    stream.write(bytes.subarray(0, 1))
    stream.write(bytes.subarray(1))
  }
  child.emit('close', 7, null)
  const result = await running
  assert.equal(control.ownsFailure(result), true)
  assert.equal(control.exitCode, 7)
  assert.equal(result.stdout, '最后 stdout')
  assert.equal(result.stderr, '最后 stderr')
  control.dispose()
})
