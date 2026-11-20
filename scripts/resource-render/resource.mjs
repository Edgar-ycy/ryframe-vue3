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

function revisionMappings(resource) {
  if (resource.revision_field == null) {
    return { revision_guard: '', revision_edit: '', revision_update: '' }
  }
  if (
    resource.revision_field !== 'revision' ||
    resource.fields.some(
      (field) =>
        field.name === 'expected_revision' ||
        (field.name === 'revision' && (field.usage.create || field.usage.update)),
    )
  ) {
    throw new Error('revision_field 必须声明不由表单编辑的 revision')
  }
  return {
    revision_guard: `  function expectedRevision(form: Readonly<${resource.pascal_name}Form>): string {
    const revision = form.revision
    if (typeof revision !== 'string' || !revision) {
      throw new Error(translate("无法确认记录版本，请重新打开编辑", "The record version could not be verified. Reopen the editor."))
    }
    return revision
  }

`,
    revision_edit: '      revision: record.revision,\n',
    revision_update: '      expected_revision: expectedRevision(form),\n',
  }
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
    ...revisionMappings(resource),
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
