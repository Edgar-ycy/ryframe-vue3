import { readFile, readdir } from 'node:fs/promises'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'
import ts from 'typescript'

import { apiPrefixContractViolation } from './api-prefix-contract.mjs'
import { apiVersionContractViolation } from './api-version-contract.mjs'
import { requirePermissionCatalog } from './permission-catalog-contract.mjs'

const contractPath = new URL('../openapi/openapi.json', import.meta.url)
const packagePath = new URL('../package.json', import.meta.url)
const pageRegistryPath = new URL('../src/router/pageRegistry.ts', import.meta.url)
const featuresPath = new URL('../src/features/', import.meta.url)
const passwordPolicyPath = new URL(
  '../src/shared/security/passwordPolicy.generated.json',
  import.meta.url,
)
const noticePolicyPath = new URL(
  '../src/shared/markdown/noticePolicy.generated.json',
  import.meta.url,
)
const apiPrefixPath = new URL(
  '../src/shared/config/apiPrefix.generated.json',
  import.meta.url,
)
const document = JSON.parse(await readFile(contractPath, 'utf8'))
const packageDocument = JSON.parse(await readFile(packagePath, 'utf8'))
const generatedPasswordPolicy = JSON.parse(await readFile(passwordPolicyPath, 'utf8'))
const generatedNoticePolicy = JSON.parse(await readFile(noticePolicyPath, 'utf8'))
const generatedApiPrefix = JSON.parse(await readFile(apiPrefixPath, 'utf8'))
const errors = []

const apiVersionViolation = apiVersionContractViolation(packageDocument, document)
if (apiVersionViolation) {
  errors.push(apiVersionViolation)
}

try {
  requirePermissionCatalog(document['x-ryframe-permission-catalog'], 'openapi/openapi.json')
}
catch (error) {
  errors.push(error instanceof Error ? error.message : String(error))
}

const contractDescription = document.info?.description ?? ''
for (const required of [
  'message',
  'request_id',
  'error_key',
  'details',
  'items/page/page_size/total/total_pages/max_page_size',
]) {
  if (!contractDescription.includes(required)) {
    errors.push(`OpenAPI description does not document current response field: ${required}`)
  }
}
for (const removed of ['"msg":', '"rows":']) {
  if (contractDescription.includes(removed)) {
    errors.push(`OpenAPI description still documents removed response field: ${removed}`)
  }
}

function propertyName(property) {
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
    return property.name.text
  }
  return undefined
}

function staticString(node, constants = new Map()) {
  if (node && ts.isStringLiteral(node)) return node.text
  if (node && ts.isIdentifier(node)) return constants.get(node.text)
  return undefined
}

function staticStringArray(node, constants = new Map()) {
  if (!node || !ts.isArrayLiteralExpression(node)) return undefined
  const values = node.elements.map(element => staticString(element, constants))
  return values.every(value => typeof value === 'string') ? values : undefined
}

async function readFeatureRegistry() {
  const entries = new Map()
  const directories = await readdir(featuresPath, { withFileTypes: true })
  for (const directory of directories) {
    if (!directory.isDirectory()) continue
    const manifestPath = new URL(`./${directory.name}/manifest.ts`, featuresPath)
    let source
    try {
      source = await readFile(manifestPath, 'utf8')
    }
    catch (error) {
      if (error?.code === 'ENOENT') continue
      throw error
    }
    const sourceFile = ts.createSourceFile(
      manifestPath.pathname,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const constants = new Map()
    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) continue
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)
          && declaration.initializer
          && ts.isStringLiteral(declaration.initializer)) {
          constants.set(declaration.name.text, declaration.initializer.text)
        }
      }
    }
    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) continue
      for (const declaration of statement.declarationList.declarations) {
        const initializer = declaration.initializer
        if (!initializer
          || !ts.isCallExpression(initializer)
          || !ts.isIdentifier(initializer.expression)
          || initializer.expression.text !== 'defineFeatureManifest'
          || initializer.arguments.length !== 1
          || !ts.isObjectLiteralExpression(initializer.arguments[0])) continue
        const fields = new Map()
        for (const field of initializer.arguments[0].properties) {
          if (ts.isPropertyAssignment(field)) fields.set(propertyName(field), field.initializer)
        }
        const routeKeyNode = fields.get('routeKey')
        const routePathNode = fields.get('path')
        const capabilityCode = staticString(fields.get('capabilityCode'), constants)
        const permissionCode = staticString(fields.get('permissionCode'), constants)
        const routeKey = staticString(routeKeyNode, constants)
        const routePath = staticString(routePathNode, constants)
        const allowedVariants = staticStringArray(fields.get('allowedVariants'), constants)
        if (!capabilityCode
          || !permissionCode
          || !routeKey
          || !routePath?.startsWith('/')
          || !allowedVariants?.length
          || new Set(allowedVariants).size !== allowedVariants.length
          || !fields.has('page')
          || !fields.has('planConfigEditor')) {
          errors.push(
            `${manifestPath.pathname}: feature manifest requires static capabilityCode, `
            + 'permissionCode, routeKey, path, unique allowedVariants, page, and planConfigEditor',
          )
          continue
        }
        if (entries.has(routeKey)) {
          errors.push(`feature manifests contain duplicate route_key ${routeKey}`)
          continue
        }
        entries.set(routeKey, {
          allowedVariants,
          capabilityCode,
          hasComponent: true,
          permissionCode,
        })
      }
    }
  }
  return entries
}

