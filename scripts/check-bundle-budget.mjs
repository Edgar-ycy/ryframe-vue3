import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const dist = path.resolve('dist')
const manifest = JSON.parse(await readFile(path.join(dist, '.vite/manifest.json'), 'utf8'))
const entries = Object.entries(manifest)
const entryKeys = entries.filter(([, value]) => value.isEntry).map(([key]) => key)

if (entryKeys.length === 0) throw new Error('Vite manifest contains no entry chunk')

const initialFiles = new Set()
const visited = new Set()
function collectInitial(key) {
  if (visited.has(key)) return
  visited.add(key)
  const chunk = manifest[key]
  if (!chunk) throw new Error(`Manifest import is missing: ${key}`)
  if (chunk.file) initialFiles.add(chunk.file)
  for (const css of chunk.css ?? []) initialFiles.add(css)
  for (const imported of chunk.imports ?? []) collectInitial(imported)
}
for (const entry of entryKeys) collectInitial(entry)

async function gzipBytes(file) {
  return gzipSync(await readFile(path.join(dist, file))).byteLength
}

const initialJs = [...initialFiles].filter(file => file.endsWith('.js'))
const initialCss = [...initialFiles].filter(file => file.endsWith('.css'))
const initialJsGzip = (await Promise.all(initialJs.map(gzipBytes))).reduce((a, b) => a + b, 0)
const initialCssGzip = (await Promise.all(initialCss.map(gzipBytes))).reduce((a, b) => a + b, 0)

const limits = {
  initialJsGzip: 250 * 1024,
  initialCssGzip: 100 * 1024,
  asyncJsRaw: 500 * 1024,
}
const failures = []
if (initialJsGzip > limits.initialJsGzip) {
  failures.push(`initial gzip JS ${initialJsGzip} > ${limits.initialJsGzip}`)
}
if (initialCssGzip > limits.initialCssGzip) {
  failures.push(`initial gzip CSS ${initialCssGzip} > ${limits.initialCssGzip}`)
}

for (const [, chunk] of entries) {
  if (!chunk.file?.endsWith('.js') || initialFiles.has(chunk.file)) continue
  const bytes = (await stat(path.join(dist, chunk.file))).size
  if (bytes > limits.asyncJsRaw) failures.push(`async JS ${chunk.file} ${bytes} > ${limits.asyncJsRaw}`)
}

console.log(`Bundle budget: initial JS ${initialJsGzip} B gzip, CSS ${initialCssGzip} B gzip`)
if (failures.length > 0) throw new Error(`Bundle budget exceeded:\n${failures.join('\n')}`)
