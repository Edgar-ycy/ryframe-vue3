import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import {
  collectInitialGraph,
  businessCatalogIsolationFailures,
  findNamedChunk,
  findOptionalNamedChunk,
} from './bundle-manifest-policy.mjs'

const dist = path.resolve('dist')
const manifest = JSON.parse(await readFile(path.join(dist, '.vite/manifest.json'), 'utf8'))
const baseline = JSON.parse(await readFile(path.resolve('scripts/bundle-baseline.json'), 'utf8'))
const entries = Object.entries(manifest)
const initialGraph = collectInitialGraph(manifest)
const initialFiles = initialGraph.files

async function gzipBytes(file) {
  return gzipSync(await readFile(path.join(dist, file))).byteLength
}

const initialJs = [...initialFiles].filter((file) => file.endsWith('.js'))
const initialCss = [...initialFiles].filter((file) => file.endsWith('.css'))
const initialJsGzip = (await Promise.all(initialJs.map(gzipBytes))).reduce((a, b) => a + b, 0)
const initialCssGzip = (await Promise.all(initialCss.map(gzipBytes))).reduce((a, b) => a + b, 0)
const i18nCoreChunk = findNamedChunk(manifest, 'i18n-core')
const i18nCoreGzip = await gzipBytes(i18nCoreChunk.file)
const apiCoreChunk = findNamedChunk(manifest, 'api-core')
const apiCoreGzip = await gzipBytes(apiCoreChunk.file)

const limits = {
  initialJsGzip: 165_000,
  initialCssGzip: 100 * 1024,
  i18nCoreGzip: 12 * 1024,
  apiCoreGzip: 8 * 1024,
  asyncJsRaw: 500 * 1024,
}
const regressionLimits = {
  initialJsGzip: baseline.initialJsGzip + Math.min(baseline.initialJsGzip * 0.03, 5 * 1024),
  initialCssGzip: baseline.initialCssGzip + Math.min(baseline.initialCssGzip * 0.03, 5 * 1024),
}
const failures = []
if (initialJsGzip > limits.initialJsGzip) {
  failures.push(`initial gzip JS ${initialJsGzip} > ${limits.initialJsGzip}`)
}
if (initialCssGzip > limits.initialCssGzip) {
  failures.push(`initial gzip CSS ${initialCssGzip} > ${limits.initialCssGzip}`)
}
if (initialJsGzip > regressionLimits.initialJsGzip) {
  failures.push(
    `initial gzip JS ${initialJsGzip} > regression limit ${regressionLimits.initialJsGzip}`,
  )
}
if (initialCssGzip > regressionLimits.initialCssGzip) {
  failures.push(
    `initial gzip CSS ${initialCssGzip} > regression limit ${regressionLimits.initialCssGzip}`,
  )
}
if (i18nCoreGzip > limits.i18nCoreGzip) {
  failures.push(`i18n-core gzip JS ${i18nCoreGzip} > ${limits.i18nCoreGzip}`)
}
if (apiCoreGzip > limits.apiCoreGzip) {
  failures.push(`api-core gzip JS ${apiCoreGzip} > ${limits.apiCoreGzip}`)
}
const catalogFiles = await readdir(path.resolve('src/i18n/catalog'), { withFileTypes: true })
const catalogSources = catalogFiles
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => `src/i18n/catalog/${entry.name}`)
failures.push(...businessCatalogIsolationFailures(manifest, initialGraph, catalogSources))
for (const domain of ['system', 'platform', 'monitor', 'agent']) {
  const chunk = findOptionalNamedChunk(manifest, `api-${domain}`)
  if (chunk && initialFiles.has(chunk.file)) failures.push(`api-${domain} entered initial graph`)
}

for (const [, chunk] of entries) {
  if (!chunk.file?.endsWith('.js') || initialFiles.has(chunk.file)) continue
  const bytes = (await stat(path.join(dist, chunk.file))).size
  if (bytes > limits.asyncJsRaw)
    failures.push(`async JS ${chunk.file} ${bytes} > ${limits.asyncJsRaw}`)
}

console.log(
  `Bundle budget: initial JS ${initialJsGzip} B gzip (baseline ${baseline.initialJsGzip} B), CSS ${initialCssGzip} B gzip (baseline ${baseline.initialCssGzip} B), i18n-core ${i18nCoreGzip} B gzip, api-core ${apiCoreGzip} B gzip`,
)
if (failures.length > 0) throw new Error(`Bundle budget exceeded:\n${failures.join('\n')}`)
