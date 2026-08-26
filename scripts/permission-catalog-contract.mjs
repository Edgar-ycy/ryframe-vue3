const permissionPattern = /^[a-z][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)+$/u

export function requirePermissionCatalog(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} 缺少 x-ryframe-permission-catalog`)
  }
  if (value.version !== 1 || !Array.isArray(value.codes) || value.codes.length === 0) {
    throw new Error(`${label} 的权限目录版本或 codes 无效`)
  }

  const codes = value.codes.map((code, index) => {
    if (typeof code !== 'string' || !permissionPattern.test(code)) {
      throw new Error(`${label} 的权限目录第 ${index + 1} 项不是合法权限码`)
    }
    return code
  })
  const canonical = [...new Set(codes)].sort()
  if (canonical.length !== codes.length || canonical.some((code, index) => code !== codes[index])) {
    throw new Error(`${label} 的权限目录必须按字典序排列且不重复`)
  }
  return Object.freeze(codes)
}
