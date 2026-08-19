import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'

const root = process.cwd()
const modulesRoot = path.join(root, 'src', 'api', 'modules')
const allowlistPath = path.join(root, 'scripts', 'api-operation-allowlist.json')
const directHttpExports = new Set(['default', 'rawRequest', 'requestBlob', 'requestText'])

function relative(absolute) {
  return path.relative(root, absolute).split(path.sep).join('/')
}

async function collectTypeScriptFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collectTypeScriptFiles(absolute))
    else if (entry.isFile() && entry.name.endsWith('.ts')) files.push(absolute)
  }
  return files.sort()
}

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text
  return undefined
}

function isHandwrittenApiPath(node) {
  if (ts.isStringLiteralLike(node)) return node.text.startsWith('/')
  return ts.isTemplateExpression(node) && (
    node.head.text.startsWith('/')
    || node.templateSpans.some(span => span.literal.text.startsWith('/'))
  )
}

function inspectSource(absolute, source) {
  const sourceFile = ts.createSourceFile(
    absolute,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const bindings = new Map()
  const directImports = new Set()

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue
    if (statement.moduleSpecifier.text !== '@/shared/http/client') continue
    const clause = statement.importClause
    if (!clause?.isTypeOnly && clause?.name) {
      bindings.set(clause.name.text, 'request')
      directImports.add('request')
    }
    for (const element of clause?.namedBindings && ts.isNamedImports(clause.namedBindings)
      ? clause.namedBindings.elements
      : []) {
      if (clause?.isTypeOnly || element.isTypeOnly) continue
      const imported = element.propertyName?.text ?? element.name.text
      if (!directHttpExports.has(imported)) continue
      bindings.set(element.name.text, imported)
      directImports.add(imported)
    }
  }

  const directCalls = {}
  let methodProperties = 0
  let pathLiterals = 0
  let urlProperties = 0

  function visit(node) {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && bindings.has(node.expression.text)
    ) {
      const helper = bindings.get(node.expression.text)
      directCalls[helper] = (directCalls[helper] ?? 0) + 1
    }
    if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
      const name = propertyName(node.name)
      if (name === 'url') urlProperties += 1
      if (name === 'method') methodProperties += 1
    }
    if (isHandwrittenApiPath(node)) pathLiterals += 1
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  return {
    directImports: [...directImports].sort(),
    directCalls: Object.fromEntries(Object.entries(directCalls).sort(([left], [right]) => (
      left.localeCompare(right)
    ))),
    pathLiterals,
    urlProperties,
    methodProperties,
  }
}

function hasLegacyUsage(inventory) {
  return inventory.directImports.length > 0
    || Object.keys(inventory.directCalls).length > 0
    || inventory.pathLiterals > 0
    || inventory.urlProperties > 0
    || inventory.methodProperties > 0
}

function sameInventory(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function formatCalls(calls) {
  const entries = Object.entries(calls)
  return entries.length > 0
    ? entries.map(([helper, count]) => `${helper}=${count}`).join(', ')
    : '无直连调用'
}

const allowlist = JSON.parse(await readFile(allowlistPath, 'utf8'))
const current = {}

for (const absolute of await collectTypeScriptFiles(modulesRoot)) {
  const inventory = inspectSource(absolute, await readFile(absolute, 'utf8'))
  if (hasLegacyUsage(inventory)) current[relative(absolute)] = inventory
}

const mismatches = [...new Set([
  ...Object.keys(allowlist),
  ...Object.keys(current),
])].sort().filter(file => !sameInventory(allowlist[file], current[file]))

if (mismatches.length > 0) {
  console.error('API operation 使用门禁失败：发现未登记的新旧式请求，或过渡 allowlist 已过期。')
  for (const file of mismatches) {
    if (!allowlist[file]) console.error(`  - 新增违规：${file}`)
    else if (!current[file]) console.error(`  - 已完成迁移但未移出 allowlist：${file}`)
    else console.error(`  - 违规基线发生变化：${file}`)
  }
  console.error('仅在完成对应迁移后收紧 allowlist；不得用扩大基线掩盖新增手写请求。')
  console.error('当前完整基线如下：')
  console.error(`${JSON.stringify(current, null, 2)}\n`)
  process.exitCode = 1
}
else {
  const files = Object.entries(current)
  const directCallCount = files.reduce((total, [, item]) => (
    total + Object.values(item.directCalls).reduce((sum, count) => sum + count, 0)
  ), 0)
  const pathLiteralCount = files.reduce((total, [, item]) => total + item.pathLiterals, 0)
  console.log(
    `API operation 使用门禁通过；剩余迁移 ${files.length} 个模块、${directCallCount} 个直连请求、${pathLiteralCount} 个手写路径。`,
  )
  for (const [file, item] of files) {
    console.log(
      `  - ${file}: ${formatCalls(item.directCalls)}；路径=${item.pathLiterals}，url=${item.urlProperties}，method=${item.methodProperties}`,
    )
  }
}
