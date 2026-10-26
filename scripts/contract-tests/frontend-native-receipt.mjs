import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test, { after } from 'node:test'
import { buildSourceSnapshot } from '../build-source.mjs'
import { sha256 } from '../build-source-inventory.mjs'
import { receiptPath, verifyBuildReceipt, writeBuildReceipt } from '../restore-build.mjs'
import { bindCurrentBytes, fixture, observe } from './frontend-native-receipt-fixture.mjs'
import './frontend-native-paths.mjs'
import { receiptBinding } from './frontend-native-binding.mjs'
import { parseJson } from '../resource-render/json.mjs'

const sentinel = 'PRIVATE-PARITY-SENTINEL'
const selected = receiptBinding()
after(() => selected.verifyUnchanged())

function nativeValidate(value) {
  return selected.invoke(value.root, {
    frontend_inventories: [value.receipt.sources.full],
    backend_inventories: [],
  })
}

function nodeValidate(value) {
  return verifyBuildReceipt(value.root, { APP_ENV: 'INVALID-SHELL' }, observe)
}

function rejectedByBoth(value) {
  assert.throws(
    () => nodeValidate(value),
    (error) => {
      assert.ok(!String(error.stack).includes(sentinel))
      return true
    },
  )
  const result = nativeValidate(value)
  assert.ifError(result.error)
  assert.ok(Number.isInteger(result.status) && result.status > 0, '原生消费者必须明确拒绝损坏输入')
  assert.equal(result.signal, null)
  assert.equal(result.stdout, '')
  assert.ok(result.stderr.trim())
  assert.ok(!result.stderr.includes(sentinel))
}

test('真实 Node v3 生产者与 Rust 原生消费者 共享文件配置、三域、身份和 Unicode dist', (t) => {
  for (const environment of ['dev', 'test', 'prod']) {
    const value = fixture(t, { environment, localTools: true })
    assert.deepEqual(nodeValidate(value), value.receipt)
    const result = nativeValidate(value)
    assert.ifError(result.error)
    assert.equal(result.status, 0, result.stderr)
    const checked = parseJson(result.stdout)
    assert.deepEqual(Object.keys(checked).sort(), [
      'backend_domains',
      'frontend_build',
      'frontend_domains',
    ])
    assert.deepEqual(checked.backend_domains, [])
    assert.deepEqual(checked.frontend_domains, [value.receipt.sources])
    assert.deepEqual(checked.frontend_build, {
      configuration: value.receipt.build.configuration,
      identity: value.receipt.build.identity,
      files: value.receipt.files,
    })
    assert.equal(checked.frontend_build.configuration.environment, environment)
    assert.equal(checked.frontend_build.identity.frontend_commit, value.head)
  }
})

test('工具文件已知配置节只记录元数据，节内字节漂移仍被两端拒绝', (t) => {
  const value = fixture(t, { formal: false })
  const tools = {
    application_config_dir: 'config',
    api_contract: { backend_repository: 'example/backend' },
    real_browser: { password: sentinel },
    browser_smoke: { serverMode: 'preview' },
  }
  value.json('config/tools.json', tools)
  fs.rmSync(value.file)
  const before = buildSourceSnapshot(value.root, { APP_ENV: 'test' }, observe)
  value.receipt = writeBuildReceipt(value.root, before, { APP_ENV: 'test' }, observe)
  assert.deepEqual(nodeValidate(value), value.receipt)
  const result = nativeValidate(value)
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
  const checked = parseJson(result.stdout)
  assert.deepEqual(checked.frontend_build.configuration, value.receipt.build.configuration)
  const descriptor = value.receipt.build.configuration.tools.find(
    (item) => item.path === 'config/tools.json',
  )
  assert.deepEqual(descriptor, {
    path: 'config/tools.json',
    sha256: sha256(fs.readFileSync(path.join(value.root, 'config/tools.json'))),
  })
  assert.ok(!JSON.stringify(value.receipt).includes(sentinel))
  assert.ok(!result.stdout.includes(sentinel))
  value.json('config/tools.json', {
    ...tools,
    real_browser: { password: sentinel + '-changed' },
  })
  rejectedByBoth(value)
})

test('development 身份允许缺少受管 JSON 的全部父目录', (t) => {
  const value = fixture(t, { formal: false })
  fs.rmSync(path.join(value.root, '.local-tests'), { recursive: true })
  fs.rmSync(value.file)
  const before = buildSourceSnapshot(value.root, { APP_ENV: 'test' }, observe)
  value.receipt = writeBuildReceipt(value.root, before, { APP_ENV: 'test' }, observe)
  assert.equal(value.receipt.build.identity.source_file, null)
  assert.deepEqual(nodeValidate(value), value.receipt)
  const result = nativeValidate(value)
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
})

