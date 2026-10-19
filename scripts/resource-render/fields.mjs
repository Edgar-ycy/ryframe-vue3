import { hasDateColumn } from './format.mjs'
import { Modules } from './modules.mjs'
import { presentation } from './presentation.mjs'
import { labels } from './properties.mjs'
import { resourceDefinition } from './resource.mjs'
import { splitForm } from './split-form.mjs'
import { splitPresentation } from './split-presentation.mjs'

function resourceModule(resource) {
  const pascal = resource.pascal_name
  const imports = `import { defineFlatCrudResource } from '@/components/business/flat-crud'\nimport { emptyPageResponse } from '@/shared/http/types'\nimport {\n  create${pascal},\n  delete${pascal},\n  get${pascal},\n  list${pascal},\n  update${pascal},\n  type ${pascal}CreateInput,\n  type ${pascal}UpdateInput,\n  type ${pascal}Query,\n  type ${pascal}Record,\n} from './api'\nimport type { ${pascal}Form } from './model'\nimport type { Translate } from './common'\nimport { emptyForm, editForm, createInput, updateInput } from './form'\nimport { queryDefaults } from './query-defaults'\n\n`
  const definition = resourceDefinition(resource, {
    query_defaults: '      ...queryDefaults(),\n',
    empty_form: '      ...emptyForm(),\n',
    edit_form: '      ...editForm(record),\n',
    create_input: '      ...createInput(form),\n',
    update_input: '      ...updateInput(form),\n',
  })
  return imports + definition.replace('function ', 'export function ')
}

function presentationModule(resource) {
  const pascal = resource.pascal_name
  const name = resource.name
  let output = `import type {\n  FlatCrudColumn,\n  FlatCrudFormField,\n  FlatCrudLabels,\n  FlatCrudPermissions,\n  FlatCrudQueryField,\n} from '@/components/business/flat-crud'\nimport type { ${pascal}Query, ${pascal}Record } from './api'\nimport type { ${pascal}Form } from './model'\nimport type { Translate } from './common'\nimport { columns } from './columns'\nimport { formFields } from './form-fields'\nimport { queryFields } from './query'\nimport { ${name}Resource } from './resource'\n\nexport type { ${pascal}Form } from './model'\n\nexport interface ${pascal}Presentation {\n  columns: readonly FlatCrudColumn<${pascal}Record>[]\n  formFields: readonly FlatCrudFormField<${pascal}Form>[]\n  labels: FlatCrudLabels\n  permissions: FlatCrudPermissions\n  queryFields: readonly FlatCrudQueryField<${pascal}Query>[]\n  resource: ReturnType<typeof ${name}Resource>\n}\n\n`
  const date = hasDateColumn(resource)
  output += `export function create${pascal}Presentation(\n  translate: Translate,\n${date ? '  formatDate: (value: string) => string,\n' : ''}): ${pascal}Presentation {\n`
  output += labels(resource)
  return (
    output +
    `  return {\n    columns: columns(translate${date ? ', formatDate' : ''}),\n    formFields: formFields(translate),\n    labels,\n    permissions,\n    queryFields: queryFields(translate),\n    resource: ${name}Resource(translate),\n  }\n}\n`
  )
}

export function renderFields(resource, version) {
  const flat = presentation(resource, version)
  if (flat.replace(/\n$/, '').split('\n').length <= 300) return new Map([['fields.ts', flat]])
  const modules = new Modules(resource, version)
  modules.add('common.ts', 'export type Translate = (zhCN: string, en: string) => string\n')
  splitForm(modules)
  splitPresentation(modules)
  modules.add('resource.ts', resourceModule(resource))
  modules.add('fields.ts', presentationModule(resource))
  return modules.assets
}
