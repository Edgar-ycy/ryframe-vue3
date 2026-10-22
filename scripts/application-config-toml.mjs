import { parse, TomlError } from 'smol-toml'

export function applicationTomlError(error, label) {
  if (!(error instanceof TomlError)) {
    return new Error(`公开配置解析失败：${label}；TOML 解析器失败；请检查所选 TOML 配置`)
  }
  const position = []
  if (Number.isSafeInteger(error.line) && error.line > 0) position.push(`line ${error.line}`)
  if (Number.isSafeInteger(error.column) && error.column > 0) {
    position.push(`column ${error.column}`)
  }
  const location = position.length ? `，${position.join(' ')}` : ''
  return new Error(`公开配置解析失败：${label}；TOML 语法错误${location}；请修正所选 TOML 配置`)
}

export function parseApplicationToml(source, label) {
  try {
    return parse(source, {
      unsafeKeyBehaviour: 'throw',
      integersAsBigInt: 'asNeeded',
      // 仅限制 inline object/array 深度，不代表全部表路径的嵌套限制。
      maxDepth: 32,
    })
  } catch (error) {
    throw applicationTomlError(error, label)
  }
}
