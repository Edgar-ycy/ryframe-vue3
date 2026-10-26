import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test, { after } from 'node:test'
import { buildSourceSnapshot } from '../build-source.mjs'
import { loadFrontendConfiguration } from '../frontend-tool-config.mjs'
import { verifyBuildReceipt, writeBuildReceipt } from '../restore-build.mjs'
import { parseJson } from '../resource-render/json.mjs'
import { receiptBinding } from './frontend-native-binding.mjs'
import { bindCurrentBytes, fixture, observe } from './frontend-native-receipt-fixture.mjs'

const selected = receiptBinding()
after(() => selected.verifyUnchanged())
const windows = { skip: process.platform !== 'win32' }

function rebuild(value) {
  fs.rmSync(value.file)
  const before = buildSourceSnapshot(value.root, { APP_ENV: 'test' }, observe)
  value.receipt = writeBuildReceipt(value.root, before, { APP_ENV: 'test' }, observe)
}

function nativeValidate(value) {
  return selected.invoke(value.root, {
    frontend_inventories: [value.receipt.sources.full],
    backend_inventories: [],
  })
}

function accepted(value) {
  assert.deepEqual(
    verifyBuildReceipt(value.root, { APP_ENV: 'INVALID-SHELL' }, observe),
    value.receipt,
  )
  const result = nativeValidate(value)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
  const checked = parseJson(result.stdout)
  assert.deepEqual(checked.frontend_domains, [value.receipt.sources])
  assert.deepEqual(checked.frontend_build, {
    configuration: value.receipt.build.configuration,
    identity: value.receipt.build.identity,
    files: value.receipt.files,
  })
  return checked.frontend_build.configuration
}

test('Windows 根目录大小写不同仍保留配置 descriptor 的相对 suffix', windows, (t) => {
  const value = fixture(t, { formal: false })
  const differentlyCased = value.root.replace(/[a-zA-Z]/gu, (letter) =>
    letter === letter.toUpperCase() ? letter.toLowerCase() : letter.toUpperCase(),
  )
  assert.notEqual(differentlyCased, value.root)
  const directory = path.join(differentlyCased, 'ConFiG')
  assert.equal(
    fs.realpathSync.native(directory).toLowerCase(),
    fs.realpathSync.native(path.join(value.root, 'config')).toLowerCase(),
  )
  value.json('config/tools.json', { application_config_dir: directory })
  rebuild(value)
  const configuration = accepted(value)
  assert.equal(configuration.directory, 'ConFiG')
  assert.deepEqual(configuration.files.map((file) => file.path), [
    'ConFiG/app.toml',
    'ConFiG/app.test.toml',
  ])
})

test('Windows 普通 Win32 目录别名在重新绑定字节后仍被两端拒绝', windows, (t) => {
  const value = fixture(t, { formal: false })
  const ordinary = path.join(value.root, 'config')
  const alias = path.join(value.root, 'config.')
  const canonical = fs.realpathSync.native(alias)
  assert.equal(canonical.toLowerCase(), fs.realpathSync.native(ordinary).toLowerCase())
  assert.notEqual(canonical.toLowerCase(), alias.toLowerCase(), '必须实际存在 Win32 词法路径别名')
  assert.equal(fs.lstatSync(alias).isSymbolicLink(), false)
  const identity = (file) => {
    const stat = fs.statSync(file, { bigint: true })
    return [String(stat.dev), String(stat.ino)]
  }
  assert.deepEqual(identity(alias), identity(ordinary))
  value.json('config/tools.json', { application_config_dir: alias })
  assert.throws(
    () => loadFrontendConfiguration(value.root, 'test'),
    /禁止重解析或指向其他来源的路径/u,
  )
  // 连同目录与文件 descriptor 使用同一词法别名，避免仅靠 descriptor 不匹配拒绝。
  value.receipt.build.configuration.directory = 'config.'
  for (const file of value.receipt.build.configuration.files) {
    file.path = file.path.replace(/^config\//u, 'config./')
  }
  bindCurrentBytes(value)
  value.receipt = parseJson(fs.readFileSync(value.file, 'utf8'))
  assert.throws(
    () => verifyBuildReceipt(value.root, { APP_ENV: 'INVALID-SHELL' }, observe),
    /禁止重解析或指向其他来源的路径/u,
  )
  const result = nativeValidate(value)
  assert.ok(Number.isInteger(result.status) && result.status > 0)
  assert.equal(result.stdout, '')
  assert.match(result.stderr, /FrontendBuildRejected/u)
})

test('超过 260 字符的普通中文空格路径完成 Node 收据生产及双端消费', (t) => {
  const value = fixture(t, { formal: false, deep: true })
  assert.ok(value.root.length > 260, `实际根路径长度必须超过 260：${value.root.length}`)
  assert.ok(path.isAbsolute(value.root))
  assert.ok(!value.root.startsWith('\\\\?\\'))
  assert.ok(value.root.includes('中文') && value.root.includes(' '))
  const configuration = accepted(value)
  assert.equal(configuration.directory, 'config')
  assert.deepEqual(configuration.files.map((file) => file.path), [
    'config/app.toml',
    'config/app.test.toml',
  ])
})
