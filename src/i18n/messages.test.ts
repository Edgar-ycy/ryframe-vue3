import { describe, expect, it } from 'vitest'
import { messageCatalogs, messages } from './messages'

function flattenMessages(value: unknown, prefix = ''): Map<string, string> {
  if (typeof value === 'string') return new Map([[prefix, value]])
  if (!isCatalog(value)) throw new Error(`语言资源 ${prefix || '<root>'} 必须是字符串或对象`)

  const entries = new Map<string, string>()
  for (const [key, nested] of Object.entries(value)) {
    const nestedPrefix = prefix ? `${prefix}.${key}` : key
    for (const [nestedKey, message] of flattenMessages(nested, nestedPrefix)) {
      entries.set(nestedKey, message)
    }
  }
  return entries
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{([A-Za-z0-9_]+)\}/gu)]
    .map(([, name]) => name)
    .filter((name): name is string => Boolean(name))
    .sort()
}

function isCatalog(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

describe('国际化资源', () => {
  it('不允许目录占用相同的顶层命名空间', () => {
    for (const locale of ['zh-CN', 'en-US'] as const) {
      const owners = new Map<string, number>()
      const duplicates: string[] = []

      for (const [index, catalog] of messageCatalogs.entries()) {
        for (const namespace of Object.keys(catalog[locale])) {
          const owner = owners.get(namespace)
          if (owner !== undefined) duplicates.push(`${namespace}: ${owner}, ${index}`)
          else owners.set(namespace, index)
        }
      }

      expect(duplicates, `${locale} 资源目录存在顶层命名空间冲突`).toEqual([])
    }
  })

  it('聚合资源包含每个已声明目录', () => {
    for (const locale of ['zh-CN', 'en-US'] as const) {
      for (const catalog of messageCatalogs) {
        expect(messages[locale]).toMatchObject(catalog[locale])
      }
    }
  })

  it('保持语言键和命名占位符一致', () => {
    const chinese = flattenMessages(messages['zh-CN'])
    const english = flattenMessages(messages['en-US'])

    expect([...english.keys()].sort()).toEqual([...chinese.keys()].sort())
    for (const [key, message] of chinese) {
      expect(placeholders(english.get(key) ?? '')).toEqual(placeholders(message))
    }
  })
})
