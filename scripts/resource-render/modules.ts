import { header, type ResourceSource } from './format.ts'

export function chunks<Value>(values: readonly Value[], size: number): Value[][] {
  const result: Value[][] = []
  for (let start = 0; start < values.length; start += size)
    result.push(values.slice(start, start + size))
  return result
}

interface AggregateFunction {
  name: string
  parameters: string
  arguments: string
  result: string
  array: boolean
}

function combine(
  paths: readonly string[],
  functions: readonly AggregateFunction[],
  imports: string,
  directory: string,
): string {
  let output = imports
  for (const [index, path] of paths.entries()) {
    const prefix = directory === '' ? '' : `${directory}/`
    if (!path.startsWith(prefix)) throw new Error('聚合只引用同目录的生成模块')
    const relative = path.slice(prefix.length)
    if (functions.length === 1) {
      const name = functions[0].name
      output += `import { ${name} as ${name}${index} } from './${relative}'\n`
    } else {
      output += 'import {\n'
      for (const { name } of functions) output += `  ${name} as ${name}${index},\n`
      output += `} from './${relative}'\n`
    }
  }
  for (const { name, parameters, arguments: args, result, array } of functions) {
    output += `\nexport function ${name}(${parameters})${result} {\n  return ${array ? '[' : '{'}\n`
    for (let index = 0; index < paths.length; index += 1)
      output += `    ...${name}${index}(${args}),\n`
    output += `  ${array ? ']' : '}'}\n}\n`
  }
  return output
}

function liftImports(body: string): string {
  let namedImport = false
  return body
    .replace(/\n$/, '')
    .split('\n')
    .map((line) => {
      const start = line.startsWith('import {') || line.startsWith('import type {')
      namedImport ||= start
      const moduleLine = namedImport && (start || line.startsWith("} from '")) && line.endsWith("'")
      if (moduleLine) namedImport = false
      if (moduleLine && line.includes(" from '../")) {
        const index = line.indexOf(" from '../")
        const prefix = line.slice(0, index)
        const relative = line.slice(index + " from '../".length)
        return `${prefix} from '${relative.startsWith('../') ? relative : `./${relative}`}\n`
      }
      return `${line}\n`
    })
    .join('')
}

export class Modules<Resource extends ResourceSource> {
  readonly resource: Resource
  readonly version: string
  readonly assets: Map<string, string>

  constructor(resource: Resource, version: string) {
    this.resource = resource
    this.version = version
    this.assets = new Map()
  }

  add(path: string, body: string): void {
    if (this.assets.has(path)) throw new Error(`生成模块路径重复：${path}`)
    this.assets.set(path, header(this.resource, this.version) + body)
  }

  tree(
    stem: string,
    leaves: readonly string[],
    functions: readonly AggregateFunction[],
    imports: string,
  ): void {
    if (leaves.length === 1) {
      this.add(`${stem}.ts`, liftImports(leaves[0]))
      return
    }
    let paths = leaves.map((body, index) => {
      const path = `${stem}/part-${index}`
      this.add(`${path}.ts`, body)
      return path
    })
    let level = 0
    while (paths.length > 24) {
      paths = chunks(paths, 24).map((children, index) => {
        const path = `${stem}/group-${level}-${index}`
        const nested = imports
          .replaceAll("from '../", "from '../../")
          .replaceAll("from './", "from '../")
        this.add(`${path}.ts`, combine(children, functions, nested, stem))
        return path
      })
      level += 1
    }
    const slash = stem.lastIndexOf('/')
    this.add(
      `${stem}.ts`,
      combine(paths, functions, imports, slash < 0 ? '' : stem.slice(0, slash)),
    )
  }
}
