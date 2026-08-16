/** 将重定向通配参数规范为站内绝对路径，避免生成以双斜杠开头的位置。 */
export function normalizeRedirectPath(value: unknown): string {
  const path = Array.isArray(value)
    ? value.join('/')
    : typeof value === 'string'
      ? value
      : ''
  const normalized = path.trim().replace(/^\/+/, '').replace(/\/{2,}/g, '/')
  return normalized ? `/${normalized}` : '/'
}