test('v2、旧环境协议、未知字段、乱序与身份 SHA 同时被实际消费者拒绝', (t) => {
  const value = fixture(t)
  for (const mutate of [
    (receipt) => {
      receipt.format_version = 2
    },
    (receipt) => {
      receipt.build.environment = { variables: [], files: [] }
    },
    (receipt) => {
      receipt.build.environment_files = []
    },
    (receipt) => {
      receipt.build.configuration.unknown = sentinel
    },
    (receipt) => {
      receipt.build.configuration.files.reverse()
    },
    (receipt) => {
      receipt.build.identity.frontend_commit = 'a'.repeat(40)
    },
    (receipt) => {
      receipt.build.toolchain.pnpm.observed = 'wrong'
    },
  ]) {
    const changed = structuredClone(value.receipt)
    mutate(changed)
    value.json(`dist/${receiptPath}`, changed)
    rejectedByBoth(value)
  }
})

test('配置、工具、受管身份、实际产物与文件集合的字节漂移均拒绝', (t) => {
  const value = fixture(t)
  for (const [relative, bytes] of [
    ['config/app.test.toml', '# 改变字节\n'],
    ['config/tools.json', '{"application_config_dir":"公开 配置"}'],
    ['.local-tests/frontend-tools.json', '{}'],
    ['.local-tests/build/source.json', '{"format_version":1,"frontend_commit":"development"}'],
    ['dist/build-identity.json', '{"frontend_commit":"development"}'],
    ['dist/assets/中文.txt', '改变产物'],
    ['dist/extra.txt', '新增产物'],
  ]) {
    const file = path.join(value.root, relative)
    const original = fs.existsSync(file) ? fs.readFileSync(file) : null
    value.put(relative, bytes)
    rejectedByBoth(value)
    if (original === null) fs.rmSync(file)
    else fs.writeFileSync(file, original)
  }
})

test('相同畸形 UTF8/TOML/JSON、未知凭据、严格 host/port 与 URL 错误安全拒绝', (t) => {
  const value = fixture(t, { formal: false })
  for (const [relative, bytes] of [
    ['config/app.test.toml', Buffer.from([0xff])],
    ['config/app.test.toml', `password="${sentinel}"`],
    ['config/app.test.toml', `api_origin=""\napi_origin="${sentinel}"`],
    ['config/app.test.toml', '[server]\nport=true'],
    ['config/app.test.toml', '[server]\nport=1.5'],
    ['config/app.test.toml', '[server]\nport=65536'],
    ['config/app.test.toml', '[server]\nhost="\\u0001"'],
    ['config/app.test.toml', '[server]\nproxy_target="ftp://invalid"'],
    ['config/app.test.toml', '[server]\nproxy_target="http://999.999.999.999"'],
    ['config/app.test.toml', `api_origin="http://user:${sentinel}@example.invalid"`],
    ['config/app.test.toml', 'api_origin="https://example.invalid/path"'],
    ['config/app.test.toml', 'api_origin="https://example.invalid/?query"'],
    ['.local-tests/frontend-tools.json', `{"password":"${sentinel}"}`],
    [
      '.local-tests/frontend-tools.json',
      '{"application_config_dir":"config","application_config_dir":"config"}',
    ],
    [
      '.local-tests/build/source.json',
      '{"format_version":1,"format_version":1,"frontend_commit":"development"}',
    ],
    [`dist/${receiptPath}`, '{"format_version":3,"format_version":3}'],
  ]) {
    const file = path.join(value.root, relative)
    const original = fs.existsSync(file) ? fs.readFileSync(file) : null
    value.put(relative, bytes)
    if (relative !== `dist/${receiptPath}`) bindCurrentBytes(value)
    rejectedByBoth(value)
    if (original === null) fs.rmSync(file)
    else fs.writeFileSync(file, original)
  }
})

test('Node 接受的 URL 规范化和整值浮点端口也必须通过 Rust 原生消费者', (t) => {
  const value = fixture(t, { formal: false })
  for (const override of [
    '[server]\nport=5173.0',
    '[server]\nproxy_target="http://example.invalid/?"',
  ]) {
    value.put('config/app.test.toml', override)
    fs.rmSync(value.file)
    const before = buildSourceSnapshot(value.root, { APP_ENV: 'test' }, observe)
    value.receipt = writeBuildReceipt(value.root, before, { APP_ENV: 'test' }, observe)
    assert.deepEqual(nodeValidate(value), value.receipt)
    const result = nativeValidate(value)
    assert.ifError(result.error)
    assert.equal(result.status, 0, result.stderr)
  }
})

test('原始 Windows junction/.. 路径在规范化之前被两端拒绝', (t) => {
  const value = fixture(t)
  const linked = path.join(value.root, 'linked')
  fs.symlinkSync(
    path.join(value.root, 'config'),
    linked,
    process.platform === 'win32' ? 'junction' : 'dir',
  )
  value.json('.local-tests/frontend-tools.json', { application_config_dir: 'linked/../config' })
  rejectedByBoth(value)
})
