import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { inspectPrereleaseDependencies } from '../prerelease-dependency-policy.mjs'

test('仓库扫描覆盖依赖清单、工作流和递归 Action 清单', async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), 'ryframe-prerelease-'))
  context.after(() => rm(root, { force: true, recursive: true }))
  await mkdir(path.join(root, '.github', 'actions', 'nested'), { recursive: true })
  await mkdir(path.join(root, '.github', 'workflows'), { recursive: true })
  await Promise.all([
    writeFile(
      path.join(root, 'package.json'),
      JSON.stringify({ dependencies: { example: '1.2.3-beta.1', stable: '1.0.0' } }),
    ),
    writeFile(path.join(root, 'pnpm-workspace.yaml'), 'catalog:\n  tool: 4.0.0-dev.2\n'),
    writeFile(
      path.join(root, 'pnpm-lock.yaml'),
      "lockfileVersion: '9.0'\nimporters:\n  .:\n    dependencies:\n      example:\n        specifier: 1.2.3-beta.1\n        version: 1.2.3-beta.1\npackages: {}\nsnapshots: {}\n",
    ),
    writeFile(
      path.join(root, '.github', 'workflows', 'ci.yml'),
      'jobs:\n  check:\n    container: node:22.0.0-rc.1\n    steps:\n      - run: echo 9.9.9-beta.1\n',
    ),
    writeFile(
      path.join(root, '.github', 'actions', 'nested', 'action.yaml'),
      'runs:\n  using: composite\n  steps:\n    - uses: owner/action@v2.0.0-next.1\n',
    ),
  ])

  const result = await inspectPrereleaseDependencies(root)
  assert.deepEqual(
    result.ciYamlFiles.map((file) => path.relative(root, file).split(path.sep).join('/')),
    ['.github/actions/nested/action.yaml', '.github/workflows/ci.yml'],
  )
  assert.deepEqual(result.findings, [
    '.github/actions/nested/action.yaml: v2.0.0-next.1',
    '.github/workflows/ci.yml: 22.0.0-rc.1',
    'package.json: 1.2.3-beta.1',
    'pnpm-lock.yaml: 1.2.3-beta.1',
    'pnpm-workspace.yaml: 4.0.0-dev.2',
  ])
})
