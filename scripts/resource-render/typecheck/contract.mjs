import fs from 'node:fs'
import path from 'node:path'

export function verifyContract({ frontend, root, ts, fields, pascal, api, generated }) {
  const hasDateColumn = fields.some(
    (field) =>
      field.usage.list &&
      field.value_type === 'date_time' &&
      !Object.keys(field.enum_values).length,
  )
  const write = (relative, content) => {
    const file = path.join(root, relative)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, content)
  }
  const copy = (relative) =>
    write(`src/${relative}`, fs.readFileSync(path.join(frontend, 'src', relative), 'utf8'))
  // 直接使用当前前端的公开类型和资源构造器，避免测试替身放宽约束。
  for (const file of [
    'components/business/flat-crud/model.ts',
    'components/business/flat-crud/resource.ts',
    'shared/http/types.ts',
    'api/contract.ts',
  ])
    copy(file)
  write(
    'src/components/business/flat-crud/index.ts',
    "export * from './model'\nexport * from './resource'\n",
  )
  const properties = (predicate, optional) =>
    fields
      .filter(predicate)
      .map((field) => {
        const suffix = optional(field) ? '?' : ''
        return `  ${field.name}${suffix}: ${field.typescript_type}`
      })
      .join('\n')
  const record = properties(
    (field) => field.usage.read || field.usage.list,
    () => false,
  )
  const query = properties(
    (field) => field.usage.filter,
    () => true,
  )
  const create = properties(
    (field) => field.usage.create,
    (field) => field.usage.create_optional,
  )
  const update = properties(
    (field) => field.usage.update,
    (field) => field.usage.update_optional,
  )
  const operations = api.operations
  write(
    'src/api/generated/schema.ts',
    `
export interface RecordVo {\n${record}\n}
export interface Query { page?: number; page_size?: number;\n${query}\n}
export interface Create {\n${create}\n}
export interface Update {\n${update}\n}
export interface components { schemas: { ${pascal}Vo: RecordVo } }
export interface operations {
  ${operations.list}: { parameters: { query?: Query } }
  ${operations.create}: { requestBody: { content: { 'application/json': Create } } }
  ${operations.update}: { requestBody: { content: { 'application/json': Update } } }
}
`,
  )
  // 仅传输端口使用确定的离线实现；响应形状继续复用真实 HTTP 类型。
  write(
    'src/api/generated/operations/system.ts',
    `
import type { RecordVo, Query, Create, Update } from '../schema'
import type { ApiResponse, PageResponse } from '@/shared/http/types'
export async function ${operations.list}(_input: { params: Query; signal?: AbortSignal }): Promise<ApiResponse<PageResponse<RecordVo>>> { throw new Error('离线端口') }
export async function ${operations.read}(_input: { path: { id: string }; signal?: AbortSignal }): Promise<ApiResponse<RecordVo>> { throw new Error('离线端口') }
export async function ${operations.create}(_input: { data: Create }): Promise<void> {}
export async function ${operations.update}(_input: { path: { id: string }; data: Update }): Promise<void> {}
export async function ${operations.delete}(_input: { path: { id: string } }): Promise<void> {}
`,
  )
  const precisionChecks = fields.some((field) => field.name === 'value_2')
    ? `
const decimal: string = form.value_0
const signed: string = form.value_1
const unsigned: string = form.value_2
// @ts-expect-error Decimal 必须以字符串传输。
form.value_0 = 0.1
// @ts-expect-error i64 必须以字符串传输。
form.value_1 = 9223372036854775807
// @ts-expect-error u64 必须以字符串传输。
form.value_2 = 18446744073709551615
export { decimal, signed, unsigned }
`
    : ''
  write(
    'contract-check.ts',
    `
import { create${pascal}Presentation, type ${pascal}Form } from './${generated}/fields'
const presentation = create${pascal}Presentation((zh, _en) => zh${hasDateColumn ? ', value => value' : ''})
const form: ${pascal}Form = presentation.resource.emptyForm()
export { form }
${precisionChecks}
`,
  )
  const compilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    baseUrl: root,
    paths: { '@/*': ['src/*'] },
    ignoreDeprecations: '6.0',
  }
  const program = ts.createProgram([path.join(root, 'contract-check.ts')], compilerOptions)
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => root,
        getCanonicalFileName: (file) => file,
        getNewLine: () => '\n',
      }),
    )
  }
}
