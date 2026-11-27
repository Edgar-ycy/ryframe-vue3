export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

// 先由原生解析器验证语法，再遍历原始 token，防止重复键被静默覆盖。
export function parseJson(source: string): JsonValue {
  let result: JsonValue
  try {
    result = JSON.parse(source)
  } catch {
    throw new Error('输入不是有效 JSON；请重新生成已校验的资源 IR')
  }
  let position = 0
  const whitespace = () => {
    while (/\s/.test(source[position] ?? '') && position < source.length) position += 1
  }
  const string = (): string => {
    const start = position++
    while (source[position] !== '"') position += source[position] === '\\' ? 2 : 1
    position += 1
    return JSON.parse(source.slice(start, position))
  }
  const value = (depth: number): void => {
    if (depth > 128) throw new Error('JSON 嵌套超过 128 层；请拆分资源配置')
    whitespace()
    const token = source[position]
    if (token === '{') {
      position += 1
      whitespace()
      const keys = new Set<string>()
      while (source[position] !== '}') {
        const key = string()
        if (keys.has(key)) throw new Error('JSON 对象包含重复字段；不接受覆盖后的资源配置')
        keys.add(key)
        whitespace()
        position += 1
        value(depth + 1)
        whitespace()
        if (source[position] === '}') break
        position += 1
        whitespace()
      }
      position += 1
    } else if (token === '[') {
      position += 1
      whitespace()
      while (source[position] !== ']') {
        value(depth + 1)
        whitespace()
        if (source[position] === ']') break
        position += 1
      }
      position += 1
    } else if (token === '"') string()
    else {
      while (position < source.length && !/[\s,\]}]/.test(source[position])) position += 1
    }
  }
  value(0)
  return result
}
