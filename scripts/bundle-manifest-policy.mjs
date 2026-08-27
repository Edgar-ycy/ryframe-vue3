const INITIAL_CATALOG_SOURCES = new Set([
  'src/i18n/catalog/core.ts',
  'src/i18n/catalog/export-jobs.ts',
  'src/i18n/catalog/shell.ts',
])

function normalizeSource(value) {
  return value?.replaceAll('\\', '/')
}

export function collectInitialGraph(manifest) {
  const entryKeys = Object.entries(manifest)
    .filter(([, chunk]) => chunk.isEntry)
    .map(([key]) => key)
  if (entryKeys.length === 0) throw new Error('Vite manifest contains no entry chunk')

  const files = new Set()
  const keys = new Set()
  function visit(key) {
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

export function businessCatalogIsolationFailures(manifest, initialGraph, catalogSources) {
  const failures = []
  for (const rawSource of catalogSources) {
    const source = normalizeSource(rawSource)
    if (!source?.startsWith('src/i18n/catalog/')) continue
    if (source.startsWith('src/i18n/catalog/core/')) continue
    if (INITIAL_CATALOG_SOURCES.has(source)) continue

    const chunk = manifest[source]
    if (!chunk || chunk.isDynamicEntry !== true) {
      failures.push(`business catalog is not an isolated dynamic entry: ${source}`)
      continue
    }
    if (initialGraph.keys.has(source) || initialGraph.files.has(chunk.file)) {
      failures.push(`business catalog entered initial graph: ${source}`)
    }
  }
  return failures.sort()
}

export function findOptionalNamedChunk(manifest, name) {
  const chunks = Object.values(manifest).filter((chunk) => chunk.name === name)
  if (chunks.length > 1) throw new Error(`Vite manifest contains duplicate ${name} chunks`)
  return chunks[0]
}

export function findNamedChunk(manifest, name) {
  const chunk = findOptionalNamedChunk(manifest, name)
  if (!chunk) throw new Error(`Vite manifest is missing the ${name} chunk`)
  return chunk
}
