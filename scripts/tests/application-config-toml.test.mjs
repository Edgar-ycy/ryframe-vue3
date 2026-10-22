import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { TomlError } from 'smol-toml'
import { loadApplicationConfig } from '../application-config.mjs'
import { applicationTomlError, parseApplicationToml } from '../application-config-toml.mjs'
import { defaults, fixture, hash, json } from './application-config-fixture.mjs'

function rejected(root, source, expected) {
  fs.writeFileSync(path.join(root, 'config/app.dev.toml'), source)
  assert.throws(
    () => loadApplicationConfig(root, { environment: 'dev' }),
    (error) => {
      assert.match(error.message, expected)
      assert.doesNotMatch(error.stack, /PRIVATE-SENTINEL/u)
      assert.equal(error.cause, undefined)
      return true
    },
  )
}

test('重复键、重复表和 unsafe keys 均安全拒绝，不暴露 parser 原文', (t) => {
  const { root } = fixture(t)
  for (const source of [
    'api_origin = "PRIVATE-SENTINEL"\napi_origin = ""\n',
    '[server]\nhost = "PRIVATE-SENTINEL"\n[server]\nport = 5173\n',
    '"__proto__" = "PRIVATE-SENTINEL"\n',
    'constructor = "PRIVATE-SENTINEL"\n',
    '[server]\n"__proto__" = "PRIVATE-SENTINEL"\n',
  ]) {
    rejected(root, source, /TOML 语法错误.*line [1-9]\d* column [1-9]\d*/u)
  }
})

test('特殊数值、超大整数、日期时间和数组按原字段类型拒绝，不进行数值或字符串转换', (t) => {
  const { root } = fixture(t)
  for (const value of [
    'nan',
    '+nan',
    'inf',
    '-inf',
    '9007199254740993',
    '9223372036854775807',
    '1979-05-27T07:32:00Z',
    '[5173]',
  ]) {
    rejected(root, `[server]\nport = ${value}\n`, /字段校验.*server.port/u)
  }
  for (const value of ['1979-05-27', '07:32:00', '1979-05-27T07:32:00', '["localhost"]']) {
    rejected(root, `[server]\nhost = ${value}\n`, /字段校验.*server.host/u)
  }
  rejected(root, 'api_origin = 1979-05-27T07:32:00Z\n', /字段校验.*api_origin/u)
  rejected(root, 'server = 1979-05-27T07:32:00Z\n', /字段校验.*server/u)
  rejected(root, 'server = []\n', /字段校验.*server/u)
  const parsed = parseApplicationToml('large = 9007199254740993', '测试输入')
  assert.equal(typeof parsed.large, 'bigint')
})

test('合法注释、多行和 Unicode TOML 输入保留原始字节摘要并只返回公开投影', (t) => {
  const { root } = fixture(t)
  const source = [
    '# PRIVATE-SENTINEL 只在注释中，不进入公开投影',
    'api_origin = """',
    'https://EXAMPLE.invalid:443/',
    '"""',
    '[server]',
    'host = "本机 中文 😀" # Unicode 与合法空格',
    'port = 6_000',
    '',
  ].join('\n')
  fs.writeFileSync(path.join(root, 'config/app.dev.toml'), source)
  const actual = loadApplicationConfig(root, { environment: 'dev' })
  assert.deepEqual(actual.publicConfig, { apiOrigin: 'https://example.invalid' })
  assert.equal(actual.server.host, '本机 中文 😀')
  assert.equal(actual.server.port, 6000)
  assert.equal(actual.files[1].sha256, hash(Buffer.from(source)))
  assert.doesNotMatch(JSON.stringify(actual), /PRIVATE-SENTINEL/u)
  assert.deepEqual(Object.keys(actual).sort(), ['environment', 'files', 'publicConfig', 'server'])
})

test('只读取 TOML 应用文件，旧 JSON 不能覆盖、补缺或作为格式回退', (t) => {
  const { root } = fixture(t)
  const before = loadApplicationConfig(root, { environment: 'dev' })
  fs.writeFileSync(path.join(root, 'config/app.json'), json({ password: 'PRIVATE-SENTINEL' }))
  fs.writeFileSync(path.join(root, 'config/app.dev.json'), json(defaults))
  assert.deepEqual(loadApplicationConfig(root, { environment: 'dev' }), before)
  fs.rmSync(path.join(root, 'config/app.dev.toml'))
  assert.throws(() => loadApplicationConfig(root, { environment: 'dev' }), /app.dev.toml.*ENOENT/u)
  rejected(root, json(defaults), /TOML 语法错误/u)
})

test('inline 深度上限32拒绝深层数组，普通浅层 TOML 仍可解析', () => {
  assert.deepEqual(parseApplicationToml('value = [[1]]', '深度测试').value, [[1]])
  assert.throws(
    () => parseApplicationToml('value = ' + '['.repeat(64) + '1' + ']'.repeat(64), '深度测试'),
    /公开配置解析失败/u,
  )
})

test('只投影安全正整数位置，未知错误固定分类且不携带原始 cause', () => {
  const error = new TomlError('PRIVATE-SENTINEL', { toml: 'PRIVATE-SENTINEL', ptr: 0 })
  for (const invalid of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1']) {
    error.line = invalid
    error.column = invalid
    const safe = applicationTomlError(error, '选中的公开文件')
    assert.doesNotMatch(safe.message, /line|column|PRIVATE-SENTINEL/u)
    assert.equal(safe.cause, undefined)
  }
  error.line = 2
  error.column = 7
  const safe = applicationTomlError(error, '选中的公开文件')
  assert.match(safe.message, /line 2 column 7/u)
  assert.doesNotMatch(safe.stack, /PRIVATE-SENTINEL/u)
  const unknown = new Error('PRIVATE-SENTINEL')
  Object.defineProperty(unknown, 'message', {
    get() {
      throw new Error('禁止读取原始错误')
    },
  })
  assert.equal(
    applicationTomlError(unknown, '选中的公开文件').message,
    '公开配置解析失败：选中的公开文件；TOML 解析器失败；请检查所选 TOML 配置',
  )
})
