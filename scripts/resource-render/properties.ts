import type { ResourceSource } from './format.ts'
import type { Resource, ResourceField } from './resource.ts'
import { enumEntries, enumValue, formWidget, quote, type EnumField, type Labels } from './values.ts'

export interface PresentationField extends ResourceField, EnumField {
  typescript_type: string
  labels: Labels
  validation: {
    required: boolean
    minimum: number | null
    maximum: number | null
  }
}

export interface PresentationResource extends Resource, ResourceSource {
  fields: readonly PresentationField[]
  access: {
    permissions: {
      list: string
      create: string
      update: string
      delete: string
    }
  }
}

const label = (field: PresentationField) =>
  `label: translate(${quote(field.labels.zh_cn)}, ${quote(field.labels.en)})`
const enter = (field: PresentationField) =>
  `translate(${quote(`请输入${field.labels.zh_cn}`)}, ${quote(`Enter ${field.labels.en}`)})`

export function queryProperties(field: PresentationField): string[] {
  const enumerated = Object.keys(field.enum_values).length > 0
  const properties = [
    `key: ${quote(field.name)}`,
    `kind: ${quote(enumerated ? 'select' : 'text')}`,
    label(field),
    `placeholder: translate(${quote(`请输入或选择${field.labels.zh_cn}`)}, ${quote(`Enter or select ${field.labels.en}`)})`,
  ]
  if (enumerated) properties.push(`options: ${field.name}Options`)
  return properties
}

export function columnProperties(field: PresentationField): string[] {
  const properties = [`key: ${quote(field.name)}`, label(field)]
  const positive = enumEntries(field).at(-1)
  if (positive) {
    properties.push(
      "display: 'status'",
      `options: ${field.name}Options`,
      `positiveValue: ${enumValue(positive[0], field)}`,
    )
  } else if (field.value_type === 'date_time') {
    properties.push("display: 'datetime'", 'format: formatDate')
  } else if (field.value_type === 'json') properties.push("display: 'json'")
  return properties
}

export function formProperties(field: PresentationField): string[] {
  const properties = [
    `key: ${quote(field.name)}`,
    `kind: ${quote(formWidget(field))}`,
    label(field),
  ]
  if (['text', 'textarea', 'date', 'date_time', 'json'].includes(field.widget)) {
    properties.push(`placeholder: ${enter(field)}`)
  }
  if (field.validation.required && !['switch', 'hidden'].includes(field.widget)) {
    properties.push(`requiredMessage: ${enter(field)}`)
  }
  if (field.widget === 'number') {
    if (field.validation.minimum != null) properties.push(`min: ${field.validation.minimum}`)
    if (field.validation.maximum != null) properties.push(`max: ${field.validation.maximum}`)
  }
  if (Object.keys(field.enum_values).length > 0) properties.push(`options: ${field.name}Options`)
  if (field.widget === 'json') {
    properties.push('invalidMessage: translate("请输入有效的 JSON", "Enter valid JSON")')
  }
  if (field.usage.create && !field.usage.update) properties.push('disabledOnEdit: true')
  if (field.usage.update && !field.usage.create) properties.push('editOnly: true')
  return properties
}

export function labels(resource: PresentationResource): string {
  const permissions = resource.access.permissions
  return (
    `  const permissions = {\n    list: ${quote(permissions.list)},\n    create: ${quote(permissions.create)},\n    update: ${quote(permissions.update)},\n    remove: ${quote(permissions.delete)},\n  } as const\n\n` +
    `  const labels = {\n    title: translate(${quote(resource.labels.zh_cn)}, ${quote(resource.labels.en)}),\n    add: translate("新增", "Add"),\n    edit: translate("编辑", "Edit"),\n    remove: translate("删除", "Delete"),\n    actions: translate("操作", "Actions"),\n    search: translate("搜索", "Search"),\n    reset: translate("重置", "Reset"),\n    confirm: translate("确定", "Confirm"),\n    cancel: translate("取消", "Cancel"),\n  }\n\n`
  )
}
