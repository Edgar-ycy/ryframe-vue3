import { editValue, formInput, quote, tsDefault } from './values.ts'
import type { FieldValue, Labels, Widget } from './values.ts'

interface ResourceField extends FieldValue {
  widget: Widget
  usage: {
    create: boolean
    create_optional: boolean
    update: boolean
    update_optional: boolean
    read: boolean
    list: boolean
    filter: boolean
  }
}

interface Resource {
  name: string
  pascal_name: string
  storage: 'control_row' | 'tenant_data'
  tenant_field: string | null
  primary_key: readonly string[]
  revision_field?: string | null
  labels: Labels
  fields: readonly ResourceField[]
}

interface FormMappings {
  query_defaults: string
  empty_form: string
  edit_form: string
  create_input: string
  update_input: string
}

function revisionMappings(resource: Resource) {
  if (resource.revision_field == null) {
    return { guard: '', edit: '', update: '' }
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
    guard: `  function expectedRevision(form: Readonly<${resource.pascal_name}Form>): string {
    const revision = form.revision
    if (typeof revision !== 'string' || !revision) {
      throw new Error(translate("无法确认记录版本，请重新打开编辑", "The record version could not be verified. Reopen the editor."))
    }
    return revision
  }

`,
    edit: '      revision: record.revision,\n',
    update: '      expected_revision: expectedRevision(form),\n',
  }
}

export function resourceDefinition(resource: Resource, mappings: FormMappings): string {
  const { name, pascal_name: pascal, labels, fields } = resource
  const recordId =
    [...resource.primary_key].reverse().find((name) => name !== resource.tenant_field) ?? 'id'
  const readableString = (field: ResourceField) =>
    field.value_type === 'string' && (field.usage.read || field.usage.list)
  const label =
    fields.find((field) => field.name === 'name' && readableString(field)) ??
    fields.find(readableString)
  const recordLabel = label?.name ?? recordId
  const storage = resource.storage === 'tenant_data' ? '    storage: "tenant_data",\n' : ''
  const revision = revisionMappings(resource)
  return `function ${name}Resource(translate: Translate) {
${revision.guard}  return defineFlatCrudResource<
    ${pascal}Record,
    ${pascal}Query,
    ${pascal}Form,
    ${pascal}CreateInput,
    ${pascal}UpdateInput
  >({
${storage}    key: ${quote(name)},
    initialQuery: (): ${pascal}Query => ({
      page: 1,
      page_size: 10,
${mappings.query_defaults}    }),
    emptyForm: (): ${pascal}Form => ({
${mappings.empty_form}    }),
    editForm: record => ({
${mappings.edit_form}${revision.edit}    }),
    createInput: form => ({
${mappings.create_input}    }),
    updateInput: form => ({
${mappings.update_input}${revision.update}    }),
    recordId: record => String(record.${recordId}),
    messages: {
      addSuccess: translate("新增成功", "Created"),
      addTitle: translate("新增${labels.zh_cn}", "Add ${labels.en}"),
      deleteConfirm: record => translate(
        \`确定删除 \${String(record.${recordLabel})} 吗？\`,
        \`Delete \${String(record.${recordLabel})}?\`,
      ),
      deleteSuccess: translate("删除成功", "Deleted"),
      detailMissing: translate("资源不存在", "Resource not found"),
      editTitle: translate("编辑${labels.zh_cn}", "Edit ${labels.en}"),
      updateSuccess: translate("更新成功", "Updated"),
      warningTitle: translate("提示", "Warning"),
    },
    adapter: {
      async list(query, signal) {
        const response = await list${pascal}({ ...query }, signal)
        return response.data ?? emptyPageResponse<${pascal}Record>(query)
      },
      async detail(id, signal) {
        const response = await get${pascal}(id, signal)
        if (!response.data) throw new Error(translate("资源不存在", "Resource not found"))
        return response.data
      },
      async create(input) { await create${pascal}(input) },
      async update(id, input) { await update${pascal}(id, input) },
      async remove(id) { await delete${pascal}(id) },
    },
  })
}
`
}

export function crudResource(resource: Resource, formFields: readonly ResourceField[]): string {
  const lines = (fields: readonly ResourceField[], value: (field: ResourceField) => string) =>
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
