import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { renderFields } from '../resource-render/fields.mjs'
import { renderTransport } from '../resource-render/transport.mjs'
import { common, empty, fixture, labels, wide } from './fixtures/resource-render/builders.mjs'

const frontend = fileURLToPath(new URL('../../', import.meta.url))
const harness = fileURLToPath(new URL('../resource-render/typecheck.mjs', import.meta.url))
const parent = path.join(frontend, '.local-tests', 'resource-render-typecheck')
fs.mkdirSync(parent, { recursive: true })
const evidence = fs.mkdtempSync(path.join(parent, 'run-'))
const receipts = []

function run(name, resource, mutate = () => {}) {
  const root = path.join(evidence, name)
  const assets = new Map([
    ...renderFields(resource, '1.3.0'),
    ...renderTransport(resource, '1.3.0'),
  ])
  for (const [relative, source] of assets) {
    assert.ok(source.trimEnd().split('\n').length <= 300, relative)
    const file = path.join(root, 'src', 'generated', 'resources', resource.name, relative)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, source)
  }
  fs.writeFileSync(path.join(root, 'resource.json'), JSON.stringify(resource, null, 2))
  mutate(root, resource, assets)
  const args = [harness, frontend, root]
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' })
  assert.ifError(result.error)
  fs.writeFileSync(path.join(root, 'stdout.log'), result.stdout)
  fs.writeFileSync(path.join(root, 'stderr.log'), result.stderr)
  receipts.push({
    name,
    root,
    executable: process.execPath,
    nodeVersion: process.version,
    args,
    pid: result.pid,
    status: result.status,
    signal: result.signal,
  })
  fs.writeFileSync(path.join(evidence, 'receipts.json'), JSON.stringify(receipts, null, 2))
  return { ...result, root }
}

function replaceGenerated(root, resource, assets, before, after) {
  let replacements = 0
  for (const relative of assets.keys()) {
    const file = path.join(root, 'src', 'generated', 'resources', resource.name, relative)
    const source = fs.readFileSync(file, 'utf8')
    if (!source.includes(before)) continue
    fs.writeFileSync(file, source.replaceAll(before, after))
    replacements += 1
  }
  assert.ok(replacements > 0, `未找到待注入位置：${before}`)
}

for (const [name, resource] of [
  ['post', fixture('post')],
  ['notice', fixture('notice')],
  ['wide', wide(1000)],
  ['empty', empty()],
  ['labels', labels()],
  ['common', common()],
]) {
  test(`${name} 生成资源通过真实 strict TypeScript 及 VM 验证`, () => {
    const result = run(name, resource)
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /TypeScript 严格类型及运行时验证通过/)
  })
}

for (const [name, injection, diagnostic] of [
  ['strict-null', 'export const invalid: string = null', /TS2322/],
  ['unused-local', 'const unusedLocal = 1', /TS6133/],
  ['unused-parameter', 'export function unused(unusedParameter: string) {}', /TS6133/],
]) {
  test(`${name} 仍被严格编译选项拒绝`, () => {
    const result = run(name, fixture('post'), (root, resource) => {
      fs.appendFileSync(
        path.join(root, 'src', 'generated', 'resources', resource.name, 'fields.ts'),
        `\n${injection}\n`,
      )
    })
    assert.equal(result.status, 1, result.stderr)
    assert.match(result.stderr, diagnostic)
  })
}

test('Decimal、i64、u64 的三个 @ts-expect-error 均必须生效', () => {
  const result = run('precision-negative', wide(3), (root, resource, assets) => {
    for (const name of ['value_0', 'value_1', 'value_2']) {
      replaceGenerated(root, resource, assets, `${name}: string`, `${name}: string | number`)
    }
  })
  assert.equal(result.status, 1, result.stderr)
  assert.equal((result.stderr.match(/TS2578:/g) ?? []).length, 3, result.stderr)
})

for (const [name, before, after] of [
  ['column-order', '    columns,', '    columns: [...columns].reverse(),'],
  ['localized-title', 'title: translate(', "title: '错误' + translate("],
]) {
  test(`${name} 类型正确时仍被 VM 行为断言拒绝`, () => {
    const result = run(name, fixture('post'), (root, resource, assets) => {
      replaceGenerated(root, resource, assets, before, after)
    })
    assert.equal(result.status, 1, result.stderr)
    assert.match(result.stderr, /AssertionError/)
    assert.doesNotMatch(result.stderr, /error TS\d+/)
  })
}

test.after(() => console.log(`类型及运行时验收收据：${evidence}`))