function readPermissionRouteKeys(source, featureEntries) {
  const sourceFile = ts.createSourceFile(
    pageRegistryPath.pathname,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  let registry
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)
        || declaration.name.text !== 'permissionRouteKeys'
        || !declaration.initializer) continue
      const initializer = declaration.initializer
      if (ts.isCallExpression(initializer)
        && initializer.arguments.length === 1
        && ts.isObjectLiteralExpression(initializer.arguments[0])) {
        registry = initializer.arguments[0]
      }
      else if (ts.isObjectLiteralExpression(initializer)) {
        registry = initializer
      }
    }
  }
  if (!registry) {
    errors.push('src/router/pageRegistry.ts: permissionRouteKeys object literal is missing')
    return new Map()
  }

  const entries = new Map()
  for (const property of registry.properties) {
    if (ts.isSpreadAssignment(property)
      && ts.isIdentifier(property.expression)
      && property.expression.text === 'featurePermissionRouteKeys') {
      for (const [routeKey, feature] of featureEntries) {
        if (entries.has(feature.permissionCode)) {
          errors.push(`permissionRouteKeys contains duplicate permission ${feature.permissionCode}`)
        }
        entries.set(feature.permissionCode, routeKey)
      }
      continue
    }
    if (!ts.isPropertyAssignment(property)) {
      errors.push('permissionRouteKeys may only contain static entries or featurePermissionRouteKeys')
      continue
    }
    const permissionCode = propertyName(property)
    const routeKey = staticString(property.initializer)
    if (!permissionCode || !routeKey) {
      errors.push('permissionRouteKeys entries must use static string keys and values')
      continue
    }
    if (entries.has(permissionCode)) {
      errors.push(`permissionRouteKeys contains duplicate permission ${permissionCode}`)
    }
    entries.set(permissionCode, routeKey)
  }
  return entries
}

function readPageRegistry(source, featureEntries) {
  const sourceFile = ts.createSourceFile(
    pageRegistryPath.pathname,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  let registry

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)
        && declaration.name.text === 'menuPageRegistry'
        && declaration.initializer
        && ts.isObjectLiteralExpression(declaration.initializer)) {
        registry = declaration.initializer
      }
    }
  }

  if (!registry) {
    errors.push('src/router/pageRegistry.ts: menuPageRegistry object literal is missing')
    return new Map()
  }

  const entries = new Map()
  for (const property of registry.properties) {
    if (ts.isSpreadAssignment(property)
      && ts.isIdentifier(property.expression)
      && property.expression.text === 'featureMenuPageRegistry') {
      for (const [routeKey, entry] of featureEntries) entries.set(routeKey, entry)
      continue
    }
    if (!ts.isPropertyAssignment(property)) {
      errors.push('menuPageRegistry may only contain explicit entries or featureMenuPageRegistry')
      continue
    }
    const routeKey = propertyName(property)
    if (!routeKey || !ts.isObjectLiteralExpression(property.initializer)) {
      errors.push('menuPageRegistry entries must use static keys and object literal values')
      continue
    }
    if (entries.has(routeKey)) {
      errors.push(`menuPageRegistry contains duplicate route_key ${routeKey}`)
      continue
    }

    const fields = new Map()
    for (const field of property.initializer.properties) {
      if (ts.isPropertyAssignment(field)) fields.set(propertyName(field), field.initializer)
    }
    const routePath = fields.get('path')
    if (!routePath || !ts.isStringLiteral(routePath) || !routePath.text.startsWith('/')) {
      errors.push(`menuPageRegistry.${routeKey}: path must be a static absolute path`)
    }
    entries.set(routeKey, { hasComponent: fields.has('component') })
  }
  return entries
}

const featureRegistry = await readFeatureRegistry()
const pageRegistrySource = await readFile(pageRegistryPath, 'utf8')
const pageRegistry = readPageRegistry(pageRegistrySource, featureRegistry)
const permissionRouteKeys = readPermissionRouteKeys(pageRegistrySource, featureRegistry)
const routePermissions = new Map()
for (const [permissionCode, routeKey] of permissionRouteKeys) {
  if (!routePermissions.has(routeKey)) routePermissions.set(routeKey, [])
  routePermissions.get(routeKey).push(permissionCode)
}
const menuRouteExtension = document['x-ryframe-menu-routes']
const contractRoutes = new Map()

