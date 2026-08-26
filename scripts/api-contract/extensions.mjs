import { isDeepStrictEqual } from 'node:util'
import { apiPrefixContractViolation } from '../api-prefix-contract.mjs'

function sortedUniqueStrings(value, location, errors) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    errors.push(`${location}: expected a string array`)
    return []
  }
  if (new Set(value).size !== value.length) errors.push(`${location}: contains duplicates`)
  return [...value].sort()
}

function validateProductCapabilityContract(document, featureRegistry, errors) {
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
    const dependencies = sortedUniqueStrings(
      capability.dependencies,
      `${location}.dependencies`,
      errors,
    )
    const conflicts = sortedUniqueStrings(capability.conflicts, `${location}.conflicts`, errors)
    const routeKeys = sortedUniqueStrings(capability.route_keys, `${location}.route_keys`, errors)
    const permissionCodes = sortedUniqueStrings(
      capability.permission_codes,
      `${location}.permission_codes`,
      errors,
    )
    sortedUniqueStrings(
      capability.default_admin_permissions,
      `${location}.default_admin_permissions`,
      errors,
    )
    sortedUniqueStrings(
      capability.deployment_dependencies,
      `${location}.deployment_dependencies`,
      errors,
    )
    sortedUniqueStrings(capability.client_config_fields, `${location}.client_config_fields`, errors)
    if (typeof capability.deployment_available !== 'boolean') {
      errors.push(`${location}.deployment_available: expected boolean`)
    }
    if (!Array.isArray(capability.variants) || capability.variants.length === 0) {
      errors.push(`${location}.variants: expected a non-empty array`)
    }
    const variants = (capability.variants ?? [])
      .map((variant, variantIndex) => {
        if (
          !variant ||
          typeof variant.code !== 'string' ||
          !variant.code ||
          !Number.isSafeInteger(variant.schema_version) ||
          variant.schema_version < 1
        ) {
          errors.push(`${location}.variants[${variantIndex}]: invalid code or schema_version`)
          return undefined
        }
        return variant.code
      })
      .filter(Boolean)
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
      'feature capability codes do not exactly match x-ryframe-product-capabilities: ' +
        `frontend=${JSON.stringify(frontendCodes)}, backend=${JSON.stringify(backendCodes)}`,
    )
  }
  for (const [capabilityCode, manifest] of manifestsByCapability) {
    const capability = capabilities.get(capabilityCode)
    if (!capability) continue
    if (!isDeepStrictEqual(capability.routeKeys, [manifest.routeKey].sort())) {
      errors.push(`${capabilityCode}: manifest route_key does not exactly match backend route_keys`)
    }
    if (!isDeepStrictEqual(capability.variants, [...manifest.allowedVariants].sort())) {
      errors.push(
        `${capabilityCode}: manifest allowedVariants do not exactly match backend variants`,
      )
    }
    if (!capability.permissionCodes.includes(manifest.permissionCode)) {
      errors.push(
        `${capabilityCode}: manifest permissionCode is absent from backend permission_codes`,
      )
    }
  }
  for (const [capabilityCode, capability] of capabilities) {
    for (const dependency of capability.dependencies) {
      if (!capabilities.has(dependency)) {
        errors.push(`${capabilityCode}: unknown dependency ${dependency}`)
      }
    }
    for (const conflict of capability.conflicts) {
      if (!capabilities.has(conflict))
        errors.push(`${capabilityCode}: unknown conflict ${conflict}`)
    }
  }
  return capabilities
}

function validateCapabilityRouteContract(document, capabilities, errors) {
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
    if (
      !route ||
      typeof route.source !== 'string' ||
      typeof route.handler !== 'string' ||
      typeof route.method !== 'string' ||
      typeof route.path !== 'string' ||
      typeof route.capability_code !== 'string'
    ) {
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

function validatePasswordPolicy(document, generatedPasswordPolicy, errors) {
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
    if (
      field?.minLength !== expectedPasswordPolicy.min_length ||
      field?.maxLength !== expectedPasswordPolicy.max_length ||
      field?.pattern !== expectedPasswordPolicy.pattern
    ) {
      errors.push(`${schemaName}.${fieldName}: schema does not expose the password policy`)
    }
  }
}

function validateNoticePolicy(document, generatedNoticePolicy, errors) {
  const expectedNoticePolicy = {
    version: 1,
    content_markdown: { min_utf8_bytes: 1, max_utf8_bytes: 60_000 },
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
    if (
      properties?.content !== undefined ||
      field?.minLength !== expectedNoticePolicy.content_markdown.min_utf8_bytes ||
      field?.maxLength !== expectedNoticePolicy.content_markdown.max_utf8_bytes
    ) {
      errors.push(`${schemaName}.content_markdown: schema does not expose the notice policy`)
    }
  }
  const noticeResponseProperties = document.components?.schemas?.NoticeVo?.properties
  if (
    noticeResponseProperties?.content !== undefined ||
    noticeResponseProperties?.content_markdown?.type !== 'string'
  ) {
    errors.push('NoticeVo must expose content_markdown and must not expose legacy content')
  }
}

function validateApiPrefix(document, generatedApiPrefix, errors) {
  const apiPrefixExtension = document['x-ryframe-api-prefix']
  if (apiPrefixContractViolation(apiPrefixExtension)) {
    errors.push('OpenAPI is missing the canonical API prefix contract')
    return
  }
  if (!isDeepStrictEqual(generatedApiPrefix, apiPrefixExtension)) {
    errors.push('generated API prefix is not synchronized with OpenAPI')
  }
  for (const [path] of Object.entries(document.paths ?? {})) {
    if (!path.startsWith(`${apiPrefixExtension.value}/`) && !['/livez', '/readyz'].includes(path)) {
      errors.push(`${path}: path does not use the canonical API prefix`)
    }
  }
}

/** 校验 OpenAPI 产品能力、策略与 API 前缀扩展。 */
export function validateOpenApiExtensions({
  document,
  errors,
  featureRegistry,
  generatedApiPrefix,
  generatedNoticePolicy,
  generatedPasswordPolicy,
}) {
  const productCapabilities = validateProductCapabilityContract(document, featureRegistry, errors)
  validateCapabilityRouteContract(document, productCapabilities, errors)
  validatePasswordPolicy(document, generatedPasswordPolicy, errors)
  validateNoticePolicy(document, generatedNoticePolicy, errors)
  validateApiPrefix(document, generatedApiPrefix, errors)
}
