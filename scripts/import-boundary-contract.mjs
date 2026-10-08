import { posix } from 'node:path'
import ts from 'typescript'
import { businessCatalogImportViolation } from './bundle-manifest-policy.mjs'

const directHttpExports = new Set(['default', 'rawRequest', 'requestBlob', 'requestText'])
const commonTargets = ['features', 'generated', 'i18n', 'shared']
const applicationTargets = ['api-core', 'api-modules', 'app', ...commonTargets, 'stores', 'utils']
const componentTargets = [...applicationTargets, 'components', 'hooks']
const viewTargets = [...componentTargets, 'directives', 'views']

const allowedAreaTargets = Object.freeze({
  app: new Set(applicationTargets),
  'api-core': new Set(['api-core', 'generated', 'shared']),
  'api-modules': new Set(['api-core', 'api-modules', 'generated', 'shared']),
  components: new Set(componentTargets),
  directives: new Set(['app', 'directives', ...commonTargets, 'stores', 'utils']),
  features: new Set(commonTargets),
  hooks: new Set([...applicationTargets, 'hooks']),
  i18n: new Set(['generated', 'i18n', 'shared']),
  router: new Set([
    'api-core',
    'api-modules',
    'components',
    'directives',
    ...commonTargets,
    'hooks',
    'router',
    'stores',
    'utils',
    'views',
  ]),
  shared: new Set(['generated', 'shared']),
  stores: new Set(['generated', 'i18n', 'shared', 'stores', 'utils']),
  utils: new Set(['generated', 'i18n', 'shared', 'utils']),
  views: new Set(viewTargets),
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
  return inspectModuleSource(source, fileName).imports
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

export function externalPackageTarget(specifier) {
  if (specifier.startsWith('.') || specifier.startsWith('@/') || specifier.startsWith('/')) {
    return undefined
  }
  const [scope, name] = specifier.split('/')
  if (!scope) return undefined
  return `package:${scope.startsWith('@') && name ? `${scope}/${name}` : scope}`
}

export function resolveImportTarget(source, specifier, modulePaths) {
  return (
    resolveInternalSpecifier(source, specifier, modulePaths) ?? externalPackageTarget(specifier)
  )
}

export function containsDefineStoreCall(source, fileName = 'module.ts') {
  return inspectModuleSource(source, fileName).containsDefineStoreCall
}

function syntaxPropertyName(node) {
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

export function inspectModuleSource(source, fileName = 'module.ts') {
  const scriptKind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind)
  const imports = []
  const defineStoreBindings = new Set(['defineStore'])
  const apiBindings = new Map()
  const directImports = new Set()
  const operationRequestImports = new Set()
  const legacyOperationImports = new Set()

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue
    const moduleName = statement.moduleSpecifier.text
    const clause = statement.importClause
    if (moduleName === 'pinia') {
      const namedBindings = clause?.namedBindings
      for (const element of namedBindings && ts.isNamedImports(namedBindings)
        ? namedBindings.elements
        : []) {
        if ((element.propertyName?.text ?? element.name.text) === 'defineStore') {
          defineStoreBindings.add(element.name.text)
        }
      }
    }
    if (moduleName === '@/api/generated/operations') legacyOperationImports.add(moduleName)
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
      apiBindings.set(clause.name.text, 'request')
      directImports.add('request')
    }
    for (const element of clause?.namedBindings && ts.isNamedImports(clause.namedBindings)
      ? clause.namedBindings.elements
      : []) {
      if (clause?.isTypeOnly || element.isTypeOnly) continue
      const imported = element.propertyName?.text ?? element.name.text
      if (!directHttpExports.has(imported)) continue
      apiBindings.set(element.name.text, imported)
      directImports.add(imported)
    }
  }

  const directCalls = {}
  let containsDefineStoreCall = false
  let methodProperties = 0
  let pathLiterals = 0
  let urlProperties = 0
  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push({ kind: importDeclarationKind(node), specifier: node.moduleSpecifier.text })
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push({ kind: exportDeclarationKind(node), specifier: node.moduleSpecifier.text })
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument
      if (ts.isLiteralTypeNode(argument) && ts.isStringLiteral(argument.literal)) {
        imports.push({ kind: 'type', specifier: argument.literal.text })
      }
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments
      if (argument && ts.isStringLiteral(argument)) {
        imports.push({ kind: 'dynamic', specifier: argument.text })
      }
    }
    if (ts.isCallExpression(node)) {
      if (
        (ts.isIdentifier(node.expression) && defineStoreBindings.has(node.expression.text)) ||
        (ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 'defineStore')
      ) {
        containsDefineStoreCall = true
      }
      if (ts.isIdentifier(node.expression)) {
        const helper = apiBindings.get(node.expression.text)
        if (helper) directCalls[helper] = (directCalls[helper] ?? 0) + 1
      }
    }
    if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
      const name = syntaxPropertyName(node.name)
      if (name === 'url') urlProperties += 1
      if (name === 'method') methodProperties += 1
    }
    if (isHandwrittenApiPath(node)) pathLiterals += 1
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  return {
    containsDefineStoreCall,
    imports,
    apiOperationUsage: {
      directImports: [...directImports].sort(),
      directCalls: Object.fromEntries(Object.entries(directCalls).sort()),
      legacyOperationImports: [...legacyOperationImports].sort(),
      methodProperties,
      operationRequestImports: [...operationRequestImports].sort(),
      pathLiterals,
      urlProperties,
    },
  }
}

