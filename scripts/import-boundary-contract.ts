import { posix } from 'node:path'
import { businessCatalogImportViolation } from './bundle-manifest-policy.ts'
import type { ImportKind } from './import-boundary-ast.ts'

export interface ImportEdge {
  kind: ImportKind
  source: string
  target: string
}

const commonTargets = ['features', 'generated', 'i18n', 'shared']
const applicationTargets = ['api-core', 'api-modules', 'app', ...commonTargets, 'stores', 'utils']
const componentTargets = [...applicationTargets, 'components', 'hooks']
const viewTargets = [...componentTargets, 'directives', 'views']

const allowedAreaTargets: Readonly<Partial<Record<string, ReadonlySet<string>>>> = Object.freeze({
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

export function normalizeModulePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\.\//u, '')
}

export function moduleArea(path: string): string {
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

export function resolveInternalSpecifier(
  source: string,
  specifier: string,
  modulePaths: ReadonlySet<string>,
): string | undefined {
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

export function externalPackageTarget(specifier: string): string | undefined {
  if (specifier.startsWith('.') || specifier.startsWith('@/') || specifier.startsWith('/')) {
    return undefined
  }
  const [scope, name] = specifier.split('/')
  if (!scope) return undefined
  return `package:${scope.startsWith('@') && name ? `${scope}/${name}` : scope}`
}

export function resolveImportTarget(
  source: string,
  specifier: string,
  modulePaths: ReadonlySet<string>,
): string | undefined {
  return (
    resolveInternalSpecifier(source, specifier, modulePaths) ?? externalPackageTarget(specifier)
  )
}

function storeDomain(path: string): string | undefined {
  const normalized = normalizeModulePath(path)
  if (!normalized.startsWith('src/stores/')) return undefined
  return normalized
    .slice('src/stores/'.length)
    .split('/')[0]
    .replace(/\.[^.]+$/u, '')
}

function externalBoundaryViolation(
  source: string,
  sourceArea: string,
  target: string,
): string | undefined {
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

export function boundaryViolation(edge: ImportEdge): string | undefined {
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
  const allowedTargets = allowedAreaTargets[sourceArea]
  if (allowedTargets && !allowedTargets.has(targetArea)) {
    return `${sourceArea} 不得依赖 ${targetArea}`
  }
  return undefined
}

export function edgeKey(edge: ImportEdge, reason?: string): string {
  return [edge.source, edge.target, edge.kind, reason].filter(Boolean).join('|')
}

function stronglyConnectedComponents(
  modules: ReadonlySet<string>,
  edges: readonly ImportEdge[],
): string[][] {
  const runtimeEdges = edges.filter((edge) => edge.kind === 'runtime')
  const adjacency = new Map<string, string[]>([...modules].map((module) => [module, []]))
  for (const edge of runtimeEdges) {
    if (modules.has(edge.target)) adjacency.get(edge.source)?.push(edge.target)
  }

  let nextIndex = 0
  const states = new Map<string, { index: number; lowLink: number }>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const components: string[][] = []

  function connect(module: string) {
    const state = { index: nextIndex, lowLink: nextIndex }
    states.set(module, state)
    nextIndex += 1
    stack.push(module)
    onStack.add(module)

    for (const target of adjacency.get(module) ?? []) {
      const targetState = states.get(target)
      if (targetState === undefined) {
        state.lowLink = Math.min(state.lowLink, connect(target).lowLink)
      } else if (onStack.has(target)) {
        state.lowLink = Math.min(state.lowLink, targetState.index)
      }
    }

    if (state.lowLink === state.index) {
      const component: string[] = []
      let current
      do {
        current = stack.pop()
        if (current === undefined) throw new Error('导入图缺少连通分量的根节点')
        onStack.delete(current)
        component.push(current)
      } while (current !== module)
      components.push(component.sort())
    }
    return state
  }

  for (const module of [...modules].sort()) {
    if (!states.has(module)) connect(module)
  }
  return components
}

export function runtimeCycleEdges(
  modules: ReadonlySet<string>,
  edges: readonly ImportEdge[],
): ImportEdge[] {
  const components = stronglyConnectedComponents(modules, edges)
  const componentByModule = new Map<string, readonly string[]>()
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
