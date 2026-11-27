import assert from 'node:assert/strict'
import test from 'node:test'

import { renderFields } from '../resource-render/fields.ts'
import { renderResourceAssets } from '../resource-render/index.mjs'
import { presentation } from '../resource-render/presentation.ts'
import { renderTransport } from '../resource-render/transport.ts'
import { fixture } from './fixtures/resource-render/builders.mjs'
import {
  dated,
  emptyEnum,
  field,
  importLabels,
  threshold,
} from './fixtures/resource-render/boundary-ir.mjs'
import {
  descriptors,
  execute,
  importsExist,
  lines,
} from './fixtures/resource-render/boundary-runtime.mjs'
import { commonOrder, order, wideOrder } from './fixtures/resource-render/order-ir.mjs'

const version = '1.3.0'
const assets = (resource) => renderResourceAssets([resource], version)
const joined = (generated) => generated.map((asset) => asset.content).join('')

test('宽模型 8/24/25/64/257/1000 字段完整恰一次、稳定重生成且所有 TS imports 存在', () => {
  for (const count of [8, 24, 25, 64, 257, 1000]) {
    const resource = wideOrder(count)
    const generated = assets(resource)
    assert.deepEqual(generated, assets(resource))
    assert.equal(new Set(generated.map((asset) => asset.path)).size, generated.length)
    for (const asset of generated) {
      assert.ok(lines(asset.content) <= (asset.path.endsWith('.vue') ? 600 : 300), asset.path)
    }
    assert.ok(importsExist(generated) > 0)
    const view = execute(resource, generated)
    descriptors(view, resource)
    const text = joined(generated)
    for (const item of resource.fields.filter((item) => item.usage.create || item.usage.update)) {
      assert.ok(text.includes(`  ${item.name}: ${item.typescript_type}`), item.name)
      assert.ok(text.includes(`record.${item.name}`), item.name)
    }
    for (const name of ['page.vue', 'registration.ts']) {
      assert.equal(
        generated.find((a) => a.path.endsWith(`/${name}`)).content,
        renderTransport(resource, version).get(name),
      )
    }
    assert.ok(text.includes('disabledOnEdit: true') && text.includes('editOnly: true'))
    if (count >= 12) assert.ok(text.includes("form.value_11 === '' ? null : form.value_11"))
    if (count >= 11) assert.ok(text.includes("form.value_10 === '' ? undefined : form.value_10"))
    if (count === 1000) {
      for (const stem of ['form', 'columns', 'query', 'form-fields']) {
        assert.ok(
          generated.some((a) => a.path.includes(`/${stem}/group-0-`)),
          stem,
        )
      }
      assert.throws(
        () => importsExist(generated.filter((a) => !a.path.endsWith('/form/part-0.ts'))),
        /引用缺失/,
      )
    }
  }
})

test('拆分只在超过 300 行后发生，覆盖 0..19 及精确 300/301 行', () => {
  const sizes = new Set()
  for (let count = 0; count < 20; count += 1) {
    const resource = wideOrder(count)
    const original = presentation(resource, version)
    const generated = renderFields(resource, version)
    const compact = lines(original) <= 300
    sizes.add(compact)
    if (compact) assert.deepEqual([...generated], [['fields.ts', original]])
    else {
      assert.ok(generated.size > 1)
      for (const source of generated.values()) assert.ok(lines(source) <= 300)
    }
  }
  assert.equal(sizes.size, 2)
  const resource = threshold()
  assert.equal(lines(presentation(resource, version)), 300)
  assert.deepEqual(
    [...renderFields(resource, version)],
    [['fields.ts', presentation(resource, version)]],
  )
  field(resource, 'value_1').validation.required = true
  assert.equal(lines(presentation(resource, version)), 301)
  assert.ok(renderFields(resource, version).size > 1)
  assert.ok(importsExist(assets(resource)) > 0)
})

