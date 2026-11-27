const INITIAL_CATALOG_SOURCES = new Set([
  'src/i18n/catalog/core.ts',
  'src/i18n/catalog/export-jobs.ts',
  'src/i18n/catalog/shell.ts',
])
const CATALOG_SOURCE_PREFIX = 'src/i18n/catalog/'

type ManifestChunk = {
  file?: string | null
  name?: string | null
  src?: string | null
  imports?: readonly string[] | null
  css?: readonly string[] | null
  isEntry?: boolean | null
  isDynamicEntry?: boolean | null
}

export type ViteManifest = Record<string, ManifestChunk>

type CatalogModule =
  | { source: string; isChild: false }
  | { source: string; isChild: true; isCore: boolean; owner: string }

type CatalogImport = {
  source?: string | null
  target?: string | null
  kind: 'dynamic' | 'runtime' | 'type'
}

type InitialGraph = {
  files: Set<string>
  keys: Set<string>
}

function normalizeSource(value: string | null | undefined): string | undefined {
  return value?.replaceAll('\\', '/')
}

function catalogModule(rawSource: string | null | undefined): CatalogModule | undefined {
  const source = normalizeSource(rawSource)
  if (!source?.startsWith(CATALOG_SOURCE_PREFIX)) return undefined

  const relativeSource = source.slice(CATALOG_SOURCE_PREFIX.length)
  const segments = relativeSource.split('/')
  if (segments.length < 2 || !segments[0]) {
    return { source, isChild: false }
  }

  const catalogName = segments[0]
  return {
    source,
    isChild: true,
    isCore: catalogName === 'core',
    owner: `${CATALOG_SOURCE_PREFIX}${catalogName}.ts`,
  }
}

export function businessCatalogImportViolation(edge: CatalogImport): string | undefined {
  const module = catalogModule(edge.target)
  if (!module?.isChild || module.isCore) return undefined

  const source = normalizeSource(edge.source)
  if (source === module.owner && edge.kind !== 'dynamic') return undefined
  return `business catalog child must be statically imported by ${module.owner}: ${module.source}`
}

export function collectInitialGraph(manifest: ViteManifest): InitialGraph {
  const entryKeys = Object.entries(manifest)
    .filter(([, chunk]) => chunk.isEntry)
    .map(([key]) => key)
  if (entryKeys.length === 0) throw new Error('Vite manifest contains no entry chunk')

  const files = new Set<string>()
  const keys = new Set<string>()
  function visit(key: string) {
    if (keys.has(key)) return
    keys.add(key)
    const chunk = manifest[key]
    if (!chunk) throw new Error(`Manifest import is missing: ${key}`)
    if (chunk.file) files.add(chunk.file)
    for (const css of chunk.css ?? []) files.add(css)
    for (const imported of chunk.imports ?? []) visit(imported)
  }
  for (const key of entryKeys) visit(key)
  return { files, keys }
}

export function staticImportCycles(manifest: ViteManifest): string[][] {
  const states = new Map<string, 'visiting' | 'visited'>()
  const stack: string[] = []
  const cycles: string[][] = []

  function visit(key: string) {
    const state = states.get(key)
    if (state === 'visiting') {
      const start = stack.indexOf(key)
      cycles.push([...stack.slice(start), key])
      return
    }
    if (state === 'visited') return

    const chunk = manifest[key]
    if (!chunk) throw new Error(`Manifest import is missing: ${key}`)

    states.set(key, 'visiting')
    stack.push(key)
    for (const imported of chunk.imports ?? []) visit(imported)
    stack.pop()
    states.set(key, 'visited')
  }

  for (const key of Object.keys(manifest).sort()) visit(key)
  return cycles
}

export function businessCatalogIsolationFailures(
  manifest: ViteManifest,
  initialGraph: InitialGraph,
  catalogSources: readonly string[],
): string[] {
  const failures: string[] = []
  for (const rawSource of catalogSources) {
    const module = catalogModule(rawSource)
    if (!module || module.isChild) continue
    const source = module.source
    if (INITIAL_CATALOG_SOURCES.has(source)) continue

    const chunk = manifest[source]
    if (!chunk || chunk.isDynamicEntry !== true) {
      failures.push(`business catalog is not an isolated dynamic entry: ${source}`)
      continue
    }
    if (
      initialGraph.keys.has(source) ||
      (chunk.file != null && initialGraph.files.has(chunk.file))
    ) {
      failures.push(`business catalog entered initial graph: ${source}`)
    }
  }
  return failures.sort()
}

export function findOptionalNamedChunk(
  manifest: ViteManifest,
  name: string,
): ManifestChunk | undefined {
  const chunks = Object.values(manifest).filter((chunk) => chunk.name === name)
  if (chunks.length > 1) throw new Error(`Vite manifest contains duplicate ${name} chunks`)
  return chunks[0]
}

export function findNamedChunk(manifest: ViteManifest, name: string): ManifestChunk {
  const chunk = findOptionalNamedChunk(manifest, name)
  if (!chunk) throw new Error(`Vite manifest is missing the ${name} chunk`)
  return chunk
}
