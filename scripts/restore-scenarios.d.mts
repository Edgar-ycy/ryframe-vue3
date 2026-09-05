export const restoreSpecs: string[]
export function realTestSelection(
  bindings: string | undefined,
  fixture: string,
): { testIgnore: string[] } | { testMatch: string[] }
