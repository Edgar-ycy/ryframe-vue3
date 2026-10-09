import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTasks, parseBuildArguments, runBuild } from '../build.mjs'
import { packageManagerInvocation } from '../build-source.mjs'

test('固定 pnpm 的原生入口由操作系统执行，JavaScript 入口由 Node 执行', () => {
  for (const cli of ['/tools/pnpm-native', 'D:/tools/pnpm-native.exe'])
    assert.deepEqual(packageManagerInvocation(cli), { executable: cli, arguments: ['--version'] })
  assert.deepEqual(packageManagerInvocation('/tools/pnpm.mjs'), {
    executable: process.execPath,
    arguments: ['/tools/pnpm.mjs', '--version'],
  })
})

test('构建参数拒绝重复与未知项', () => {
  assert.deepEqual(parseBuildArguments([]), { real: false, plan: false })
  for (const values of [['--unknown'], ['--real', '--real']])
    assert.throws(() => parseBuildArguments(values))
})

test('构建计划共用任务图且不读取来源、不执行、不签发收据', () => {
  const forbidden = () => {
    throw new Error('计划禁止副作用')
  }
  const plan = runBuild(
    '/unused',
    { real: true, plan: true },
    {
      execute: forbidden,
      capture: forbidden,
      publish: forbidden,
    },
  )
  assert.deepEqual(plan.tasks, buildTasks())
  assert.deepEqual(plan.overrides, { VITE_APP_API_ORIGIN: '' })
})

test('真实构建按同一任务图运行并核验来源、绑定同源 API 环境', () => {
  const calls = []
  const source = { marker: '当前构建来源' }
  const result = runBuild(
    '/source',
    { real: true, plan: false },
    {
      environment: { VITE_APP_API_ORIGIN: 'http://unbound.invalid' },
      capture: (root, overrides, environment) => {
        assert.equal(environment.VITE_APP_API_ORIGIN, '')
        calls.push('capture')
        return source
      },
      execute: (root, task, environment) => {
        assert.equal(environment.VITE_APP_API_ORIGIN, '')
        calls.push(task.name)
      },
      publish: (root, before) => {
        assert.equal(before, source)
        calls.push('publish')
        return { status: 'bound' }
      },
    },
  )
  assert.deepEqual(calls, ['capture', ...buildTasks().map((task) => task.name), 'publish'])
  assert.deepEqual(result, { status: 'bound' })
})

test('类型或构建失败不签发成功收据', () => {
  let published = false
  assert.throws(
    () =>
      runBuild(
        '/source',
        { real: true, plan: false },
        {
          capture: () => ({}),
          execute: () => {
            throw new Error('构建失败')
          },
          publish: () => {
            published = true
          },
        },
      ),
    /构建失败/u,
  )
  assert.equal(published, false)
})
