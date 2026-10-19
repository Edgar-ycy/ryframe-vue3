import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'

import { verifyContract } from './typecheck/contract.mjs'

const [frontend, root] = process.argv.slice(2)
const require = createRequire(path.join(frontend, 'package.json'))
const ts = require('typescript')
const resource = JSON.parse(fs.readFileSync(path.join(root, 'resource.json'), 'utf8'))
const { fields, pascal_name: pascal, name, api } = resource
const generated = `src/generated/resources/${name}`
verifyContract({ frontend, root, ts, fields, pascal, api, generated })
// 执行相同 TS 源码，核验聚合没有遗漏、重复、乱序或改变值类型。
const modules = new Map()
function load(file) {
  if (modules.has(file)) return modules.get(file).exports
  const module = { exports: {} }
  modules.set(file, module)
  const source = fs.readFileSync(file, 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const localRequire = (specifier) => {
    const target = specifier.startsWith('@/')
      ? path.join(root, 'src', specifier.slice(2))
      : path.resolve(path.dirname(file), specifier)
    return load(fs.existsSync(`${target}.ts`) ? `${target}.ts` : path.join(target, 'index.ts'))
  }
  vm.runInThisContext(`(function(require, module, exports) { ${code}\n})`, { filename: file })(
    localRequire,
    module,
    module.exports,
  )
  return module.exports
}
const factory = load(path.join(root, generated, 'fields.ts'))[`create${pascal}Presentation`]
const zh = factory(
  (zh) => zh,
  (value) => `日期:${value}`,
)
const en = factory(
  (_zh, en) => en,
  (value) => `Date:${value}`,
)
const formFields = fields.filter((field) => field.usage.create || field.usage.update)
const queryFields = fields.filter((field) => field.usage.filter && field.widget !== 'hidden')
assert.deepEqual(
  Array.from(zh.columns, (field) => field.key),
  fields.filter((field) => field.usage.list).map((field) => field.name),
)
assert.deepEqual(
  Array.from(zh.formFields, (field) => field.key),
  formFields.map((field) => field.name),
)
assert.deepEqual(
  Array.from(zh.queryFields, (field) => field.key),
  queryFields.map((field) => field.name),
)
const form = zh.resource.emptyForm()
assert.deepEqual(
  Object.keys(form),
  formFields.map((field) => field.name),
)
assert.deepEqual(
  Object.keys(zh.resource.createInput(form)),
  fields.filter((field) => field.usage.create).map((field) => field.name),
)
assert.deepEqual(
  Object.keys(zh.resource.updateInput(form)),
  fields.filter((field) => field.usage.update).map((field) => field.name),
)
const sampleRecordValue = (field) => {
  if (field.nullable) return null
  if (field.wire_type === 'string') return '12345678901234567890.125000'
  if (field.value_type === 'bool') return true
  if (field.value_type === 'date') return '2026-10-18'
  if (field.value_type === 'date_time') return '2026-10-18T08:30:00.000Z'
  if (field.value_type === 'json') return { key: 'value', count: 2 }
  if (['string'].includes(field.value_type)) return 'text'
  return 1
}
const recordValues = Object.fromEntries(
  fields.map((field) => [field.name, sampleRecordValue(field)]),
)
const editForm = zh.resource.editForm(recordValues)
for (const field of formFields) {
  if (field.value_type === 'json') {
    const recordValue = recordValues[field.name]
    assert.equal(
      editForm[field.name],
      recordValue === null ? '' : JSON.stringify(recordValue, null, 2),
    )
  } else {
    assert.equal(editForm[field.name], recordValues[field.name])
  }
}
for (const field of queryFields.filter((field) => field.value_type === 'string'))
  assert.equal(zh.resource.initialQuery()[field.name], '')
for (const field of fields) {
  const column = zh.columns.find((column) => column.key === field.name)
  const english = en.columns.find((column) => column.key === field.name)
  if (column) {
    assert.equal(column.label, field.labels.zh_cn)
    assert.equal(english.label, field.labels.en)
    if (Object.keys(field.enum_values).length) {
      const entries = Object.entries(field.enum_values).sort(([a], [b]) =>
        a < b ? -1 : a > b ? 1 : 0,
      )
      assert.deepEqual(
        Array.from(column.options, (option) => option.label),
        entries.map(([, label]) => label.zh_cn),
      )
      const enumValue = (key) =>
        field.wire_type === 'string'
          ? key
          : field.value_type === 'bool'
            ? key === 'true'
            : Number(key)
      assert.deepEqual(
        Array.from(column.options, (option) => option.value),
        entries.map(([key]) => enumValue(key)),
      )
      assert.equal(column.positiveValue, enumValue(entries.at(-1)[0]))
    } else if (field.value_type === 'date_time') assert.equal(column.format('2026'), '日期:2026')
  }
  if (!(field.usage.create || field.usage.update)) continue
  const control = zh.formFields.find((control) => control.key === field.name)
  const englishControl = en.formFields.find((control) => control.key === field.name)
  assert.equal(control.label, field.labels.zh_cn)
  assert.equal(englishControl.label, field.labels.en)
  if (['text', 'textarea', 'date', 'date_time', 'json'].includes(field.widget)) {
    assert.equal(control.placeholder, `请输入${field.labels.zh_cn}`)
    assert.equal(englishControl.placeholder, `Enter ${field.labels.en}`)
  }
  assert.equal(control.disabledOnEdit === true, field.usage.create && !field.usage.update)
  assert.equal(control.editOnly === true, field.usage.update && !field.usage.create)
  const expectedKind =
    field.value_type === 'bool'
      ? 'switch'
      : field.value_type === 'date'
        ? 'date'
        : field.value_type === 'date_time'
          ? 'date_time'
          : field.value_type === 'json'
            ? 'json'
            : Object.keys(field.enum_values).length
              ? 'radio'
              : field.widget === 'number'
                ? 'number'
                : field.widget === 'textarea'
                  ? 'textarea'
                  : 'text'
  assert.equal(control.kind, expectedKind)
  if (field.value_type === 'json') {
    assert.equal(control.invalidMessage, '请输入有效的 JSON')
    const conversion = recordValues[field.name]
    for (const action of ['create', 'update']) {
      if (!field.usage[action]) continue
      const converted = zh.resource[`${action}Input`](editForm)
      assert.deepEqual(converted[field.name], conversion)
    }
  }
  if (['decimal', 'i64', 'u64'].includes(field.value_type) && field.wire_type === 'string') {
    assert.equal(form[field.name], '')
    const precise = { ...form, [field.name]: '18446744073709551615.125000' }
    for (const action of ['create', 'update']) {
      if (!field.usage[action]) continue
      const convert = zh.resource[`${action}Input`]
      assert.equal(convert(precise)[field.name], precise[field.name])
      assert.equal(
        convert(form)[field.name],
        field.nullable ? null : field.usage[`${action}_optional`] ? undefined : '',
      )
    }
  }
}
for (const field of queryFields) {
  const zhQuery = zh.queryFields.find((control) => control.key === field.name)
  const enQuery = en.queryFields.find((control) => control.key === field.name)
  assert.equal(zhQuery.label, field.labels.zh_cn)
  assert.equal(enQuery.label, field.labels.en)
  assert.equal(zhQuery.placeholder, `请输入或选择${field.labels.zh_cn}`)
  assert.equal(enQuery.placeholder, `Enter or select ${field.labels.en}`)
}
const importLikeField = fields.find((field) => field.labels.zh_cn === "hello from '../path")
if (importLikeField) {
  const column = zh.columns.find((column) => column.key === importLikeField.name)
  assert.deepEqual(
    Buffer.from(column.label, 'utf8'),
    Buffer.from(importLikeField.labels.zh_cn, 'utf8'),
  )
}
assert.deepEqual(
  { ...zh.permissions },
  {
    list: resource.access.permissions.list,
    create: resource.access.permissions.create,
    update: resource.access.permissions.update,
    remove: resource.access.permissions.delete,
  },
)
assert.equal(zh.labels.title, resource.labels.zh_cn)
assert.equal(en.labels.title, resource.labels.en)
assert.equal(zh.resource.recordId(recordValues), String(recordValues.id))
const visibleString = (field) =>
  field.value_type === 'string' && (field.usage.read || field.usage.list)
const label =
  fields.find((field) => field.name === 'name' && visibleString(field)) ??
  fields.find(visibleString)
assert.ok(
  zh.resource.messages
    .deleteConfirm(recordValues)
    .includes(String(recordValues[label?.name ?? 'id'])),
)
console.log(`TypeScript 严格类型及运行时验证通过：${formFields.length} 个表单字段`)
