import { readFileSync } from 'node:fs'

import { editValue, formInput, quote, tsDefault } from './values.mjs'

const template = readFileSync(new URL('./resource.ts.tpl', import.meta.url), 'utf8')

function renderTemplate(values) {
  return template.replace(/\{\{|\}\}|\{([a-z_]+)(:\?)?\}/g, (token, key, quoted) => {
    if (token === '{{') return '{'
    if (token === '}}') return '}'
    if (!Object.hasOwn(values, key)) throw new Error(`CRUD 模板缺少参数 ${key}`)
    return quoted ? quote(values[key]) : values[key]
  })
}

export function resourceDefinition(resource, mappings) {
  const recordId =
    [...resource.primary_key].reverse().find((name) => name !== resource.tenant_field) ?? 'id'
  const readableString = (field) =>
    field.value_type === 'string' && (field.usage.read || field.usage.list)
  const label =
    resource.fields.find((field) => field.name === 'name' && readableString(field)) ??
    resource.fields.find(readableString)
  return renderTemplate({
    name: resource.name,
    storage: resource.storage === 'tenant_data' ? '    storage: "tenant_data",\n' : '',
    pascal: resource.pascal_name,
    zh: resource.labels.zh_cn,
    en: resource.labels.en,
    record_id: recordId,
    record_label: label?.name ?? recordId,
    ...mappings,
  })
}

export function crudResource(resource, formFields) {
  const lines = (fields, value) =>
    fields.map((field) => `      ${field.name}: ${value(field)},\n`).join('')
  return resourceDefinition(resource, {
    query_defaults: lines(
      resource.fields.filter(
        (field) => field.usage.filter && field.widget !== 'hidden' && field.value_type === 'string',
      ),
      () => "''",
    ),
    empty_form: lines(formFields, tsDefault),
    edit_form: lines(formFields, editValue),
    create_input: lines(
      resource.fields.filter((field) => field.usage.create),
      (field) => formInput(field, field.usage.create_optional),
    ),
    update_input: lines(
      resource.fields.filter((field) => field.usage.update),
      (field) => formInput(field, field.usage.update_optional),
    ),
  })
}
