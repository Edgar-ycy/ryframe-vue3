export function hasRequiredCapabilities(
  capabilities: readonly string[],
  required: readonly string[] | undefined,
): boolean {
  return !required?.length || required.every((code) => capabilities.includes(code))
}
