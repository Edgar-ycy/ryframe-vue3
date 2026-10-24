import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createTemporaryDirectory } from '../temporary-directory.mjs'

import { renderResourceAssets } from '../resource-render/index.mjs'
import { parseJson } from '../resource-render/json.mjs'
import { maxInputBytes, readRequest, renderRequest } from '../resource-render/protocol.mjs'

const resource = JSON.parse(
  await readFile(new URL('./fixtures/resource-render/post.json', import.meta.url), 'utf8'),
)
const request = () => ({
  format_version: 1,
  generator_version: '1.3.0',
  aggregate: false,
  resources: [resource],
})
const cli = fileURLToPath(new URL('../resource-render/cli.mjs', import.meta.url))

test('私有协议绑定版本并返回完整确定性资产，不改写输入', () => {
  const input = request()
  const before = JSON.stringify(input)
  const output = renderRequest(before)
  assert(output.endsWith('\n'))
  assert.deepEqual(JSON.parse(output), {
    format_version: 1,
    generator_version: '1.3.0',
    assets: renderResourceAssets([resource], '1.3.0'),
  })
  assert.equal(JSON.stringify(input), before)
})

test('未知字段、缺失字段、旧协议和不支持的模型在返回前拒绝', () => {
  for (const input of [
    null,
    [],
    {},
    { ...request(), extra: true },
    { ...request(), format_version: '1' },
    { ...request(), format_version: 2 },
    { ...request(), resources: {} },
    { ...request(), resources: [{ ...resource, schema_version: 2 }] },
    { ...request(), resources: [{ ...resource, profile: 'custom' }] },
  ])
    assert.throws(() => renderRequest(JSON.stringify(input)))
  for (const key of Object.keys(request())) {
    const input = request()
    delete input[key]
    assert.throws(() => renderRequest(JSON.stringify(input)), /字段/)
  }
  assert.throws(
    () => renderRequest('{"secret":"not-for-diagnostics"'),
    (error) => {
      assert(!error.message.includes('not-for-diagnostics'))
      return /JSON/.test(error.message)
    },
  )
})

test('读取器跨 UTF-8 分片保留中文，并拒绝非法编码和超限字节', async () => {
  const encoded = Buffer.from('中文资源')
  assert.equal(
    await readRequest(Readable.from([...encoded].map((byte) => Buffer.from([byte])))),
    '中文资源',
  )
  await assert.rejects(readRequest(Readable.from([Buffer.from([0xc3, 0x28])])), /UTF-8/)
  await assert.rejects(
    readRequest(Readable.from([Buffer.alloc(maxInputBytes), Buffer.from('x')])),
    /16 MiB/,
  )
  assert.throws(() => renderRequest(' '.repeat(maxInputBytes + 1)), /16 MiB/)
})

test('重复键、转义后的同名键与过深 JSON 拒绝，正常字符串和数组不被误判', () => {
  for (const source of ['{"a":1,"a":2}', '{"a":1,"\\u0061":2}', '[{"x":{},"x":[]}]']) {
    assert.throws(() => parseJson(source), /重复字段/)
  }
  assert.throws(() => parseJson('['.repeat(130) + '0' + ']'.repeat(130)), /128 层/)
  for (const source of [
    JSON.stringify({ a: '"重复键: "a"', b: [true, false, null, 12e3] }),
    '[]',
    '{}',
    '"中文"',
    '0',
  ]) {
    assert.deepEqual(parseJson(source), JSON.parse(source))
  }
})

test('真实 CLI 只从 stdin 接收请求，stdout 仅包含一份 JSON，不创建文件', async () => {
  let scratch = fileURLToPath(
    new URL('../../.local-tests/resource-render-protocol/', import.meta.url),
  )
  while (scratch.length < 300) scratch = path.join(scratch, '深层隔离资源-contract-stage')
  await mkdir(scratch, { recursive: true })
  const cwd = await createTemporaryDirectory(path.join(scratch, 'attempt-'))
  assert(!cwd.startsWith('\\\\?\\'), '协议 cwd 保持普通路径')
  try {
    const result = spawnSync(process.execPath, [cli], {
      cwd,
      input: JSON.stringify(request()),
      encoding: 'utf8',
    })
    assert.ifError(result.error)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stderr, '')
    assert.equal(result.stdout, renderRequest(JSON.stringify(request())))
    assert.deepEqual(await readdir(cwd), [])
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('整批冲突、额外参数和非法 JSON 的 CLI 失败没有部分 stdout', () => {
  for (const [args, input] of [
    [[], JSON.stringify({ ...request(), resources: [resource, resource] })],
    [['--write'], JSON.stringify(request())],
    [[], '{"password":"must-not-appear"'],
  ]) {
    const result = spawnSync(process.execPath, [cli, ...args], { input, encoding: 'utf8' })
    assert.ifError(result.error)
    assert.equal(result.status, 2)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /未写入受管文件/)
    assert(!result.stderr.includes('must-not-appear'))
    assert(!result.stderr.includes('at file:'))
  }
})
