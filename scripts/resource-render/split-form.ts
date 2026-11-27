import { chunks, type Modules } from './modules.ts'
import type { PresentationField, PresentationResource } from './properties.ts'
import { editValue, formInput, formType, tsDefault } from './values.ts'

function formPart(resource: PresentationResource, fields: readonly PresentationField[]): string {
  const pascal = resource.pascal_name
  let output = `import type {\n  ${pascal}CreateInput,\n  ${pascal}UpdateInput,\n  ${pascal}Record,\n} from '../api'\n\ninterface FormPart {\n`
  for (const field of fields) output += `  ${field.name}: ${formType(field)}\n`
  output += '}\n'
  for (const mode of ['empty', 'edit', 'create', 'update'] as const) {
    const [name, parameter, result] = {
      empty: ['emptyForm', '', 'FormPart'],
      edit: ['editForm', `record: ${pascal}Record`, 'FormPart'],
      create: [
        'createInput',
        'form: Readonly<FormPart>',
        `Pick<${pascal}CreateInput, keyof FormPart & keyof ${pascal}CreateInput>`,
      ],
      update: [
        'updateInput',
        'form: Readonly<FormPart>',
        `Pick<${pascal}UpdateInput, keyof FormPart & keyof ${pascal}UpdateInput>`,
      ],
    }[mode]
    const selected = fields.filter(
      (field) => mode === 'empty' || mode === 'edit' || field.usage[mode],
    )
    const properties = selected
      .map((field) => {
        const value =
          mode === 'empty'
            ? tsDefault(field)
            : mode === 'edit'
              ? editValue(field)
              : formInput(field, field.usage[`${mode}_optional`])
        return `    ${field.name}: ${value},\n`
      })
      .join('')
    const args = properties === '' && parameter !== '' ? `_${parameter}` : parameter
    output += `\nexport function ${name}(${args}): ${result} {\n  return {\n${properties}  }\n}\n`
  }
  return output
}

function queryDefaults(modules: Modules<PresentationResource>): void {
  const fields = modules.resource.fields.filter(
    (field) => field.usage.filter && field.widget !== 'hidden' && field.value_type === 'string',
  )
  const leaves = chunks(fields, 100).map((fields) => {
    const properties = fields.map((field) => `    ${field.name}: '' as const,\n`).join('')
    return `export function queryDefaults() {\n  return {\n${properties}  }\n}\n`
  })
  if (leaves.length === 0) leaves.push('export function queryDefaults() {\n  return {}\n}\n')
  modules.tree(
    'query-defaults',
    leaves,
    [{ name: 'queryDefaults', parameters: '', arguments: '', result: '', array: false }],
    '',
  )
}

export function splitForm(modules: Modules<PresentationResource>): void {
  const resource = modules.resource
  const fields = resource.fields.filter((field) => field.usage.create || field.usage.update)
  const leaves = chunks(fields, 24).map((fields) => formPart(resource, fields))
  if (leaves.length === 0) leaves.push(formPart(resource, []))
  const pascal = resource.pascal_name
  const form = `form: Readonly<${pascal}Form>`
  modules.tree(
    'form',
    leaves,
    [
      { name: 'emptyForm', parameters: '', arguments: '', result: '', array: false },
      {
        name: 'editForm',
        parameters: `record: ${pascal}Record`,
        arguments: 'record',
        result: '',
        array: false,
      },
      { name: 'createInput', parameters: form, arguments: 'form', result: '', array: false },
      { name: 'updateInput', parameters: form, arguments: 'form', result: '', array: false },
    ],
    `import type { ${pascal}Record } from './api'\nimport type { ${pascal}Form } from './model'\n`,
  )
  modules.add(
    'model.ts',
    resource.revision_field == null
      ? `import type { emptyForm } from './form'\n\nexport type ${pascal}Form = ReturnType<typeof emptyForm>\n`
      : `import type { ${pascal}Record } from './api'\nimport type { emptyForm } from './form'\n\nexport type ${pascal}Form = ReturnType<typeof emptyForm> & {\n  readonly revision?: ${pascal}Record['revision']\n}\n`,
  )
  queryDefaults(modules)
}
