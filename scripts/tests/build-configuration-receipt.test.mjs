import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { runBuild } from '../build.mjs'
import { fixture, buildEnvironment } from './restore-build-fixture.mjs'
import { buildSourceSnapshot } from '../build-source.mjs'
import { prepareBuildIdentity } from '../build-identity.mjs'
import {
  buildExternalReceipt,
  receiptPath,
  verifyBuildReceipt,
  writeBuildReceipt,
} from '../restore-build.mjs'

test('v3 收据拒绝旧 v2、未知字段和配置、工具、身份的漂移', (t) => {
  const root = fixture(t)
  const environment = buildEnvironment(root)
  prepareBuildIdentity(root)
  const before = buildSourceSnapshot(root, environment)
  const receipt = writeBuildReceipt(root, before, environment)
  const receiptFile = path.join(root, 'dist', receiptPath)
  for (const changed of [
    { ...receipt, format_version: 2 },
    { ...receipt, unknown: true },
    { ...receipt, build: { ...receipt.build, environment_files: [] } },
  ]) {
    fs.writeFileSync(receiptFile, JSON.stringify(changed))
    assert.throws(() => verifyBuildReceipt(root, environment), /收据无效/u)
  }
  fs.writeFileSync(receiptFile, JSON.stringify(receipt))
  for (const [relative, source] of [
    ['config/app.dev.toml', '[server]\nport = 6400\n'],
    ['.local-tests/frontend-tools.json', '{}'],
    ['.local-tests/build/source.json', '{"format_version":1,"frontend_commit":"development"} '],
  ]) {
    const file = path.join(root, relative)
    const original = fs.existsSync(file) ? fs.readFileSync(file) : null
    fs.writeFileSync(file, source)
    assert.throws(() => verifyBuildReceipt(root, environment), /不一致/u)
    assert.throws(() => writeBuildReceipt(root, before, environment), /发生变化/u)
    if (original) fs.writeFileSync(file, original)
    else fs.rmSync(file)
  }
  assert.deepEqual(verifyBuildReceipt(root, { ...environment, APP_ENV: 'prod' }), receipt)
})

test('实际身份产物必须与来源一致，文件集合和读取顺序必须精确', (t) => {
  const root = fixture(t)
  const environment = buildEnvironment(root)
  const before = buildSourceSnapshot(root, environment)
  fs.writeFileSync(path.join(root, 'dist/build-identity.json'), '{"frontend_commit":"wrong"}')
  assert.throws(() => writeBuildReceipt(root, before, environment), /身份.*不一致/u)
  fs.writeFileSync(path.join(root, 'dist/build-identity.json'), '{"frontend_commit":"development"}')
  const receipt = writeBuildReceipt(root, before, environment)
  const altered = structuredClone(receipt)
  altered.build.configuration.files.reverse()
  fs.writeFileSync(path.join(root, 'dist', receiptPath), JSON.stringify(altered))
  assert.throws(() => verifyBuildReceipt(root, environment), /收据无效/u)
})

test('real 同源检查与来源采集之间的配置漂移在任务执行前拒绝', () => {
  let reads = 0
  const forbidden = () => {
    throw new Error('不应执行任务或签发收据')
  }
  assert.throws(
    () =>
      runBuild(
        '/unused',
        { real: true },
        {
          environment: { APP_ENV: 'test' },
          configure: () => ({
            publicConfig: { apiOrigin: reads++ === 0 ? '' : 'https://changed.invalid' },
          }),
          identify: () => {},
          capture: () => ({}),
          execute: forbidden,
          publish: forbidden,
        },
      ),
    /执行任务前.*漂移/u,
  )
})

test('外部恢复构建在同源检查后拒绝忽略配置漂移，不派生 Vite 或签发收据', (t) => {
  const root = fixture(t)
  const environment = buildEnvironment(root)
  const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const directory = path.join(root, '.local-tests/public-config')
  fs.cpSync(path.join(root, 'config'), directory, { recursive: true })
  fs.writeFileSync(
    path.join(root, '.local-tests/frontend-tools.json'),
    JSON.stringify({ application_config_dir: '.local-tests/public-config' }),
  )
  const rename = fs.renameSync
  t.mock.method(fs, 'renameSync', (...args) => {
    const result = rename(...args)
    fs.writeFileSync(
      path.join(directory, 'app.dev.toml'),
      'api_origin = "https://changed.example.invalid"\n',
    )
    return result
  })
  assert.throws(
    () =>
      buildExternalReceipt(root, head, {
        environment,
        observeToolchain: () => ({
          node: process.version,
          pnpm: { pinned: '11.20.0', observed: '11.20.0' },
          vite: '7.1.7',
        }),
        executeBuild: () => assert.fail('漂移时禁止派生 Vite'),
      }),
    /外部恢复构建执行前.*漂移/u,
  )
  assert.equal(fs.existsSync(path.join(root, 'dist', receiptPath)), false)
})
