import { hasDateColumn } from './format.mjs'
import { chunks } from './modules.mjs'
import { columnProperties, formProperties, queryProperties } from './properties.mjs'
import { enumEntries, enumValue, objectBlock, quote } from './values.ts'

const descriptors = {
  query: ['queryFields', 'Query', 'FlatCrudQueryField'],
  columns: ['columns', 'Record', 'FlatCrudColumn'],
  'form-fields': ['formFields', 'Form', 'FlatCrudFormField'],
}

function part(resource, kind, fields) {
  const [name, model, flatType] = descriptors[kind]
  const pascal = resource.pascal_name
  const modelPath = model === 'Form' ? 'model' : 'api'
  let output = `import type { ${flatType} } from '@/components/business/flat-crud'\nimport type { ${pascal}${model} } from '../${modelPath}'\nimport type { Translate } from '../common'\n`
  for (const field of fields.filter((field) => Object.keys(field.enum_values).length > 0)) {
    output += `import { options as ${field.name}Options } from '../options/${field.name}'\n`
  }
  let body = ''
  for (const field of fields) {
    const properties = {
      query: queryProperties,
      columns: columnProperties,
      'form-fields': formProperties,
    }[kind](field)
    body += objectBlock(
      properties.map((property) =>
        Object.keys(field.enum_values).length > 0 && property.startsWith('options:')
          ? `${property}(translate)`
          : property,
      ),
    )
  }
  const translate = fields.length === 0 ? '_translate' : 'translate'
  const date =
    kind === 'columns' && hasDateColumn(resource)
      ? `, ${body.includes('format: formatDate') ? 'formatDate' : '_formatDate'}: (value: string) => string`
      : ''
  return (
    output +
    `\nexport function ${name}(${translate}: Translate${date}): readonly ${flatType}<${pascal}${model}>[] {\n  return [\n${body}  ]\n}\n`
  )
}

function options(modules) {
  for (const field of modules.resource.fields.filter(
    (field) => Object.keys(field.enum_values).length > 0,
  )) {
    const leaves = chunks(enumEntries(field), 40).map((entries) => {
      const body = entries
        .map(([value, labels]) =>
          objectBlock([
            `label: translate(${quote(labels.zh_cn)}, ${quote(labels.en)})`,
            `value: ${enumValue(value, field)}`,
          ]),
        )
        .join('')
      return `import type { FlatCrudOption } from '@/components/business/flat-crud'\nimport type { Translate } from '../../common'\n\nexport function options(translate: Translate): readonly FlatCrudOption[] {\n  return [\n${body}  ]\n}\n`
    })
    modules.tree(
      `options/${field.name}`,
      leaves,
      [
        {
          name: 'options',
          parameters: 'translate: Translate',
          arguments: 'translate',
          result: ': readonly FlatCrudOption[]',
          array: true,
        },
      ],
      "import type { FlatCrudOption } from '@/components/business/flat-crud'\nimport type { Translate } from '../common'\n",
    )
  }
}

export function splitPresentation(modules) {
  options(modules)
  const resource = modules.resource
  const pascal = resource.pascal_name
  for (const kind of ['query', 'columns', 'form-fields']) {
    const fields = resource.fields.filter((field) =>
      kind === 'query'
        ? field.usage.filter && field.widget !== 'hidden'
        : kind === 'columns'
          ? field.usage.list
          : field.usage.create || field.usage.update,
    )
    const leaves = chunks(fields, 16).map((fields) => part(resource, kind, fields))
    if (leaves.length === 0) leaves.push(part(resource, kind, []))
    const [name, model, flatType] = descriptors[kind]
    const modelPath = model === 'Form' ? 'model' : 'api'
    const date = kind === 'columns' && hasDateColumn(resource)
    modules.tree(
      kind,
      leaves,
      [
        {
          name,
          parameters: date
            ? 'translate: Translate, formatDate: (value: string) => string'
            : 'translate: Translate',
          arguments: date ? 'translate, formatDate' : 'translate',
          result: `: readonly ${flatType}<${pascal}${model}>[]`,
          array: true,
        },
      ],
      `import type { ${flatType} } from '@/components/business/flat-crud'\nimport type { ${pascal}${model} } from './${modelPath}'\nimport type { Translate } from './common'\n`,
    )
  }
}
