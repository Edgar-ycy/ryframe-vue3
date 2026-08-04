import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { buildApiArtifacts, generatedArtifactPaths } from './api-artifacts.mjs'

const mode = process.argv[2] ?? '--write'
if (!new Set(['--write', '--check']).has(mode) || process.argv.length > 3) {
  throw new Error('用法：generate-api-artifacts.mjs [--write|--check]')
}

const root = fileURLToPath(new URL('../', import.meta.url))

async function writeArtifacts(outputRoot, artifacts) {
  for (const [relative, content] of artifacts) {
    const output = path.join(outputRoot, relative)
    await mkdir(path.dirname(output), { recursive: true })
    await writeFile(output, content, 'utf8')
  }
}

async function checkArtifacts(artifacts) {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'ryframe-api-artifacts-'))
  try {
    await writeArtifacts(temporaryRoot, artifacts)
    const stale = []
    for (const relative of generatedArtifactPaths) {
      let committed
      try {
        committed = await readFile(path.join(root, relative))
      }
      catch {
        stale.push(relative)
        continue
      }
      const generated = await readFile(path.join(temporaryRoot, relative))
      if (!committed.equals(generated)) stale.push(relative)
    }
    if (stale.length > 0) {
      throw new Error(`以下 OpenAPI 派生文件不是最新版本：\n  - ${stale.join('\n  - ')}\n请运行 pnpm api:generate`)
    }
  }
  finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

const artifacts = await buildApiArtifacts(root)
if (mode === '--check') {
  await checkArtifacts(artifacts)
  console.log(`OpenAPI 派生文件只读校验通过（${artifacts.size} 个文件）`)
}
else {
  await writeArtifacts(root, artifacts)
  console.log(`已生成 OpenAPI 派生文件（${artifacts.size} 个文件）`)
}
