import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { combineTaskPlans, createTaskPlan, parseTaskArguments } from '../task-runner-contract.mjs'
import { executeTaskPlan, TaskRunError } from '../task-runner.mjs'

const runner = fileURLToPath(new URL('../task-runner.mjs', import.meta.url))
const plan = (args, source = 'test-source') => createTaskPlan(parseTaskArguments(args), { source })

test('执行真实归并后的节点，覆盖单测与完整类型各一次，并按依赖收集产物', async () => {
  const graph = combineTaskPlans([
    plan(['check']),
    plan(['check', '--full']),
    plan(['check', '--stage', 'contract']),
  ])
  const executed = []
  const reports = []
  const results = await executeTaskPlan(graph, {
    execute: async (task) => {
      for (const dependency of task.dependencies) {
        assert.ok(executed.some((earlier) => earlier.key === dependency))
      }
      executed.push(task)
      return { code: 0, artifacts: task.id === 'build' ? ['dist/index.html'] : [] }
    },
    report: (result) => reports.push(result),
  })
  for (const id of ['unit', 'typecheck', 'api-contract', 'api-source', 'build', 'bundle']) {
    assert.equal(executed.filter((task) => task.id === id).length, 1)
  }
  assert.deepEqual(results.find((result) => result.task.id === 'build').artifacts, [
    'dist/index.html',
  ])
  assert.equal(reports.length, results.length)
})

test('失败退出码传播，后继单测和构建不启动', async () => {
  const executed = []
  await assert.rejects(
    executeTaskPlan(plan(['check', '--full']), {
      execute: async (task) => {
        executed.push(task.id)
        return { code: task.id === 'api-source' ? 7 : 0 }
      },
      report: () => undefined,
    }),
    (error) => error instanceof TaskRunError && error.exitCode === 7,
  )
  assert.equal(executed.includes('unit'), false)
  assert.equal(executed.includes('build'), false)
})

test('执行异常和信号均返回失败，缺失依赖不能静默跳过', async () => {
  const unit = plan(['check', '--stage', 'unit'])
  await assert.rejects(
    executeTaskPlan(unit, {
      execute: async () => {
        throw new Error('spawn failed')
      },
      report: () => undefined,
    }),
    (error) => error.exitCode === 1,
  )
  for (const [signal, code] of [
    ['SIGINT', 130],
    ['SIGTERM', 143],
  ]) {
    await assert.rejects(
      executeTaskPlan(unit, {
        execute: async () => ({ code: 1, signal }),
        report: () => undefined,
      }),
      (error) => error.exitCode === code,
    )
  }
  unit.groups[0][0].dependencies = ['missing']
  await assert.rejects(executeTaskPlan(unit), /依赖尚未成功/u)
})

test('同名任务的不同来源仍实际执行两次', async () => {
  const graph = combineTaskPlans([
    plan(['check', '--stage', 'unit'], 'before'),
    plan(['check', '--stage', 'unit'], 'after'),
  ])
  const sources = []
  await executeTaskPlan(graph, {
    execute: async (task) => {
      sources.push(task.source)
      return { code: 0 }
    },
    report: () => undefined,
  })
  assert.deepEqual(sources, ['before', 'after'])
})

test('--plan 在 Node 禁止文件写入与派生子进程的权限模型中成功', () => {
  const result = spawnSync(
    process.execPath,
    ['--permission', '--allow-fs-read=*', runner, 'check', '--full', '--fix', '--plan'],
    { encoding: 'utf8', windowsHide: true, shell: false },
  )
  assert.equal(result.error, undefined)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /依赖：/u)
  assert.match(result.stdout, /作用：write/u)
  assert.match(result.stdout, /coverage.*true/u)
  for (const label of [
    '工作目录：',
    '调用：',
    '编译覆盖：',
    '允许写入：',
    '外部资源：',
    '并发资源：',
  ]) {
    assert.match(result.stdout, new RegExp(label, 'u'))
  }
})

test('browser 只接受显式 fixture，遗留环境不能隐式选择 Device', () => {
  const inherited = spawnSync(
    process.execPath,
    ['--permission', '--allow-fs-read=*', runner, 'check', '--stage', 'browser', '--plan'],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        RYFRAME_E2E_FIXTURE: 'device',
        RYFRAME_E2E_SERVER: 'preview',
      },
      windowsHide: true,
      shell: false,
    },
  )
  assert.equal(inherited.error, undefined)
  assert.equal(inherited.status, 0, inherited.stderr)
  assert.match(inherited.stdout, /"RYFRAME_E2E_FIXTURE":"core"/u)
  assert.match(inherited.stdout, /"RYFRAME_E2E_SERVER":"dev"/u)

  const explicit = spawnSync(
    process.execPath,
    [
      '--permission',
      '--allow-fs-read=*',
      runner,
      'check',
      '--stage',
      'browser',
      '--real',
      '--fixture',
      'device',
      '--server',
      'preview',
      '--plan',
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        RYFRAME_E2E_FIXTURE: 'core',
        RYFRAME_E2E_SERVER: 'dev',
      },
      windowsHide: true,
      shell: false,
    },
  )
  assert.equal(explicit.error, undefined)
  assert.equal(explicit.status, 0, explicit.stderr)
  assert.match(explicit.stdout, /"RYFRAME_E2E_FIXTURE":"device"/u)
  assert.match(explicit.stdout, /"RYFRAME_E2E_SERVER":"preview"/u)
  assert.match(explicit.stdout, /playwright\.real\.config\.ts/u)
})

test('实际进程将未知和互斥参数映射到退出码 2，帮助为 0', () => {
  for (const args of [
    ['check', '--bad'],
    ['check', '--full', '--test', 'a.ts'],
  ]) {
    const result = spawnSync(process.execPath, [runner, ...args], {
      encoding: 'utf8',
      windowsHide: true,
      shell: false,
    })
    assert.equal(result.error, undefined)
    assert.equal(result.status, 2, result.stderr)
  }
  const help = spawnSync(process.execPath, [runner, '--help'], {
    encoding: 'utf8',
    windowsHide: true,
    shell: false,
  })
  assert.equal(help.status, 0, help.stderr)
})