if (!menuRouteExtension || typeof menuRouteExtension !== 'object') {
  errors.push('OpenAPI is missing x-ryframe-menu-routes')
}
else {
  if (menuRouteExtension.version !== 2) {
    errors.push(`unsupported menu route contract version: ${menuRouteExtension.version}`)
  }
  if (!Array.isArray(menuRouteExtension.routes)) {
    errors.push('x-ryframe-menu-routes.routes must be an array')
  }
  else {
    for (const [index, route] of menuRouteExtension.routes.entries()) {
      const routeKey = route?.route_key
      const name = route?.name
      const titleKey = route?.title_key
      const menuType = route?.menu_type
      if (typeof routeKey !== 'string'
        || !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(routeKey)) {
        errors.push(`menu route contract entry ${index} has an invalid route_key`)
        continue
      }
      if (!['M', 'C'].includes(menuType)) {
        errors.push(`menu route contract entry ${routeKey} has an invalid menu_type`)
        continue
      }
      if (typeof name !== 'string' || name.trim() !== name || name.length === 0) {
        errors.push(`menu route contract entry ${routeKey} has an invalid name`)
      }
      if (typeof titleKey !== 'string' || !/^[A-Za-z][A-Za-z0-9]*$/.test(titleKey)) {
        errors.push(`menu route contract entry ${routeKey} has an invalid title_key`)
      }
      if (contractRoutes.has(routeKey)) {
        errors.push(`menu route contract contains duplicate route_key ${routeKey}`)
        continue
      }
      const permissionCode = route?.permission_code ?? null
      const capabilityCode = route?.capability_code ?? null
      if (permissionCode !== null && typeof permissionCode !== 'string') {
        errors.push(`menu route contract entry ${routeKey} has an invalid permission_code`)
      }
      if (capabilityCode !== null && typeof capabilityCode !== 'string') {
        errors.push(`menu route contract entry ${routeKey} has an invalid capability_code`)
      }
      contractRoutes.set(routeKey, { capabilityCode, menuType, permissionCode })
    }
  }
}

if (contractRoutes.size < 21) {
  errors.push(`expected at least 21 menu route contracts, found ${contractRoutes.size}`)
}
for (const [routeKey, contract] of contractRoutes) {
  const entry = pageRegistry.get(routeKey)
  if (!entry) {
    errors.push(`menuPageRegistry is missing backend route_key ${routeKey}`)
    continue
  }
  if (contract.menuType === 'C' && !entry.hasComponent) {
    errors.push(`menuPageRegistry.${routeKey}: page menu must declare a component`)
  }
  if (contract.menuType === 'M' && entry.hasComponent) {
    errors.push(`menuPageRegistry.${routeKey}: directory menu must not declare a component`)
  }
  const permissions = routePermissions.get(routeKey) ?? []
  if (permissions.length > 1) {
    errors.push(`permissionRouteKeys maps multiple page permissions to ${routeKey}`)
  }
  const expectedPermission = permissions[0] ?? null
  if (contract.permissionCode !== expectedPermission) {
    errors.push(
      `menu route contract ${routeKey}: permission_code must be `
      + `${JSON.stringify(expectedPermission)}, found ${JSON.stringify(contract.permissionCode)}`,
    )
  }
  const expectedCapability = featureRegistry.get(routeKey)?.capabilityCode ?? null
  if (contract.capabilityCode !== expectedCapability) {
    errors.push(
      `menu route contract ${routeKey}: capability_code must be `
      + `${JSON.stringify(expectedCapability)}, found ${JSON.stringify(contract.capabilityCode)}`,
    )
  }
}
for (const routeKey of pageRegistry.keys()) {
  if (!contractRoutes.has(routeKey)) {
    errors.push(`menuPageRegistry contains undeclared route_key ${routeKey}`)
  }
}

for (const [permissionCode, routeKey] of permissionRouteKeys) {
  if (!pageRegistry.has(routeKey)) {
    errors.push(`permissionRouteKeys.${permissionCode}: unknown route_key ${routeKey}`)
  }
}

function sortedUniqueStrings(value, location) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    errors.push(`${location}: expected a string array`)
    return []
  }
  if (new Set(value).size !== value.length) errors.push(`${location}: contains duplicates`)
  return [...value].sort()
}

