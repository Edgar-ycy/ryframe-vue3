import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { readConsumerContext } from '../consumer-context.mjs'
import { fileHash } from '../application-config-files.mjs'
import { receiptBinding } from '../contract-tests/frontend-native-binding.mjs'
import { consumerFixture, sentinel } from './consumer-context-fixture.mjs'

const read = (value) => readConsumerContext(value.file, { frontendRoot: value.frontend })
const safeFailure = (action) =>
  assert.throws(action, (error) => {
    assert.ok(!String(error.stack).includes(sentinel))
    return true
  })

test('v1 精确六字段绑定当前目录、参数和原生工具来源，读取前后稳定', (t) => {
  const value = consumerFixture(t)
  const selected = read(value)
  assert.deepEqual(selected.context, value.value)
  assert.equal(selected.arguments.size, 5)
  assert.equal(selected.arguments.get('--mode'), 'formal')
  selected.verifyUnchanged()
  safeFailure(() => readConsumerContext(value.file))
  value.value.frontend_root = process.cwd()
  value.save()
  const binding = receiptBinding(['--consumer-context', value.file])
  assert.equal(binding.executable, value.executable)
  binding.verifyUnchanged()
})

test('严格 UTF8、BOM、畸形 JSON 和各层含转义的重复字段均安全拒绝', (t) => {
  const value = consumerFixture(t)
  const source = JSON.stringify(value.value)
  for (const bytes of [
    Buffer.from([0xff]),
    '\uFEFF' + source,
    `{"private":"${sentinel}",`,
    source.replace('"format_version":1', '"format_version":1,"format_\\u0076ersion":1'),
    source.replace('"bytes":', '"bytes":1,"bytes":'),
    source.replace(
      '"path":"config/tools.toml"',
      '"path":"config/tools.toml","path":"config/tools.toml"',
    ),
  ]) {
    fs.writeFileSync(value.file, bytes)
    safeFailure(() => read(value))
  }
})

test('未知与缺失字段、旧版本、类型、非规范摘要和来源字节数均拒绝', (t) => {
  const value = consumerFixture(t)
  for (const mutate of [
    (v) => {
      v.private = sentinel
    },
    (v) => {
      delete v.origin_tool_binding
    },
    (v) => {
      v.format_version = 2
    },
    (v) => {
      v.format_version = '1'
    },
    (v) => {
      v.origin_tool_binding = []
    },
    (v) => {
      v.origin_tool_binding.private = sentinel
    },
    (v) => {
      v.origin_tool_binding.bytes = 0
    },
    (v) => {
      v.origin_tool_binding.bytes = 1.5
    },
    (v) => {
      v.origin_tool_binding.bytes = Number.MAX_SAFE_INTEGER + 1
    },
    (v) => {
      v.origin_tool_binding.bytes += 1
    },
    (v) => {
      v.origin_tool_binding.sha256 = 'A'.repeat(64)
    },
    (v) => {
      v.origin_tool_binding.sha256 = 'a'.repeat(63)
    },
    (v) => {
      v.origin_tool_binding.sha256 = 'a'.repeat(64)
    },
    (v) => {
      v.origin_tool_binding.path = value.executable
    },
    (v) => {
      v.tool_configuration = null
    },
    (v) => {
      v.tool_configuration[0].private = sentinel
    },
    (v) => {
      v.tool_configuration[0].sha256 = 'A'.repeat(64)
    },
    (v) => {
      v.tool_configuration[0].path = '../config/tools.toml'
    },
    (v) => {
      v.tool_configuration.reverse()
    },
    (v) => {
      v.tool_configuration.push(v.tool_configuration[0])
    },
    (v) => {
      v.tool_configuration.pop()
    },
  ]) {
    const changed = structuredClone(value.value)
    mutate(changed)
    value.save(changed)
    safeFailure(() => read(value))
  }
})

test('arguments 恰有五对已知参数，验证唯一性、类型和既有值域', (t) => {
  const value = consumerFixture(t)
  for (const args of [
    null,
    [],
    [...value.value.arguments, '--extra', sentinel],
    ['--mode', 'formal', '--mode', 'formal', ...value.value.arguments.slice(4)],
    ...[
      [0, '--unknown'],
      [1, 'bad'],
      [3, 'relative.json'],
      [5, 'short'],
      [7, 'https://example.invalid'],
      [9, 'yes'],
      [9, true],
      [1, ''],
      [1, '\0'],
    ].map(([index, replacement]) => value.value.arguments.with(index, replacement)),
  ]) {
    value.save({ ...value.value, arguments: args })
    safeFailure(() => read(value))
  }
  value.value.arguments[1] = 'candidate'
  value.value.arguments[9] = 'false'
  value.save()
  assert.equal(read(value).arguments.get('--mode'), 'candidate')
})

