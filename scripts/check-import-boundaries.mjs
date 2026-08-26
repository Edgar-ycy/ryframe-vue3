import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseVue } from '@vue/compiler-sfc'
import {
  boundaryViolation,
  edgeKey,
  extractImportSpecifiers,
  normalizeModulePath,
  resolveInternalSpecifier,
  runtimeCycleEdges,
} from './import-boundary-contract.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = join(root, 'src')
const commandArguments = process.argv.slice(2)
if (commandArguments.length > 0) throw new Error(`未知参数：${commandArguments[0]}`)

async function collectModules(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const modules = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) modules.push(...(await collectModules(path)))
    else if (
      entry.isFile() &&
      /\.(?:[cm]?ts|tsx|vue)$/u.test(entry.name) &&
      !/\.d\.[cm]?tsx?$/u.test(entry.name)
    )
      modules.push(path)
  }
  return modules
}

function moduleSource(path, content) {
  if (!path.endsWith('.vue')) return content
  const { descriptor, errors } = parseVue(content, { filename: path })
  if (errors.length > 0) throw new Error(`无法解析 ${path}: ${String(errors[0])}`)
  return [descriptor.script?.content, descriptor.scriptSetup?.content].filter(Boolean).join('\n')
}

const absoluteModules = await collectModules(sourceRoot)
const modulePaths = new Set(
  absoluteModules.map((path) => normalizeModulePath(relative(root, path))),
)
const edges = []

for (const absolutePath of absoluteModules.sort()) {
  const source = normalizeModulePath(relative(root, absolutePath))
  const content = moduleSource(source, await readFile(absolutePath, 'utf8'))
  for (const dependency of extractImportSpecifiers(content, source)) {
    const target = resolveInternalSpecifier(source, dependency.specifier, modulePaths)
    if (target) edges.push({ kind: dependency.kind, source, target })
  }
}

const uniqueEdges = [...new Map(edges.map((edge) => [edgeKey(edge), edge])).values()]
const forbidden = uniqueEdges.flatMap((edge) => {
  const reason = boundaryViolation(edge)
  return reason ? [edgeKey(edge, reason)] : []
})
const cycles = runtimeCycleEdges(modulePaths, uniqueEdges).map((edge) => edgeKey(edge))
const violations = [
  ...new Set(forbidden.map((edge) => `边界违规 ${edge}`)),
  ...new Set(cycles.map((edge) => `运行时环内边 ${edge}`)),
]
if (violations.length > 0) {
  console.error('导入边界检查失败：')
  for (const violation of violations.sort()) console.error(`  ${violation}`)
  process.exitCode = 1
} else {
  console.log('导入边界检查通过（0 条边界债务、0 条运行时环内边）。')
}