function validateProductCapabilityContract() {
  const extension = document['x-ryframe-product-capabilities']
  if (!extension || typeof extension !== 'object' || extension.version !== 1) {
    errors.push('OpenAPI is missing x-ryframe-product-capabilities version 1')
    return new Map()
  }
  if (!Array.isArray(extension.capabilities)) {
    errors.push('x-ryframe-product-capabilities.capabilities must be an array')
    return new Map()
  }

  const manifestsByCapability = new Map()
  for (const [routeKey, manifest] of featureRegistry) {
    if (manifestsByCapability.has(manifest.capabilityCode)) {
      errors.push(`feature manifests contain duplicate capability ${manifest.capabilityCode}`)
      continue
    }
    manifestsByCapability.set(manifest.capabilityCode, { ...manifest, routeKey })
  }

  const capabilities = new Map()
  for (const [index, capability] of extension.capabilities.entries()) {
    const location = `x-ryframe-product-capabilities.capabilities[${index}]`
    if (!capability || typeof capability.code !== 'string' || !capability.code) {
      errors.push(`${location}: missing capability code`)
      continue
    }
    if (capabilities.has(capability.code)) {
      errors.push(`${location}: duplicate capability ${capability.code}`)
      continue
    }
    const dependencies = sortedUniqueStrings(capability.dependencies, `${location}.dependencies`)
    const conflicts = sortedUniqueStrings(capability.conflicts, `${location}.conflicts`)
    const routeKeys = sortedUniqueStrings(capability.route_keys, `${location}.route_keys`)
    const permissionCodes = sortedUniqueStrings(
      capability.permission_codes,
      `${location}.permission_codes`,
    )
    sortedUniqueStrings(
      capability.default_admin_permissions,
      `${location}.default_admin_permissions`,
    )
    sortedUniqueStrings(
      capability.deployment_dependencies,
      `${location}.deployment_dependencies`,
    )
    sortedUniqueStrings(capability.client_config_fields, `${location}.client_config_fields`)
    if (typeof capability.deployment_available !== 'boolean') {
      errors.push(`${location}.deployment_available: expected boolean`)
    }
    if (!Array.isArray(capability.variants) || capability.variants.length === 0) {
      errors.push(`${location}.variants: expected a non-empty array`)
    }
    const variants = (capability.variants ?? []).map((variant, variantIndex) => {
      if (!variant
        || typeof variant.code !== 'string'
        || !variant.code
        || !Number.isSafeInteger(variant.schema_version)
        || variant.schema_version < 1) {
        errors.push(`${location}.variants[${variantIndex}]: invalid code or schema_version`)
        return undefined
      }
      return variant.code
    }).filter(Boolean)
    if (new Set(variants).size !== variants.length) {
      errors.push(`${location}.variants: duplicate variant code`)
    }
    capabilities.set(capability.code, {
      conflicts,
      dependencies,
      permissionCodes,
      routeKeys,
      variants: [...variants].sort(),
    })
  }

  const backendCodes = [...capabilities.keys()].sort()
  const frontendCodes = [...manifestsByCapability.keys()].sort()
  if (!isDeepStrictEqual(backendCodes, frontendCodes)) {
    errors.push(
      'feature capability codes do not exactly match x-ryframe-product-capabilities: '
      + `frontend=${JSON.stringify(frontendCodes)}, backend=${JSON.stringify(backendCodes)}`,
    )
  }
  for (const [capabilityCode, manifest] of manifestsByCapability) {
    const capability = capabilities.get(capabilityCode)
    if (!capability) continue
    if (!isDeepStrictEqual(capability.routeKeys, [manifest.routeKey].sort())) {
      errors.push(`${capabilityCode}: manifest route_key does not exactly match backend route_keys`)
    }
    if (!isDeepStrictEqual(capability.variants, [...manifest.allowedVariants].sort())) {
      errors.push(`${capabilityCode}: manifest allowedVariants do not exactly match backend variants`)
    }
    if (!capability.permissionCodes.includes(manifest.permissionCode)) {
      errors.push(`${capabilityCode}: manifest permissionCode is absent from backend permission_codes`)
    }
  }
  for (const [capabilityCode, capability] of capabilities) {
    for (const dependency of capability.dependencies) {
      if (!capabilities.has(dependency)) {
        errors.push(`${capabilityCode}: unknown dependency ${dependency}`)
      }
    }
    for (const conflict of capability.conflicts) {
      if (!capabilities.has(conflict)) errors.push(`${capabilityCode}: unknown conflict ${conflict}`)
    }
  }
  return capabilities
}

function validateCapabilityRouteContract(capabilities) {
  const extension = document['x-ryframe-route-contract']
  if (!extension || typeof extension !== 'object' || extension.version !== 1) {
    errors.push('OpenAPI is missing x-ryframe-route-contract version 1')
    return
  }
  if (!Array.isArray(extension.routes)) {
    errors.push('x-ryframe-route-contract.routes must be an array')
    return
  }
  const routeKeys = new Set()
  const boundPermissions = new Map()
  for (const [index, route] of extension.routes.entries()) {
    const location = `x-ryframe-route-contract.routes[${index}]`
    if (!route
      || typeof route.source !== 'string'
      || typeof route.handler !== 'string'
      || typeof route.method !== 'string'
      || typeof route.path !== 'string'
      || typeof route.capability_code !== 'string') {
      errors.push(`${location}: malformed route binding`)
      continue
    }
    const key = `${route.method.toUpperCase()} ${route.path}`
    if (routeKeys.has(key)) errors.push(`${location}: duplicate route binding ${key}`)
    routeKeys.add(key)
    if (!route.path.startsWith('/api/v1/')) errors.push(`${location}: path must use /api/v1`)
    const capability = capabilities.get(route.capability_code)
    if (!capability) {
      errors.push(`${location}: unknown capability_code ${route.capability_code}`)
      continue
    }
    if (route.permission_code !== null && typeof route.permission_code !== 'string') {
      errors.push(`${location}: permission_code must be string or null`)
      continue
    }
    if (route.permission_code && !capability.permissionCodes.includes(route.permission_code)) {
      errors.push(`${location}: permission_code is outside the capability descriptor`)
    }
    if (route.permission_code) {
      if (!boundPermissions.has(route.capability_code)) {
        boundPermissions.set(route.capability_code, new Set())
      }
      boundPermissions.get(route.capability_code).add(route.permission_code)
    }
  }
  for (const [capabilityCode, capability] of capabilities) {
    const actual = [...(boundPermissions.get(capabilityCode) ?? [])].sort()
    if (!isDeepStrictEqual(actual, capability.permissionCodes)) {
      errors.push(`${capabilityCode}: route contract does not bind every descriptor permission`)
    }
  }
}

const productCapabilities = validateProductCapabilityContract()
validateCapabilityRouteContract(productCapabilities)

