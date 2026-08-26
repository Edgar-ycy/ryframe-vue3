import type { EffectiveSessionCapability } from '@/api/modules/sessionContext'

export function capabilityCodes(capabilities: readonly EffectiveSessionCapability[]): string[] {
  return capabilities.map((capability) => capability.code)
}

export function hasCapability(
  capabilities: readonly EffectiveSessionCapability[],
  code: string,
): boolean {
  return capabilities.some((capability) => capability.code === code)
}

export function hasCapabilities(
  capabilities: readonly EffectiveSessionCapability[],
  required: readonly string[],
): boolean {
  return required.every((code) => hasCapability(capabilities, code))
}
