import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseVue } from '@vue/compiler-sfc'
import {
  boundaryViolation,
  compareImportBaseline,
  createImportBaseline,
  edgeKey,
  extractImportSpecifiers,
  normalizeModulePath,
  resolveInternalSpecifier,
  runtimeCycleEdges,
} from './import-boundary-contract.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = join(root, 'src')
const baselinePath = join(root, 'scripts/import-boundary-baseline.json')
const commandArguments = process.argv.slice(2)
const unknownArgument = commandArguments.find((argument) => argument !== '--update-baseline')
if (unknownArgument) throw new Error(`未知参数：${unknownArgument}`)

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
const current = createImportBaseline(forbidden, cycles)

let baseline
try {
  baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
  baseline = createImportBaseline([], [])
}
if (baseline.version !== 1) throw new Error('导入迁移基线版本必须为 1')

const comparison = compareImportBaseline(current, baseline)
const additions = [
  ...comparison.newForbiddenEdges.map((edge) => `新增边界违规 ${edge}`),
  ...comparison.newRuntimeCycleEdges.map((edge) => `新增运行时环内边 ${edge}`),
]
if (commandArguments.includes('--update-baseline')) {
  if (additions.length > 0) {
    console.error('导入迁移基线拒绝扩张：')
    for (const addition of additions) console.error(`  ${addition}`)
    process.exitCode = 1
  } else if (current.forbiddenEdges.length === 0 && current.runtimeCycleEdges.length === 0) {
    console.error('债务已清零，请删除 scripts/import-boundary-baseline.json，而不是保留空基线。')
    process.exitCode = 1
  } else {
    await writeFile(baselinePath, `${JSON.stringify(current, null, 2)}\n`, 'utf8')
    console.log(
      `导入迁移基线已收敛：${current.forbiddenEdges.length} 条边界债务，` +
        `${current.runtimeCycleEdges.length} 条运行时环内边。`,
    )
  }
} else if (additions.length > 0) {
  console.error('导入边界检查失败：')
  for (const addition of additions) console.error(`  ${addition}`)
  process.exitCode = 1
} else if (
  comparison.resolvedForbiddenEdges.length > 0 ||
  comparison.resolvedRuntimeCycleEdges.length > 0
) {
  console.error(
    '导入迁移基线包含已消除债务；请运行 `node scripts/check-import-boundaries.mjs --update-baseline` 收敛基线。',
  )
  process.exitCode = 1
} else {
  console.log(
    `导入边界检查通过（剩余 ${comparison.remainingForbiddenEdges} 条边界债务、` +
      `${comparison.remainingRuntimeCycleEdges} 条运行时环内边）。`,
  )
}
