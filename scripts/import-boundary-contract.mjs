import { posix } from 'node:path'
import ts from 'typescript'

const allowedAreaTargets = Object.freeze({
  app: new Set([
    'api-core',
    'api-modules',
    'app',
    'features',
    'generated',
    'i18n',
    'shared',
    'stores',
    'utils',
  ]),
  'api-core': new Set(['api-core', 'generated', 'shared']),
  'api-modules': new Set(['api-core', 'api-modules', 'generated', 'shared']),
  components: new Set([
    'api-core',
    'api-modules',
    'app',
    'components',
    'features',
    'generated',
    'hooks',
    'i18n',
    'shared',
    'stores',
    'utils',
  ]),
  directives: new Set([
    'app',
    'directives',
    'features',
    'generated',
    'i18n',
    'shared',
    'stores',
    'utils',
  ]),
  features: new Set(['features', 'generated', 'i18n', 'shared']),
  hooks: new Set([
    'api-core',
    'api-modules',
    'app',
    'features',
    'generated',
    'hooks',
    'i18n',
    'shared',
    'stores',
    'utils',
  ]),
  i18n: new Set(['generated', 'i18n', 'shared']),
  router: new Set([
    'api-core',
    'api-modules',
    'components',
    'directives',
    'features',
    'generated',
    'hooks',
    'i18n',
    'router',
    'shared',
    'stores',
    'utils',
    'views',
  ]),
  shared: new Set(['generated', 'shared']),
  stores: new Set(['generated', 'i18n', 'shared', 'stores', 'utils']),
  utils: new Set(['generated', 'i18n', 'shared', 'utils']),
  views: new Set([
    'api-core',
    'api-modules',
    'app',
    'components',
    'directives',
    'features',
    'generated',
    'hooks',
    'i18n',
    'shared',
    'stores',
    'utils',
    'views',
  ]),
})

export function normalizeModulePath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//u, '')
}

export function moduleArea(path) {
  const normalized = normalizeModulePath(path)
  if (normalized.startsWith('src/api/generated/')) return 'generated'
  if (normalized === 'src/api/contract.ts' || normalized === 'src/api/operationRequest.ts') {
    return 'api-core'
  }
  if (normalized.startsWith('src/api/modules/')) return 'api-modules'
  if (normalized.startsWith('src/api/')) return 'api-core'
  if (normalized.startsWith('src/generated/')) return 'generated'
  const segment = normalized.split('/')[1]
  return segment || 'other'
}

export function extractImportSpecifiers(source, fileName = 'module.ts') {
  const scriptKind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind)
  const imports = []

  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push({
        kind: importDeclarationKind(node),
        specifier: node.moduleSpecifier.text,
      })
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push({
        kind: exportDeclarationKind(node),
        specifier: node.moduleSpecifier.text,
      })
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments
      if (argument && ts.isStringLiteral(argument)) {
        imports.push({ kind: 'dynamic', specifier: argument.text })
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return imports
}

function exportDeclarationKind(node) {
  if (node.isTypeOnly) return 'type'
  const clause = node.exportClause
  if (
    clause &&
    ts.isNamedExports(clause) &&
    clause.elements.length > 0 &&
    clause.elements.every((element) => element.isTypeOnly)
  ) {
    return 'type'
  }
  return 'runtime'
}

function importDeclarationKind(node) {
  const clause = node.importClause
  if (!clause) return 'runtime'
  if (clause.isTypeOnly) return 'type'
  if (clause.name) return 'runtime'
  const bindings = clause.namedBindings
  if (
    bindings &&
    ts.isNamedImports(bindings) &&
    bindings.elements.length > 0 &&
    bindings.elements.every((element) => element.isTypeOnly)
  )
    return 'type'
  return 'runtime'
}

export function resolveInternalSpecifier(source, specifier, modulePaths) {
  let base
  if (specifier.startsWith('@/')) base = `src/${specifier.slice(2)}`
  else if (specifier.startsWith('.')) {
    base = posix.normalize(posix.join(posix.dirname(normalizeModulePath(source)), specifier))
  } else return undefined
  if (!base.startsWith('src/')) return undefined

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    `${base}.vue`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.mts`,
    `${base}/index.cts`,
    `${base}/index.vue`,
  ]
  return candidates.find((candidate) => modulePaths.has(candidate))
}

export function boundaryViolation(edge) {
  const sourceArea = moduleArea(edge.source)
  const targetArea = moduleArea(edge.target)
  if (sourceArea === 'generated') return undefined
  if (sourceArea === 'features' && targetArea === 'views' && edge.kind === 'dynamic') {
    return undefined
  }
  if (sourceArea === 'stores' && edge.kind !== 'type' && targetArea === 'api-modules') {
    return 'stores 不得直接调用 API 模块'
  }
  if (
    sourceArea === 'stores' &&
    edge.kind !== 'type' &&
    edge.target.startsWith('src/shared/query/')
  ) {
    return 'stores 不得操作 QueryClient'
  }
  if (
    edge.kind === 'type' &&
    (sourceArea === 'features' || sourceArea === 'stores') &&
    targetArea === 'api-modules'
  ) {
    return undefined
  }
  if (allowedAreaTargets[sourceArea] && !allowedAreaTargets[sourceArea].has(targetArea)) {
    return `${sourceArea} 不得依赖 ${targetArea}`
  }
  return undefined
}

export function edgeKey(edge, reason) {
  return [edge.source, edge.target, edge.kind, reason].filter(Boolean).join('|')
}

export function stronglyConnectedComponents(modules, edges) {
  const runtimeEdges = edges.filter((edge) => edge.kind === 'runtime')
  const adjacency = new Map([...modules].map((module) => [module, []]))
  for (const edge of runtimeEdges) adjacency.get(edge.source)?.push(edge.target)

  let nextIndex = 0
  const indices = new Map()
  const lowLinks = new Map()
  const stack = []
  const onStack = new Set()
  const components = []

  function connect(module) {
    indices.set(module, nextIndex)
    lowLinks.set(module, nextIndex)
    nextIndex += 1
    stack.push(module)
    onStack.add(module)

    for (const target of adjacency.get(module) ?? []) {
      if (!indices.has(target)) {
        connect(target)
        lowLinks.set(module, Math.min(lowLinks.get(module), lowLinks.get(target)))
      } else if (onStack.has(target)) {
        lowLinks.set(module, Math.min(lowLinks.get(module), indices.get(target)))
      }
    }

    if (lowLinks.get(module) !== indices.get(module)) return
    const component = []
    let current
    do {
      current = stack.pop()
      onStack.delete(current)
      component.push(current)
    } while (current !== module)
    components.push(component.sort())
  }

  for (const module of [...modules].sort()) {
    if (!indices.has(module)) connect(module)
  }
  return components
}

export function runtimeCycleEdges(modules, edges) {
  const components = stronglyConnectedComponents(modules, edges)
  const componentByModule = new Map()
  for (const component of components) {
    if (component.length > 1) {
      for (const module of component) componentByModule.set(module, component)
    }
  }
  return edges
    .filter((edge) => edge.kind === 'runtime')
    .filter((edge) => {
      const component = componentByModule.get(edge.source)
      return component?.includes(edge.target) || edge.source === edge.target
    })
}
