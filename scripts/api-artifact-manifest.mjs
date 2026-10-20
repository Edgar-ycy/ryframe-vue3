import { readFileSync } from 'node:fs'
import { parseJson } from './resource-render/json.mjs'

export function parseArtifactManifest(source) {
  const manifest = parseJson(source)
  if (
    !manifest ||
    Array.isArray(manifest) ||
    Object.keys(manifest).sort().join() !== 'files,format_version' ||
    manifest.format_version !== 1 ||
    !Array.isArray(manifest.files) ||
    !manifest.files.length ||
    manifest.files.length > 10000
  )
    throw new Error('API 派生清单必须使用版本 1 和非空 files 数组')
  const seen = new Set()
  for (const file of manifest.files) {
    if (
      typeof file !== 'string' ||
      !file.startsWith('src/') ||
      /[\\:\p{Cc}]/u.test(file) ||
      file.split('/').some((part) => !part || part === '.' || part === '..') ||
      seen.has(file)
    ) {
      throw new Error('API 派生清单包含重复或不安全的 src 相对路径')
    }
    seen.add(file)
  }
  return Object.freeze([...manifest.files])
}

export const artifactPaths = parseArtifactManifest(
  readFileSync(new URL('./api-artifact-manifest.json', import.meta.url), 'utf8'),
)
