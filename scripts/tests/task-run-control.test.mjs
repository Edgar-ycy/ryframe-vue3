import assert from 'node:assert/strict'
import { EventEmitter, once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'
import { TaskRunControl, withTaskSignals } from '../task-run-control.mjs'
import { executeTaskPlan } from '../task-runner.mjs'

const task = (id) => ({ id, key: id, dependencies: [] })
const graph = () => ({ groups: [[task('first'), task('second')], [task('later')]] })

test('首个真实失败立即取消兄弟，保留首个失败码并等待兄弟清理后返回', async () => {
  const control = new TaskRunControl()
  const events = []
  const reports = []
  await assert.rejects(
    executeTaskPlan(graph(), {
      control,
      execute: async (entry, _interactive, run) => {
        events.push(entry.id)
        if (entry.id === 'first') {
          await delay(10)
          return { code: 7, stdout: '失败原因' }
        }
        await once(run.signal, 'abort')
        events.push('cancel')
        await delay(10)
        events.push('cleaned')
        return { code: 143, signal: 'SIGTERM', stderr: '清理完成' }
      },
      report: (result) => reports.push(result),
    }),
    (error) => error.exitCode === 7,
  )
  assert.deepEqual(events, ['first', 'second', 'cancel', 'cleaned'])
  assert.equal(reports[0].cancelled, false)
  assert.equal(reports[1].cancelled, true)
  assert.equal(reports[1].stderr, '清理完成')
})

test('失败码按实际完成先后选择，不能按任务数组顺序覆盖', async () => {
  await assert.rejects(
    executeTaskPlan(graph(), {
      execute: async (entry) => {
        await delay(entry.id === 'first' ? 20 : 1)
        return { code: entry.id === 'first' ? 8 : 9 }
      },
      report: () => undefined,
    }),
    (error) => error.exitCode === 9,
  )
})

test('报告异常不能覆盖首个失败码，并继续收集同阶段其他任务的报告', async () => {
  const reports = []
  await assert.rejects(
    executeTaskPlan(graph(), {
      execute: async () => ({ code: 7 }),
      report: (result) => {
        reports.push(result.task.id)
        throw new Error('报告失败')
      },
    }),
    (error) => error.exitCode === 7,
  )
  assert.deepEqual(reports, ['first', 'second'])
  await assert.rejects(
    executeTaskPlan(graph(), {
      execute: async () => ({ code: 0 }),
      report: () => {
        throw new Error('报告失败')
      },
    }),
    /报告失败/u,
  )
})

test('第一次中断停止后续调度，第二次强制；保留首次中断退出码', async () => {
  for (const [first, second, code] of [
    ['SIGINT', 'SIGTERM', 130],
    ['SIGTERM', 'SIGINT', 143],
  ]) {
    const signals = new EventEmitter()
    const control = new TaskRunControl({ gracePeriodMs: 10000 })
    const called = []
    const running = withTaskSignals(
      () =>
        executeTaskPlan(graph(), {
          control,
          execute: async (entry, _interactive, run) => {
            called.push(entry.id)
            await once(run.forceSignal, 'abort')
            return { code: 1, signal: 'SIGKILL' }
          },
          report: () => undefined,
        }),
      control,
      signals,
    )
    signals.emit(first)
    assert.equal(control.signal.aborted, true)
    assert.equal(control.forceSignal.aborted, false)
    signals.emit(second)
    await assert.rejects(running, (error) => error.exitCode === code)
    assert.deepEqual(called, ['first', 'second'])
    assert.equal(signals.listenerCount('SIGINT'), 0)
    assert.equal(signals.listenerCount('SIGTERM'), 0)
  }
})

test('忽略正常停止时宽限期自动强制，第二次中断不重复发送强制停止', async () => {
  const control = new TaskRunControl({ gracePeriodMs: 10 })
  const stops = []
  control.register((signal) => stops.push(signal))
  control.interrupt('SIGINT')
  await delay(30)
  control.interrupt('SIGTERM')
  assert.deepEqual(stops, ['SIGINT', 'SIGKILL'])
  assert.equal(control.exitCode, 130)
  control.dispose()
})

test('首个失败后中断不会覆盖失败码，已取消时登记的进程立即收到停止', () => {
  const control = new TaskRunControl()
  const stops = []
  control.fail({ code: 23 })
  const unregister = control.register((signal) => stops.push(signal))
  control.interrupt('SIGINT')
  control.interrupt('SIGTERM')
  unregister()
  control.fail({ code: 24 })
  assert.deepEqual(stops, ['SIGTERM', 'SIGKILL'])
  assert.equal(control.exitCode, 23)
  control.dispose()
})

test('已中断任务图零调度；不同运行互不污染，信号清理保留原监听者', async () => {
  const control = new TaskRunControl()
  control.interrupt('SIGINT')
  await assert.rejects(
    executeTaskPlan(graph(), {
      control,
      execute: () => assert.fail('不得启动已停止任务'),
    }),
    (error) => error.exitCode === 130,
  )
  const signals = new EventEmitter()
  const existing = () => undefined
  signals.on('SIGINT', existing)
  await assert.rejects(
    withTaskSignals(
      async () => {
        throw new Error('调用方失败')
      },
      new TaskRunControl(),
      signals,
    ),
    /调用方失败/u,
  )
  assert.deepEqual(signals.listeners('SIGINT'), [existing])
  const result = await executeTaskPlan(graph(), {
    execute: async () => ({ code: 0 }),
    report: () => undefined,
  })
  assert.equal(result.length, 3)
})