test('全部路径拒绝相对根、ParentDir、目录冒充文件和缺失入口', (t) => {
  const value = consumerFixture(t)
  for (const field of ['backend_root', 'frontend_root']) {
    for (const replacement of [
      'relative',
      `${value.root}/frontend/../frontend`,
      1,
      null,
      sentinel,
    ]) {
      value.save({ ...value.value, [field]: replacement })
      safeFailure(() => read(value))
    }
  }
  value.save()
  safeFailure(() => readConsumerContext(`${value.root}/frontend/../consumer.json`))
  fs.rmSync(value.executable)
  safeFailure(() => read(value))
})

test('ctx 自身、binding 字节与配置前后漂移及缺失 binding 都是真失败', (t) => {
  const value = consumerFixture(t)
  for (const file of [value.file, value.binding, path.join(value.backend, 'config/tools.toml')]) {
    const selected = read(value)
    const before = fs.readFileSync(file)
    fs.appendFileSync(file, ' ')
    safeFailure(() => selected.verifyUnchanged())
    fs.writeFileSync(file, before)
  }
  const selected = read(value)
  fs.rmSync(value.binding)
  safeFailure(() => selected.verifyUnchanged())
  safeFailure(() => read(value))
})

test('配置存在性集合覆盖缺省、公共、本机及运行期间新增删除', (t) => {
  const value = consumerFixture(t)
  const publicFile = path.join(value.backend, 'config/tools.toml')
  const localFile = path.join(value.backend, '.local-tests/tools.toml')
  const selected = read(value)
  fs.rmSync(localFile)
  safeFailure(() => selected.verifyUnchanged())
  value.value.tool_configuration.pop()
  value.save()
  read(value).verifyUnchanged()
  fs.rmSync(publicFile)
  fs.rmdirSync(path.dirname(publicFile))
  value.value.tool_configuration = []
  value.save()
  const empty = read(value)
  value.put('backend/.local-tests/tools.toml', '# 新增')
  safeFailure(() => empty.verifyUnchanged())
  value.value.tool_configuration = [{ path: '.local-tests/tools.toml', sha256: 'a'.repeat(64) }]
  value.save()
  safeFailure(() => read(value))
})

test('ctx、入口、binding 与配置的链接和祖先 junction 均拒绝', (t) => {
  const value = consumerFixture(t)
  const kind = process.platform === 'win32' ? 'junction' : 'dir'
  const linked = path.join(value.root, 'linked')
  fs.symlinkSync(value.backend, linked, kind)
  value.save({ ...value.value, backend_root: linked })
  safeFailure(() => read(value))
  value.save()
  const contextLink = path.join(value.root, 'context-link')
  fs.symlinkSync(value.root, contextLink, kind)
  safeFailure(() => readConsumerContext(path.join(contextLink, 'consumer.json')))
  const config = path.join(value.backend, 'config/tools.toml')
  fs.rmSync(config)
  fs.symlinkSync(value.frontend, config, kind)
  safeFailure(() => read(value))
})

test('只接受正式上下文，拒绝旧解释器字段与手动旁路或重复参数', (t) => {
  const value = consumerFixture(t)
  value.save({ ...value.value, python_program: value.executable })
  safeFailure(() => read(value))
  value.save()
  for (const args of [
    [],
    ['--python', value.executable],
    ['--backend-root', value.backend],
    ['--consumer-context', value.file, '--python', value.executable],
    ['--consumer-context', value.file, '--backend-root', value.backend],
    ['--consumer-context', value.file, '--consumer-context', value.file],
    ['--unknown', sentinel],
  ])
    safeFailure(() => receiptBinding(args))
})

test('重新绑定描述文件不能省略实际源码或接受未知工具字段', (t) => {
  const value = consumerFixture(t)
  const original = fs.readFileSync(value.binding)
  for (const mutate of [
    (binding) => {
      binding.sources.pop()
    },
    (binding) => {
      binding.private = sentinel
    },
  ]) {
    const binding = JSON.parse(original)
    mutate(binding)
    const bytes = Buffer.from(JSON.stringify(binding))
    fs.writeFileSync(value.binding, bytes)
    value.value.origin_tool_binding.bytes = bytes.length
    value.value.origin_tool_binding.sha256 = fileHash(bytes)
    value.save()
    safeFailure(() => read(value))
  }
})
