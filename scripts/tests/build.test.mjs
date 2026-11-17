import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTasks, parseBuildArguments, runBuild } from '../build.mjs'
import { packageManagerInvocation } from '../build-source.mjs'
import { bundledCorepackPath } from '../tool-inputs.mjs'

test('构建从宿主 Node 的实际发行目录定位 Corepack', () => {
  assert.equal(
    bundledCorepackPath('/opt/node/bin/node', 'linux'),
    '/opt/node/lib/node_modules/corepack/dist/corepack.js',
  )
  assert.equal(
    bundledCorepackPath('D:/Program Files/nodejs/node.exe', 'win32').replaceAll('\\', '/'),
    'D:/Program Files/nodejs/node_modules/corepack/dist/corepack.js',
  )
})

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
  assert.equal(
    parseBuildArguments(['--source-commit', 'a'.repeat(40)]).sourceCommit,
    'a'.repeat(40),
  )
  for (const values of [
    ['--unknown'],
    ['--real', '--real'],
    ['--source-commit'],
    ['--source-commit', 'A'.repeat(40)],
    ['--source-commit', 'a'.repeat(40), '--source-commit', 'a'.repeat(40)],
  ])
    assert.throws(() => parseBuildArguments(values))
})

test('真实构建按同一任务图运行并核验文件同源，不覆盖旧 VITE 外部输入', () => {
  const calls = []
  const source = { marker: '当前构建来源' }
  const result = runBuild(
    '/source',
    { real: true, plan: false },
    {
      environment: { VITE_APP_API_ORIGIN: 'http://unbound.invalid' },
      configure: () => ({ publicConfig: { apiOrigin: '' } }),
      identify: () => calls.push('identity'),
      capture: (root, environment) => {
        assert.equal(environment.VITE_APP_API_ORIGIN, 'http://unbound.invalid')
        calls.push('capture')
        return source
      },
      execute: (root, task, environment) => {
        assert.equal(environment.VITE_APP_API_ORIGIN, 'http://unbound.invalid')
        calls.push(task.name)
      },
      publish: (root, before) => {
        assert.equal(before, source)
        calls.push('publish')
        return { status: 'bound' }
      },
    },
  )
  assert.deepEqual(calls, [
    'identity',
    'capture',
    ...buildTasks().map((task) => task.name),
    'publish',
  ])
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
          configure: () => ({ publicConfig: { apiOrigin: '' } }),
          identify: () => {},
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

test('正式非 real 构建也在任务前后核对完整来源，保持原任务图且不签发恢复收据', () => {
  for (const drift of [false, true]) {
    const calls = []
    const source = { marker: '冻结来源' }
    let captured = 0
    const run = () =>
      runBuild(
        '/source',
        { real: false, sourceCommit: 'a'.repeat(40) },
        {
          environment: { APP_ENV: 'prod' },
          configure: () => ({ publicConfig: { apiOrigin: 'https://api.example.invalid' } }),
          identify: (_root, commit) => {
            assert.equal(commit, 'a'.repeat(40))
            calls.push('identity')
          },
          capture: () => {
            calls.push('capture')
            return drift && captured++ > 0 ? { marker: '来源已变化' } : source
          },
          execute: (_root, task) => calls.push(task.name),
          publish: () => assert.fail('非 real 构建不得签发恢复收据'),
        },
      )
    if (drift) assert.throws(run, /正式构建期间.*发生变化/u)
    else assert.equal(run(), undefined)
    assert.deepEqual(calls, [
      'identity',
      'capture',
      ...buildTasks().map((task) => task.name),
      'capture',
    ])
  }
})

test('正式非 real 构建在执行任务前拒绝配置来源漂移', () => {
  let reads = 0
  assert.throws(
    () =>
      runBuild(
        '/source',
        { sourceCommit: 'a'.repeat(40) },
        {
          configure: () => ({ marker: reads++ }),
          identify: () => {},
          capture: () => ({}),
          execute: () => assert.fail('配置漂移时不得执行构建任务'),
        },
      ),
    /执行任务前.*漂移/u,
  )
})
