export function parseXtaskJsonReceipt(stdout: string): Record<string, unknown> {
  const lines = stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
  const values: unknown[] = []

  for (const line of lines) {
    if (!line.startsWith('{') && !line.startsWith('[')) continue
    try {
      values.push(JSON.parse(line))
    } catch {
      throw new Error('xtask 输出包含不完整的 JSON 行')
    }
  }

  if (values.length === 0) throw new Error('xtask 没有返回 JSON 收据')
  if (values.length !== 1) throw new Error('xtask 返回了多个 JSON 值')
  const [receipt] = values
  if (typeof receipt !== 'object' || receipt === null || Array.isArray(receipt)) {
    throw new Error('xtask JSON 收据必须是对象')
  }
  return Object.fromEntries(Object.entries(receipt))
}
