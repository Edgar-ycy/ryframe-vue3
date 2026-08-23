/** 创建只允许解析本地 OpenAPI 引用的解析器。 */
export function createLocalReferenceResolver(document, errors) {
  return function resolveLocalReference(value, location) {
    const reference = value?.$ref
    if (!reference) return value
    if (!reference.startsWith('#/')) {
      errors.push(`${location}: only local OpenAPI references are supported`)
      return undefined
    }

    let resolved = document
    for (const token of reference.slice(2).split('/')) {
      const key = token.replaceAll('~1', '/').replaceAll('~0', '~')
      resolved = resolved?.[key]
    }
    if (!resolved) errors.push(`${location}: unresolved OpenAPI reference ${reference}`)
    return resolved
  }
}
