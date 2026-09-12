export function parseXtaskJsonReceipt(stdout: string): Record<string, unknown> {
  const lines = stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
  const values: { index: number; value: unknown }[] = []

  for (const [index, line] of lines.entries()) {
    try {
      values.push({ index, value: JSON.parse(line) })
    } catch {
      // Cargo 与 xtask 日志不是收据；唯一收据必须是完整的末行 JSON。
    }
  }

  if (values.length === 0) throw new Error('xtask 没有返回 JSON 收据')
  if (values.length !== 1) throw new Error('xtask 返回了多个 JSON 值')
  const [receipt] = values
  if (receipt.index !== lines.length - 1) throw new Error('xtask JSON 收据后存在未完成输出')
  if (typeof receipt.value !== 'object' || receipt.value === null || Array.isArray(receipt.value)) {
    throw new Error('xtask JSON 收据必须是对象')
  }
  return Object.fromEntries(Object.entries(receipt.value))
}