const expectedPasswordPolicy = {
  version: 1,
  min_length: 8,
  max_length: 72,
  pattern: '^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[!-~]{8,72}$',
  allowed_characters: 'ascii_graphic',
  required_classes: ['uppercase', 'lowercase', 'digit', 'special'],
}
const passwordPolicyExtension = document['x-ryframe-password-policy']
if (!isDeepStrictEqual(passwordPolicyExtension, expectedPasswordPolicy)) {
  errors.push('OpenAPI password policy does not match the canonical strong policy')
}
if (!isDeepStrictEqual(generatedPasswordPolicy, passwordPolicyExtension)) {
  errors.push('generated password policy is not synchronized with OpenAPI')
}
for (const [schemaName, fieldName] of [
  ['ChangePasswordRequest', 'new_password'],
  ['CompletePasswordResetRequest', 'new_password'],
  ['CreateTenantDto', 'admin_password'],
]) {
  const field = document.components?.schemas?.[schemaName]?.properties?.[fieldName]
  if (field?.minLength !== expectedPasswordPolicy.min_length
    || field?.maxLength !== expectedPasswordPolicy.max_length
    || field?.pattern !== expectedPasswordPolicy.pattern) {
    errors.push(`${schemaName}.${fieldName}: schema does not expose the password policy`)
  }
}

const expectedNoticePolicy = {
  version: 1,
  content_markdown: {
    min_utf8_bytes: 1,
    max_utf8_bytes: 60_000,
  },
}
const noticePolicyExtension = document['x-ryframe-notice-policy']
if (!isDeepStrictEqual(noticePolicyExtension, expectedNoticePolicy)) {
  errors.push('OpenAPI notice policy does not match the canonical Markdown byte policy')
}
if (!isDeepStrictEqual(generatedNoticePolicy, noticePolicyExtension)) {
  errors.push('generated notice policy is not synchronized with OpenAPI')
}
for (const schemaName of ['CreateNoticeDto', 'UpdateNoticeDto']) {
  const properties = document.components?.schemas?.[schemaName]?.properties
  const field = properties?.content_markdown
  if (properties?.content !== undefined
    || field?.minLength !== expectedNoticePolicy.content_markdown.min_utf8_bytes
    || field?.maxLength !== expectedNoticePolicy.content_markdown.max_utf8_bytes) {
    errors.push(`${schemaName}.content_markdown: schema does not expose the notice policy`)
  }
}
const noticeResponseProperties = document.components?.schemas?.NoticeVo?.properties
if (noticeResponseProperties?.content !== undefined
  || noticeResponseProperties?.content_markdown?.type !== 'string') {
  errors.push('NoticeVo must expose content_markdown and must not expose legacy content')
}

if (!String(document.openapi).startsWith('3.')) {
  errors.push(`unsupported OpenAPI version: ${document.openapi ?? '<missing>'}`)
}
if (document.info?.title !== 'RyFrame API') {
  errors.push(`unexpected API title: ${document.info?.title ?? '<missing>'}`)
}

