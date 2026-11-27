export type ContractRecord = Record<string, unknown>
export type Labels = Record<'zh_cn' | 'en', string>

function isRecord(value: unknown): value is ContractRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function requireRecord(value: unknown, location: string): ContractRecord {
  if (!isRecord(value)) throw new Error(`${location}: 必须是对象`)
  return value
}

export function requireExactKeys<Key extends string>(
  value: unknown,
  expected: readonly Key[],
  location: string,
): asserts value is Record<Key, unknown> {
  const actual = Object.keys(requireRecord(value, location)).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${location}: 字段必须精确为 ${wanted.join(', ')}`)
  }
}

export function requireString(value: unknown, location: string, pattern?: RegExp): string {
  if (
    typeof value !== 'string' ||
    value.trim() !== value ||
    value.length === 0 ||
    (pattern && !pattern.test(value))
  ) {
    throw new Error(`${location}: 字符串格式无效`)
  }
  return value
}

export function requireStringRecord<Key extends string>(
  value: unknown,
  keys: readonly Key[],
  location: string,
  pattern?: RegExp,
): asserts value is Record<Key, string> {
  requireExactKeys(value, keys, location)
  for (const key of keys) requireString(value[key], `${location}.${key}`, pattern)
}

export function requireLabels(value: unknown, location: string): asserts value is Labels {
  requireStringRecord(value, ['zh_cn', 'en'], location)
}

export function getProperty(value: unknown, key: string): unknown {
  return (value as ContractRecord | null | undefined)?.[key]
}

// 保留原可选字段检查在遇到非对象时由 in 运算符报告错误的顺序。
export function hasKey(value: unknown, key: string): boolean {
  return key in (value as object)
}