export function inspectApiOperationUsage(source, fileName = 'module.ts') {
  return inspectModuleSource(source, fileName).apiOperationUsage
}

export function hasApiOperationUsage(inventory) {
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

function storeDomain(path) {
  const normalized = normalizeModulePath(path)
  if (!normalized.startsWith('src/stores/')) return undefined
  return normalized
    .slice('src/stores/'.length)
    .split('/')[0]
    .replace(/\.[^.]+$/u, '')
}

function externalBoundaryViolation(source, sourceArea, target) {
  if (!target.startsWith('package:')) return undefined
  const packageName = target.slice('package:'.length)
  if (sourceArea === 'stores' && !['pinia', 'vue'].includes(packageName)) {
    return `stores 不得依赖外部包 ${packageName}`
  }
  if (sourceArea === 'api-modules') {
    return `api-modules 不得直接依赖外部包 ${packageName}`
  }
  if (source.startsWith('src/shared/http/') && packageName !== 'axios') {
    return `shared/http 不得依赖外部包 ${packageName}`
  }
  return undefined
}

export function boundaryViolation(edge) {
  const sourceArea = moduleArea(edge.source)
  const externalViolation = externalBoundaryViolation(edge.source, sourceArea, edge.target)
  if (externalViolation) return externalViolation
  if (edge.target.startsWith('package:')) return undefined
  const catalogViolation = businessCatalogImportViolation(edge)
  if (catalogViolation) return catalogViolation
  const targetArea = moduleArea(edge.target)
  if (sourceArea === 'generated') return undefined
  if (edge.kind !== 'type' && edge.target === 'src/api/operationRequest.ts') {
    return 'operationRequest 只能由生成 caller 调用'
  }
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
    sourceArea === 'stores' &&
    edge.kind !== 'type' &&
    targetArea === 'stores' &&
    storeDomain(edge.source) !== storeDomain(edge.target)
  ) {
    return 'stores 不得跨 Store 编排'
  }
  if (edge.kind === 'type' && sourceArea === 'features' && targetArea === 'api-modules') {
    return undefined
  }
  if (
    edge.kind === 'type' &&
    sourceArea === 'stores' &&
    edge.target === 'src/features/session/contracts.ts'
  ) {
    return undefined
  }
  if (
    edge.kind === 'type' &&
    edge.source === 'src/features/session/contracts.ts' &&
    edge.target === 'src/api/contract.ts'
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
  for (const edge of runtimeEdges) {
    if (modules.has(edge.target)) adjacency.get(edge.source)?.push(edge.target)
  }

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
