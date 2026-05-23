/**
 * 蛇形命名 → 驼峰命名转换
 */
export function toCamel<T = any>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(toCamel) as T
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as object).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
      acc[camelKey] = toCamel((obj as Record<string, any>)[key])
      return acc
    }, {} as Record<string, any>) as T
  }
  return obj
}

/**
 * 驼峰命名 → 蛇形命名转换
 */
export function toSnake<T = any>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(toSnake) as T
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as object).reduce((acc, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      acc[snakeKey] = toSnake((obj as Record<string, any>)[key])
      return acc
    }, {} as Record<string, any>) as T
  }
  return obj
}
