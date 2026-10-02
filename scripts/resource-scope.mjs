const RESOURCE_SCOPE = /^[a-z0-9][a-z0-9_-]*[a-z0-9]$/u

/** 资源 scope 必须同时满足产品 ResourceScopeId 的完整边界。 */
export function isResourceScopeId(value) {
  return (
    typeof value === 'string' &&
    value.length >= 2 &&
    value.length <= 48 &&
    RESOURCE_SCOPE.test(value)
  )
}
