import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('AutoImport 只声明 Vue composition primitives', async () => {
  const config = await readFile(new URL('../../vite.config.ts', import.meta.url), 'utf8')
  const start = config.indexOf('AutoImport({')
  const end = config.indexOf('\n      }),', start)
  assert.ok(start >= 0 && end > start, '未找到 AutoImport 配置')
  const autoImport = config.slice(start, end)
  assert.match(autoImport, /imports: \[\{ vue: vueCompositionPrimitives \}\]/u)
  assert.doesNotMatch(autoImport, /element-plus|pinia|vue-router/u)
})

test('模板组件继续自动解析并保留可提交的组件声明', async () => {
  const [config, declarations, ignore] = await Promise.all([
    readFile(new URL('../../vite.config.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/components.d.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../.gitignore', import.meta.url), 'utf8'),
  ])
  assert.match(config, /Components\(\{[\s\S]*dts: 'src\/components\.d\.ts'/u)
  assert.match(declarations, /interface GlobalComponents/u)
  assert.doesNotMatch(ignore, /^src\/components\.d\.ts$/mu)
})

test('运行时全局声明不再包含 Router、Pinia 或 Element Plus 服务', async () => {
  const declarations = await readFile(
    new URL('../../src/auto-imports.d.ts', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(declarations, /element-plus|pinia|vue-router/u)
  assert.match(declarations, /const computed: typeof import\('vue'\)\.computed/u)
})
