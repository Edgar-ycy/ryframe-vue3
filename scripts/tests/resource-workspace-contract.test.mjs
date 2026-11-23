import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { maxInputBytes } from '../resource-render/protocol.mjs'
import { prepareOrderFrontendContract } from './helpers/resource-workspace-contract.mjs'
import {
  componentMarker,
  generatedContract,
  missingContract,
  operationNames,
  orderPermissionMarkers,
} from './fixtures/resource-workspace/builders.mjs'

const fixtureDirectory = new URL('./fixtures/resource-workspace/', import.meta.url)
const cli = fileURLToPath(new URL('./helpers/resource-workspace-contract-cli.mjs', import.meta.url))
const partialMessage = '只发现部分权限、operation 或 schema 标记，拒绝猜测并重复装配'
const request = (contract = missingContract()) => ({ format_version: 1, ...contract })
const runCli = (input, args = []) => {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: fileURLToPath(fixtureDirectory),
    input: typeof input === 'string' || Buffer.isBuffer(input) ? input : JSON.stringify(input),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
  assert.ifError(result.error)
  return result
}
const assertRejected = (input, reason, args = []) => {
  const result = runCli(input, args)
  assert.equal(result.status, 2)
  assert.equal(result.stdout, '')
  assert.match(result.stderr, /Order 前端契约.+失败：.+；未写入受管文件。\n$/)
  assert.match(result.stderr, reason)
  assert(!result.stderr.includes('must-not-appear'))
  assert(!result.stderr.includes('at file:'))
}

test('missing_order_frontend_contract_is_injected_once', async () => {
  const input = missingContract()
  const before = structuredClone(input)
  const injected = prepareOrderFrontendContract(input)
  assert(injected, '首次装配应返回修改内容')
  const operations = await readFile(new URL('order_operations.ts.part', fixtureDirectory), 'utf8')
  const schema = await readFile(new URL('order_schema.ts.part', fixtureDirectory), 'utf8')
  assert.equal(
    injected.permissions,
    'export const permissionCatalog = [\n' +
      orderPermissionMarkers.map((marker) => `  ${marker},\n`).join('') +
      ']\n',
  )
  assert.equal(injected.operations, input.operations + '\n' + operations)
  assert(injected.schema.includes(schema))
  assert.equal(prepareOrderFrontendContract(injected), null, '重复装配完整 fixture 契约必须零修改')
  assert.deepEqual(input, before)
})

test('basic_generated_order_frontend_contract_is_upgraded_once', () => {
  const input = generatedContract()
  const before = structuredClone(input)
  const upgraded = prepareOrderFrontendContract(input)
  assert(upgraded, '首次升级应补充 OrderDetailVo')
  assert.equal(upgraded.permissions, input.permissions, '升级不得改写已生成权限清单')
  assert.equal(upgraded.operations, input.operations, '升级不得改写已生成 operation')
  const reference = 'import("./core").components["schemas"]["OrderVo"]'
  assert.equal(upgraded.schema.split(reference).length - 1, 2)
  assert.equal(upgraded.schema.split('OrderDetailVo:').length - 1, 1)
  assert.equal(prepareOrderFrontendContract(upgraded), null, '升级后的 generated 契约必须零修改')
  assert.deepEqual(input, before)
})

test('partial_order_frontend_contract_fails_closed', () => {
  const partialContracts = [
    {
      permissions: 'export const permissionCatalog = [\n  "system:order:list",\n]\n',
      operations: '',
      schema: '',
    },
    { permissions: '', operations: '', schema: 'OrderDetailVo: {}' },
    {
      permissions: '"system:order:list"',
      operations: 'export const get_system_orders = bindJsonOperation({})',
      schema: 'ApiPageResponse_OrderVo:\nApiResponse_OrderVo:',
    },
  ]
  for (const input of partialContracts) {
    assert.throws(() => prepareOrderFrontendContract(input), { message: partialMessage })
  }
})