const paths = Object.entries(document.paths ?? {})
const apiPrefixExtension = document['x-ryframe-api-prefix']
if (apiPrefixContractViolation(apiPrefixExtension)) {
  errors.push('OpenAPI is missing the canonical API prefix contract')
}
else {
  if (!isDeepStrictEqual(generatedApiPrefix, apiPrefixExtension)) {
    errors.push('generated API prefix is not synchronized with OpenAPI')
  }
  for (const [path] of paths) {
    if (!path.startsWith(`${apiPrefixExtension.value}/`)
      && !['/livez', '/readyz'].includes(path)) {
      errors.push(`${path}: path does not use the canonical API prefix`)
    }
  }
}
const operationIds = new Set()
const bodylessWriteAllowlist = new Set([
  // 这些操作的语义完全由路径、身份或请求头决定，后端不接收 JSON 请求体。
  'post_auth_logout',
  'post_auth_refresh',
  'post_auth_ws_ticket',
  'post_monitor_jobs_by_id_retry',
  'post_monitor_schedules_by_id_run',
  'post_platform_product_plans_by_plan_id_versions_by_version_publish',
  'post_platform_product_plans_by_plan_id_versions_by_version_retire',
  'post_platform_tenant_data_migrations_by_migration_id_cancel',
  'post_platform_tenant_data_migrations_by_migration_id_finalize',
  'post_system_config_packages',
  'post_system_perms_sync',
  'post_system_notices_by_id_publish_message',
  'put_system_messages_by_id_read',
  'put_system_messages_read_all',
])
const methods = new Set(['get', 'post', 'put', 'patch', 'delete'])
const requiredQueryOperationIds = new Set([
  'get_auth_captcha_generate',
  'get_auth_captcha_image',
  'get_common_file_download',
  'get_agent_v1_directory_departments',
  'get_agent_v1_directory_posts',
  'get_agent_v1_directory_users',
  'get_agent_v1_reference_dictionaries_by_type_code',
  'get_monitor_jobs',
  'get_monitor_retention_runs',
  'get_monitor_schedules',
  'get_monitor_schedules_by_id_executions',
  'get_platform_tenants_page',
  'get_platform_data_targets',
  'get_platform_product_plans',
  'get_system_config_packages',
  'get_system_config_transfers',
  'get_system_config_transfers_by_id_items',
  'get_system_service_access_audits',
  'get_system_service_accounts',
  'get_system_service_delegations',
  'get_system_configs',
  'get_system_depts',
  'get_system_dict_data',
  'get_system_dict_types',
  'get_system_loginlogs',
  'get_system_menus',
  'get_system_messages',
  'get_system_notices',
  'get_system_online',
  'get_system_operlogs',
  'get_system_perms_tree',
  'get_system_posts',
  'get_system_roles',
  'get_system_roles_options',
  'get_system_users',
  'get_system_user_imports',
  'get_system_user_imports_by_id_rows',
  'get_system_users_options',
])
const c1PaginatedOperationIds = new Set([
  'get_agent_v1_directory_departments',
  'get_agent_v1_directory_posts',
  'get_agent_v1_directory_users',
  'get_agent_v1_reference_dictionaries_by_type_code',
  'get_monitor_jobs',
  'get_monitor_retention_runs',
  'get_monitor_schedules',
  'get_monitor_schedules_by_id_executions',
  'get_platform_tenants_page',
  'get_platform_data_targets',
  'get_platform_product_plans',
  'get_system_config_packages',
  'get_system_config_transfers',
  'get_system_config_transfers_by_id_items',
  'get_system_service_access_audits',
  'get_system_service_accounts',
  'get_system_service_delegations',
  'get_system_configs',
  'get_system_depts',
  'get_system_dict_types',
  'get_system_loginlogs',
  'get_system_menus',
  'get_system_notices',
  'get_system_online',
  'get_system_operlogs',
  'get_system_posts',
  'get_system_roles',
  'get_system_user_imports',
  'get_system_user_imports_by_id_rows',
  'get_system_users',
])
const c1OptionOperationContracts = new Map([
  ['get_system_roles_options', '/api/v1/system/roles/options'],
  ['get_system_users_options', '/api/v1/system/users/options'],
])
const c1RemovedUnboundedListPaths = new Set([
  '/api/v1/system/configs/all',
  '/api/v1/system/depts/all',
  '/api/v1/system/dict/types/all',
  '/api/v1/system/loginlogs/all',
  '/api/v1/system/menus/all',
  '/api/v1/system/notices/all',
  '/api/v1/system/online/all',
  '/api/v1/system/operlogs/all',
  '/api/v1/system/posts/all',
  '/api/v1/system/roles/all',
  '/api/v1/system/users/all',
])
const c1StringPathIdOperationIds = new Set([
  'delete_system_configs_by_id',
  'delete_system_depts_by_id',
  'delete_system_dict_data_by_id',
  'delete_system_dict_types_by_id',
  'delete_system_menus_by_id',
  'delete_system_notices_by_id',
  'delete_system_perms_by_id',
  'delete_system_posts_by_id',
  'delete_system_roles_by_id',
  'delete_system_users_by_id',
  'get_system_configs_by_id',
  'get_system_depts_by_id',
  'get_system_menus_by_id',
  'get_system_notices_by_id',
  'get_system_perms_by_id',
  'get_system_posts_by_id',
  'get_system_roles_by_id',
  'get_system_roles_by_id_permissions',
  'get_system_users_by_id',
  'post_system_notices_by_id_publish_message',
  'post_system_users_by_id_password_reset_requests',
  'put_system_configs_by_id',
  'put_system_depts_by_id',
  'put_system_dict_data_by_id',
  'put_system_dict_types_by_id',
  'put_system_menus_by_id',
  'put_system_notices_by_id',
  'put_system_perms_by_id',
  'put_system_posts_by_id',
  'put_system_roles_by_id',
  'put_system_roles_by_id_data_scope',
  'put_system_roles_by_id_permissions',
  'put_system_users_by_id',
  'put_system_users_by_id_roles',
  'put_system_users_by_id_status',
])
// 参数必须出现在契约中，但调用方可以省略，由运行时分页配置补全默认值。
// page_size 与 limit 的静态 maximum 必须留空，避免伪造可被 TOML 改写的运行时上限。
const c1PaginationParameterContracts = new Map([
  ['page', { type: 'integer', minimum: 1, maximum: undefined }],
  ['page_size', { type: 'integer', minimum: 1, maximum: undefined }],
])
// 平台租户容量页固定将单页上限收紧为 100，不受通用分页配置放宽。
const fixedPaginationPageSizeMaximums = new Map([
  ['get_agent_v1_directory_departments', 100],
  ['get_agent_v1_directory_posts', 100],
  ['get_agent_v1_directory_users', 100],
  ['get_agent_v1_reference_dictionaries_by_type_code', 100],
  ['get_platform_tenants_page', 100],
  ['get_platform_data_targets', 100],
  ['get_platform_product_plans', 100],
])
const c1OptionParameterContracts = new Map([
  ['q', { type: 'string', minLength: undefined, maxLength: 64 }],
  ['limit', { type: 'integer', minimum: 1, maximum: undefined }],
])
let operationCount = 0
const queryOperationIds = new Set()
const operationsById = new Map()

for (const [path, pathItem] of paths) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (!methods.has(method)) continue
    operationCount += 1

    const operationId = operation.operationId
    if (!operationId) errors.push(`${method.toUpperCase()} ${path}: missing operationId`)
    else if (operationIds.has(operationId)) errors.push(`${operationId}: duplicate operationId`)
    else operationIds.add(operationId)

    const successResponses = Object.entries(operation.responses ?? {})
      .filter(([status]) => /^2\d\d$/.test(status))
    if (successResponses.length === 0) {
      errors.push(`${operationId}: missing 2xx response`)
    }
    for (const [status, response] of successResponses) {
      const content = Object.values(response.content ?? {})
      if (content.length === 0 || content.some(media => !media.schema)) {
        errors.push(`${operationId}: ${status} response is missing a content schema`)
      }
    }

    if (['post', 'put', 'patch'].includes(method)
      && !operation.requestBody
      && !bodylessWriteAllowlist.has(operationId)) {
      errors.push(`${operationId}: write operation is missing requestBody`)
    }

    const parameters = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]
    if (operationId && parameters.some(parameter => parameter.in === 'query')) {
      queryOperationIds.add(operationId)
    }
    if (operationId && !operationsById.has(operationId)) {
      operationsById.set(operationId, { method, operation, parameters, path })
    }
  }
}

