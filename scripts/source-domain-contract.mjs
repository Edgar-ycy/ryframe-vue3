import { spawnSync } from 'node:child_process'
import { lstatSync, realpathSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'
import { fileURLToPath } from 'node:url'

import { captureSourceInventory, sha256, sourceDomains } from './build-source-inventory.mjs'
import { environmentFiles, environmentPaths } from './build-source.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))

function syntheticInventory(relative) {
  const head = 'a'.repeat(40)
  return {
    source: {
      snapshot: { head, patch_sha256: 'b'.repeat(64), files: [], clean: true },
      worktree_fingerprint: `sha256:${'c'.repeat(64)}`,
    },
    files: [{ path: relative, sha256: sha256(relative) }],
    guard: { head, index_sha256: 'd'.repeat(64), modes_sha256: 'e'.repeat(64) },
  }
}

export function verifySourceDomainContract(frontend = root, environment = process.env) {
  const checker = environment.RYFRAME_BACKEND_SOURCE_DOMAIN_CHECK?.trim()
  if (!checker || !path.isAbsolute(checker) || !lstatSync(checker).isFile()) {
    throw new Error('消费者契约缺少后端来源分域检查器')
  }
  const inventories = [
    captureSourceInventory(frontend),
    syntheticInventory('src/new-feature.ts'),
    syntheticInventory('scripts/new-check.mjs'),
    syntheticInventory('future/new-input.dat'),
  ]
  const environmentFixtures = environmentPaths.slice(1).map((relative) => ({
    path: relative,
    content: `${relative}=fixture\n`,
  }))
  const expected = {
    domains: inventories.map(sourceDomains),
    environment_names: [...environmentPaths],
    environment_files: environmentFiles(frontend),
    environment_fixture_files: environmentFixtures.map((item) => ({
      path: item.path,
      sha256: sha256(item.content),
    })),
  }
  const python = environment.RYFRAME_PYTHON?.trim() || 'python'
  const result = spawnSync(
    python,
    [realpathSync(checker), '--frontend-dir', realpathSync(frontend)],
    {
      input: JSON.stringify({ inventories, environment_fixtures: environmentFixtures }),
      encoding: 'utf8',
      windowsHide: true,
      shell: false,
      maxBuffer: 16 * 1024 * 1024,
    },
  )
  if (result.error || result.status !== 0) {
    throw new Error('后端来源分域检查器执行失败', { cause: result.error })
  }
  let actual
  try {
    actual = JSON.parse(result.stdout)
  } catch (error) {
    throw new Error('后端来源分域检查器输出无效', { cause: error })
  }
  if (!isDeepStrictEqual(actual, expected)) throw new Error('前后端来源分域规则发生漂移')
  return actual
}

const isMain =
  process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
if (isMain) {
  verifySourceDomainContract()
  console.log('前后端构建来源三域规则一致')
}