test('完整 generated 契约直接返回零修改，保留原字节和对象', () => {
  const input = generatedContract({ detail: true })
  input.operations += '// 中文、$&、\\n 与 CRLF\r\n'
  const before = structuredClone(input)
  assert.equal(prepareOrderFrontendContract(input), null)
  assert.deepEqual(input, before)
})

test('每个缺失标记及混合 fixture/generated 契约都拒绝猜测', () => {
  const complete = generatedContract({ detail: true })
  const markers = [
    ...orderPermissionMarkers.map((marker) => ['permissions', marker]),
    ...operationNames.map((name) => ['operations', `export const ${name} =`]),
    ...operationNames.map((name) => ['schema', `    ${name}: {`]),
    ...[
      'ApiPageResponse_OrderVo:',
      'ApiResponse_OrderVo:',
      'CreateOrderDto:',
      'UpdateOrderDto:',
    ].map((marker) => ['schema', marker]),
  ]
  for (const [field, marker] of markers) {
    const input = { ...complete, [field]: complete[field].replace(marker, '') }
    assert.throws(() => prepareOrderFrontendContract(input), { message: partialMessage })
  }
  const mixed = { ...complete, schema: complete.schema + 'type OrderContractRecord = {' }
  assert.throws(() => prepareOrderFrontendContract(mixed), { message: partialMessage })
})

test('缺失接口保留原中文错误，generated 升级要求唯一 components', () => {
  for (const [field, value, message] of [
    ['permissions', '', '权限清单缺少 permissionCatalog'],
    ['schema', 'export interface operations {\n}\n', 'OpenAPI schema 缺少 components 接口'],
    ['schema', componentMarker + '    }\n}\n', 'OpenAPI schema 缺少 operations 接口'],
    [
      'permissions',
      missingContract().permissions.replaceAll('\n', '\r\n'),
      '权限清单缺少 permissionCatalog',
    ],
  ]) {
    assert.throws(() => prepareOrderFrontendContract({ ...missingContract(), [field]: value }), {
      message,
    })
  }
  for (const schema of [
    generatedContract().schema.replace(componentMarker, ''),
    generatedContract().schema + componentMarker,
  ]) {
    assert.throws(() => prepareOrderFrontendContract({ ...generatedContract(), schema }), {
      message: 'OpenAPI schema 必须包含唯一的 components 接口',
    })
  }
})

test('首次替换保持 Rust replacen 语义，fixture 不改写 CRLF 或 JSON 字符串字节', () => {
  const input = missingContract()
  input.permissions += input.permissions
  input.schema += input.schema
  input.operations += "// $&、$`、$'、\\n、中文\r\n"
  const updated = prepareOrderFrontendContract(input)
  assert(updated.permissions.endsWith(missingContract().permissions))
  assert(updated.schema.endsWith(missingContract().schema))
  for (const marker of orderPermissionMarkers)
    assert.equal(updated.permissions.split(marker).length - 1, 1)
  assert.equal(updated.schema.split('type OrderContractRecord = {').length - 1, 1)
  assert(updated.operations.startsWith(input.operations + '\n'))
  assert.equal(prepareOrderFrontendContract(updated), null)
})

test('fixture SHA-256 固定原后端完整字节，故障注入保留故意的 TS 类型错误', async () => {
  for (const [name, hash] of [
    [
      'order_operations.ts.part',
      '452a4deb58cc5f66ca0ea1fa581e300221392b030370a3abd901c35de165b983',
    ],
    ['order_schema.ts.part', '6c70239f640a04951c1c36a43b79e66c5b4fff03b2639f7ab08447470ea6f53d'],
  ]) {
    const bytes = await readFile(new URL(name, fixtureDirectory))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash)
  }
  assert.deepEqual(
    await readFile(new URL('generation-failure.ts.part', fixtureDirectory)),
    Buffer.from('export const generationFailure: string = 1\n'),
  )
})