function resolveLocalReference(value, location) {
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

const queryParametersByOperationId = new Map()

function queryParametersFor(operationId, entry) {
  if (queryParametersByOperationId.has(operationId)) {
    return queryParametersByOperationId.get(operationId)
  }

  const parameters = new Map()
  for (const [index, rawParameter] of entry.parameters.entries()) {
    const parameter = resolveLocalReference(
      rawParameter,
      `${operationId}.parameters[${index}]`,
    )
    if (parameter?.in !== 'query') continue
    if (typeof parameter.name !== 'string' || parameter.name.length === 0) {
      errors.push(`${operationId}.parameters[${index}]: query parameter is missing a name`)
      continue
    }
    if (parameters.has(parameter.name)) {
      errors.push(`${operationId}: duplicate query parameter ${parameter.name}`)
      continue
    }
    parameters.set(parameter.name, parameter)
  }
  queryParametersByOperationId.set(operationId, parameters)
  return parameters
}

function displayContractValue(value) {
  return value === undefined ? '<absent>' : JSON.stringify(value)
}

function validateC1QueryParameter(operationId, parameters, parameterName, expectedSchema) {
  const parameter = parameters.get(parameterName)
  if (!parameter) {
    errors.push(`${operationId}: required C1 query parameter ${parameterName} is missing`)
    return
  }
  if (parameter.required !== false) {
    errors.push(`${operationId}.${parameterName}: parameter must remain optional with runtime defaults`)
  }

  const schema = resolveLocalReference(
    parameter.schema,
    `${operationId}.${parameterName}.schema`,
  )
  if (!schema || typeof schema !== 'object') {
    errors.push(`${operationId}.${parameterName}: query parameter schema is missing`)
    return
  }
  for (const [keyword, expected] of Object.entries(expectedSchema)) {
    if (schema[keyword] !== expected) {
      errors.push(
        `${operationId}.${parameterName}: expected ${keyword}=`
        + `${displayContractValue(expected)}, found ${displayContractValue(schema[keyword])}`,
      )
    }
  }
}

function validateRoleOptionPurpose(operationId, parameters) {
  const parameter = parameters.get('purpose')
  if (!parameter) {
    errors.push(`${operationId}: required role option purpose is missing`)
    return
  }
  if (parameter.required !== true) {
    errors.push(`${operationId}.purpose: parameter must remain required`)
  }
  const schema = resolveLocalReference(parameter.schema, `${operationId}.purpose.schema`)
  if (schema?.type !== 'string'
    || !isDeepStrictEqual(schema.enum, ['user_assignment', 'service_account_assignment'])) {
    errors.push(`${operationId}.purpose: role option purpose enum is invalid`)
  }
}

function validateC1QueryContracts() {
  if (c1PaginatedOperationIds.size !== 30) {
    errors.push(`C1 pagination manifest must contain 30 operationIds, found ${c1PaginatedOperationIds.size}`)
  }
  if (c1OptionOperationContracts.size !== 2) {
    errors.push(`C1 options manifest must contain 2 operationIds, found ${c1OptionOperationContracts.size}`)
  }

  for (const operationId of c1PaginatedOperationIds) {
    const entry = operationsById.get(operationId)
    if (!entry) {
      errors.push(`${operationId}: required C1 pagination operation is missing`)
      continue
    }
    const parameters = queryParametersFor(operationId, entry)
    for (const [parameterName, expectedSchema] of c1PaginationParameterContracts) {
      const fixedMaximum = parameterName === 'page_size'
        ? fixedPaginationPageSizeMaximums.get(operationId)
        : undefined
      validateC1QueryParameter(
        operationId,
        parameters,
        parameterName,
        fixedMaximum === undefined
          ? expectedSchema
          : { ...expectedSchema, maximum: fixedMaximum },
      )
    }
  }

  for (const [operationId, expectedPath] of c1OptionOperationContracts) {
    const entry = operationsById.get(operationId)
    if (!entry) {
      errors.push(`${operationId}: required C1 options operation is missing`)
      continue
    }
    if (entry.method !== 'get' || entry.path !== expectedPath) {
      errors.push(`${operationId}: options operation must remain GET ${expectedPath}`)
    }
    const parameters = queryParametersFor(operationId, entry)
    const isRoleOptions = operationId === 'get_system_roles_options'
    const expectedNames = isRoleOptions ? ['limit', 'purpose', 'q'] : ['limit', 'q']
    if (!isDeepStrictEqual([...parameters.keys()].sort(), expectedNames)) {
      errors.push(`${operationId}: options query parameters do not match the exact manifest`)
    }
    for (const [parameterName, expectedSchema] of c1OptionParameterContracts) {
      validateC1QueryParameter(operationId, parameters, parameterName, expectedSchema)
    }
    if (isRoleOptions) validateRoleOptionPurpose(operationId, parameters)
  }

  // 新增分页或 options 操作不能绕过按 operationId 维护的精确清单。
  for (const [operationId, entry] of operationsById) {
    const parameters = queryParametersFor(operationId, entry)
    const hasPaginationParameter = parameters.has('page') || parameters.has('page_size')
    if (hasPaginationParameter && !c1PaginatedOperationIds.has(operationId)) {
      errors.push(`${operationId}: pagination operation is missing from the C1 manifest`)
    }
    if (entry.path.endsWith('/options') && !c1OptionOperationContracts.has(operationId)) {
      errors.push(`${operationId}: options operation is missing from the C1 manifest`)
    }
  }
}

// C1 已删除无上限列表，并只为受控候选项保留 `/options`；不允许旧路径回流。
if (c1RemovedUnboundedListPaths.size !== 11) {
  errors.push(`C1 removed path manifest must contain 11 entries, found ${c1RemovedUnboundedListPaths.size}`)
}
for (const path of c1RemovedUnboundedListPaths) {
  if (document.paths?.[path]) errors.push(`${path}: removed unbounded list path returned`)
}
for (const operationId of requiredQueryOperationIds) {
  if (!queryOperationIds.has(operationId)) {
    errors.push(`${operationId}: required bounded query operation is missing`)
  }
}
validateC1QueryContracts()

function validateIdentityParameter(operationId, parameter, location) {
  const schema = resolveLocalReference(parameter.schema, `${location}.schema`)
  if (!schema || typeof schema !== 'object') {
    errors.push(`${location}: identity parameter schema is missing`)
    return
  }

  if (parameter.name.endsWith('_ids')) {
    if (schema.type !== 'array'
      || schema.items?.type !== 'string'
      || schema.items?.format === 'int64') {
      errors.push(`${location}: *_ids parameters must use an array of string items`)
    }
  }
  else if (schema.type !== 'string' || schema.format === 'int64') {
    errors.push(`${location}: id and *_id parameters must use string transport`)
  }

  if (parameter.in === 'path' && parameter.required !== true) {
    errors.push(`${location}: path identity parameter must be required`)
  }
  if (parameter.in === 'path' && !operationsById.get(operationId)?.path.includes(`{${parameter.name}}`)) {
    errors.push(`${location}: path identity parameter has no matching path placeholder`)
  }
}

function validateIdentityParameters() {
  if (c1StringPathIdOperationIds.size !== 35) {
    errors.push(
      `C1 string path ID manifest must contain 35 operationIds, `
      + `found ${c1StringPathIdOperationIds.size}`,
    )
  }

  let pathIdentityParameterCount = 0
  const pathIdentityOperationIds = new Set()
  for (const [operationId, entry] of operationsById) {
    for (const [index, rawParameter] of entry.parameters.entries()) {
      const parameter = resolveLocalReference(
        rawParameter,
        `${operationId}.parameters[${index}]`,
      )
      if (!parameter
        || !['path', 'query'].includes(parameter.in)
        || typeof parameter.name !== 'string'
        || !/(^id$|_id$|_ids$)/u.test(parameter.name)) {
        continue
      }
      const location = `${operationId}.${parameter.in}.${parameter.name}`
      validateIdentityParameter(operationId, parameter, location)
      if (parameter.in === 'path') {
        pathIdentityParameterCount += 1
        pathIdentityOperationIds.add(operationId)
      }
    }
  }

  if (pathIdentityParameterCount < 35) {
    errors.push(
      `expected at least 35 path identity parameters, found ${pathIdentityParameterCount}`,
    )
  }
  for (const operationId of c1StringPathIdOperationIds) {
    if (!pathIdentityOperationIds.has(operationId)) {
      errors.push(`${operationId}: required string path ID guard target is missing`)
    }
  }
}

validateIdentityParameters()

function validateIdFields(schema, location) {
  if (!schema || typeof schema !== 'object') return
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const propertyTypes = Array.isArray(property.type) ? property.type : [property.type]
    if (/(^id$|_id$)/.test(name) && !propertyTypes.includes('string')) {
      errors.push(`${location}.${name}: ID fields must use string transport`)
    }
    if (/_ids$/.test(name)
      && (!propertyTypes.includes('array') || property.items?.type !== 'string')) {
      errors.push(`${location}.${name}: ID list fields must use string items`)
    }
    validateIdFields(property, `${location}.${name}`)
  }
  for (const [index, branch] of (schema.allOf ?? []).entries()) {
    validateIdFields(branch, `${location}.allOf[${index}]`)
  }
}

const schemas = document.components?.schemas ?? {}
for (const [name, schema] of Object.entries(schemas)) {
  validateIdFields(schema, `components.schemas.${name}`)
}

if (paths.length < 97) errors.push(`expected at least 97 paths, found ${paths.length}`)
if (operationCount < 128) errors.push(`expected at least 128 operations, found ${operationCount}`)
if (Object.keys(schemas).length < 188) {
  errors.push(`expected at least 188 schemas, found ${Object.keys(schemas).length}`)
}
if (errors.length > 0) {
  console.error('API contract check failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exitCode = 1
}
else {
  console.log(
    `API contract check passed (${paths.length} paths, ${operationCount} operations, `
    + `${Object.keys(schemas).length} schemas, ${queryOperationIds.size} query operations, `
    + `${contractRoutes.size} menu routes)`,
  )
}
