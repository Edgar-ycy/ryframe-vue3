import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { captureSourceInventory } from '../build-source-inventory.ts'
import { sourceDomains } from '../build-source-domains.ts'
import { fixture } from './restore-build-fixture.mjs'

test('Vite 配置与身份的完整本地模块依赖同时绑定产品和工具摘要', (t) => {
  const root = fixture(t)
  const repository = new URL('../../', import.meta.url)
  const visited = new Set()
  const visit = (relative) => {
    if (visited.has(relative)) return
    visited.add(relative)
    const source = fs.readFileSync(new URL(relative, repository), 'utf8')
    for (const match of source.matchAll(/\bfrom\s+['"](?<module>\.[^'"]+)['"]/gu)) {
      const dependency = path.posix.normalize(
        path.posix.join(path.posix.dirname(relative), match.groups.module),
      )
      visit(dependency)
    }
    if (!relative.startsWith('scripts/')) return
    const target = path.join(root, relative)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, source)
  }
  visit('scripts/frontend-tool-config.mjs')
  visit('scripts/build-identity.mjs')
  const before = sourceDomains(captureSourceInventory(root))
  for (const relative of [...visited].filter((file) => file.startsWith('scripts/'))) {
    assert.ok(before.product.frontend.files.includes(relative), `${relative} 缺少产品来源绑定`)
    assert.ok(before.tools.files.includes(relative), `${relative} 缺少工具来源绑定`)
    const target = path.join(root, relative)
    const original = fs.readFileSync(target)
    fs.appendFileSync(target, '\n// 验证生产输入漂移\n')
    const after = sourceDomains(captureSourceInventory(root))
    assert.notEqual(after.product.frontend.sha256, before.product.frontend.sha256, relative)
    assert.notEqual(after.tools.sha256, before.tools.sha256, relative)
    fs.writeFileSync(target, original)
  }
})

test('专用页面配置只影响工具，测试类型配置继续绑定产品和完整来源', (t) => {
  const root = fixture(t)
  const generated = path.join(root, 'playwright.generated.config.ts')
  const types = path.join(root, 'tsconfig.test.json')
  fs.writeFileSync(generated, '// 受控验收配置\n')
  fs.writeFileSync(types, '{"include":["tests/**/*.ts"]}\n')
  const before = sourceDomains(captureSourceInventory(root))
  fs.appendFileSync(generated, '// 配置字节变化\n')
  const changedTool = sourceDomains(captureSourceInventory(root))
  assert.deepEqual(before.product, changedTool.product)
  assert.notDeepEqual(before.tools, changedTool.tools)
  assert.notDeepEqual(before.full, changedTool.full)
  fs.appendFileSync(types, '\n')
  const changedTypes = sourceDomains(captureSourceInventory(root))
  assert.notDeepEqual(changedTool.product, changedTypes.product)
  assert.notDeepEqual(changedTool.tools, changedTypes.tools)
  assert.notDeepEqual(changedTool.full, changedTypes.full)
})

test('冻结与现行 lint 和格式化配置都归入工具来源', () => {
  const configurations = [
    'eslint.config.js',
    'eslint.config.ts',
    'prettier.config.mjs',
    'prettier.config.ts',
    'stylelint.config.js',
    'stylelint.config.ts',
  ]
  const head = 'a'.repeat(40)
  const sha256 = 'b'.repeat(64)
  const inventory = {
    source: {
      snapshot: { head, patch_sha256: sha256, files: [], clean: true },
      worktree_fingerprint: `sha256:${sha256}`,
    },
    files: [...configurations, 'src/main.ts'].sort().map((path) => ({ path, sha256 })),
    guard: { head, index_sha256: sha256, modes_sha256: sha256 },
  }
  const domains = sourceDomains(inventory)
  assert.deepEqual(domains.tools.files, configurations)
  assert.deepEqual(domains.product.frontend.files, ['src/main.ts'])
  assert.deepEqual(domains.full, inventory)
})
