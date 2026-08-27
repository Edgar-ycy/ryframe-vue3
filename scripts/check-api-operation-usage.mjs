import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'

const root = process.cwd()
const modulesRoot = path.join(root, 'src', 'api', 'modules')
const directHttpExports = new Set(['default', 'rawRequest', 'requestBlob', 'requestText'])

function relative(absolute) {
  return path.relative(root, absolute).split(path.sep).join('/')
}

async function collectTypeScriptFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await collectTypeScriptFiles(absolute)))
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
  return (
    ts.isTemplateExpression(node) &&
    (node.head.text.startsWith('/') ||
      node.templateSpans.some((span) => span.literal.text.startsWith('/')))
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
  const operationRequestImports = new Set()
  const legacyOperationImports = new Set()

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue
    const moduleName = statement.moduleSpecifier.text
    const clause = statement.importClause
    if (moduleName === '@/api/generated/operations') {
      legacyOperationImports.add(moduleName)
    }
    if (moduleName === '@/api/operationRequest' && !clause?.isTypeOnly) {
      if (clause?.name) operationRequestImports.add('default')
      for (const element of clause?.namedBindings && ts.isNamedImports(clause.namedBindings)
        ? clause.namedBindings.elements
        : []) {
        if (!element.isTypeOnly)
          operationRequestImports.add(element.propertyName?.text ?? element.name.text)
      }
    }
    if (moduleName !== '@/shared/http/client') continue
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
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      bindings.has(node.expression.text)
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
    directCalls: Object.fromEntries(
      Object.entries(directCalls).sort(([left], [right]) => left.localeCompare(right)),
    ),
    pathLiterals,
    legacyOperationImports: [...legacyOperationImports].sort(),
    operationRequestImports: [...operationRequestImports].sort(),
    urlProperties,
    methodProperties,
  }
}

function hasLegacyUsage(inventory) {
  return (
    inventory.directImports.length > 0 ||
    inventory.legacyOperationImports.length > 0 ||
    inventory.operationRequestImports.length > 0 ||
    Object.keys(inventory.directCalls).length > 0 ||
    inventory.pathLiterals > 0 ||
    inventory.urlProperties > 0 ||
    inventory.methodProperties > 0
  )
}

function formatCalls(calls) {
  const entries = Object.entries(calls)
  return entries.length > 0
    ? entries.map(([helper, count]) => `${helper}=${count}`).join(', ')
    : '无直连调用'
}

const current = {}

for (const absolute of await collectTypeScriptFiles(modulesRoot)) {
  const inventory = inspectSource(absolute, await readFile(absolute, 'utf8'))
  if (hasLegacyUsage(inventory)) current[relative(absolute)] = inventory
}

const violations = Object.keys(current).sort()

if (violations.length > 0) {
  console.error('API operation 使用门禁失败：发现通用传输、旧 operation 入口或手写请求。')
  for (const file of violations) console.error(`  - ${file}`)
  console.error('API 模块必须调用分域生成的 typed caller，不接受违规基线。')
  console.error('当前完整违规清单如下：')
  console.error(`${JSON.stringify(current, null, 2)}\n`)
  process.exitCode = 1
} else {
  const files = Object.entries(current)
  const directCallCount = files.reduce(
    (total, [, item]) =>
      total + Object.values(item.directCalls).reduce((sum, count) => sum + count, 0),
    0,
  )
  const pathLiteralCount = files.reduce((total, [, item]) => total + item.pathLiterals, 0)
  console.log(
    `API operation 使用门禁通过；${files.length} 个违规模块、${directCallCount} 个直连请求、${pathLiteralCount} 个手写路径。`,
  )
  for (const [file, item] of files) {
    console.log(
      `  - ${file}: ${formatCalls(item.directCalls)}；路径=${item.pathLiterals}，url=${item.urlProperties}，method=${item.methodProperties}`,
    )
  }
}
