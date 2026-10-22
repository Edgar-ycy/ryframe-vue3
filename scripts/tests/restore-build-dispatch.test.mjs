import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fixture, buildEnvironment } from './restore-build-fixture.mjs'
import { buildExternalReceipt } from '../restore-build.mjs'

// 独立目标入口用于检查派生进程路径；真实 Vite 打包由 application-vite-isolation 场景覆盖。
const targetEntry = String.raw`
const fs = require('node:fs')
const path = require('node:path')
if (process.argv[2] !== 'build') throw new Error('目标入口只接受 build')
const identity = JSON.parse(fs.readFileSync('.local-tests/build/source.json', 'utf8'))
fs.writeFileSync('dist/build-identity.json', JSON.stringify({
  frontend_commit: identity.frontend_commit,
}))
fs.writeFileSync('.local-tests/target-dispatch.json', JSON.stringify({
  entry: __filename, cwd: process.cwd(), environment: process.env.APP_ENV,
}))
`

test('外部构建确实派生目标工作树的 Vite 入口，并向它传递文件选择环境', (t) => {
  const root = fixture(t)
  const environment = { ...buildEnvironment(root), APP_ENV: 'test' }
  const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const entry = path.join(root, 'node_modules/vite/target-vite.cjs')
  fs.writeFileSync(entry, targetEntry)
  fs.writeFileSync(
    path.join(root, 'node_modules/vite/package.json'),
    JSON.stringify({ version: '7.1.7', bin: { vite: './target-vite.cjs' } }),
  )
  const receipt = buildExternalReceipt(root, head, {
    environment,
    observeToolchain: () => ({
      node: process.version,
      pnpm: { pinned: '11.20.0', observed: '11.20.0' },
      vite: '7.1.7',
    }),
  })
  const dispatched = JSON.parse(
    fs.readFileSync(path.join(root, '.local-tests/target-dispatch.json')),
  )
  assert.deepEqual(dispatched, { entry, cwd: root, environment: 'test' })
  assert.equal(receipt.build.identity.frontend_commit, head)
  assert.equal(receipt.build.configuration.environment, 'test')
})
