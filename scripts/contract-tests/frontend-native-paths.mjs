import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test, { after } from 'node:test'
import { buildSourceSnapshot } from '../build-source.mjs'
import { loadFrontendConfiguration } from '../frontend-tool-config.mjs'
import { createWindowsAttributeCheck } from '../application-config-paths.mjs'
import { receiptPath, verifyBuildReceipt, writeBuildReceipt } from '../restore-build.mjs'
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
  assert.equal(fs.lstatSync(ordinary).isDirectory(), true)
  assert.notEqual(fs.realpathSync.native(ordinary).toLowerCase(), alias.toLowerCase())
  // 实际普通 Win32 属性调用成功且非 reparse；不要求 Node 接受该词法别名。
  const attributes = createWindowsAttributeCheck()
  assert.doesNotThrow(() => attributes(alias, 'Win32 普通目录别名'))
  value.json('config/tools.json', { application_config_dir: alias })
  const rejectedPath = (error) =>
    error instanceof Error &&
    error.message.includes('公开配置路径校验失败') &&
    error.message.includes(alias) &&
    /IO ENOENT|禁止重解析或指向其他来源的路径/u.test(error.message)
  assert.throws(() => loadFrontendConfiguration(value.root, 'test'), rejectedPath)
  // 先从真实普通文件重绑字节，再令 descriptor 使用别名，不强求 Node 能打开别名。
  bindCurrentBytes(value)
  value.receipt = parseJson(fs.readFileSync(value.file, 'utf8'))
  value.receipt.build.configuration.directory = 'config.'
  for (const file of value.receipt.build.configuration.files) {
    file.path = file.path.replace(/^config\//u, 'config./')
  }
  value.json(`dist/${receiptPath}`, value.receipt)
  assert.throws(
    () => verifyBuildReceipt(value.root, { APP_ENV: 'INVALID-SHELL' }, observe),
    rejectedPath,
  )
  const result = nativeValidate(value)
  assert.ok(Number.isInteger(result.status) && result.status > 0)
  assert.equal(result.stdout, '')
  assert.match(result.stderr, /FrontendBuildRejected/u)
})
