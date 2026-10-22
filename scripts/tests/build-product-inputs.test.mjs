import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { captureSourceInventory, sourceDomains } from '../build-source-inventory.mjs'
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
