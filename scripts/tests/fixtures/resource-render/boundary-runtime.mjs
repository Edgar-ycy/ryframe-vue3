import assert from 'node:assert/strict'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const frontend = fileURLToPath(new URL('../../../../', import.meta.url))
const require = createRequire(path.join(frontend, 'package.json'))
const ts = require('typescript')

export const lines = (source) => source.replace(/\n$/, '').split('\n').length

export function importsExist(assets) {
  const files = new Map(assets.map((asset) => [asset.path, asset.content]))
  let checked = 0
  for (const [file, source] of files) {
    if (!file.endsWith('.ts')) continue
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    assert.equal(tree.parseDiagnostics.length, 0, `${file} 语法错误`)
    for (const statement of tree.statements) {
      const specifier = statement.moduleSpecifier
      if (!specifier || !ts.isStringLiteral(specifier)) continue
      const target = specifier.text
      // 只校验相对 TS 模块；Vue 页面及 @/、package 等外部入口由对应门禁处理。
      if (!target.startsWith('.') || target.endsWith('.vue')) continue
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), target))
      assert.ok(
        [resolved, `${resolved}.ts`, `${resolved}/index.ts`].some((name) => files.has(name)),
        `${file} 引用缺失 ${target}`,
      )
      checked += 1
    }
  }
  return checked
}

// 只替换离线出站端口；所有字段聚合、表单转换及 options 函数执行生成的 TS 源码。
export function execute(resource, assets, english = false) {
  const prefix = `src/generated/resources/${resource.name}/`
  const files = new Map(assets.map((asset) => [asset.path, asset.content]))
  const modules = new Map()
  const ports = {
    '@/components/business/flat-crud': { defineFlatCrudResource: (value) => value },
    '@/shared/http/types': { emptyPageResponse: () => ({ items: [], total: 0 }) },
    '@/api/generated/operations/system': Object.fromEntries(
      Object.values(resource.api.operations).map((name) => [
        name,
        () => {
          throw new Error('离线测试不调用传输端口')
        },
      ]),
    ),
  }
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports
    const source = files.get(file)
    assert.equal(typeof source, 'string', `缺少运行时模块 ${file}`)
    const module = { exports: {} }
    modules.set(file, module)
    const code = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText
    const localRequire = (specifier) => {
      if (Object.hasOwn(ports, specifier)) return ports[specifier]
      assert.ok(specifier.startsWith('.'), `未登记外部端口 ${specifier}`)
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier))
      return load(files.has(`${target}.ts`) ? `${target}.ts` : `${target}/index.ts`)
    }
    vm.runInNewContext(`(function(require, module, exports) { ${code}\n})`, {}, { filename: file })(
      localRequire,
      module,
      module.exports,
    )
    return module.exports
  }
  const factory = load(`${prefix}fields.ts`)[`create${resource.pascal_name}Presentation`]
  return factory(
    (zh, en) => (english ? en : zh),
    (value) => `日期:${value}`,
  )
}

export function descriptors(presentation, resource) {
  const selections = {
    columns: (field) => field.usage.list,
    queryFields: (field) => field.usage.filter && field.widget !== 'hidden',
    formFields: (field) => field.usage.create || field.usage.update,
  }
  for (const [name, selected] of Object.entries(selections)) {
    const expected = resource.fields.filter(selected).map((field) => field.name)
    const actual = Array.from(presentation[name], (field) => field.key)
    assert.deepEqual(actual, expected, name)
    assert.equal(new Set(actual).size, actual.length, `${name} 字段重复`)
  }
  const form = presentation.resource.emptyForm()
  assert.deepEqual(
    Object.keys(form),
    resource.fields.filter(selections.formFields).map((f) => f.name),
  )
  for (const action of ['create', 'update']) {
    assert.deepEqual(
      Object.keys(presentation.resource[`${action}Input`](form)),
      resource.fields.filter((field) => field.usage[action]).map((field) => field.name),
    )
  }
}
