import { isDeepStrictEqual } from 'node:util'
import {
  canonicalDigest,
  exactObject,
  validateSourceInventory,
  type InventoryFile,
  type SourceInventory,
} from './build-source-inventory.ts'

type SourceGroup = {
  sha256: string
  files: string[]
}

type SourceDomains = {
  product: { frontend: SourceGroup }
  tools: SourceGroup
  full: SourceInventory
}

function frontendProduct(relative: string): boolean {
  const first = relative.split('/')[0]
  if (['src', 'public', 'openapi'].includes(first)) return true
  // Vite 直接或间接导入的配置与身份实现也会改变生产产物。
  if (
    [
      'scripts/application-config.mjs',
      'scripts/application-config-files.mjs',
      'scripts/application-config-paths.mjs',
      'scripts/application-config-toml.mjs',
      'scripts/frontend-tool-config.mjs',
      'scripts/build-identity.mjs',
      'scripts/resource-render/json.mjs',
      'scripts/resource-render/json.ts',
    ].includes(relative)
  )
    return true
  if (relative === 'tsconfig.test.json') return true
  if (
    frontendTool(relative) ||
    [
      '.editorconfig',
      '.gitattributes',
      '.gitignore',
      '.prettierignore',
      'ARCHITECTURE.md',
      'ARCHITECTURE.en.md',
      'CHANGELOG.md',
      'CHANGELOG.en.md',
      'LICENSE',
      'README.md',
      'README.en.md',
    ].includes(relative)
  )
    return false
  return true
}

function frontendTool(relative: string): boolean {
  const first = relative.split('/')[0]
  return (
    relative === 'config/tools.json' ||
    ['scripts', 'tests', '.github'].includes(first) ||
    [
      'eslint.config.js',
      'eslint.config.ts',
      'playwright.config.ts',
      'playwright.real.config.ts',
      'playwright.generated.config.ts',
      'tsconfig.test.json',
      'prettier.config.mjs',
      'prettier.config.ts',
      'stylelint.config.js',
      'stylelint.config.ts',
      'vitest.config.ts',
    ].includes(relative)
  )
}

function sourceGroup(files: readonly InventoryFile[], selected: string[]): SourceGroup {
  const byPath = new Map(files.map((item) => [item.path, item] as const))
  const values = selected.map((relative) => byPath.get(relative))
  return { sha256: canonicalDigest(values), files: selected }
}

export function sourceDomains(input: unknown): SourceDomains {
  const inventory = validateSourceInventory(input)
  const product = inventory.files
    .filter((item) => frontendProduct(item.path))
    .map((item) => item.path)
  const tools = inventory.files.filter((item) => frontendTool(item.path)).map((item) => item.path)
  return {
    product: { frontend: sourceGroup(inventory.files, product) },
    tools: sourceGroup(inventory.files, tools),
    full: structuredClone(inventory),
  }
}

export function validateSourceDomains(value: unknown): SourceDomains {
  exactObject(value, ['product', 'tools', 'full'], '构建来源分域字段无效')
  exactObject(value.product, ['frontend'], '前端产品来源角色无效')
  if (!isDeepStrictEqual(value, sourceDomains(validateSourceInventory(value.full)))) {
    throw new Error('构建来源分域与完整来源清单不一致')
  }
  return value as SourceDomains
}
