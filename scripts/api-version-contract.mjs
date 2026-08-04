function normalizedVersion(value) {
  return typeof value === 'string' && value.trim() === value && value.length > 0
    ? value
    : null
}

export function apiVersionContractViolation(packageDocument, openApiDocument) {
  const packageVersion = normalizedVersion(packageDocument?.version)
  if (!packageVersion) {
    return 'package.json version must be a non-empty trimmed string'
  }

  const openApiVersion = normalizedVersion(openApiDocument?.info?.version)
  if (!openApiVersion) {
    return 'OpenAPI info.version must be a non-empty trimmed string'
  }

  if (packageVersion !== openApiVersion) {
    return `package.json version ${JSON.stringify(packageVersion)} does not equal `
      + `OpenAPI info.version ${JSON.stringify(openApiVersion)}`
  }

  return null
}
