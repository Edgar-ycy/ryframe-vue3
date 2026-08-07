export const serverStateContracts = new Map([
  ['src/app/messages/messageHooks.ts', ['useTenantQuery', 'useMutation']],
  ['src/app/settings/shellSettingsQuery.ts', ['useTenantQuery']],
  ['src/components/layout/Navbar/index.vue', ['confirmAction']],
  ['src/components/layout/index.vue', ['useShellSettingsQuery']],
  ['src/components/layout/Settings/index.vue', ['useTenantMutation']],
  ['src/hooks/useAsyncExport.ts', ['useTenantMutation']],
  ['src/views/platform/tenant/index.vue', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/profile/useProfileManagement.ts', ['useTenantQuery']],
  ['src/views/profile/useProfileMutations.ts', ['useTenantMutation']],
  ['src/views/monitor/cache/index.vue', ['useTenantQuery']],
  ['src/views/monitor/db-pool/index.vue', ['useTenantQuery']],
  ['src/views/monitor/loginlog/index.vue', ['useTenantQuery']],
  ['src/views/monitor/online/useOnlineManagement.ts', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/monitor/operlog/index.vue', ['useTenantQuery']],
  ['src/views/monitor/runtime/index.vue', ['useTenantQuery']],
  ['src/views/monitor/server/index.vue', ['useTenantQuery']],
  ['src/views/system/config/index.vue', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/system/dept/composables/useDeptManagement.ts', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/system/dict/components/DictDataDialog.vue', ['useTenantMutation']],
  ['src/views/system/dict/components/DictTypeDialog.vue', ['useTenantMutation']],
  ['src/views/system/dict/composables/useDictManagement.ts', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/system/menu/components/MenuFormDialog.vue', ['useTenantMutation']],
  ['src/views/system/menu/composables/useMenuManagement.ts', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/system/notice/useNoticeManagement.ts', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/system/permission/components/PermissionFormDialog.vue', ['useTenantMutation']],
  ['src/views/system/permission/composables/usePermissionManagement.ts', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/system/post/index.vue', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/system/role/components/RoleDataScopeDialog.vue', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/system/role/components/RoleFormDialog.vue', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/system/role/components/RolePermissionDialog.vue', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/system/role/composables/useRoleManagement.ts', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/system/user/components/PasswordResetDialog.vue', ['useTenantMutation']],
  ['src/views/system/user/components/UserFormDialog.vue', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/system/user/components/UserRoleDialog.vue', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/system/user/composables/useRoleOptions.ts', ['useTenantQuery']],
  ['src/views/system/user/composables/useUserManagement.ts', ['useTenantQuery', 'useTenantMutation']],
  ['src/views/tools/gen/useGeneratorManagement.ts', ['useTenantQuery', 'useTenantMutation']],
])

export const serverStateInventoryRoots = [
  'src/components/layout',
  'src/views',
]

export const serverStateApiImportExemptions = new Set([
  'src/views/login/index.vue',
  'src/views/redirect/index.vue',
  'src/views/reset-password/index.vue',
])

const MANUAL_PENDING_REF = /\b(?:const|let)\s+\w*(?:loading|pending|saving|submitting|uploading|generating)\w*\s*=\s*ref(?:<[^>]+>)?\(\s*(?:false|true)\s*\)/iu

/** 返回源码中从 API 模块运行时导入的本地标识符。 */
export function runtimeApiImportNames(source) {
  const names = new Set()
  const pattern = /import\s+((?:(?!\bimport\b)[\s\S])*?)\s+from\s+['"]@\/api\/modules\/[^'"]+['"]/gu
  for (const match of source.matchAll(pattern)) {
    const clause = match[1].trim()
    if (clause.startsWith('type ')) continue
    const namedStart = clause.indexOf('{')
    const namedEnd = clause.lastIndexOf('}')
    if (namedStart >= 0 && namedEnd > namedStart) {
      const namedImports = clause.slice(namedStart + 1, namedEnd).split(',')
      for (const item of namedImports) {
        const normalized = item.trim()
        if (!normalized || normalized.startsWith('type ')) continue
        const [imported, alias] = normalized.split(/\s+as\s+/u)
        names.add((alias ?? imported).trim())
      }
    }
    const defaultImport = clause.slice(0, namedStart >= 0 ? namedStart : clause.length)
      .replace(/,$/u, '')
      .trim()
    if (defaultImport && !defaultImport.startsWith('*')) names.add(defaultImport)
  }
  return names
}

export function hasRuntimeApiModuleImport(source) {
  return runtimeApiImportNames(source).size > 0
}

/** 校验一个服务端状态入口是否仍退回手工生命周期或手工请求状态。 */
export function validateServerStateSource(relative, source, requiredFragments) {
  const errors = []
  for (const fragment of requiredFragments) {
    if (!source.includes(fragment)) {
      errors.push(`${relative}: server state must use ${fragment}`)
    }
  }
  if (MANUAL_PENDING_REF.test(source)) {
    errors.push(`${relative}: manual server-state pending ref returned`)
  }
  if (hasCommentOnlyCatch(source)) {
    errors.push(`${relative}: server-state error is swallowed by an empty catch`)
  }
  if (hasMountedServerPull(source)) {
    errors.push(`${relative}: server state must not be pulled from onMounted`)
  }
  return errors
}

/** 找出管理界面中新出现但尚未登记的运行时 API 入口。 */
export function validateServerStateInventory(
  sources,
  contracts = serverStateContracts,
  exemptions = serverStateApiImportExemptions,
) {
  const errors = []
  for (const [relative, source] of sources) {
    if (
      hasRuntimeApiModuleImport(source)
      && !contracts.has(relative)
      && !exemptions.has(relative)
    ) {
      errors.push(`${relative}: runtime API entry is missing a server-state contract`)
    }
  }
  return errors
}

function hasMountedServerPull(source) {
  const apiNames = runtimeApiImportNames(source)
  for (const argument of callArguments(source, 'onMounted')) {
    for (const name of apiNames) {
      if (new RegExp(`\\b${escapeRegExp(name)}\\s*\\(`, 'u').test(argument)) return true
    }
    if (/\b(?:fetch|load|list|refresh|sync)\w*\s*\(/iu.test(argument)) return true
  }
  return false
}

function hasCommentOnlyCatch(source) {
  for (const body of blockBodiesAfter(source, /\bcatch\s*(?:\([^)]*\))?\s*\{/gu)) {
    const withoutComments = body
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .replace(/\/\/[^\r\n]*/gu, '')
      .trim()
    if (!withoutComments) return true
  }
  return false
}

function callArguments(source, functionName) {
  const results = []
  const pattern = new RegExp(`\\b${escapeRegExp(functionName)}\\s*\\(`, 'gu')
  for (const match of source.matchAll(pattern)) {
    const opening = match.index + match[0].lastIndexOf('(')
    const closing = matchingDelimiter(source, opening, '(', ')')
    if (closing >= 0) results.push(source.slice(opening + 1, closing))
  }
  return results
}

function blockBodiesAfter(source, pattern) {
  const results = []
  for (const match of source.matchAll(pattern)) {
    const opening = match.index + match[0].lastIndexOf('{')
    const closing = matchingDelimiter(source, opening, '{', '}')
    if (closing >= 0) results.push(source.slice(opening + 1, closing))
  }
  return results
}

function matchingDelimiter(source, opening, open, close) {
  let depth = 0
  let quote = ''
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let index = opening; index < source.length; index += 1) {
    const current = source[index]
    const next = source[index + 1]
    if (lineComment) {
      if (current === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (current === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (escaped) escaped = false
      else if (current === '\\') escaped = true
      else if (current === quote) quote = ''
      continue
    }
    if (current === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }
    if (current === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }
    if (current === '\'' || current === '"' || current === '`') {
      quote = current
      continue
    }
    if (current === open) depth += 1
    else if (current === close) {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}
