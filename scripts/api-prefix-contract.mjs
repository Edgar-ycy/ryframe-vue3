const apiPrefixPattern = /^\/api\/v[1-9]\d*$/
const canonicalKeys = ['value', 'version']

export function apiPrefixContractViolation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'must be an object'
  }
  const keys = Object.keys(value).sort()
  if (
    keys.length !== canonicalKeys.length ||
    keys.some((key, index) => key !== canonicalKeys[index])
  ) {
    return 'must contain exactly version and value'
  }
  if (value.version !== 1) {
    return 'must use version 1'
  }
  if (typeof value.value !== 'string' || !apiPrefixPattern.test(value.value)) {
    return 'must contain a supported versioned API path'
  }
  return null
}

export function requireApiPrefixContract(value, label) {
  const violation = apiPrefixContractViolation(value)
  if (violation) {
    throw new Error(`${label} has an invalid x-ryframe-api-prefix: ${violation}`)
  }
  return value
}
