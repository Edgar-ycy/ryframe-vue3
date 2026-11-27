import { hasDateColumn, header } from './format.mjs'
import { columnProperties, formProperties, labels, queryProperties } from './properties.mjs'
import { crudResource } from './resource.ts'
import { enumEntries, enumValue, formType, objectBlock, quote } from './values.ts'

export function presentation(resource, version) {
  const pascal = resource.pascal_name
  const formFields = resource.fields.filter((field) => field.usage.create || field.usage.update)
  let output = header(resource, version)
  output +=
    "import {\n  defineFlatCrudResource,\n  type FlatCrudColumn,\n  type FlatCrudFormField,\n  type FlatCrudLabels,\n  type FlatCrudPermissions,\n  type FlatCrudQueryField,\n} from '@/components/business/flat-crud'\n"
  output += `import {\n  create${pascal},\n  delete${pascal},\n  get${pascal},\n  list${pascal},\n  update${pascal},\n  type ${pascal}CreateInput,\n  type ${pascal}Query,\n  type ${pascal}Record,\n  type ${pascal}UpdateInput,\n} from './api'\nimport { emptyPageResponse } from '@/shared/http/types'\n\n`
  output += `export interface ${pascal}Form {\n`
  for (const field of formFields) output += `  ${field.name}: ${formType(field)}\n`
  if (resource.revision_field != null)
    output += `  readonly revision?: ${pascal}Record['revision']\n`
  output += '}\n\n'
  const dateParameter = hasDateColumn(resource) ? '  formatDate: (value: string) => string,\n' : ''
  output += `export interface ${pascal}Presentation {\n  columns: readonly FlatCrudColumn<${pascal}Record>[]\n  formFields: readonly FlatCrudFormField<${pascal}Form>[]\n  labels: FlatCrudLabels\n  permissions: FlatCrudPermissions\n  queryFields: readonly FlatCrudQueryField<${pascal}Query>[]\n  resource: ReturnType<typeof ${resource.name}Resource>\n}\n\ntype Translate = (zhCN: string, en: string) => string\n\nexport function create${pascal}Presentation(\n  translate: Translate,\n${dateParameter}): ${pascal}Presentation {\n`
  for (const field of resource.fields.filter(
    (field) => Object.keys(field.enum_values).length > 0,
  )) {
    output += `  const ${field.name}Options = [\n`
    for (const [value, label] of enumEntries(field)) {
      output += objectBlock([
        `label: translate(${quote(label.zh_cn)}, ${quote(label.en)})`,
        `value: ${enumValue(value, field)}`,
      ])
    }
    output += '  ] as const\n\n'
  }
  output += labels(resource)
  output += '  const queryFields = [\n'
  for (const field of resource.fields.filter(
    (field) => field.usage.filter && field.widget !== 'hidden',
  )) {
    output += objectBlock(queryProperties(field))
  }
  output += `  ] as const satisfies readonly FlatCrudQueryField<${pascal}Query>[]\n\n`
  output += '  const columns = [\n'
  for (const field of resource.fields.filter((field) => field.usage.list)) {
    output += objectBlock(columnProperties(field))
  }
  output += `  ] as const satisfies readonly FlatCrudColumn<${pascal}Record>[]\n\n`
  output += '  const formFields = [\n'
  for (const field of formFields) output += objectBlock(formProperties(field))
  output += `  ] as const satisfies readonly FlatCrudFormField<${pascal}Form>[]\n\n  return {\n    columns,\n    formFields,\n    labels,\n    permissions,\n    queryFields,\n    resource: ${resource.name}Resource(translate),\n  }\n}\n\n`
  return output + crudResource(resource, formFields)
}