test('真实 CLI 返回唯一 JSON 和 LF，缺失、升级及完整契约都不写文件', async () => {
  const names = await readdir(fixtureDirectory)
  const before = await Promise.all(names.map((name) => readFile(new URL(name, fixtureDirectory))))
  for (const input of [
    missingContract(),
    generatedContract(),
    generatedContract({ detail: true }),
  ]) {
    input.operations += '// 中文、\\n、$&\r\n'
    const result = runCli(request(input))
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stderr, '')
    assert.equal(
      result.stdout,
      JSON.stringify({ format_version: 1, updated: prepareOrderFrontendContract(input) }) + '\n',
    )
    const { updated } = JSON.parse(result.stdout)
    assert.equal(runCli(request(updated ?? input)).stdout, '{"format_version":1,"updated":null}\n')
  }
  assert.deepEqual(await readdir(fixtureDirectory), names)
  assert.deepEqual(
    await Promise.all(names.map((name) => readFile(new URL(name, fixtureDirectory)))),
    before,
  )
})

test('严格协议拒绝未知、缺失字段、非法类型及版本，错误不回显字段内容', () => {
  for (const input of [null, [], {}, { ...request(), 'must-not-appear': true }]) {
    assertRejected(input, /校验协议失败：请求字段/)
  }
  for (const key of Object.keys(request())) {
    const input = request()
    delete input[key]
    assertRejected(input, /请求字段/)
  }
  for (const version of [null, true, '1', 0, 2]) {
    assertRejected({ ...request(), format_version: version }, /协议版本/)
  }
  for (const key of ['permissions', 'operations', 'schema']) {
    for (const value of [null, true, 1, [], {}, '\ud800', '\udfff']) {
      assertRejected({ ...request(), [key]: value }, /字符串|Unicode/)
    }
  }
})

test('严格 JSON 拒绝重复键、转义同名键、嵌套重复及无效语法，不泄露输入', () => {
  for (const source of [
    '{"format_version":1,"format_version":1}',
    '{"permissions":"must-not-appear","\\u0070ermissions":""}',
    '{"a":{"schema":1,"schema":2}}',
  ])
    assertRejected(source, /校验协议失败：JSON 对象包含重复字段/)
  for (const source of [
    '',
    'null null',
    '{"password":"must-not-appear"',
    '{"a":1,}',
    '//must-not-appear\n{}',
  ])
    assertRejected(source, /校验协议失败：输入不是有效 JSON/)
  assertRejected('['.repeat(130) + '0' + ']'.repeat(130), /128 层/)
})

test('真实 CLI 严格拒绝非法 UTF-8、UTF-16 及超过 16 MiB 的原始输入', () => {
  for (const input of [
    Buffer.from([0xc3, 0x28]),
    Buffer.from([0xff, 0xfe, 0x7b, 0]),
    Buffer.from([0xed, 0xa0, 0x80]),
  ]) {
    assertRejected(input, /读取请求失败：输入不是有效 UTF-8/)
  }
  const input = request(generatedContract({ detail: true }))
  input.operations += ' '.repeat(maxInputBytes - Buffer.byteLength(JSON.stringify(input)))
  const source = JSON.stringify(input)
  assert.equal(Buffer.byteLength(source), maxInputBytes)
  assert.equal(runCli(source).stdout, '{"format_version":1,"updated":null}\n')
  assertRejected(source + ' ', /读取请求失败：输入超过 16 MiB/)
})

test('CLI 参数与部分契约在各自阶段失败，stdout 无部分结果也不回显参数', () => {
  assertRejected(request(), /读取请求失败：.+不接受参数/, ['--must-not-appear'])
  assertRejected({ ...request(), permissions: 'must-not-appear' }, /装配契约失败：权限清单缺少/)
  assertRejected(
    { ...request(), operations: 'must-not-appear', schema: 'OrderDetailVo: {}' },
    /装配契约失败：只发现部分/,
  )
  const partial = generatedContract()
  partial.permissions = partial.permissions.replace('"system:order:create"', 'must-not-appear')
  assertRejected(request(partial), /装配契约失败：只发现部分/)
})