test('单 leaf 的 columns/query/form-fields/options 文案及中英文 placeholder 原值不变', () => {
  const resource = importLabels()
  const name = field(resource, 'name')
  assert.ok(lines(presentation(resource, version)) > 300)
  const generated = assets(resource)
  assert.ok(importsExist(generated) > 0)
  for (const suffix of ['columns.ts', 'query.ts', 'form-fields.ts', 'options/status.ts']) {
    const source = generated.find((a) => a.path.endsWith(`/${suffix}`)).content
    assert.ok(
      source.includes(`label: translate("hello from '../path", "import { sample } from '../path")`),
    )
    assert.ok(!source.includes("hello from './path"))
  }
  assert.ok(!generated.some((a) => a.path.includes('/columns/')))
  const zh = execute(resource, generated)
  const en = execute(resource, generated, true)
  for (const [view, query, form] of [
    [zh, `请输入或选择${name.labels.zh_cn}`, `请输入${name.labels.zh_cn}`],
    [en, `Enter or select ${name.labels.en}`, `Enter ${name.labels.en}`],
  ]) {
    assert.equal(view.queryFields.find((f) => f.key === 'name').placeholder, query)
    assert.equal(view.formFields.find((f) => f.key === 'name').placeholder, form)
  }
})

test('1641 数值枚举和空表单递归分组，保留最后枚举值与全部 import', () => {
  const resource = emptyEnum()
  const generated = assets(resource)
  assert.ok(generated.some((a) => a.path.includes('/options/status/group-0')))
  assert.ok(joined(generated).includes('value: 1640'))
  assert.deepEqual(generated, assets(resource))
  assert.ok(importsExist(generated) > 0)
  const view = execute(resource, generated)
  descriptors(view, resource)
  assert.equal(view.formFields.length, 0)
  const options = view.columns.find((f) => f.key === 'status').options
  assert.deepEqual(
    Array.from(options, (o) => o.value),
    Array.from({ length: 1641 }, (_, i) => String(i))
      .sort()
      .map(Number),
  )
})

test('生成控件的创建专有、更新专有及可编辑状态保持准确投影', () => {
  const resource = commonOrder()
  field(resource, 'name').usage.update = false
  const kinds = {
    enabled: 'switch',
    due_on: 'date',
    happens_at: 'date_time',
    amount: 'text',
    metadata: 'json',
    note: 'textarea',
    count: 'number',
    status: 'radio',
  }
  for (const [name, kind] of Object.entries(kinds)) {
    const item = field(resource, name)
    for (const [create, update] of [
      [true, false],
      [false, true],
      [true, true],
    ]) {
      Object.assign(item.usage, { create, update })
      const generated = assets(resource)
      const view = execute(resource, generated)
      const control = view.formFields.find((f) => f.key === name)
      assert.equal(control.kind, kind)
      assert.equal(control.disabledOnEdit === true, create && !update)
      assert.equal(control.editOnly === true, update && !create)
    }
  }
})

test('常用类型生成对应控件，JSON 往返及展示保持不变', () => {
  const resource = commonOrder()
  const generated = assets(resource)
  assert.ok(importsExist(generated) > 0)
  const view = execute(resource, generated)
  assert.equal(view.columns.find((field) => field.key === 'metadata').display, 'json')
  const record = Object.fromEntries(
    resource.fields.map((f) => [f.name, f.value_type === 'json' ? { count: 2 } : 'text']),
  )
  const form = view.resource.editForm(record)
  assert.equal(form.metadata, JSON.stringify(record.metadata, null, 2))
  for (const action of ['create', 'update']) {
    assert.deepEqual(
      structuredClone(view.resource[`${action}Input`](form).metadata),
      record.metadata,
    )
  }
})

test('DateTime 仅无枚举且列表可见时在紧凑及拆分 fields/page 中生成 formatter', () => {
  for (const count of [0, 8])
    for (const visible of [false, true])
      for (const enumerated of [false, true]) {
        const resource = dated(count, visible, enumerated)
        const needed = visible && !enumerated
        const text = [...renderFields(resource, version).values()].join('')
        assert.equal(text.includes('formatDate'), needed)
        assert.equal(text.includes('formatDate: (value: string) => string'), needed)
        assert.equal(text.includes('format: formatDate'), needed)
        const page = renderTransport(resource, version).get('page.vue')
        assert.equal(page.includes('formatLocalizedDate'), needed)
        assert.ok(
          page.includes(
            needed ? 'Presentation(translate, formatLocalizedDate)' : 'Presentation(translate)',
          ),
        )
      }
})

test('Post/Notice/Device 保持单文件，bootstrap 元数据不改变前端输出', () => {
  const device = order()
  Object.assign(device, { name: 'device', pascal_name: 'Device' })
  for (const resource of [fixture('post'), fixture('notice'), device]) {
    assert.deepEqual(
      [...renderFields(resource, version)],
      [['fields.ts', presentation(resource, version)]],
    )
  }
  const resource = order()
  const first = assets(resource)
  resource.bootstrap_migration = false
  assert.deepEqual(assets(resource), first)
})
